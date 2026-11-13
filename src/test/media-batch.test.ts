import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ batch: vi.fn(), single: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/cloudinary.functions", () => ({
  readCloudinaryImages: mocks.batch,
  readCloudinaryImage: mocks.single,
  uploadCloudinaryImage: vi.fn(),
}));
import { photoUrl } from "@/lib/media";

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe("browser image batches", () => {
  it("deduplicates requests and splits them into bounded batches", async () => {
    vi.useFakeTimers();
    mocks.batch.mockImplementation(async ({ data }: { data: { urls: string[] } }) =>
      data.urls.map(url => ({ url, image: `image:${url}`, error: null, retryIndividually: false })));
    const urls = Array.from({ length: 5 }, (_, i) => `https://res.cloudinary.com/demo/${i}`);
    const requests = [...urls.map(photoUrl), photoUrl(urls[0]!)];
    await vi.advanceTimersByTimeAsync(10);
    const images = await Promise.all(requests);
    expect(mocks.batch).toHaveBeenCalledTimes(2);
    expect(images[0]).toBe(images[5]);
    expect(images).toHaveLength(6);
  });
  it("retries an oversized batch individually", async () => {
    vi.useFakeTimers();
    mocks.batch.mockResolvedValue([{ url: "https://res.cloudinary.com/demo/a", image: null, error: null, retryIndividually: true }]);
    mocks.single.mockResolvedValue({ image: "image" });
    const result = photoUrl("https://res.cloudinary.com/demo/a");
    await vi.advanceTimersByTimeAsync(10);
    expect(await result).toBe("image");
    expect(mocks.single).toHaveBeenCalledOnce();
  });
});
