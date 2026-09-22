import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { adminListPosts, adminCreatePost, type AdminCreateInput } from '@/lib/blog/queries';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;
  const posts = await adminListPosts();
  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  let body: AdminCreateInput & { status?: 'DRAFT' | 'PUBLISHED' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
  }

  try {
    const post = await adminCreatePost({ ...body, authorId: auth.userId });
    return NextResponse.json({ post });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Save failed' }, { status: 500 });
  }
}
