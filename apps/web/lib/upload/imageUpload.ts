interface PresignResponse {
  presignedUrl: string;
  publicUrl: string;
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
  const { presignedUrl, publicUrl } = await requestPresignedUrl(file);
  await uploadToR2(presignedUrl, file);
  return publicUrl;
}
