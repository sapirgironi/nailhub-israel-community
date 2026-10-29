import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_OPTIMIZED_IMAGE_BYTES } from "../lib/cloudinary";
import { optimizeUploadImage } from "../lib/image-optimization";

describe("image upload optimization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("resizes large transparent images and keeps the optimized file under the upload cap", async () => {
    const close = vi.fn();
    const image = { width: 4000, height: 2000, close } as ImageBitmap;
    const drawImage = vi.fn();
    const context = { drawImage } as unknown as CanvasRenderingContext2D;
    let blobCount = 0;

    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(image));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => context);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => {
      blobCount += 1;
      const size = blobCount <= 4 ? MAX_OPTIMIZED_IMAGE_BYTES + 1 : 128;
      callback(new Blob([new Uint8Array(size)], { type: type ?? "" }));
    });

    const source = new File(["image"], "logo.png", {
      type: "image/png",
      lastModified: 123,
    });
    const optimized = await optimizeUploadImage(source);

    expect(optimized.type).toBe("image/webp");
    expect(optimized.name).toBe("logo.webp");
    expect(optimized.size).toBeLessThanOrEqual(MAX_OPTIMIZED_IMAGE_BYTES);
    expect(drawImage).toHaveBeenLastCalledWith(image, 0, 0, 1536, 768);
    expect(close).toHaveBeenCalledOnce();
  });
});
