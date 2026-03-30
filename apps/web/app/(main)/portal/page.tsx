import { Suspense } from 'react';
import { PortalCard } from '@/components/portal/PortalCard';
import { PortalFilters } from '@/components/portal/PortalFilters';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'College Football Transfer Portal Tracker | Portal Wire',
  description: 'Track every college football transfer portal entry and commitment across FBS. Filter by position, star rating, and status. Predict where players will land and claim recruits for your school.',
  openGraph: {
    title: 'College Football Transfer Portal Tracker | CFB Social',
    description: 'Track every CFB transfer portal entry. Filter by position, stars, and status.',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'College Football Transfer Portal Tracker | CFB Social',
    description: 'Track every CFB transfer portal entry. Filter by position, stars, and status.',
  },
  alternates: {
    canonical: 'https://cfbsocial.com/portal',
  },
};

function PortalSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="gridiron-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="skeleton" style={{ height: 48, width: 48, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 16, width: 160, marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 12, width: 220 }} />
          </div>
          <div className="skeleton" style={{ height: 24, width: 80, borderRadius: 2 }} />
        </div>
      ))}
    </div>
  );
}

interface PortalPageProps {
  searchParams: Promise<{ status?: string; position?: string; stars?: string }>;
}

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const params = await searchParams;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 className="section-headline" style={{ marginBottom: 4 }}>Portal Wire</h1>
        <p style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          Transfer Portal War Room &mdash; Track entries, predict commitments, file your claims
        </p>
      </div>

      <hr className="gridiron-divider" />

      <Suspense fallback={<PortalSkeleton />}>
        <PortalFilters />
        <PortalList
          status={params.status}
          position={params.position}
          stars={params.stars}
        />
      </Suspense>
    </div>
  );
}

async function PortalList({
  status,
  position,
  stars,
}: {
  status?: string;
  position?: string;
  stars?: string;
}) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  let query = supabase
    .from('portal_players')
    .select(`
      *,
      previous_school:schools!portal_players_previous_school_id_fkey(
        id, name, abbreviation, primary_color, logo_url
      ),
      committed_school:schools!portal_players_committed_school_id_fkey(
        id, name, abbreviation, primary_color, logo_url
      )
    `)
    .order('star_rating', { ascending: false })
    .order('entered_portal_at', { ascending: false })
    .limit(30);

  if (status) {
    query = query.eq('status', status);
  }

  if (position) {
    query = query.eq('position', position);
  }

  if (stars) {
    query = query.gte('star_rating', Number(stars));
  }

  const { data: players, error } = await query;

  if (error || !players || players.length === 0) {
    return (
      <div className="gridiron-card" style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          No portal activity right now
        </p>
        <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {status || position || stars
            ? 'Try adjusting your filters.'
            : 'Check back when the transfer window opens.'}
        </p>
      </div>
    );
  }

  // Group player counts by status for quick stats
  const inPortal = players.filter((p) => p.status === 'IN_PORTAL').length;
  const committed = players.filter((p) => p.status === 'COMMITTED').length;

  return (
    <div>
      {/* Quick stats */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 16,
          fontFamily: 'var(--sans)',
          fontSize: '0.75rem',
          letterSpacing: '0.5px',
          color: 'var(--text-secondary)',
        }}
      >
        <span><strong style={{ color: 'var(--gold)' }}>{inPortal}</strong> In Portal</span>
        <span><strong style={{ color: 'var(--success, #2d6a4f)' }}>{committed}</strong> Committed</span>
        <span><strong>{players.length}</strong> Total Shown</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {players.map((player) => (
          <PortalCard
            key={player.id}
            player={player as Parameters<typeof PortalCard>[0]['player']}
          />
        ))}
      </div>
    </div>
  );
}
