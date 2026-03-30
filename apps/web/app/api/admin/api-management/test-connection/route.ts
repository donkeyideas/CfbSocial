import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { testProviderConnection } from '@/lib/admin/actions/api-management';

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { provider } = await request.json();
    if (!provider) return NextResponse.json({ error: 'Missing provider' }, { status: 400 });
    const result = await testProviderConnection(provider);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
