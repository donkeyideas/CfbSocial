// ============================================================
// Game Room Queries — Moments, Saves, Leagues
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_LIMIT = 20;

const POST_EMBED = `
  post:post_id (
    id, content, media_urls, post_type, school_id, status, created_at,
    touchdown_count, fumble_count, reply_count, repost_count, bookmark_count,
    author:author_id ( id, username, display_name, avatar_url, dynasty_tier ),
    school:school_id ( id, name, abbreviation, slug, primary_color, secondary_color, logo_url )
  )
`;

/** Get a paginated list of moments (joined to their post + author + school). */
export async function getMoments(
  client: SupabaseClient,
  options: { schoolId?: string; saveId?: string; cursor?: string; limit?: number } = {}
) {
  const { schoolId, saveId, cursor, limit = DEFAULT_LIMIT } = options;

  let query = client
    .from('game_moments')
    .select(`*, ${POST_EMBED}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (schoolId) query = query.eq('school_id', schoolId);
  if (saveId) query = query.eq('save_id', saveId);
  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) throw error;
  // Only return moments whose post is still published
  return (data ?? []).filter((m: Record<string, unknown>) => {
    const post = m.post as Record<string, unknown> | null;
    return post && post.status === 'PUBLISHED';
  });
}

/** Get a single moment by its post id. */
export async function getMomentByPostId(client: SupabaseClient, postId: string) {
  const { data, error } = await client
    .from('game_moments')
    .select(`*, ${POST_EMBED}`)
    .eq('post_id', postId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Get a user's dynasty saves. */
export async function getSaves(client: SupabaseClient, ownerId: string) {
  const { data, error } = await client
    .from('dynasty_saves')
    .select(`*, school:school_id ( id, name, abbreviation, slug, primary_color, secondary_color, logo_url )`)
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Get open/recruiting online leagues, optionally filtered by a tag. */
export async function getLeagues(
  client: SupabaseClient,
  options: { tag?: string; status?: string; limit?: number } = {}
) {
  const { tag, status, limit = 50 } = options;
  let query = client
    .from('online_leagues')
    .select(`*, commissioner:commissioner_id ( id, username, display_name )`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);
  if (tag) query = query.contains('tags', [tag]);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Get a single league by id (with commissioner) for the public league page. */
export async function getLeagueById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('online_leagues')
    .select('*, commissioner:commissioner_id ( username, display_name )')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Get the latest published issue (optionally for a specific owner) with its pages. */
export async function getLatestIssue(client: SupabaseClient, ownerId?: string) {
  let q = client
    .from('game_room_issues')
    .select('*')
    .eq('is_published', true)
    .order('issue_number', { ascending: false })
    .limit(1);
  if (ownerId) q = q.eq('owner_id', ownerId);
  const { data: issue, error: issueErr } = await q.maybeSingle();
  if (issueErr) throw issueErr;
  if (!issue) return null;

  const { data: items, error: itemsErr } = await client
    .from('game_room_issue_items')
    .select(`
      *,
      post:post_id (
        id, content, media_urls, touchdown_count,
        author:author_id ( username, display_name ),
        school:school_id ( name, abbreviation, primary_color ),
        game_moment:game_moments ( title, opponent, our_score, opp_score, week, result, game_state, is_team_builder )
      )
    `)
    .eq('issue_id', issue.id)
    .order('position', { ascending: true });
  if (itemsErr) throw itemsErr;

  return { issue, items: items ?? [] };
}

/** Get ALL of an owner's issues, each with full page data (for the Magazine switcher). */
export async function getOwnerIssues(client: SupabaseClient, ownerId: string) {
  const { data: issues, error: issuesErr } = await client
    .from('game_room_issues')
    .select('*')
    .eq('owner_id', ownerId)
    .order('issue_number', { ascending: false });
  if (issuesErr) throw issuesErr;
  if (!issues || issues.length === 0) return [];

  const ids = issues.map((i) => i.id);
  const { data: items, error: itemsErr } = await client
    .from('game_room_issue_items')
    .select(`
      *,
      post:post_id (
        id, content, media_urls, touchdown_count, status,
        author:author_id ( username, display_name ),
        school:school_id ( name, abbreviation, primary_color ),
        game_moment:game_moments ( title, opponent, our_score, opp_score, week, result, game_state, is_team_builder )
      )
    `)
    .in('issue_id', ids)
    .order('position', { ascending: true });
  if (itemsErr) throw itemsErr;

  const byIssue: Record<string, unknown[]> = {};
  (items ?? []).forEach((it: Record<string, unknown>) => {
    // Skip pages whose moment was deleted/removed so they don't appear in the magazine.
    const post = it.post as Record<string, unknown> | null;
    if (!post || post.status !== 'PUBLISHED') return;
    const k = it.issue_id as string;
    (byIssue[k] ??= []).push(it);
  });

  return issues.map((issue) => ({ issue, items: byIssue[issue.id] ?? [] }));
}

/** Public "Newsstand": every published issue that has at least one live page, newest first.
 *  Returns lightweight cover cards (no full page bodies) for a browse grid. */
export async function getPublicIssues(client: SupabaseClient, opts: { limit?: number } = {}) {
  const limit = opts.limit ?? 60;
  const { data: issues, error } = await client
    .from('game_room_issues')
    .select('id, issue_number, title, cover_post_id, owner_id, owner:owner_id ( username, display_name )')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!issues || issues.length === 0) return [];

  const ids = issues.map((i) => i.id);
  const { data: items, error: itemsErr } = await client
    .from('game_room_issue_items')
    .select('issue_id, post_id, position, post:post_id ( media_urls, status, school:school_id ( abbreviation, primary_color ) )')
    .in('issue_id', ids)
    .order('position', { ascending: true });
  if (itemsErr) throw itemsErr;

  const byIssue: Record<string, Array<Record<string, unknown>>> = {};
  (items ?? []).forEach((it: Record<string, unknown>) => {
    const post = it.post as Record<string, unknown> | null;
    if (!post || post.status !== 'PUBLISHED' || !((post.media_urls as string[] | null)?.length)) return;
    (byIssue[it.issue_id as string] ??= []).push(it);
  });

  return issues
    .map((issue) => {
      const pages = byIssue[issue.id] ?? [];
      const coverItem = pages.find((p) => p.post_id === issue.cover_post_id) ?? pages[0];
      const coverPost = coverItem?.post as Record<string, unknown> | undefined;
      const school = coverPost?.school as Record<string, unknown> | null | undefined;
      const owner = issue.owner as { username?: string; display_name?: string | null } | null;
      return {
        id: issue.id as string,
        issueNumber: issue.issue_number as number,
        title: (issue.title as string | null) || 'Game Room Weekly',
        ownerUsername: owner?.username ?? null,
        ownerName: owner?.display_name ?? null,
        coverUrl: ((coverPost?.media_urls as string[] | undefined)?.[0]) ?? null,
        coverAccent: (school?.primary_color as string | null) ?? null,
        school: (school?.abbreviation as string | null) ?? null,
        pageCount: pages.length,
      };
    })
    .filter((m) => m.pageCount > 0 && m.coverUrl);
}

/** Public, read-only fetch of a single issue by its id (for the Newsstand reader route). */
export async function getPublicIssueById(client: SupabaseClient, id: string) {
  const { data: issue, error } = await client
    .from('game_room_issues')
    .select('*, owner:owner_id ( username, display_name )')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle();
  if (error) throw error;
  if (!issue) return null;

  const { data: items, error: itemsErr } = await client
    .from('game_room_issue_items')
    .select(`
      *,
      post:post_id (
        id, content, media_urls, touchdown_count, status,
        author:author_id ( username, display_name ),
        school:school_id ( name, abbreviation, primary_color ),
        game_moment:game_moments ( title, opponent, our_score, opp_score, week, result, game_state, is_team_builder )
      )
    `)
    .eq('issue_id', issue.id)
    .order('position', { ascending: true });
  if (itemsErr) throw itemsErr;

  const published = (items ?? []).filter((it: Record<string, unknown>) => {
    const post = it.post as Record<string, unknown> | null;
    return post && post.status === 'PUBLISHED';
  });
  return { issue, items: published };
}

/** Public, read-only fetch of the issue announced by a given Feed post (no owner gate). */
export async function getIssueByFeedPost(client: SupabaseClient, feedPostId: string) {
  const { data: issue, error: issueErr } = await client
    .from('game_room_issues')
    .select('*, owner:owner_id ( username, display_name )')
    .eq('feed_post_id', feedPostId)
    .maybeSingle();
  if (issueErr) throw issueErr;
  if (!issue) return null;

  const { data: items, error: itemsErr } = await client
    .from('game_room_issue_items')
    .select(`
      *,
      post:post_id (
        id, content, media_urls, touchdown_count, status,
        author:author_id ( username, display_name ),
        school:school_id ( name, abbreviation, primary_color ),
        game_moment:game_moments ( title, opponent, our_score, opp_score, week, result, game_state, is_team_builder )
      )
    `)
    .eq('issue_id', issue.id)
    .order('position', { ascending: true });
  if (itemsErr) throw itemsErr;

  const published = (items ?? []).filter((it: Record<string, unknown>) => {
    const post = it.post as Record<string, unknown> | null;
    return post && post.status === 'PUBLISHED';
  });
  return { issue, items: published };
}

/** Pending join requests across every league a commissioner runs (the inbox). */
export async function getCommissionerRequests(client: SupabaseClient, commissionerId: string) {
  const { data: leagues, error: lgErr } = await client
    .from('online_leagues')
    .select('id, name')
    .eq('commissioner_id', commissionerId);
  if (lgErr) throw lgErr;
  if (!leagues || leagues.length === 0) return [];

  const ids = leagues.map((l) => l.id);
  const { data: reqs, error: reqErr } = await client
    .from('league_requests')
    .select('*, applicant:user_id ( id, username, display_name, avatar_url, dynasty_tier )')
    .in('league_id', ids)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true });
  if (reqErr) throw reqErr;

  const nameById: Record<string, string> = {};
  leagues.forEach((l) => { nameById[l.id] = l.name; });
  return (reqs ?? []).map((r: Record<string, unknown>) => ({ ...r, league_name: nameById[r.league_id as string] }));
}

/** League ids the user belongs to (so members can see the join password). */
export async function getMyLeagueIds(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('league_members')
    .select('league_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((m: Record<string, unknown>) => m.league_id as string);
}

/** Get a user's issues with their page assignments (for the moment-assignment UI). */
export async function getUserIssues(client: SupabaseClient, ownerId: string) {
  const { data, error } = await client
    .from('game_room_issues')
    .select('id, issue_number, title, cover_post_id, cover_headline, cover_subtitle, items:game_room_issue_items ( post_id, position )')
    .eq('owner_id', ownerId)
    .order('issue_number', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Get pending join requests for a league (commissioner inbox). */
export async function getLeagueRequests(client: SupabaseClient, leagueId: string) {
  const { data, error } = await client
    .from('league_requests')
    .select(`*, applicant:user_id ( id, username, display_name, avatar_url, dynasty_tier, xp )`)
    .eq('league_id', leagueId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
