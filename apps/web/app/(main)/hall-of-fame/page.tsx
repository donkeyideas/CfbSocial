import { Suspense } from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Hall of Fame',
};

export default function HallOfFamePage() {
  return (
    <div>
      <div className="feed-header">
        <h1 className="feed-title">Hall of Fame</h1>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--faded-ink)', marginTop: 4 }}>
          The all-time greats of CFB Social. Legends are made here.
        </p>
      </div>

      <Suspense fallback={<HofSkeleton />}>
        <HallOfFameContent />
      </Suspense>
    </div>
  );
}

function HofSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="content-card" style={{ padding: 24 }}>
          <div className="skeleton" style={{ width: 160, height: 18, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: '100%', height: 12, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '50%', height: 12 }} />
        </div>
      ))}
    </div>
  );
}

const TIER_COLORS: Record<string, string> = {
  WALK_ON: '#556b2f',
  STARTER: '#2d6a4f',
  ALL_CONFERENCE: '#0077b6',
  ALL_AMERICAN: '#7b2cbf',
  HEISMAN: '#b8860b',
  HALL_OF_FAME: '#8b0000',
};

const TIER_LABELS: Record<string, string> = {
  WALK_ON: 'Walk-On',
  STARTER: 'Starter',
  ALL_CONFERENCE: 'All-Conference',
  ALL_AMERICAN: 'All-American',
  HEISMAN: 'Heisman',
  HALL_OF_FAME: 'Hall of Fame',
};

async function HallOfFameContent() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  // Top users by XP
  const { data: topXP } = await supabase
    .from('profiles')
    .select('id, username, display_name, xp, level, dynasty_tier, post_count, touchdown_count, follower_count, school:schools!profiles_school_id_fkey(name, abbreviation, primary_color, slug)')
    .order('xp', { ascending: false })
    .limit(15);

  // Top by touchdowns received
  const { data: topTD } = await supabase
    .from('profiles')
    .select('id, username, display_name, touchdown_count, dynasty_tier, school:schools!profiles_school_id_fkey(name, abbreviation, primary_color, slug)')
    .order('touchdown_count', { ascending: false })
    .limit(10);

  // Top by followers
  const { data: topFollowed } = await supabase
    .from('profiles')
    .select('id, username, display_name, follower_count, dynasty_tier, school:schools!profiles_school_id_fkey(name, abbreviation, primary_color, slug)')
    .order('follower_count', { ascending: false })
    .limit(10);

  // Top by post count
  const { data: topPosters } = await supabase
    .from('profiles')
    .select('id, username, display_name, post_count, dynasty_tier, school:schools!profiles_school_id_fkey(name, abbreviation, primary_color, slug)')
    .order('post_count', { ascending: false })
    .limit(10);

  // Top by correct predictions
  const { data: topPredictors } = await supabase
    .from('profiles')
    .select('id, username, display_name, correct_predictions, prediction_count, dynasty_tier, school:schools!profiles_school_id_fkey(name, abbreviation, primary_color, slug)')
    .order('correct_predictions', { ascending: false })
    .limit(10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Dynasty Leaderboard */}
      <LeaderboardSection
        title="Dynasty Leaders"
        subtitle="All-time XP rankings"
        rows={(topXP ?? []).map((u, i) => ({
          rank: i + 1,
          username: u.username,
          displayName: u.display_name,
          value: `${(u.xp ?? 0).toLocaleString()} XP`,
          secondary: `Lvl ${u.level ?? 1}`,
          tier: u.dynasty_tier ?? 'WALK_ON',
          school: u.school as unknown as { name: string; abbreviation: string; primary_color: string; slug: string } | null,
        }))}
      />

      {/* Touchdown Leaders */}
      <LeaderboardSection
        title="Touchdown Leaders"
        subtitle="Most upvotes received"
        rows={(topTD ?? []).map((u, i) => ({
          rank: i + 1,
          username: u.username,
          displayName: u.display_name,
          value: `${(u.touchdown_count ?? 0).toLocaleString()} TD`,
          tier: u.dynasty_tier ?? 'WALK_ON',
          school: u.school as unknown as { name: string; abbreviation: string; primary_color: string; slug: string } | null,
        }))}
      />

      {/* Most Followed */}
      <LeaderboardSection
        title="Most Followed"
        subtitle="Top influencers on the platform"
        rows={(topFollowed ?? []).map((u, i) => ({
          rank: i + 1,
          username: u.username,
          displayName: u.display_name,
          value: `${(u.follower_count ?? 0).toLocaleString()} followers`,
          tier: u.dynasty_tier ?? 'WALK_ON',
          school: u.school as unknown as { name: string; abbreviation: string; primary_color: string; slug: string } | null,
        }))}
      />

      {/* Top Posters */}
      <LeaderboardSection
        title="Iron Men"
        subtitle="Most posts published"
        rows={(topPosters ?? []).map((u, i) => ({
          rank: i + 1,
          username: u.username,
          displayName: u.display_name,
          value: `${(u.post_count ?? 0).toLocaleString()} posts`,
          tier: u.dynasty_tier ?? 'WALK_ON',
          school: u.school as unknown as { name: string; abbreviation: string; primary_color: string; slug: string } | null,
        }))}
      />

      {/* Top Predictors */}
      <LeaderboardSection
        title="Oracle Board"
        subtitle="Best prediction records"
        rows={(topPredictors ?? []).map((u, i) => ({
          rank: i + 1,
          username: u.username,
          displayName: u.display_name,
          value: `${u.correct_predictions ?? 0}/${u.prediction_count ?? 0} correct`,
          tier: u.dynasty_tier ?? 'WALK_ON',
          school: u.school as unknown as { name: string; abbreviation: string; primary_color: string; slug: string } | null,
        }))}
      />
    </div>
  );
}

