import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { saveAutomationConfig } from '@/lib/admin/actions/social-posts';

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const config = await request.json();
    const result = await saveAutomationConfig(config);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
