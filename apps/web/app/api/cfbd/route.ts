import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';

export const runtime = 'nodejs';

/**
 * Reads CFBD recruiting / portal data from the `cfbd_cache` table, which is
 * refreshed once a day by /api/cron/cfbd. This route NEVER calls CFBD directly
 * — that keeps page loads fast and the CFBD monthly quota intact (the old
 * version called the upstream per request with an ineffective in-memory cache,
 * which exhausted the quota and left the widget showing a stale fallback).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (!type || !['recruiting', 'portal'].includes(type)) {
    return NextResponse.json(
      { error: 'Missing or invalid type param. Use ?type=recruiting or ?type=portal' },
      { status: 400 },
    );
  }

  const cacheHeaders = {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  };

  try {
    const supabase = createAdminClient();
    const { data: row } = await supabase
      .from('cfbd_cache')
      .select('data, fetched_at')
      .eq('id', type)
      .maybeSingle();

    return NextResponse.json(
      { data: row?.data ?? [], fetchedAt: row?.fetched_at ?? null, cached: true },
      { headers: cacheHeaders },
    );
  } catch (err) {
    console.error('[api/cfbd] read failed:', err);
    return NextResponse.json({ data: [], fetchedAt: null, cached: false });
  }
}
