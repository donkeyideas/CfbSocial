import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2/client';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(req: NextRequest) {
  // Dual auth: cookie (web) or Bearer token (mobile)
  let userId: string | null = null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  userId = user?.id ?? null;

  if (!userId) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const admin = createAdminClient();
      const { data: { user: tokenUser } } = await admin.auth.getUser(token);
      if (tokenUser) userId = tokenUser.id;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { fileName, contentType, fileSize } = body;

  if (!fileName || !contentType) {
    return NextResponse.json({ error: 'fileName and contentType required' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'File type not allowed. Use JPEG, PNG, WebP, or GIF.' }, { status: 400 });
  }

  if (fileSize && fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum 5 MB.' }, { status: 400 });
  }

  const ext = EXT_MAP[contentType] || 'jpg';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const key = `posts/${userId}/${timestamp}-${random}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
  const publicUrl = `${R2_PUBLIC_URL}/${key}`;

  return NextResponse.json({ presignedUrl, publicUrl });
}
