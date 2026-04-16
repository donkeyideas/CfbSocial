import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { getAnalyticsData } from '@/lib/admin/actions/api-management';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start and end query params required' }, { status: 400 });
    }

    const data = await getAnalyticsData(startDate, endDate);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analytics fetch failed' },
      { status: 500 },
    );
  }
}
