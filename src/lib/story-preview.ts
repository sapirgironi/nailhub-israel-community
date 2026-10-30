// A bounded editing bitmap, never the final story capture. Keep the original File for publication.
export async function createStoryPreview(file: File): Promise<Blob> {
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 768 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('לא ניתן לפתוח את התמונה');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('לא ניתן לפתוח את התמונה')), 'image/webp', 0.75);
    });
  } finally {
    image.close();
  }
}