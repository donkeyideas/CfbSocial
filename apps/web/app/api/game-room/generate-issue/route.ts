import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';

const ISSUE_SIZE = 10;
const RECENCY_DAYS = 14;

/** Start of the current ISO week (Monday 00:00 UTC). */
function weekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay();            // 0 Sun .. 6 Sat
  const sinceMonday = day === 0 ? 6 : day - 1;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - sinceMonday));
}

/**
 * Publish / refresh the Game Room Weekly issue.
 *  - Same week as the latest issue  -> refresh it in place (picks up new moments).
 *  - New week (or no issue yet)      -> create the next issue number.
 * Moments are ranked by reactions; prefers the last 14 days, falls back to all-time.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // 1. Candidate moments — recent first, then all-time fallback
  const since = new Date(Date.now() - RECENCY_DAYS * 86400000).toISOString();
  let { data: moments } = await admin
    .from('posts')
    .select('id, touchdown_count, created_at')
    .eq('post_type', 'MOMENT').eq('status', 'PUBLISHED')
    .gte('created_at', since)
    .order('touchdown_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(ISSUE_SIZE);

  if (!moments || moments.length < 3) {
    const { data: allTime } = await admin
      .from('posts')
      .select('id, touchdown_count, created_at')
      .eq('post_type', 'MOMENT').eq('status', 'PUBLISHED')
      .order('touchdown_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(ISSUE_SIZE);
    moments = allTime ?? [];
  }

  if (!moments || moments.length === 0) {
    return NextResponse.json({ error: 'No moments to feature yet. Post some first.' }, { status: 400 });
  }

  // 2. Latest issue — refresh if it's this week, otherwise start a new one
  const { data: latest } = await admin
    .from('game_room_issues')
    .select('id, issue_number, created_at')
    .order('issue_number', { ascending: false })
    .limit(1).maybeSingle();

  const thisWeek = latest && new Date(latest.created_at) >= weekStart();

  let issueId: string;
  let issueNumber: number;

  if (thisWeek && latest) {
    issueId = latest.id;
    issueNumber = latest.issue_number;
    await admin.from('game_room_issue_items').delete().eq('issue_id', issueId);
    await admin.from('game_room_issues')
      .update({ cover_post_id: moments[0]!.id, published_at: new Date().toISOString(), is_published: true })
      .eq('id', issueId);
  } else {
    issueNumber = (latest?.issue_number ?? 0) + 1;
    const { data: issue, error } = await admin
      .from('game_room_issues')
      .insert({ issue_number: issueNumber, title: 'Game Room Weekly', cover_post_id: moments[0]!.id, is_published: true })
      .select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    issueId = issue.id;
  }

  // 3. (Re)build the page list
  const items = moments.map((m, i) => ({
    issue_id: issueId,
    post_id: m.id,
    page_label: i === 0 ? 'Cover Story' : `Page ${i + 1}`,
    position: i,
  }));
  const { error: itemsErr } = await admin.from('game_room_issue_items').insert(items);
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, issueNumber, refreshed: !!thisWeek, pages: items.length });
}
