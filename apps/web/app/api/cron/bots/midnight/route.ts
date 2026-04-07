import { NextRequest, NextResponse } from 'next/server';
import { resetDailyCounters } from '@/lib/admin/bots/context-builder';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const vercelCron = request.headers.get('x-vercel-cron');

  if (!vercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await resetDailyCounters();
    return NextResponse.json({ success: true, message: 'Daily counters reset' });
  } catch (error) {
    console.error('Midnight cron failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
