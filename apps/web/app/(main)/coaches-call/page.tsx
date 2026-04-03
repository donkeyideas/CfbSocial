import { Suspense } from 'react';

export const metadata = {
  title: "Coach's Call",
};

export default function CoachesCallPage() {
  return (
    <div>
      <div className="feed-header">
        <h1 className="feed-title">Coach&apos;s Call</h1>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--faded-ink)', marginTop: 4 }}>
          Community polls and hot-seat debates. Cast your vote on the biggest decisions in CFB.
        </p>
      </div>

      <Suspense fallback={<CoachesCallSkeleton />}>
        <CoachesCallContent />
      </Suspense>
    </div>
  );
}

function CoachesCallSkeleton() {
  return (
    <div className="content-card" style={{ padding: 24 }}>
      <div className="skeleton" style={{ width: 200, height: 18, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '100%', height: 12, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '70%', height: 12 }} />
    </div>
  );
}

async function CoachesCallContent() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  // Fetch active rivalries as "debates"
  const { data: rivalries } = await supabase
    .from('rivalries')
    .select(`
      *,
      school_1:schools!rivalries_school_1_id_fkey(id, name, abbreviation, slug, primary_color, mascot),
      school_2:schools!rivalries_school_2_id_fkey(id, name, abbreviation, slug, primary_color, mascot)
    `)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });

  // Fetch recent prediction posts as "hot takes under review"
  const { data: hotTakes } = await supabase
    .from('posts')
    .select(`
      id, content, touchdown_count, fumble_count, created_at,
      author:profiles!posts_author_id_fkey(username, display_name, dynasty_tier),
      school:schools!posts_school_id_fkey(name, abbreviation, primary_color)
    `)
    .eq('post_type', 'PREDICTION')
    .eq('status', 'PUBLISHED')
    .order('touchdown_count', { ascending: false })
    .limit(10);

  const activeRivalries = rivalries ?? [];
  const topTakes = hotTakes ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Active Debates Section */}
      <div>
        <h2 style={{
          fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '1px',
          color: 'var(--crimson)', marginBottom: 12, paddingLeft: 4,
        }}>
          Active Debates
        </h2>

        {activeRivalries.length === 0 ? (
          <div className="content-card" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem' }}>No active debates right now.</p>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'var(--faded-ink)', marginTop: 8 }}>
              Check back soon for new community polls.
            </p>
          </div>
        ) : (
          activeRivalries.map((rivalry) => {
            const s1 = rivalry.school_1 as { id: string; name: string; abbreviation: string; primary_color: string; mascot: string } | null;
            const s2 = rivalry.school_2 as { id: string; name: string; abbreviation: string; primary_color: string; mascot: string } | null;
            const totalVotes = (rivalry.school_1_vote_count ?? 0) + (rivalry.school_2_vote_count ?? 0);
            const pct1 = totalVotes > 0 ? Math.round(((rivalry.school_1_vote_count ?? 0) / totalVotes) * 100) : 50;
            const pct2 = 100 - pct1;

            return (
              <a key={rivalry.id} href={`/rivalry/${rivalry.id}`} className="content-card" style={{ display: 'block', padding: '16px 20px', marginBottom: 10, textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>
                  {rivalry.name}
                </div>
                {rivalry.subtitle && (
                  <div style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--faded-ink)', marginBottom: 12 }}>
                    {rivalry.subtitle}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      backgroundColor: s1?.primary_color ?? '#555',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                    }}>
                      {s1?.abbreviation}
                    </div>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', fontWeight: 600 }}>
                      {s1?.name}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--faded-ink)' }}>VS</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', fontWeight: 600 }}>
                      {s2?.name}
                    </span>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      backgroundColor: s2?.primary_color ?? '#555',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                    }}>
                      {s2?.abbreviation}
                    </div>
                  </div>
                </div>
                {totalVotes > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--border)' }}>
                      <div style={{ width: `${pct1}%`, background: s1?.primary_color ?? 'var(--crimson)' }} />
                      <div style={{ width: `${pct2}%`, background: s2?.primary_color ?? 'var(--dark-brown)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--faded-ink)', marginTop: 4 }}>
                      <span>{pct1}%</span>
                      <span>{totalVotes} votes</span>
                      <span>{pct2}%</span>
                    </div>
                  </div>
                )}
              </a>
            );
          })
        )}
      </div>

      {/* Top Predictions / Hot Takes */}
      <div>
        <h2 style={{
          fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '1px',
          color: 'var(--crimson)', marginBottom: 12, paddingLeft: 4,
        }}>
          Hottest Predictions
        </h2>

        {topTakes.length === 0 ? (
          <div className="content-card" style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'var(--faded-ink)' }}>
              No predictions yet. Be the first to make a bold call.
            </p>
          </div>
        ) : (
          topTakes.map((take) => {
            const author = take.author as unknown as { username: string; display_name: string | null; dynasty_tier: string } | null;
            const school = take.school as unknown as { name: string; abbreviation: string; primary_color: string } | null;
            return (
              <a key={take.id} href={`/post/${take.id}`} className="content-card" style={{ display: 'block', padding: '12px 20px', marginBottom: 8, textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {school && (
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                      backgroundColor: school.primary_color, padding: '1px 6px',
                      borderRadius: 3, fontFamily: 'var(--sans)',
                    }}>
                      {school.abbreviation}
                    </span>
                  )}
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', fontWeight: 600 }}>
                    {author?.display_name ?? author?.username}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--faded-ink)' }}>
                    {new Date(take.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                  {take.content}
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--faded-ink)' }}>
                  <span>TD {take.touchdown_count}</span>
                  <span>FMB {take.fumble_count}</span>
                </div>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}
