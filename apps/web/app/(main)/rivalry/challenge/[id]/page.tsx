import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChallengeDetail } from '@/components/rivalry/ChallengeDetail';

export const revalidate = 60;

interface ChallengePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ChallengePageProps) {
  const { id } = await params;
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data } = await supabase
    .from('challenges')
    .select('topic')
    .eq('id', id)
    .single();

  return { title: data?.topic ?? 'Challenge' };
}

export default async function ChallengeDetailPage({ params }: ChallengePageProps) {
  const { id } = await params;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/rivalry?tab=challenges"
          style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.8rem',
            color: 'var(--faded-ink)',
            textDecoration: 'none',
          }}
        >
          &larr; Back to Challenges
        </Link>
      </div>

      <Suspense fallback={<div className="content-card" style={{ opacity: 0.5, padding: 32 }}>Loading...</div>}>
        <ChallengeContent challengeId={id} />
      </Suspense>
    </div>
  );
}

async function ChallengeContent({ challengeId }: { challengeId: string }) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: challenge, error } = await supabase
    .from('challenges')
    .select(`
      *,
      challenger:profiles!challenges_challenger_id_fkey(
        id, username, display_name, avatar_url, school_id, dynasty_tier
      ),
      challenged:profiles!challenges_challenged_id_fkey(
        id, username, display_name, avatar_url, school_id, dynasty_tier
      )
    `)
    .eq('id', challengeId)
    .single();

  if (error || !challenge) notFound();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Check if user already voted
  let userVote: string | null = null;
  if (user) {
    const { data: vote } = await supabase
      .from('challenge_votes')
      .select('voted_for')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .maybeSingle();
    userVote = vote?.voted_for ?? null;
  }

  return (
    <ChallengeDetail
      challenge={challenge as never}
      currentUserId={user?.id ?? null}
      existingVote={userVote}
    />
  );
}
