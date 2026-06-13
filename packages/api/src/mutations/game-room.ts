// ============================================================
// Game Room Mutations — Moments, Saves, Leagues
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateMomentInput, CreateLeagueInput, RequestSlotInput,
} from '@cfb-social/types';

/**
 * Create a Moment: a MOMENT post (with the screenshot as media) plus a
 * companion game_moments row holding the scorebug metadata.
 */
export async function createMoment(client: SupabaseClient, input: CreateMomentInput) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. The post (so the moment lives in the feed + reuses reactions/actions)
  const { data: post, error: postErr } = await client
    .from('posts')
    .insert({
      author_id: input.authorId ?? user.id,
      content: input.content ?? '',
      post_type: 'MOMENT',
      media_urls: input.imageUrls,
      school_id: input.schoolId ?? null,
      status: 'PUBLISHED',
    })
    .select('id')
    .single();
  if (postErr) throw postErr;

  // 2. The companion metadata
  const { data: moment, error: momErr } = await client
    .from('game_moments')
    .insert({
      post_id: post.id,
      save_id: input.saveId ?? null,
      school_id: input.schoolId ?? null,
      title: input.title ?? null,
      opponent: input.opponent ?? null,
      our_score: input.ourScore ?? null,
      opp_score: input.oppScore ?? null,
      week: input.week ?? null,
      season_label: input.seasonLabel ?? null,
      result: input.result ?? null,
      game_state: input.gameState ?? null,
      is_team_builder: input.isTeamBuilder ?? false,
      moment_tags: input.momentTags ?? [],
      game_version: input.gameVersion ?? 'CFB 27',
    })
    .select()
    .single();
  if (momErr) throw momErr;

  // 3. XP, fire-and-forget
  client.rpc('award_xp', {
    p_user_id: user.id,
    p_amount: 2,
    p_source: 'POST_CREATED',
    p_reference_id: post.id,
    p_description: 'Posted a Game Room moment',
  }).then(null, () => { /* ignore */ });

  return { postId: post.id as string, moment };
}

/** Update an existing moment: post content/images + scorebug metadata. */
export async function updateMoment(
  client: SupabaseClient,
  input: {
    postId: string;
    content?: string;
    mediaUrls?: string[];
    schoolId?: string | null;
    title?: string | null;
    opponent?: string | null;
    ourScore?: number | null;
    oppScore?: number | null;
    week?: string | null;
    result?: string | null;
    gameState?: string | null;
    isTeamBuilder?: boolean;
    momentTags?: string[];
  }
) {
  const postPatch: Record<string, unknown> = { is_edited: true, edited_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (input.content !== undefined) postPatch.content = input.content;
  if (input.mediaUrls !== undefined) postPatch.media_urls = input.mediaUrls;
  if (input.schoolId !== undefined) postPatch.school_id = input.schoolId;
  const { error: postErr } = await client.from('posts').update(postPatch).eq('id', input.postId);
  if (postErr) throw postErr;

  const momPatch: Record<string, unknown> = {};
  if (input.schoolId !== undefined) momPatch.school_id = input.schoolId;
  if (input.title !== undefined) momPatch.title = input.title;
  if (input.opponent !== undefined) momPatch.opponent = input.opponent;
  if (input.ourScore !== undefined) momPatch.our_score = input.ourScore;
  if (input.oppScore !== undefined) momPatch.opp_score = input.oppScore;
  if (input.week !== undefined) momPatch.week = input.week;
  if (input.result !== undefined) momPatch.result = input.result;
  if (input.gameState !== undefined) momPatch.game_state = input.gameState;
  if (input.isTeamBuilder !== undefined) momPatch.is_team_builder = input.isTeamBuilder;
  if (input.momentTags !== undefined) momPatch.moment_tags = input.momentTags;
  if (Object.keys(momPatch).length > 0) {
    const { error: momErr } = await client.from('game_moments').update(momPatch).eq('post_id', input.postId);
    if (momErr) throw momErr;
  }

  return { ok: true };
}

/**
 * Share a Magazine issue to the main Feed as an ISSUE post.
 * Idempotent: if the issue already has a live feed post, returns it.
 */
export async function shareIssueToFeed(client: SupabaseClient, issueId: string) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: issue, error: issueErr } = await client
    .from('game_room_issues')
    .select('id, owner_id, title, issue_number, cover_headline, cover_subtitle, cover_post_id, feed_post_id')
    .eq('id', issueId)
    .single();
  if (issueErr) throw issueErr;
  if (issue.owner_id !== user.id) throw new Error('Not your issue');

  // Already shared? Return the existing post if it's still published.
  if (issue.feed_post_id) {
    const { data: existing } = await client
      .from('posts')
      .select('id, status')
      .eq('id', issue.feed_post_id)
      .maybeSingle();
    if (existing && existing.status === 'PUBLISHED') return { postId: existing.id as string, alreadyShared: true };
  }

  // Resolve a cover image: the chosen cover, else the first page's first image.
  let coverUrl: string | null = null;
  if (issue.cover_post_id) {
    const { data: cp } = await client.from('posts').select('media_urls').eq('id', issue.cover_post_id).maybeSingle();
    coverUrl = (cp?.media_urls as string[] | null)?.[0] ?? null;
  }
  if (!coverUrl) {
    const { data: firstItem } = await client
      .from('game_room_issue_items')
      .select('post:post_id ( media_urls )')
      .eq('issue_id', issue.id)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle();
    const post = (firstItem as { post: { media_urls: string[] } | null } | null)?.post;
    coverUrl = post?.media_urls?.[0] ?? null;
  }

  const masthead = issue.title || 'Game Room Weekly';
  const headline = issue.cover_headline ? ` — ${issue.cover_headline}` : '';
  const content = `${masthead} · Issue No. ${issue.issue_number} is out${headline}`;

  const { data: post, error: postErr } = await client
    .from('posts')
    .insert({
      author_id: user.id,
      content,
      post_type: 'ISSUE',
      media_urls: coverUrl ? [coverUrl] : [],
      status: 'PUBLISHED',
    })
    .select('id')
    .single();
  if (postErr) throw postErr;

  const { error: linkErr } = await client
    .from('game_room_issues')
    .update({ feed_post_id: post.id })
    .eq('id', issue.id);
  if (linkErr) throw linkErr;

  return { postId: post.id as string, alreadyShared: false };
}

