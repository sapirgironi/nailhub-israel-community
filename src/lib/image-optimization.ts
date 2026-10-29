import { MAX_OPTIMIZED_IMAGE_BYTES, validateImage } from "./cloudinary";

const MAX_IMAGE_DIMENSION = 1920;
const QUALITY_STEPS = [0.82, 0.68, 0.54, 0.4];

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("כיווץ התמונה נכשל"))),
      type,
      quality,
    );
  });
}

export async function optimizeUploadImage(file: File): Promise<File> {
  validateImage(file);
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file);
  } catch {
    throw new Error("לא ניתן לפתוח את התמונה. בחרי קובץ תמונה תקין.");
  }

  try {
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
    const outputType = file.type === "image/png" ? "image/webp" : "image/jpeg";
    let dimensions = scale;

    for (let attempt = 0; attempt < 7; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * dimensions));
      canvas.height = Math.max(1, Math.round(image.height * dimensions));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("כיווץ התמונה נכשל");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasBlob(canvas, outputType, quality);
        if (blob.size <= MAX_OPTIMIZED_IMAGE_BYTES) {
          const extension =
            blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
          const name = file.name.replace(/\.[^.]+$/, "") || "image";
          return new File([blob], `${name}.${extension}`, {
            type: blob.type || outputType,
            lastModified: file.lastModified,
          });
        }
      }

      dimensions *= 0.8;
    }

    throw new Error("התמונה עדיין גדולה מדי לאחר הכיווץ. בחרי תמונה אחרת.");
  } finally {
    image.close();
  }
}
