import { NextRequest, NextResponse } from 'next/server';
import { triggerBotPost } from '@/lib/admin/actions/bots';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  // Auth: require CRON_SECRET header or admin session
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    const { requireAdmin } = await import('@/lib/admin/auth-guard');
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;
  }

  const { botIds } = await request.json() as { botIds: string[] };
  if (!botIds?.length) {
    return NextResponse.json({ error: 'botIds array required' }, { status: 400 });
  }

  const results: { botId: string; postId?: string; error?: string }[] = [];

  for (const botId of botIds) {
    try {
      const result = await triggerBotPost(botId);
      results.push({ botId, ...result });
    } catch (e) {
      results.push({ botId, error: e instanceof Error ? e.message : String(e) });
    }
    // Small delay between posts
    await new Promise(r => setTimeout(r, 2000));
  }

  return NextResponse.json({ results });
}