/**
 * Assign a moment (post) to an issue at a page; optionally set as cover.
 * Platform-agnostic: pass the admin client (web routes) or the user's client (mobile, RLS-gated).
 * A moment lives in ONE issue at a time. issueId null & no newIssueTitle => unassign.
 */
export async function assignMomentToIssue(
  client: SupabaseClient,
  ownerId: string,
  input: { postId: string; issueId?: string | null; newIssueTitle?: string | null; page?: number; isCover?: boolean }
) {
  const postId = input.postId;
  if (!postId) throw new Error('postId required');
  const page = Math.max(1, parseInt(String(input.page ?? 1), 10) || 1);
  const isCover = !!input.isCover;

  const { data: myIssues } = await client.from('game_room_issues').select('id').eq('owner_id', ownerId);
  const myIssueIds = (myIssues ?? []).map((r: Record<string, unknown>) => r.id as string);

  // Clear this post from the user's issues first (single-issue model)
  if (myIssueIds.length > 0) {
    await client.from('game_room_issue_items').delete().eq('post_id', postId).in('issue_id', myIssueIds);
    await client.from('game_room_issues').update({ cover_post_id: null }).eq('cover_post_id', postId).eq('owner_id', ownerId);
  }

  let issueId: string | null = input.issueId ?? null;
  const newIssueTitle = input.newIssueTitle?.toString().trim();

  if (newIssueTitle) {
    const { data: last } = await client.from('game_room_issues')
      .select('issue_number').eq('owner_id', ownerId).order('issue_number', { ascending: false }).limit(1).maybeSingle();
    const { data: created, error } = await client.from('game_room_issues')
      .insert({ owner_id: ownerId, issue_number: ((last?.issue_number as number) ?? 0) + 1, title: newIssueTitle.slice(0, 80), is_published: true })
      .select('id').single();
    if (error) throw error;
    issueId = created.id as string;
  } else if (issueId) {
    const { data: existing } = await client.from('game_room_issues').select('id, owner_id').eq('id', issueId).single();
    if (!existing || existing.owner_id !== ownerId) throw new Error('Not your issue.');
  }

  if (!issueId) return { ok: true, issueId: null };

  await client.from('game_room_issue_items').insert({ issue_id: issueId, post_id: postId, position: page, page_label: `Page ${page}` });
  if (isCover) await client.from('game_room_issues').update({ cover_post_id: postId }).eq('id', issueId);

  return { ok: true, issueId };
}

/**
 * Create or update an issue's settings (masthead + cover text + cover image).
 * Never touches issue items (pages are managed via assignMomentToIssue).
 */
