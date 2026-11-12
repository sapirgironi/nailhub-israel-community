import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lovable: vi.fn(),
  supabase: vi.fn(),
}));
vi.mock("@/integrations/lovable", () => ({
  lovable: { auth: { signInWithOAuth: mocks.lovable } },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithOAuth: mocks.supabase } },
}));

import { signInWithOAuth } from "@/lib/oauth";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("OAuth routing", () => {
  it("preserves the Lovable flow by default", async () => {
    vi.stubEnv("VITE_SUPABASE_OAUTH_MODE", "");
    mocks.lovable.mockResolvedValue({ redirected: true });
    await signInWithOAuth("google", "https://example.test/feed");
    expect(mocks.lovable).toHaveBeenCalledWith("google", {
      redirect_uri: "https://example.test/feed",
    });
    expect(mocks.supabase).not.toHaveBeenCalled();
  });

  it("routes direct OAuth through the selected Supabase project", async () => {
    vi.stubEnv("VITE_SUPABASE_OAUTH_MODE", "supabase");
    mocks.supabase.mockResolvedValue({ data: { url: "https://example.test/auth" }, error: null });
    expect(await signInWithOAuth("apple", "https://example.test/feed")).toEqual({
      redirected: true,
      error: null,
    });
    expect(mocks.supabase).toHaveBeenCalledWith({
      provider: "apple",
      options: { redirectTo: "https://example.test/feed" },
    });
    expect(mocks.lovable).not.toHaveBeenCalled();
  });

  it("surfaces provider and redirect errors", async () => {
    vi.stubEnv("VITE_SUPABASE_OAUTH_MODE", "supabase");
    const error = new Error("provider disabled");
    mocks.supabase.mockResolvedValueOnce({ data: { url: null }, error });
    expect(await signInWithOAuth("google", "https://example.test")).toEqual({
      redirected: false,
      error,
    });
    mocks.supabase.mockResolvedValueOnce({ data: { url: null }, error: null });
    expect((await signInWithOAuth("google", "https://example.test")).error).toBeInstanceOf(Error);
  });

  it("rejects an invalid OAuth mode", async () => {
    vi.stubEnv("VITE_SUPABASE_OAUTH_MODE", "invalid");
    await expect(signInWithOAuth("google", "https://example.test")).rejects.toThrow(
      "Invalid OAuth configuration",
    );
  });
});
