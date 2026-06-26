import { cache } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { PostCard } from '@/components/feed/PostCard';
import {
  SportsTeamJsonLd,
  BreadcrumbJsonLd,
  CollectionPageJsonLd,
} from '@/components/seo/JsonLd';
import {
  matchupSlug,
  parseMatchupSlug,
  findCuratedRivalry,
  curatedMatchupSlugs,
  matchupIntro,
  type MatchupSchool,
} from '@/lib/seo/matchups';
import { isPostIndexable, NOINDEX_ROBOTS } from '@/lib/seo/indexable';

export const revalidate = 3600;
export const dynamicParams = true; // allow non-curated pairs to render on demand (ISR)

const SCHOOL_FIELDS =
  'id, name, slug, conference, mascot, state, is_fbs, short_name, abbreviation, primary_color, secondary_color, logo_url';

const POST_SELECT = `
  *,
  author:profiles!posts_author_id_fkey(
    id, username, display_name, avatar_url, school_id, dynasty_tier, is_bot
  ),
  school:schools!posts_school_id_fkey(
    id, name, abbreviation, primary_color, secondary_color, logo_url, slug
  )
`;

interface MatchupPageProps {
  params: Promise<{ slug: string }>;
}

type LoadedSchool = MatchupSchool & Record<string, unknown>;

interface MatchupData {
  a: LoadedSchool;
  b: LoadedSchool;
  posts: Array<Record<string, unknown>>;
  indexablePostCount: number;
}

/**
 * Loads both schools + aggregated posts for a pair. Wrapped in React `cache()`
 * so generateMetadata and the page component (same request, same args) share a
 * single DB round-trip. Returns null when either school slug is invalid.
 */
const getMatchup = cache(async (slugA: string, slugB: string): Promise<MatchupData | null> => {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: schools } = await supabase.from('schools').select(SCHOOL_FIELDS).in('slug', [slugA, slugB]);
  const a = schools?.find((s) => s.slug === slugA) as LoadedSchool | undefined;
  const b = schools?.find((s) => s.slug === slugB) as LoadedSchool | undefined;
  if (!a || !b) return null;

  const { data: postsRaw } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .in('school_id', [a.id, b.id])
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(30);

  const posts = (postsRaw ?? []) as Array<Record<string, unknown>>;
  const indexablePostCount = posts.filter((p) =>
    isPostIndexable({
      status: p.status as string | null,
      removed_at: p.removed_at as string | null,
      post_type: p.post_type as string | null,
      content: p.content as string | null,
      media_urls: p.media_urls as string[] | null,
      reply_count: p.reply_count as number | null,
      view_count: p.view_count as number | null,
      author: (p.author as { is_bot?: boolean | null } | null) ?? null,
    }),
  ).length;

  return { a, b, posts, indexablePostCount };
});

/** Curated rivalries are always indexable; other pairs only once they earn it. */
function shouldIndexMatchup(a: MatchupSchool, b: MatchupSchool, indexablePostCount: number): boolean {
  return !!findCuratedRivalry(a.slug, b.slug) || indexablePostCount >= 3;
}

/** Pre-render the curated marquee rivalries at build time. */
export function generateStaticParams() {
  return curatedMatchupSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: MatchupPageProps) {
  const { slug } = await params;
  const pair = parseMatchupSlug(slug);
  if (!pair) return { title: 'Matchup', robots: NOINDEX_ROBOTS };

  const data = await getMatchup(pair[0], pair[1]);
  if (!data) return { title: 'Matchup', robots: NOINDEX_ROBOTS };
  const { a, b, indexablePostCount } = data;

  const rivalry = findCuratedRivalry(a.slug, b.slug);
  const seriesName = rivalry?.name;
  const canonical = `https://www.cfbsocial.com/matchup/${matchupSlug(a.slug, b.slug)}`;
  const title = seriesName
    ? `${seriesName}: ${a.name} vs ${b.name} Rivalry | CFB Social`
    : `${a.name} vs ${b.name} Rivalry — History, Takes & Debate | CFB Social`;
  const description = `${a.name} vs ${b.name} — the rivalry, the history, and the hottest fan takes. Pick a side, drop a prediction, and settle the debate on CFB Social.`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary' as const, title, description },
    alternates: { canonical },
    // Single source of truth for robots — overrides the root layout default so
    // there's exactly one robots tag (no index/noindex conflict).
    robots: shouldIndexMatchup(a, b, indexablePostCount) ? { index: true, follow: true } : NOINDEX_ROBOTS,
  };
}

