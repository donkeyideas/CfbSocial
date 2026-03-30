import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { bulkApproveDrafts } from '@/lib/admin/actions/social-posts';

export async function POST() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const result = await bulkApproveDrafts();
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true, count: result.count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
