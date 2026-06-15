import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MagazineFlip } from '@/components/game-room/MagazineFlip';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

type IssueRow = {
  id: string;
  issue_number: number;
  title: string | null;
  cover_headline: string | null;
  cover_subtitle: string | null;
  cover_post_id: string | null;
  owner: { username: string; display_name: string | null } | null;
};
type ItemRow = { id: string; post: { media_urls: string[]; content: string } | null };

async function load(id: string) {
  const { createClient } = await import('@/lib/supabase/server');
  const { getPublicIssueById } = await import('@cfb-social/api');
  const supabase = await createClient();
  return (await getPublicIssueById(supabase, id).catch(() => null)) as
    | { issue: IssueRow; items: ItemRow[] }
    | null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await load(id);
  if (!data) return { title: 'Magazine not found | CFB Social' };
  const { issue, items } = data;
  const masthead = issue.title || 'Game Room Weekly';
  const title = `${masthead} · Issue No. ${issue.issue_number} | CFB Social Game Room`;
  const desc = issue.cover_headline || `A College Football dynasty magazine from @${issue.owner?.username ?? 'a coach'} on CFB Social. Flip through the issue.`;
  const cover = (items.find((it) => it.post?.media_urls?.length)?.post?.media_urls?.[0]) ?? 'https://www.cfbsocial.com/logo.png';
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, images: [{ url: cover }] },
    twitter: { card: 'summary_large_image', title, description: desc, images: [cover] },
    alternates: { canonical: `https://www.cfbsocial.com/game-room/m/${id}` },
  };
}

export default async function PublicMagazinePage({ params }: PageProps) {
  const { id } = await params;
  const data = await load(id);
  if (!data || data.items.length === 0) notFound();
  const { issue, items } = data;
  const masthead = issue.title || 'Game Room Weekly';

  return (
    <div>
      <div className="feed-header">
        <Link className="gr-back-link" href="/game-room">&larr; Newsstand</Link>
        <h1 className="feed-title">{masthead}</h1>
        <p className="gr-public-byline">
          Issue No. {issue.issue_number}
          {issue.owner?.username ? <> · by <Link href={`/profile/${issue.owner.username}`}>@{issue.owner.username}</Link></> : null}
        </p>
      </div>

      <MagazineFlip
        issueNumber={issue.issue_number}
        items={items as never[]}
        title={issue.title}
        coverHeadline={issue.cover_headline}
        coverSubtitle={issue.cover_subtitle}
        coverPostId={issue.cover_post_id}
      />

      <div className="gr-public-foot">
        <Link className="gr-link-btn" href="/game-room">Make your own in the Game Room →</Link>
      </div>
    </div>
  );
}
