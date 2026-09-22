// ============================================================
// Blog post data access.
// Public reads use the anon client (RLS exposes only PUBLISHED posts).
// Admin writes use the service-role client (routes gate with requireAdmin).
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/admin/supabase/admin';
import { sanitizeBlogHtml } from './sanitize';

function anon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export interface BlogFaq {
  question: string;
  answer: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string | null;
  cover_image_url: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  post_type: 'MATCHUP' | 'GENERAL';
  home_school_id: string | null;
  away_school_id: string | null;
  matchup_slug: string | null;
  tags: string[];
  faqs: BlogFaq[];
  author_id: string | null;
  views: number;
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BlogListItem = Pick<
  BlogPost,
  'id' | 'slug' | 'title' | 'excerpt' | 'cover_image_url' | 'tags' | 'published_at' | 'post_type' | 'created_at'
>;

const LIST_COLUMNS = 'id, slug, title, excerpt, cover_image_url, tags, published_at, post_type, created_at';

/* ── Public reads ──────────────────────────────────────────────── */

export async function getPublishedPosts(opts?: { limit?: number; offset?: number }): Promise<BlogListItem[]> {
  const limit = opts?.limit ?? 12;
  const offset = opts?.offset ?? 0;
  const { data, error } = await anon()
    .from('blog_posts')
    .select(LIST_COLUMNS)
    .eq('status', 'PUBLISHED')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error || !data) return [];
  return data as unknown as BlogListItem[];
}

export async function countPublishedPosts(): Promise<number> {
  const { count } = await anon()
    .from('blog_posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'PUBLISHED');
  return count ?? 0;
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data } = await anon()
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'PUBLISHED')
    .maybeSingle();
  return (data as unknown as BlogPost) ?? null;
}

export async function getRelatedPosts(currentId: string, tags: string[], limit = 3): Promise<BlogListItem[]> {
  const c = anon();
  // Prefer posts that share a tag; backfill with newest.
  let related: BlogListItem[] = [];
  if (tags.length) {
    const { data } = await c
      .from('blog_posts')
      .select(LIST_COLUMNS)
      .eq('status', 'PUBLISHED')
      .neq('id', currentId)
      .overlaps('tags', tags)
      .order('published_at', { ascending: false })
      .limit(limit);
    related = (data as unknown as BlogListItem[]) ?? [];
  }
  if (related.length < limit) {
    const { data } = await c
      .from('blog_posts')
      .select(LIST_COLUMNS)
      .eq('status', 'PUBLISHED')
      .neq('id', currentId)
      .order('published_at', { ascending: false })
      .limit(limit + 3);
    const extra = ((data as unknown as BlogListItem[]) ?? []).filter(
      (p) => !related.some((r) => r.id === p.id),
    );
    related = [...related, ...extra].slice(0, limit);
  }
  return related;
}

export async function getAllPublishedSlugs(): Promise<Array<{ slug: string; updated_at: string }>> {
  const { data } = await anon()
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('status', 'PUBLISHED')
    .order('published_at', { ascending: false })
    .limit(1000);
  return (data as Array<{ slug: string; updated_at: string }>) ?? [];
}

export async function incrementViews(id: string): Promise<void> {
  try {
    await createAdminClient().rpc('increment_blog_views', { p_id: id });
  } catch {
    /* best-effort; RPC optional */
  }
}

/* ── Admin ─────────────────────────────────────────────────────── */

export async function adminListPosts(): Promise<BlogPost[]> {
  const { data } = await createAdminClient()
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  return (data as unknown as BlogPost[]) ?? [];
}

export async function adminGetPost(id: string): Promise<BlogPost | null> {
  const { data } = await createAdminClient().from('blog_posts').select('*').eq('id', id).maybeSingle();
  return (data as unknown as BlogPost) ?? null;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'post';
}

async function uniqueSlug(base: string): Promise<string> {
  const admin = createAdminClient();
  let slug = base;
  for (let i = 0; i < 20; i++) {
    const { data } = await admin.from('blog_posts').select('id').eq('slug', slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now()}`;
}

export interface AdminCreateInput {
  title: string;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  coverImageUrl?: string;
  tags?: string[];
  faqs?: BlogFaq[];
  postType?: 'MATCHUP' | 'GENERAL';
  homeSchoolId?: string | null;
  awaySchoolId?: string | null;
  matchupSlug?: string | null;
  authorId?: string | null;
  slug?: string;
  status?: 'DRAFT' | 'PUBLISHED';
}

export async function adminCreatePost(input: AdminCreateInput): Promise<BlogPost> {
  const admin = createAdminClient();
  const base = slugify(input.slug || input.title);
  const slug = await uniqueSlug(base);
  const status = input.status ?? 'DRAFT';
  const row = {
    slug,
    title: input.title,
    content: sanitizeBlogHtml(input.content),
    excerpt: input.excerpt ?? null,
    meta_title: input.metaTitle ?? null,
    meta_description: input.metaDescription ?? null,
    keywords: input.keywords ?? null,
    cover_image_url: input.coverImageUrl ?? null,
    tags: input.tags ?? [],
    faqs: input.faqs ?? [],
    post_type: input.postType ?? 'GENERAL',
    home_school_id: input.homeSchoolId ?? null,
    away_school_id: input.awaySchoolId ?? null,
    matchup_slug: input.matchupSlug ?? null,
    author_id: input.authorId ?? null,
    status,
    published_at: status === 'PUBLISHED' ? new Date().toISOString() : null,
  };
  const { data, error } = await admin.from('blog_posts').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as unknown as BlogPost;
}

export interface AdminUpdateInput {
  title?: string;
  content?: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  coverImageUrl?: string | null;
  tags?: string[];
  faqs?: BlogFaq[];
  featured?: boolean;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export async function adminUpdatePost(id: string, patch: AdminUpdateInput): Promise<BlogPost> {
  const admin = createAdminClient();
  const existing = await adminGetPost(id);
  if (!existing) throw new Error('Post not found');

  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.content !== undefined) update.content = sanitizeBlogHtml(patch.content);
  if (patch.excerpt !== undefined) update.excerpt = patch.excerpt;
  if (patch.metaTitle !== undefined) update.meta_title = patch.metaTitle;
  if (patch.metaDescription !== undefined) update.meta_description = patch.metaDescription;
  if (patch.keywords !== undefined) update.keywords = patch.keywords;
  if (patch.coverImageUrl !== undefined) update.cover_image_url = patch.coverImageUrl;
  if (patch.tags !== undefined) update.tags = patch.tags;
  if (patch.faqs !== undefined) update.faqs = patch.faqs;
  if (patch.featured !== undefined) update.featured = patch.featured;
  if (patch.status !== undefined) {
    update.status = patch.status;
    // stamp published_at on first publish
    if (patch.status === 'PUBLISHED' && !existing.published_at) {
      update.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await admin.from('blog_posts').update(update).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as unknown as BlogPost;
}

export async function adminDeletePost(id: string): Promise<void> {
  const { error } = await createAdminClient().from('blog_posts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
