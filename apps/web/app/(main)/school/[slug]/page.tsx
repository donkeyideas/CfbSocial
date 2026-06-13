import Link from 'next/link';
import Image from 'next/image';
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
  const { getMoments } = await import('@cfb-social/api');
  const [fanCountRes, postCountRes, postsRes, topFansRes, portalCountRes, momentsData] = await Promise.all([
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
      .select('username, display_name, avatar_url, xp, dynasty_tier, post_count')
      .eq('school_id', school.id)
      .order('xp', { ascending: false })
      .limit(10),
    supabase
      .from('portal_players')
      .select('id', { count: 'exact', head: true })
      .or(`previous_school_id.eq.${school.id},committed_school_id.eq.${school.id}`),
    getMoments(supabase, { schoolId: school.id, limit: 12 }).catch(() => []),
  ]);

  const fanCount = fanCountRes.count;
  const postCount = postCountRes.count;
  const posts = postsRes.data;
  const topFans = topFansRes.data;
  const portalCount = portalCountRes.count;

  // Fetch YouTube highlights — returns [] when YOUTUBE_API_KEY is missing
  const highlights = await searchHighlights(`${school.name} football`, 5).catch(() => []);

  // Game Room moments for this school (long-tail "<school> College Football 26 dynasty")
  type GMItem = {
    id: string; title: string | null; opponent: string | null; our_score: number | null; opp_score: number | null; week: string | null;
    post: { id: string; media_urls: string[]; content: string } | null;
  };
  const moments = ((momentsData as GMItem[]) ?? []).filter((m) => m.post && m.post.media_urls?.length > 0).slice(0, 8);

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

      {moments.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontFamily: 'var(--serif)', color: 'var(--dark-brown)', fontSize: '1.25rem', marginBottom: 4 }}>
            {school.name} College Football 26 Dynasty Moments
          </h2>
          <p style={{ color: 'var(--faded-ink)', fontSize: '0.9rem', lineHeight: 1.55, marginBottom: 14, maxWidth: '52rem' }}>
            Screenshots and dynasty moments {school.name} fans shared from EA Sports College Football 26. Post your own in the{' '}
            <Link href="/game-room">Game Room</Link>.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {moments.map((m) => {
              const score = m.our_score != null && m.opp_score != null ? ` ${m.our_score}-${m.opp_score}` : '';
              const vs = m.opponent ? ` vs ${m.opponent}` : '';
              const alt = `${school.name} College Football 26 dynasty moment${vs}${score}${m.week ? ` (${m.week})` : ''}`;
              return (
                <Link key={m.id} href={`/post/${m.post!.id}`} style={{ textDecoration: 'none', color: 'inherit', border: '1px solid var(--tan)', borderRadius: 6, overflow: 'hidden', background: 'var(--warm-white, var(--cream))' }}>
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#120a1f' }}>
                    <Image src={m.post!.media_urls[0]!} alt={alt} fill style={{ objectFit: 'cover' }} sizes="(max-width: 700px) 50vw, 240px" quality={85} />
                  </div>
                  <div style={{ padding: '8px 10px', fontFamily: 'var(--serif)', fontSize: '0.85rem', color: 'var(--ink)', lineHeight: 1.3 }}>
                    {m.title || `${school.name}${vs}${score}` || 'Dynasty moment'}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
