/**
 * Shared feed query field selections.
 * Used by both server-side FeedList and client-side FeedListClient
 * to avoid SELECT * and reduce payload ~40%.
 */

export const FEED_POST_SELECT = `
  id,
  created_at,
  author_id,
  school_id,
  content,
  post_type,
  status,
  touchdown_count,
  fumble_count,
  reply_count,
  repost_count,
  bookmark_count,
  parent_id,
  moderation_score,
  sideline_quarter,
  sideline_time,
  sideline_game,
  sideline_verified,
  media_urls,
  author:profiles!posts_author_id_fkey(
    id,
    username,
    display_name,
    avatar_url,
    school_id,
    dynasty_tier
  ),
  school:schools!posts_school_id_fkey(
    id,
    name,
    abbreviation,
    primary_color,
    secondary_color,
    logo_url,
    slug
  ),
  aging_takes(
    id,
    user_id,
    revisit_date,
    is_surfaced,
    community_verdict
  )
`.trim();

export const FEED_REPOST_SELECT = `
  id,
  created_at,
  user_id,
  post_id,
  reposter:profiles!reposts_user_id_fkey(
    username,
    display_name
  ),
  post:posts!reposts_post_id_fkey(
    ${FEED_POST_SELECT}
  )
`.trim();
