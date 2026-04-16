// ============================================================
// Bot Event Detector
// Scans for real-world events and pushes them into bot_event_queue
// ============================================================

import { createAdminClient } from '@/lib/admin/supabase/admin';
import { getScoreboard } from '@/lib/providers/espn';

/**
 * Detect events from ESPN, portal, and user activity,
 * then push them into bot_event_queue.
 */
export async function detectAndQueueEvents(): Promise<{ queued: number }> {
  const supabase = createAdminClient();
  let queued = 0;

  // Get all schools that have bots
  const { data: botSchools } = await supabase
    .from('profiles')
    .select('school_id, school:schools!profiles_school_id_fkey(id, abbreviation, name)')
    .eq('is_bot', true)
    .eq('bot_active', true)
    .eq('status', 'ACTIVE');

  if (!botSchools?.length) return { queued: 0 };

  const schoolMap = new Map<string, { id: string; abbreviation: string; name: string }>();
  for (const bs of botSchools) {
    const school = Array.isArray(bs.school) ? bs.school[0] : bs.school;
    if (school && bs.school_id) {
      schoolMap.set(bs.school_id as string, school as { id: string; abbreviation: string; name: string });
    }
  }

  // 1. Detect live games and game finals
  const events = await getScoreboard();
  for (const event of events) {
    const comp = event.competitions[0];
    if (!comp) continue;

    const state = comp.status.type.state; // 'pre', 'in', 'post'
    const home = comp.competitors.find(c => c.homeAway === 'home');
    const away = comp.competitors.find(c => c.homeAway === 'away');
    if (!home || !away) continue;

    // Check if any bot school is playing
    for (const [schoolId, school] of schoolMap) {
      const isPlaying = home.team.abbreviation.toUpperCase() === school.abbreviation.toUpperCase() ||
        away.team.abbreviation.toUpperCase() === school.abbreviation.toUpperCase();
      if (!isPlaying) continue;

      const eventType = state === 'in' ? 'game_live' : state === 'post' ? 'game_final' : null;
      if (!eventType) continue;

      // Check if we already have this event queued recently (within 10 minutes)
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from('bot_event_queue')
        .select('id')
        .eq('event_type', eventType)
        .eq('school_id', schoolId)
        .gte('created_at', tenMinAgo)
        .eq('is_active', true)
        .limit(1);
      if (existing?.length) continue;

      const delay = eventType === 'game_live'
        ? { min: 30, max: 120 }
        : { min: 15, max: 180 };

      const scheduledDelay = delay.min + Math.floor(Math.random() * (delay.max - delay.min));
      const scheduledAt = new Date(Date.now() + scheduledDelay * 1000).toISOString();

      await supabase.from('bot_event_queue').insert({
        event_type: eventType,
        school_id: schoolId,
        payload: {
          espnId: event.id,
          homeTeam: home.team.displayName,
          awayTeam: away.team.displayName,
          homeScore: home.score,
          awayScore: away.score,
          clock: comp.status.displayClock,
          period: comp.status.period,
        },
        priority: eventType === 'game_final' ? 9 : 7,
        min_delay_seconds: delay.min,
        max_delay_seconds: delay.max,
        scheduled_at: scheduledAt,
      });
      queued++;
    }
  }

  // 2. Detect recent portal commits affecting bot schools
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: recentPortal } = await supabase
    .from('portal_players')
    .select('id, name, position, previous_school_id, committed_school_id')
    .gte('entered_portal_at', twoDaysAgo)
    .not('committed_school_id', 'is', null)
    .limit(20);

  if (recentPortal?.length) {
    for (const player of recentPortal) {
      const affectedSchools = [player.previous_school_id, player.committed_school_id].filter(Boolean) as string[];
      for (const schoolId of affectedSchools) {
        if (!schoolMap.has(schoolId)) continue;

        // Check existing
        const { data: existing } = await supabase
          .from('bot_event_queue')
          .select('id')
          .eq('event_type', 'portal_commit')
          .eq('school_id', schoolId)
          .contains('payload', { playerId: player.id })
          .eq('is_active', true)
          .limit(1);
        if (existing?.length) continue;

        const scheduledDelay = 120 + Math.floor(Math.random() * 480);
        await supabase.from('bot_event_queue').insert({
          event_type: 'portal_commit',
          school_id: schoolId,
          payload: {
            playerId: player.id,
            playerName: player.name,
            position: player.position,
            direction: player.committed_school_id === schoolId ? 'incoming' : 'outgoing',
          },
          priority: 5,
          min_delay_seconds: 120,
          max_delay_seconds: 600,
          scheduled_at: new Date(Date.now() + scheduledDelay * 1000).toISOString(),
        });
        queued++;
      }
    }
  }

  // 3. Detect user mentions of bot schools in recent posts
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recentUserPosts } = await supabase
    .from('posts')
    .select('id, content, school_id, author_id')
    .gte('created_at', fiveMinAgo)
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .limit(20);

  if (recentUserPosts?.length) {
    // Check if author is a bot - skip bot posts
    const { data: botIds } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_bot', true);
    const botIdSet = new Set((botIds ?? []).map(b => b.id as string));

    for (const post of recentUserPosts) {
      if (botIdSet.has(post.author_id as string)) continue;

      const content = (post.content as string).toLowerCase();
      for (const [schoolId, school] of schoolMap) {
        if (content.includes(school.name.toLowerCase()) || content.includes(school.abbreviation.toLowerCase())) {
          // Check existing
          const { data: existing } = await supabase
            .from('bot_event_queue')
            .select('id')
            .eq('event_type', 'user_mention')
            .eq('school_id', schoolId)
            .contains('payload', { postId: post.id })
            .eq('is_active', true)
            .limit(1);
          if (existing?.length) continue;

          const scheduledDelay = 60 + Math.floor(Math.random() * 240);
          await supabase.from('bot_event_queue').insert({
            event_type: 'user_mention',
            school_id: schoolId,
            payload: {
              postId: post.id,
              postContent: (post.content as string).slice(0, 200),
              authorId: post.author_id,
            },
            priority: 4,
            min_delay_seconds: 60,
            max_delay_seconds: 300,
            scheduled_at: new Date(Date.now() + scheduledDelay * 1000).toISOString(),
          });
          queued++;
        }
      }
    }
  }

  return { queued };
}

