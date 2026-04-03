import { Suspense } from 'react';
import { PredictionCard } from '@/components/predictions/PredictionCard';
import { CreatePrediction } from '@/components/predictions/CreatePrediction';
import { PredictionLeaderboard } from '@/components/predictions/PredictionLeaderboard';

export const revalidate = 60;

export const metadata = {
  title: 'College Football Predictions | File Takes & Track Your Record',
  description: 'Make college football predictions and put your takes on record. Track prediction accuracy, see the leaderboard, and collect receipts when you are right. The CFB predictions tracker.',
  openGraph: {
    title: 'College Football Predictions | CFB Social',
    description: 'File college football predictions and track your record. Receipts or busts — history will judge.',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'College Football Predictions | CFB Social',
    description: 'File college football predictions and track your record. Receipts or busts — history will judge.',
  },
  alternates: {
    canonical: 'https://cfbsocial.com/predictions',
  },
};

interface PredictionsPageProps {
  searchParams: Promise<{ tab?: string; result?: string; category?: string }>;
}

export default async function PredictionsPage({ searchParams }: PredictionsPageProps) {
  const params = await searchParams;
  const activeTab = params.tab === 'leaderboard' ? 'leaderboard' : 'predictions';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 className="section-headline" style={{ marginBottom: 4 }}>Predictions</h1>
        <p style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          Put your takes on record. Receipts or busts &mdash; history will judge.
        </p>
      </div>

      <hr className="gridiron-divider" />

      {/* Tabs */}
      <PredictionTabs activeTab={activeTab} />

      {activeTab === 'leaderboard' ? (
        <Suspense fallback={<LoadingSkeleton />}>
          <LeaderboardSection />
        </Suspense>
      ) : (
        <>
          <CreatePrediction />
          <Suspense fallback={<LoadingSkeleton />}>
            <PredictionsList result={params.result} category={params.category} />
          </Suspense>
        </>
      )}
    </div>
  );
}

function PredictionTabs({ activeTab }: { activeTab: string }) {
  return (
    <div className="feed-tabs" style={{ marginBottom: 16 }}>
      <a
        href="/predictions"
        className={`feed-tab ${activeTab === 'predictions' ? 'active' : ''}`}
        style={{ textDecoration: 'none' }}
      >
        All Predictions
      </a>
      <a
        href="/predictions?tab=leaderboard"
        className={`feed-tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
        style={{ textDecoration: 'none' }}
      >
        Leaderboard
      </a>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="gridiron-card" style={{ padding: 16 }}>
          <div className="skeleton" style={{ height: 16, width: 200, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 12, width: '100%', marginBottom: 4 }} />
          <div className="skeleton" style={{ height: 12, width: '70%' }} />
        </div>
      ))}
    </div>
  );
}

async function PredictionsList({
  result,
  category,
}: {
  result?: string;
  category?: string;
}) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  let query = supabase
    .from('predictions')
    .select(`
      *,
      user:predictions_user_id_fkey(
        id, username, display_name, avatar_url, dynasty_tier
      ),
      post:predictions_post_id_fkey(
        id, content, created_at, touchdown_count, fumble_count
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  if (result) {
    query = query.eq('result', result);
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data: predictions, error } = await query;

  if (error || !predictions || predictions.length === 0) {
    return (
      <div className="gridiron-card" style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          No predictions filed yet
        </p>
        <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Be the first to put your take on record.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {predictions.map((pred) => (
        <PredictionCard
          key={pred.id}
          prediction={pred as Parameters<typeof PredictionCard>[0]['prediction']}
        />
      ))}
    </div>
  );
}

async function LeaderboardSection() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: users } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, dynasty_tier, correct_predictions, prediction_count')
    .gt('prediction_count', 0)
    .order('correct_predictions', { ascending: false })
    .limit(20);

  return (
    <div className="gridiron-card" style={{ padding: 20 }}>
      <PredictionLeaderboard users={(users ?? []) as Parameters<typeof PredictionLeaderboard>[0]['users']} />
    </div>
  );
}
