import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocks.request }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: mocks.rpc, auth: { getUser: mocks.getUser } },
}));
import { submitClientRequestOnServer } from "@/lib/client-request.server";

const input = {
  techId: "10000000-0000-4000-8000-000000000001",
  requestId: "20000000-0000-4000-8000-000000000001",
  claimToken: "a".repeat(64),
  fullName: "דנה",
  phone: "050-1234567",
  requestType: "other" as const,
  description: "בקשה לבדיקה",
};

beforeEach(() => {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-secret");
  vi.stubEnv("VERCEL", "1");
  mocks.request.mockReturnValue(new Request("https://example.test", {
    headers: { "x-vercel-forwarded-for": "192.0.2.1" },
  }));
  mocks.rpc.mockResolvedValue({ data: "submitted", error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("public request server boundary", () => {
  it("uses keyed hashes rather than the source address or contact details in rate records", async () => {
    await expect(submitClientRequestOnServer(input)).resolves.toBe("submitted");
    const [name, args] = mocks.rpc.mock.calls[0]!;
    expect(name).toBe("submit_client_request_guarded");
    expect(args.p_source_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(args.p_fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(args.p_source_hash).not.toContain("192.0.2.1");
    expect(args.p_fingerprint).not.toContain("0501234567");
  });
  it("fails closed when the trusted Vercel address is missing or invalid", async () => {
    mocks.request.mockReturnValue(new Request("https://example.test", {
      headers: { "x-forwarded-for": "192.0.2.1", "x-vercel-forwarded-for": "not-an-address" },
    }));
    await expect(submitClientRequestOnServer(input)).rejects.toThrow("לא ניתן לאמת את מקור הפנייה");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not trust forwarded headers on an unconfigured production host", async () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "production");
    await expect(submitClientRequestOnServer(input)).rejects.toThrow("לא ניתן לאמת את מקור הפנייה");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects a banned signed-in account before attempting submission", async () => {
    mocks.request.mockReturnValue(new Request("https://example.test", {
      headers: { "x-vercel-forwarded-for": "192.0.2.1", authorization: "Bearer token" },
    }));
    mocks.getUser.mockResolvedValue({ data: { user: { id: "member" } }, error: null });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await expect(submitClientRequestOnServer(input)).rejects.toThrow("לא ניתן לשלוח פנייה מהחשבון הזה");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("is_account_banned", { target_user: "member" });
  });
  it("does not turn a database failure into success", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "unavailable" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(submitClientRequestOnServer(input)).rejects.toThrow("שליחת הפנייה נכשלה");
    vi.restoreAllMocks();
  });
});