/**
 * Consume events from the queue and dispatch bot actions.
 */
export async function consumeEventQueue(): Promise<{ consumed: number; actionsExecuted: number }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Fetch ready events (cap at 2 per cycle — previously 5 — to prevent AI cost spikes)
  const { data: readyEvents } = await supabase
    .from('bot_event_queue')
    .select('*')
    .eq('is_active', true)
    .lte('scheduled_at', now)
    .gt('expires_at', now)
    .order('priority', { ascending: false })
    .limit(2);

  if (!readyEvents?.length) return { consumed: 0, actionsExecuted: 0 };

  let consumed = 0;
  let actionsExecuted = 0;

  for (const event of readyEvents) {
    // Find bots for this school that haven't consumed this event
    const consumedBy = (event.consumed_by as string[]) ?? [];

    const { data: eligibleBots } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('is_bot', true)
      .eq('bot_active', true)
      .eq('school_id', event.school_id)
      .eq('status', 'ACTIVE');

    if (!eligibleBots?.length) continue;

    const unconsumed = eligibleBots.filter(b => !consumedBy.includes(b.id));
    if (!unconsumed.length) {
      // All bots consumed, deactivate event
      await supabase.from('bot_event_queue').update({ is_active: false }).eq('id', event.id);
      continue;
    }

    // Pick 1 bot to act on this event (reduced from 2 to halve AI cost per event)
    const shuffled = unconsumed.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 1);

    for (const bot of selected) {
      try {
        // Import engine dynamically to avoid circular deps
        const { postBotTake, botReplyToPost, botReactToPosts } = await import('./engine');

        if (event.event_type === 'user_mention') {
          // Reply to the user's post
          const result = await botReplyToPost(bot.id);
          if (result.success) actionsExecuted++;
        } else {
          // Post a reaction take + react to posts
          const result = await postBotTake(bot.id);
          if (result.success) actionsExecuted++;
          await botReactToPosts(bot.id);
        }

        // Mark as consumed
        consumedBy.push(bot.id);
      } catch (err) {
        console.error(`[EVENT] Bot ${bot.username} failed on event ${event.id}:`, err);
      }
    }

    // Update consumed_by
    await supabase
      .from('bot_event_queue')
      .update({ consumed_by: consumedBy })
      .eq('id', event.id);

    consumed++;
  }

  return { consumed, actionsExecuted };
}
