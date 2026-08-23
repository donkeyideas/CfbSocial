interface PresignResponse {
  presignedUrl: string;
  publicUrl: string;
}

const MAX_DIMENSION = 2048; // longest edge after downscale
const TARGET_MAX_BYTES = 5 * 1024 * 1024; // server hard cap
const COMPRESSIBLE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Downscale + re-encode oversized images in the browser so they fit under the
 * server's 5 MB cap. Game-capture screenshots are often 4K PNGs (~30 MB); this
 * turns them into web-friendly JPEGs. Falls back to the original file if the
 * image can't be processed (e.g. GIF, HEIC, or a decode failure).
 */
async function compressImage(file: File): Promise<File> {
  // Small enough already, or a format we don't re-encode (GIF animation, HEIC, etc.)
  if (file.size <= TARGET_MAX_BYTES) return file;
  if (!COMPRESSIBLE_TYPES.includes(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file);

    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    // Try decreasing quality until we're under the cap.
    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
      );
      if (blob && blob.size <= TARGET_MAX_BYTES) {
        const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        return new File([blob], newName, { type: 'image/jpeg' });
      }
    }

    return file; // couldn't get it small enough; let the server reject with its message
  } catch {
    return file;
  }
}

export async function requestPresignedUrl(file: File): Promise<PresignResponse> {
  const res = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to get upload URL');
  }

  return res.json();
}

export async function uploadToR2(presignedUrl: string, file: File): Promise<void> {
  const res = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!res.ok) {
    throw new Error('Failed to upload image');
  }
}

export async function uploadImage(file: File): Promise<string> {
  const prepared = await compressImage(file);
  const { presignedUrl, publicUrl } = await requestPresignedUrl(prepared);
  await uploadToR2(presignedUrl, prepared);
  return publicUrl;
}