interface LeaderboardRow {
  rank: number;
  username: string;
  displayName: string | null;
  value: string;
  secondary?: string;
  tier: string;
  school: { name: string; abbreviation: string; primary_color: string; slug: string } | null;
}

function LeaderboardSection({ title, subtitle, rows }: { title: string; subtitle: string; rows: LeaderboardRow[] }) {
  const filtered = rows.filter((r) => r.value !== '0 TD' && r.value !== '0 followers' && r.value !== '0 posts' && r.value !== '0/0 correct' && r.value !== '0 XP');

  return (
    <div>
      <div className="content-card" style={{ padding: '14px 20px', marginBottom: 8 }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', fontWeight: 700 }}>{title}</h3>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'var(--faded-ink)', marginTop: 2 }}>{subtitle}</p>
      </div>

      {filtered.length === 0 ? (
        <div className="content-card" style={{ textAlign: 'center', padding: 20 }}>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--faded-ink)' }}>No entries yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map((row) => (
            <Link
              key={`${row.rank}-${row.username}`}
              href={`/profile/${row.username}`}
              className="content-card"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: row.rank <= 3 ? 'var(--crimson)' : 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: '0.8rem', fontWeight: 700,
                color: row.rank <= 3 ? '#fff' : 'var(--faded-ink)',
              }}>
                {row.rank}
              </div>

              {row.school && (
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  backgroundColor: row.school.primary_color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.5rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {row.school.abbreviation}
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.displayName ?? row.username}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700,
                    color: TIER_COLORS[row.tier] ?? '#556b2f',
                    fontFamily: 'var(--sans)', textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    {TIER_LABELS[row.tier] ?? row.tier}
                  </span>
                  {row.school && (
                    <span style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'var(--faded-ink)' }}>
                      {row.school.name}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', fontWeight: 700 }}>
                  {row.value}
                </div>
                {row.secondary && (
                  <div style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'var(--faded-ink)' }}>
                    {row.secondary}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
