/**
 * Single source of truth for which user-generated pages are worth indexing.
 *
 * Used by BOTH the sitemap (apps/web/app/sitemap.ts) and each page's
 * generateMetadata `robots` field so the two policies can never drift apart.
 *
 * Why this exists: the corpus is overwhelmingly bot-generated short takes.
 * Mass-indexing thin, auto-generated pages is exactly what Google's
 * "scaled content abuse" / helpful-content systems demote. So we concentrate
 * crawl budget on durable hubs (schools, matchups, conferences) and the small
 * amount of genuinely substantive human content, and noindex the rest.
 */

export const MIN_PROFILE_POSTS = 3;
export const MIN_INDEXABLE_CONTENT_LENGTH = 140;
export const MIN_INDEXABLE_REPLIES = 2;
export const MIN_INDEXABLE_VIEWS = 50;

/** Next.js metadata `robots` value for pages we want crawled-but-not-indexed. */
export const NOINDEX_ROBOTS = { index: false, follow: true } as const;

export interface IndexablePost {
  status?: string | null;
  removed_at?: string | null;
  post_type?: string | null;
  content?: string | null;
  media_urls?: string[] | null;
  reply_count?: number | null;
  view_count?: number | null;
  /** Joined author — `is_bot` must be present to evaluate non-moment posts. */
  author?: { is_bot?: boolean | null } | null;
}

/**
 * A post page is worth indexing when it carries durable, substantive content:
 *   - a MOMENT with an image (ranks in Google Images, evergreen), OR
 *   - a real (non-bot) author whose take has genuine substance or engagement.
 * Everything else (short bot takes, removed/unpublished) is noindex.
 */
export function isPostIndexable(post: IndexablePost): boolean {
  if (post.status && post.status !== 'PUBLISHED') return false;
  if (post.removed_at) return false;

  const hasImage = (post.media_urls?.length ?? 0) > 0;
  if (post.post_type === 'MOMENT' && hasImage) return true;

  // Non-moment takes must come from a real person. The author join is required;
  // if it's missing we treat the post as non-indexable rather than guess.
  if (post.author?.is_bot !== false) return false;

  const substantial = (post.content?.trim().length ?? 0) >= MIN_INDEXABLE_CONTENT_LENGTH;
  const engaged =
    (post.reply_count ?? 0) >= MIN_INDEXABLE_REPLIES ||
    (post.view_count ?? 0) >= MIN_INDEXABLE_VIEWS;
  return substantial || engaged;
}

export interface IndexableProfile {
  is_bot?: boolean | null;
  post_count?: number | null;
  status?: string | null;
}

/**
 * A profile is worth indexing only if it belongs to a real, active user who
 * has actually contributed content. Bot profiles are never indexed.
 */
export function isProfileIndexable(p: IndexableProfile): boolean {
  if (p.is_bot) return false;
  if (p.status && p.status !== 'ACTIVE') return false;
  return (p.post_count ?? 0) >= MIN_PROFILE_POSTS;
}
