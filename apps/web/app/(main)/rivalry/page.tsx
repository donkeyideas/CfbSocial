import { Suspense } from 'react';
import { RivalryCard } from '@/components/rivalry/RivalryCard';
import { ChallengeCard } from '@/components/rivalry/ChallengeCard';
import { CreateChallenge } from '@/components/rivalry/CreateChallenge';
import { RivalryTabs } from '@/components/rivalry/RivalryTabs';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'CFB Fan Debates | College Football Rivalries & School vs School',
  description: 'Debate college football rivalries and settle fan arguments once and for all. Pick sides in school-vs-school matchups, issue challenges, and let the community judge. The best CFB fan debates.',
  openGraph: {
    title: 'CFB Fan Debates & Rivalry Ring | CFB Social',
    description: 'Debate college football rivalries. Pick sides. Issue challenges. Let the community judge.',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'CFB Fan Debates & Rivalry Ring | CFB Social',
    description: 'Debate college football rivalries. Pick sides. Issue challenges. Let the community judge.',
  },
  alternates: {
    canonical: 'https://cfbsocial.com/rivalry',
  },
};

function RivalrySkeleton() {
  return (
    <div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="content-card" style={{ opacity: 0.5, marginBottom: 16 }}>
          <div className="post-user-row">
            <div className="skeleton" style={{ width: 38, height: 38, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: 160, height: 14, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: 100, height: 10 }} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="skeleton" style={{ width: '100%', height: 8, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface RivalryPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function RivalryPage({ searchParams }: RivalryPageProps) {
  const params = await searchParams;
  const tab = params.tab === 'challenges' ? 'challenges' : 'rivalries';

  return (
    <div>
      <div className="feed-header">
        <h1 className="feed-title">Rivalry Ring</h1>
        <Suspense>
          <RivalryTabs />
        </Suspense>
      </div>

      {tab === 'challenges' && <CreateChallenge />}

      <Suspense fallback={<RivalrySkeleton />}>
        {tab === 'rivalries' ? <RivalriesList /> : <ChallengesList />}
      </Suspense>
    </div>
  );
}

async function RivalriesList() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: rivalries, error } = await supabase
    .from('rivalries')
    .select(`
      *,
      school_1:school_1_id (
        id, name, abbreviation, primary_color, secondary_color, logo_url, mascot
      ),
      school_2:school_2_id (
        id, name, abbreviation, primary_color, secondary_color, logo_url, mascot
      )
    `)
    .in('status', ['UPCOMING', 'ACTIVE', 'VOTING'])
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !rivalries || rivalries.length === 0) {
    return (
      <div className="content-card" style={{ textAlign: 'center', padding: 32 }}>
        <p className="post-body" style={{ fontSize: '1.1rem' }}>
          No active rivalries right now.
        </p>
        <p style={{ color: 'var(--faded-ink)', fontSize: '0.85rem', marginTop: 8 }}>
          Check back during rivalry week for school vs school debates.
        </p>
      </div>
    );
  }

  return (
    <div>
      {rivalries.map((rivalry) => (
        <RivalryCard key={rivalry.id} rivalry={rivalry as never} />
      ))}
    </div>
  );
}

async function ChallengesList() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: challenges, error } = await supabase
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
    .in('status', ['PENDING', 'ACTIVE', 'VOTING', 'COMPLETED'])
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !challenges || challenges.length === 0) {
    return (
      <div className="content-card" style={{ textAlign: 'center', padding: 32 }}>
        <p className="post-body" style={{ fontSize: '1.1rem' }}>
          No challenges yet.
        </p>
        <p style={{ color: 'var(--faded-ink)', fontSize: '0.85rem', marginTop: 8 }}>
          Issue a challenge to start a head-to-head debate.
        </p>
      </div>
    );
  }

  return (
    <div>
      {challenges.map((challenge) => (
        <ChallengeCard key={challenge.id} challenge={challenge as never} />
      ))}
    </div>
  );
}
