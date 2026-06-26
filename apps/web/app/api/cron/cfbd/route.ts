import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';
import { getRecruiting, getPortal, CFBDQuotaError } from '@/lib/cfbd';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Daily CFBD refresh cron.
 *
 * Called once a day by Vercel cron. Fetches recruiting commits + transfer
 * portal entries and upserts them into `cfbd_cache`, which /api/cfbd (and thus
 * the Recruiting/Portal Wire sidebar) reads. This is the ONLY place that calls
 * the CFBD upstream, keeping us far under the free-tier monthly quota.
 *
 * On a quota error (429) we deliberately keep the existing cached row rather
 * than overwrite it with empty data, so the widget never goes blank.
 *
 * Schedule: 0 9 * * * (daily, see vercel.json)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const vercelCron = request.headers.get('x-vercel-cron');
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev && !vercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const result: Record<string, { updated: boolean; count: number; reason?: string }> = {};

  for (const [id, loader] of [
    ['recruiting', getRecruiting],
    ['portal', getPortal],
  ] as const) {
    try {
      const data = await loader();
      if (data.length === 0) {
        // Don't clobber a previously-good row with an empty fetch.
        result[id] = { updated: false, count: 0, reason: 'empty upstream' };
        continue;
      }
      const { error } = await supabase
        .from('cfbd_cache')
        .upsert({ id, data, fetched_at: new Date().toISOString() }, { onConflict: 'id' });
      if (error) {
        result[id] = { updated: false, count: data.length, reason: error.message };
      } else {
        result[id] = { updated: true, count: data.length };
      }
    } catch (err) {
      const reason = err instanceof CFBDQuotaError ? 'quota exceeded (kept last cache)' : String(err);
      console.warn(`[cron/cfbd] ${id}: ${reason}`);
      result[id] = { updated: false, count: 0, reason };
    }
  }

  return NextResponse.json({ ok: true, result });
}
