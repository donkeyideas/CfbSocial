import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';
import { aiChatWithRetry } from '@/lib/admin/ai/deepseek';
import { sendPushToAudience } from '@/lib/firebase/send';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Auto-broadcast cron endpoint.
 * Called every hour by Vercel cron. Checks admin_settings to see if
 * auto-broadcast is enabled and whether enough time has passed since the
 * last broadcast. If so, generates AI content and sends to all users.
 *
 * Schedule: 0 * * * * (every hour — the interval setting gates actual sends)
 */
export async function GET(request: NextRequest) {
  // Auth: CRON_SECRET, Vercel cron header, or dev mode bypass
  const authHeader = request.headers.get('authorization');
  const vercelCron = request.headers.get('x-vercel-cron');
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev && !vercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Respond immediately, do heavy work in after()
  after(async () => {
    try {
      await runAutoBroadcast();
    } catch (err) {
      console.error('[auto-broadcast] Fatal error:', err);
    }
  });

  return NextResponse.json({ queued: true });
}

async function runAutoBroadcast() {
  const supabase = createAdminClient();

  // --- 1. Check if auto-broadcast is enabled ---
  const { data: settingsRows } = await supabase
    .from('admin_settings')
    .select('key, value')
    .in('key', ['auto_broadcast_enabled', 'auto_broadcast_interval_hours']);

  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) {
    settings[row.key as string] = row.value as string;
  }

  if (settings.auto_broadcast_enabled !== 'true') {
    console.log('[auto-broadcast] Disabled, skipping.');
    return;
  }

  const intervalHours = parseInt(settings.auto_broadcast_interval_hours || '12', 10);
  if (intervalHours < 1) return;

  // --- 2. Check last broadcast time ---
  const { data: lastBroadcast } = await supabase
    .from('system_notifications')
    .select('created_at')
    .eq('target_audience', 'all')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lastBroadcast) {
    const lastTime = new Date(lastBroadcast.created_at).getTime();
    const now = Date.now();
    const hoursSinceLast = (now - lastTime) / (1000 * 60 * 60);

    if (hoursSinceLast < intervalHours) {
      console.log(
        `[auto-broadcast] Only ${hoursSinceLast.toFixed(1)}h since last broadcast, need ${intervalHours}h. Skipping.`
      );
      return;
    }
  }

  // --- 3. Get previous broadcasts to avoid duplicates ---
  const { data: previousBroadcasts } = await supabase
    .from('system_notifications')
    .select('title, body')
    .eq('target_audience', 'all')
    .order('created_at', { ascending: false })
    .limit(20);

  const previousList = (previousBroadcasts ?? [])
    .map((b, i) => `${i + 1}. "${b.title}" - ${(b.body || '').slice(0, 80)}`)
    .join('\n');

  // --- 4. Generate AI content ---
  const systemPrompt = `You are a community manager for CFB Social, the college football fan community. Users post takes, debate rivalries, file predictions, track the transfer portal, and build their dynasty.

Generate a short, engaging system broadcast notification to keep fans excited and active.

Rules:
- Title: 5-10 words max, catchy and direct
- Body: 1-2 sentences max, 20-40 words
- Tone: energetic, competitive, passionate — like a sports broadcaster or CFB analyst
- Never use markdown formatting (no **, --, ###, *, etc.)
- Never use emojis
- Mix up topics: rivalry debates, transfer portal moves, prediction challenges, game day hype, dynasty rankings, community milestones
- Each broadcast must be completely unique and different from previous ones
- Stay on-brand: college football culture, fan passion, school pride

Return ONLY valid JSON: {"title": "...", "body": "..."}`;

  const userPrompt = previousList
    ? `Here are the previous broadcasts (DO NOT repeat any of these themes or phrasings):\n${previousList}\n\nGenerate a completely new and different broadcast.`
    : 'Generate an engaging broadcast for our college football fan community.';

  const raw = await aiChatWithRetry(userPrompt, {
    feature: 'auto_broadcast',
    subType: 'broadcast_generation',
    temperature: 1.0,
    maxTokens: 200,
    systemPrompt,
  });

  if (!raw) {
    console.error('[auto-broadcast] AI generation returned null');
    return;
  }

  let title = '';
  let body = '';
  try {
    const parsed = JSON.parse(raw);
    title = parsed.title || '';
    body = parsed.body || '';
  } catch {
    const titleMatch = raw.match(/"title"\s*:\s*"([^"]+)"/);
    const bodyMatch = raw.match(/"body"\s*:\s*"([^"]+)"/);
    title = titleMatch?.[1] || 'Time to Talk Football';
    body = bodyMatch?.[1] || 'The press box is buzzing. Drop your hottest take and join the conversation today.';
  }

  // Clean up any markdown artifacts
  title = title.replace(/[*#_~`>-]{2,}/g, '').trim();
  body = body.replace(/[*#_~`>-]{2,}/g, '').trim();

  if (!title || !body) {
    console.error('[auto-broadcast] Empty title or body after cleanup');
    return;
  }

  // --- 5. Create system notification record ---
  const { data: sysNotif, error: insertError } = await supabase
    .from('system_notifications')
    .insert({
      title,
      body,
      target_audience: 'all',
      target_id: null,
      created_by: null, // System-generated, no admin actor
      status: 'sending',
    })
    .select()
    .single();

  if (insertError || !sysNotif) {
    console.error('[auto-broadcast] Insert error:', insertError);
    return;
  }

  // --- 6. Create in-app notifications for all users ---
  const { data: allUsers } = await supabase.from('profiles').select('id');

  if (!allUsers || allUsers.length === 0) {
    console.log('[auto-broadcast] No users found, skipping.');
    return;
  }

  // Batch insert in-app notifications (max 1000 at a time)
  for (let i = 0; i < allUsers.length; i += 1000) {
    const batch = allUsers.slice(i, i + 1000).map((u) => ({
      recipient_id: u.id,
      type: 'SYSTEM',
      data: { message: body, title, system_notification_id: sysNotif.id },
    }));
    await supabase.from('notifications').insert(batch);
  }

  // --- 7. Send push notifications ---
  const result = await sendPushToAudience(
    { title, body, data: { type: 'SYSTEM' } },
    {
      systemNotificationId: sysNotif.id,
      targetAudience: 'all',
    }
  );

  // --- 8. Update system notification with results ---
  await supabase
    .from('system_notifications')
    .update({
      status: 'sent',
      sent_count: result.sent,
      failed_count: result.failed,
      sent_at: new Date().toISOString(),
    })
    .eq('id', sysNotif.id);

  console.log(
    `[auto-broadcast] Sent "${title}" to ${allUsers.length} users (push: ${result.sent} ok, ${result.failed} failed)`
  );
}
