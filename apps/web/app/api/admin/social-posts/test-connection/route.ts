import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { testConnection } from '@/lib/admin/actions/social-posts';

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { platform } = await request.json();
    if (!platform) return NextResponse.json({ error: 'Missing platform' }, { status: 400 });

    const result = await testConnection(platform);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
