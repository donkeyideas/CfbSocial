import { NextRequest, NextResponse } from 'next/server';
import { runBotCycle } from '@/lib/admin/bots/engine';
import { updateBotMoods } from '@/lib/admin/bots/context-builder';
import { detectAndQueueEvents, consumeEventQueue } from '@/lib/admin/bots/event-detector';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  // Auth: CRON_SECRET or Vercel cron header
  const authHeader = request.headers.get('authorization');
  const vercelCron = request.headers.get('x-vercel-cron');

  if (!vercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Phase 1: Detect events and queue them (game state, portal, user mentions)
    const eventResult = await detectAndQueueEvents();

    // Phase 2: Update bot moods based on game results
    const moodResult = await updateBotMoods();

    // Phase 3: Consume event queue (event-driven reactions)
    const consumeResult = await consumeEventQueue();

    // Phase 4: Run ambient bot cycle (fills gaps when no events fire)
    const cycleResult = await runBotCycle();

    return NextResponse.json({
      ...cycleResult,
      eventsQueued: eventResult.queued,
      eventsConsumed: consumeResult.consumed,
      eventActions: consumeResult.actionsExecuted,
      moodsUpdated: moodResult.updated,
    });
  } catch (error) {
    console.error('Bot cron failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
