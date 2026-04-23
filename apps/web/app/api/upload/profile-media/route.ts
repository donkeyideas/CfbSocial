import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Upload avatar or banner for the authenticated user's profile.
 * Uses the admin (service-role) client so no storage RLS policies are needed.
 */
export async function POST(req: NextRequest) {
  // Authenticate via cookie (web) or Bearer token (mobile)
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

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const type = formData.get('type') as string | null; // 'avatar' or 'banner'
  const profileId = formData.get('profileId') as string | null;

  if (!file || !type) {
    return NextResponse.json({ error: 'file and type required' }, { status: 400 });
  }

  if (type !== 'avatar' && type !== 'banner') {
    return NextResponse.json({ error: 'type must be avatar or banner' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed. Use JPEG, PNG, WebP, or GIF.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum 5 MB.' }, { status: 400 });
  }

  // Verify the profile belongs to this user
  const admin = createAdminClient();
  const editId = profileId || userId;

  const { data: profile } = await admin
    .from('profiles')
    .select('id, owner_id')
    .eq('id', editId)
    .single();

  if (!profile || profile.owner_id !== userId) {
    return NextResponse.json({ error: 'Profile not found or not yours' }, { status: 403 });
  }

  // Build storage path (same structure as before)
  const storageBase = editId === userId ? userId : `${userId}/${editId}`;
  const filePath = `${storageBase}/${type}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(filePath, buffer, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from('avatars').getPublicUrl(filePath);
  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  return NextResponse.json({ url: publicUrl });
}