export default async function MatchupPage({ params }: MatchupPageProps) {
  const { slug } = await params;
  const pair = parseMatchupSlug(slug);
  if (!pair) notFound();
  const [slugA, slugB] = pair;

  // Canonicalise to alphabetical slug order so each pair has one URL.
  const canonicalSlug = matchupSlug(slugA, slugB);
  if (slug !== canonicalSlug) redirect(`/matchup/${canonicalSlug}`);

  const data = await getMatchup(slugA, slugB);
  if (!data) notFound();
  const { a, b, posts } = data;

  const rivalry = findCuratedRivalry(a.slug, b.slug);
  const paragraphs = matchupIntro(a, b, rivalry);
  const heading = rivalry?.name ? rivalry.name : `${a.name} vs ${b.name} Rivalry`;
  const subheading = rivalry?.name
    ? `${a.name} vs ${b.name}`
    : `${a.conference}${a.conference === b.conference ? '' : ` vs ${b.conference}`}`;

  const canonicalUrl = `https://www.cfbsocial.com/matchup/${canonicalSlug}`;

  return (
    <>
      <CollectionPageJsonLd
        name={`${heading} — ${a.name} vs ${b.name}`}
        description={`${a.name} vs ${b.name} rivalry hub: history, fan takes, and live debate on CFB Social.`}
        url={canonicalUrl}
      />
      <SportsTeamJsonLd name={a.name} conference={a.conference} mascot={a.mascot ?? undefined} url={`https://www.cfbsocial.com/school/${a.slug}`} />
      <SportsTeamJsonLd name={b.name} conference={b.conference} mascot={b.mascot ?? undefined} url={`https://www.cfbsocial.com/school/${b.slug}`} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://www.cfbsocial.com' },
          { name: 'Rivalries', url: 'https://www.cfbsocial.com/rivalry' },
          { name: `${a.name} vs ${b.name}`, url: canonicalUrl },
        ]}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '1.25rem 0 0.5rem', flexWrap: 'wrap' }}>
        {[a, b].map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {i === 1 && <span style={{ fontFamily: 'var(--serif)', color: 'var(--faded-ink)', fontSize: '1.1rem' }}>vs</span>}
            <Link href={`/school/${s.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
              {s.logo_url ? (
                <span style={{ position: 'relative', width: 34, height: 34, flexShrink: 0 }}>
                  <Image src={s.logo_url as string} alt={`${s.name} logo`} fill style={{ objectFit: 'contain' }} sizes="34px" />
                </span>
              ) : null}
              <span style={{ fontFamily: 'var(--serif)', fontWeight: 700, color: 'var(--ink-dark)' }}>{s.name}</span>
            </Link>
          </div>
        ))}
      </div>

      <h1 style={{ fontFamily: 'var(--serif)', color: 'var(--ink-dark)', fontSize: '1.9rem', fontWeight: 700, margin: '0 0 0.25rem', lineHeight: 1.2 }}>
        {heading}
      </h1>
      <p style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--faded-ink)', margin: '0 0 1rem' }}>
        {subheading} Rivalry
      </p>

      {paragraphs.map((para, i) => (
        <p key={i} style={{ color: 'var(--faded-ink)', fontSize: '0.95rem', lineHeight: 1.65, margin: '0 0 0.85rem', maxWidth: '52rem' }}>
          {para}
        </p>
      ))}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '0.5rem 0 1.5rem' }}>
        <Link href={`/school/${a.slug}`} className="content-card" style={{ padding: '8px 14px', textDecoration: 'none', color: 'var(--ink-dark)', fontFamily: 'var(--serif)', fontWeight: 600 }}>
          {a.name} fan hub
        </Link>
        <Link href={`/school/${b.slug}`} className="content-card" style={{ padding: '8px 14px', textDecoration: 'none', color: 'var(--ink-dark)', fontFamily: 'var(--serif)', fontWeight: 600 }}>
          {b.name} fan hub
        </Link>
        <Link href="/feed" className="content-card" style={{ padding: '8px 14px', textDecoration: 'none', color: 'var(--crimson, #8b1a1a)', fontFamily: 'var(--serif)', fontWeight: 700 }}>
          Join the debate &rarr;
        </Link>
      </div>

      <h2 style={{ fontFamily: 'var(--serif)', color: 'var(--dark-brown)', fontSize: '1.25rem', margin: '0 0 0.75rem' }}>
        Latest {a.name} &amp; {b.name} takes
      </h2>
      {posts.length === 0 ? (
        <div className="content-card" style={{ padding: 24, textAlign: 'center', color: 'var(--faded-ink)' }}>
          No takes on this matchup yet. <Link href="/feed">Be the first to weigh in.</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id as string} post={post as never} />
          ))}
        </div>
      )}
    </>
  );
}
