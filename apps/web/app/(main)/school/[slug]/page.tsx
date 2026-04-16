import { notFound } from 'next/navigation';
import { SchoolHub } from './SchoolHub';
import { SportsTeamJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { searchHighlights } from '@/lib/providers/youtube';

export const revalidate = 60;

interface SchoolPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SchoolPageProps) {
  const { slug } = await params;
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data } = await supabase
    .from('schools')
    .select('name, conference, mascot')
    .eq('slug', slug)
    .single();

  if (!data) return { title: 'School' };

  const mascotStr = data.mascot ? ` ${data.mascot}` : '';
  const title = `${data.name}${mascotStr} Fans -- Debates, Takes & Predictions | CFB Social`;
  const description = `Join ${data.name}${mascotStr} fans on CFB Social. Post hot takes, debate rivals, track recruiting and the transfer portal. College football's most passionate community.`;

  return {
    title,
    description,
    openGraph: {
      title: `${data.name} | CFB Social`,
      description,
    },
    alternates: {
      canonical: `https://www.cfbsocial.com/school/${slug}`,
    },
  };
}

export default async function SchoolPage({ params }: SchoolPageProps) {
  const { slug } = await params;
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  // Fetch school first (needed for dependent queries) — select only needed columns
  const { data: school, error } = await supabase
    .from('schools')
    .select('id, name, short_name, abbreviation, slug, conference, mascot, stadium, city, state, primary_color, secondary_color, logo_url, is_fbs')
    .eq('slug', slug)
    .single();

  if (error || !school) notFound();

  // Fetch all remaining data in PARALLEL (was 5 sequential queries)
  const [fanCountRes, postCountRes, postsRes, topFansRes, portalCountRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', school.id),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', school.id)
      .eq('status', 'PUBLISHED'),
    supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(
          id, username, display_name, avatar_url, school_id, dynasty_tier
        ),
        school:schools!posts_school_id_fkey(
          id, name, abbreviation, primary_color, secondary_color, logo_url, slug
        )
      `)
      .eq('school_id', school.id)
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('profiles')
      .select('username, display_name, xp, dynasty_tier, post_count')
      .eq('school_id', school.id)
      .order('xp', { ascending: false })
      .limit(10),
    supabase
      .from('portal_players')
      .select('id', { count: 'exact', head: true })
      .or(`previous_school_id.eq.${school.id},committed_school_id.eq.${school.id}`),
  ]);

  const fanCount = fanCountRes.count;
  const postCount = postCountRes.count;
  const posts = postsRes.data;
  const topFans = topFansRes.data;
  const portalCount = portalCountRes.count;

  // Fetch YouTube highlights — returns [] when YOUTUBE_API_KEY is missing
  const highlights = await searchHighlights(`${school.name} football`, 5).catch(() => []);

  return (
    <>
      <SportsTeamJsonLd
        name={school.name}
        conference={school.conference}
        mascot={school.mascot}
        url={`https://www.cfbsocial.com/school/${slug}`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://www.cfbsocial.com' },
          { name: 'Schools', url: 'https://www.cfbsocial.com/schools' },
          { name: school.name, url: `https://www.cfbsocial.com/school/${slug}` },
        ]}
      />
      <h1
        style={{
          fontFamily: 'var(--serif)',
          color: 'var(--ink-dark)',
          fontSize: '1.75rem',
          fontWeight: 700,
          margin: '1.5rem 0 0.5rem',
          lineHeight: 1.25,
        }}
      >
        {school.name} Football Fan Community
      </h1>
      <p
        style={{
          color: 'var(--faded-ink)',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          margin: '0 0 1.25rem',
          maxWidth: '52rem',
        }}
      >
        The {school.name}{school.mascot ? ` ${school.mascot}` : ''} community on CFB Social.
        {' '}Debate the {school.conference || 'conference'}, track {school.name}&apos;s recruiting class, file predictions, and talk trash to rival fans.
        {' '}College football&apos;s most passionate fan debates, all in one place.
      </p>
      <SchoolHub
        school={school}
        fanCount={fanCount ?? 0}
        postCount={postCount ?? 0}
        portalCount={portalCount ?? 0}
        posts={posts ?? []}
        topFans={topFans ?? []}
        highlights={highlights}
      />
    </>
  );
}
