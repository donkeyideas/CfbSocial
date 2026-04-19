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
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const contentType = mimeType ||
    (ext === 'png' ? 'image/png' :
    ext === 'webp' ? 'image/webp' :
    ext === 'gif' ? 'image/gif' :
    'image/jpeg');

  const name = fileName || `photo.${ext}`;

  // Step 1: Get presigned URL
  let presignData: PresignResponse;
  try {
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
      throw new Error(data.error || `Presign failed (${presignRes.status})`);
    }

    presignData = await presignRes.json();
  } catch (e: any) {
    throw new Error(`Presign step failed: ${e.message}`);
  }

  // Step 2: Upload file via XMLHttpRequest (native RN file upload, no extra dependencies)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', presignData.presignedUrl);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`R2 upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('R2 upload network error'));
    xhr.ontimeout = () => reject(new Error('R2 upload timed out'));

    // React Native XHR natively handles file:// URIs when passed as an object
    xhr.send({ uri, type: contentType, name } as any);
  });

  return presignData.publicUrl;
}
