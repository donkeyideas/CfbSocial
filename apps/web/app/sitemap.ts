import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://www.cfbsocial.com';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // regenerate at most every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages (always included, no DB dependency)
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/feed`, lastModified: new Date(), changeFrequency: 'always', priority: 1.0 },
    { url: `${BASE_URL}/rivalry`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/portal`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/predictions`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/war-room`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE_URL}/mascot-wars`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/recruiting`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/dynasty`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/hall-of-fame`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.5 },
    { url: `${BASE_URL}/vault`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/delete-account`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    { url: `${BASE_URL}/schools`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ];

  // Conference hub pages
  const conferencePages: MetadataRoute.Sitemap = [
    'sec', 'big-ten', 'big-12', 'acc', 'pac-12', 'american',
    'sun-belt', 'conference-usa', 'mac', 'mountain-west', 'independents',
  ].map((conf) => ({
    url: `${BASE_URL}/conferences/${conf}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Dynamic pages from Supabase — wrapped in try/catch so the build
  // doesn't fail when Supabase is slow or unreachable.
  let schoolPages: MetadataRoute.Sitemap = [];
  let postPages: MetadataRoute.Sitemap = [];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const [schoolsResult, postsResult] = await Promise.all([
      supabase
        .from('schools')
        .select('slug, updated_at')
        .not('slug', 'is', null),
      supabase
        .from('posts')
        .select('id, created_at')
        .eq('status', 'PUBLISHED')
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(1000),
    ]);

    schoolPages = (schoolsResult.data ?? []).map((school) => ({
      url: `${BASE_URL}/school/${school.slug}`,
      lastModified: school.updated_at ? new Date(school.updated_at) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    postPages = (postsResult.data ?? []).map((post) => ({
      url: `${BASE_URL}/post/${post.id}`,
      lastModified: new Date(post.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (err) {
    console.warn('Sitemap: Supabase query failed, returning static pages only:', err);
  }

  return [...staticPages, ...conferencePages, ...schoolPages, ...postPages];
}