export async function saveIssueSettings(
  client: SupabaseClient,
  ownerId: string,
  input: { issueId?: string | null; title?: string | null; coverHeadline?: string | null; coverSubtitle?: string | null; coverPostId?: string | null }
) {
  const title = ((input.title ?? '').toString().trim() || 'Game Room Weekly').slice(0, 80);
  const coverHeadline = input.coverHeadline ? String(input.coverHeadline).slice(0, 120) : null;
  const coverSubtitle = input.coverSubtitle ? String(input.coverSubtitle).slice(0, 200) : null;
  const coverPostId = input.coverPostId; // undefined = leave as is

  if (input.issueId) {
    const { data: existing } = await client.from('game_room_issues').select('id, owner_id').eq('id', input.issueId).single();
    if (!existing || existing.owner_id !== ownerId) throw new Error('Not your issue.');
    const patch: Record<string, unknown> = { title, cover_headline: coverHeadline, cover_subtitle: coverSubtitle };
    if (coverPostId !== undefined) patch.cover_post_id = coverPostId;
    await client.from('game_room_issues').update(patch).eq('id', input.issueId);
    return { ok: true, issueId: input.issueId };
  }

  const { data: last } = await client.from('game_room_issues')
    .select('issue_number').eq('owner_id', ownerId).order('issue_number', { ascending: false }).limit(1).maybeSingle();
  const { data: created, error } = await client.from('game_room_issues')
    .insert({ owner_id: ownerId, issue_number: ((last?.issue_number as number) ?? 0) + 1, title, cover_headline: coverHeadline, cover_subtitle: coverSubtitle, is_published: true })
    .select('id').single();
  if (error) throw error;
  return { ok: true, issueId: created.id as string };
}

/** Delete one of the owner's issues (its pages cascade via FK). */
export async function deleteIssue(client: SupabaseClient, ownerId: string, issueId: string) {
  const { data: existing } = await client.from('game_room_issues').select('id, owner_id').eq('id', issueId).single();
  if (!existing || existing.owner_id !== ownerId) throw new Error('Not your issue.');
  await client.from('game_room_issues').delete().eq('id', issueId);
  return { ok: true };
}

/** Approve/decline a league join request via the SECURITY DEFINER RPC (works on web + mobile). */
export async function resolveLeagueRequest(client: SupabaseClient, requestId: string, action: 'approve' | 'decline') {
  const { error } = await client.rpc('resolve_league_request', { p_request_id: requestId, p_action: action });
  if (error) throw error;
  return { ok: true };
}

/** Create a dynasty save. */
export async function createSave(
  client: SupabaseClient,
  input: { name: string; schoolId?: string | null; isTeamBuilder?: boolean; teamBuilderName?: string | null; currentYear?: number; currentSeasonLabel?: string | null; record?: string | null }
) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await client
    .from('dynasty_saves')
    .insert({
      owner_id: user.id,
      name: input.name,
      school_id: input.schoolId ?? null,
      is_team_builder: input.isTeamBuilder ?? false,
      team_builder_name: input.teamBuilderName ?? null,
      current_year: input.currentYear ?? 1,
      current_season_label: input.currentSeasonLabel ?? null,
      record: input.record ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** List a new online league. Commissioner is auto-added as a member. */
export async function createLeague(client: SupabaseClient, input: CreateLeagueInput) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: league, error } = await client
    .from('online_leagues')
    .insert({
      commissioner_id: user.id,
      name: input.name,
      platform: input.platform ?? 'PS5',
      max_users: input.maxUsers ?? 32,
      filled_count: 1,
      sim_schedule: input.simSchedule ?? null,
      style: input.style ?? 'COMPETITIVE',
      rules: input.rules ?? null,
      tags: input.tags ?? [],
      open_schools: input.openSchools ?? null,
      join_code: input.joinCode ?? null,
      join_password: input.joinPassword ?? null,
      is_private: input.isPrivate ?? false,
      cross_play: input.crossPlay ?? true,
      status: 'RECRUITING',
    })
    .select()
    .single();
  if (error) throw error;

  await client.from('league_members').insert({
    league_id: league.id,
    user_id: user.id,
    role: 'COMMISSIONER',
  });

  return league;
}

/** Request a slot in a league. */
export async function requestSlot(client: SupabaseClient, input: RequestSlotInput) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await client
    .from('league_requests')
    .insert({
      league_id: input.leagueId,
      user_id: user.id,
      preferred_school: input.preferredSchool ?? null,
      school_id: input.schoolId ?? null,
      platform: input.platform ?? null,
      message: input.message ?? null,
      status: 'PENDING',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Commissioner approves a request → adds the member, bumps the count. */
export async function approveRequest(client: SupabaseClient, requestId: string) {
  const { data: req, error: reqErr } = await client
    .from('league_requests')
    .update({ status: 'APPROVED', resolved_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();
  if (reqErr) throw reqErr;

  await client.from('league_members').insert({
    league_id: req.league_id,
    user_id: req.user_id,
    school_id: req.school_id ?? null,
    role: 'COACH',
  });

  await client.rpc('increment_league_filled', { p_league_id: req.league_id })
    .then(null, () => { /* optional RPC; safe to ignore if absent */ });

  return req;
}

/** Commissioner declines a request. */
export async function declineRequest(client: SupabaseClient, requestId: string) {
  const { data, error } = await client
    .from('league_requests')
    .update({ status: 'DECLINED', resolved_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
