import { WEB_API_URL } from '@/lib/constants';

interface PresignResponse {
  presignedUrl: string;
  publicUrl: string;
}

export async function uploadImage(
  uri: string,
  accessToken: string
): Promise<string> {
  // Determine content type from URI
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const contentType =
    ext === 'png' ? 'image/png' :
    ext === 'webp' ? 'image/webp' :
    ext === 'gif' ? 'image/gif' :
    'image/jpeg';

  const fileName = `photo.${ext}`;

  // Get presigned URL
  const presignRes = await fetch(`${WEB_API_URL}/api/upload/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ fileName, contentType }),
  });

  if (!presignRes.ok) {
    const data = await presignRes.json();
    throw new Error(data.error || 'Failed to get upload URL');
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
    throw new Error('Failed to upload image');
  }

  return publicUrl;
}
