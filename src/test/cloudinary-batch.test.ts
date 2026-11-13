import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchImage: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = { middleware: () => builder, inputValidator: () => builder, handler: (handler: unknown) => handler };
    return builder;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({ setResponseHeader: vi.fn() }));
vi.mock("@/lib/account-access", () => ({ requireActiveAccount: {} }));
vi.mock("@/lib/cloudinary.server", () => ({
  getCloudinaryDeliveryConfig: () => ({ cloud: "demo", secret: "test" }),
  fetchOptimizedImage: mocks.fetchImage,
}));
import { readCloudinaryImages } from "@/lib/cloudinary.functions";

const owner = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const url = (user: string, image: string) => `https://res.cloudinary.com/demo/image/authenticated/f_auto,q_auto/v1/nailhub/${user}/${image}.jpg`;
const one = "20000000-0000-4000-8000-000000000001";
const two = "20000000-0000-4000-8000-000000000002";
const three = "20000000-0000-4000-8000-000000000003";
const readBatch = readCloudinaryImages as unknown as (input: unknown) => Promise<{ url: string; image: string | null; error: string | null; retryIndividually: boolean }[]>;

beforeEach(() => {
  mocks.fetchImage.mockReset().mockResolvedValue("data:image/webp;base64,abc");
});

describe("private image batching", () => {
  it("uses one RLS-checked lookup and never fetches an inaccessible image", async () => {
    const own = url(owner, one), visible = url(other, two), hidden = url(other, three);
    const rpc = vi.fn().mockResolvedValue({ data: [{ url: visible }], error: null });
    const result = await readBatch({ data: { urls: [own, visible, hidden] }, context: { userId: owner, supabase: { rpc } } });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("visible_media_urls", { candidate_urls: [visible, hidden] });
    expect(mocks.fetchImage).toHaveBeenCalledTimes(2);
    expect(result[0]?.image).toBeTruthy();
    expect(result[1]?.image).toBeTruthy();
    expect(result[2]).toMatchObject({ image: null, error: "אין גישה לתמונה" });
  });
  it("fails closed when the visibility check fails", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error("unavailable") });
    await expect(readBatch({ data: { urls: [url(other, two)] }, context: { userId: owner, supabase: { rpc } } })).rejects.toThrow();
    expect(mocks.fetchImage).not.toHaveBeenCalled();
  });
  it("asks the client to retry individually when the batch response would be too large", async () => {
    mocks.fetchImage.mockResolvedValue("x".repeat(1_600_000));
    const result = await readBatch({ data: { urls: [url(owner, one), url(owner, two)] }, context: { userId: owner, supabase: {} } });
    expect(result.every(item => item.image === null && item.retryIndividually)).toBe(true);
  });
});
