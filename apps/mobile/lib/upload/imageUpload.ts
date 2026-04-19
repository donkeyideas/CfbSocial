import { WEB_API_URL } from '@/lib/constants';

interface PresignResponse {
  presignedUrl: string;
  publicUrl: string;
}

export async function uploadImage(
  uri: string,
  accessToken: string,
  mimeType?: string,
  fileName?: string | null
): Promise<string> {
  // Use provided mimeType or guess from URI extension
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const contentType = mimeType ||
    (ext === 'png' ? 'image/png' :
    ext === 'webp' ? 'image/webp' :
    ext === 'gif' ? 'image/gif' :
    'image/jpeg');

  const name = fileName || `photo.${ext}`;

  // Get presigned URL
  const presignRes = await fetch(`${WEB_API_URL}/api/upload/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ fileName: name, contentType }),
  });

  if (!presignRes.ok) {
    const data = await presignRes.json().catch(() => ({}));
    throw new Error(data.error || `Upload failed (${presignRes.status})`);
  }

  const { presignedUrl, publicUrl }: PresignResponse = await presignRes.json();

  // Fetch local file as blob and upload to R2
  const fileRes = await fetch(uri);
  const blob = await fileRes.blob();

  const uploadRes = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });

  if (!uploadRes.ok) {
    throw new Error(`Failed to upload image (${uploadRes.status})`);
  }

  return publicUrl;
}
