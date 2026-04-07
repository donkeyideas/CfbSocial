import { RecruitingClient } from './RecruitingClient';

export const revalidate = 300; // revalidate every 5 minutes

export const metadata = {
  title: 'College Football Recruiting | Transfer Portal Activity by School',
  description: 'Track college football recruiting and transfer portal activity across all FBS programs. See which schools are gaining and losing players, view star ratings, and monitor recruiting heat maps.',
  openGraph: {
    title: 'College Football Recruiting | CFB Social',
    description: 'Transfer portal activity and recruiting intelligence across all FBS programs.',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'College Football Recruiting | CFB Social',
    description: 'Transfer portal activity and recruiting intelligence across all FBS programs.',
  },
  alternates: {
    canonical: 'https://cfbsocial.com/recruiting',
  },
};

export default async function RecruitingPage() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  // Fetch schools + portal data in parallel. Only fetch the columns we need.
  const [schoolsRes, portalPlayersRes, claimsCountsRes, inPortalRes, committedRes] = await Promise.all([
    supabase
      .from('schools')
      .select('id, name, abbreviation, slug, primary_color, secondary_color, conference, mascot')
      .eq('is_fbs', true)
      .order('name'),
    // Fetch only school IDs and status — no star_rating (saves bandwidth)
    supabase
      .from('portal_players')
      .select('previous_school_id, committed_school_id')
      .limit(2000),
    // Fetch only school_id for claims
    supabase
      .from('roster_claims')
      .select('school_id')
      .limit(5000),
    // Use head:true count queries instead of fetching all rows to count
    supabase
      .from('portal_players')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'IN_PORTAL'),
    supabase
      .from('portal_players')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'COMMITTED'),
  ]);

  const schools = schoolsRes.data;
  const portalPlayers = portalPlayersRes.data;
  const claims = claimsCountsRes.data;

  // Build aggregation maps
  const lostMap = new Map<string, number>();
  const gainedMap = new Map<string, number>();
  for (const p of portalPlayers ?? []) {
    if (p.previous_school_id) lostMap.set(p.previous_school_id, (lostMap.get(p.previous_school_id) ?? 0) + 1);
    if (p.committed_school_id) gainedMap.set(p.committed_school_id, (gainedMap.get(p.committed_school_id) ?? 0) + 1);
  }

  const claimsMap = new Map<string, number>();
  for (const c of claims ?? []) {
    if (c.school_id) claimsMap.set(c.school_id, (claimsMap.get(c.school_id) ?? 0) + 1);
  }

  type ActivityLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  function getActivityLevel(score: number): ActivityLevel {
    if (score >= 15) return 'VERY_HIGH';
    if (score >= 8) return 'HIGH';
    if (score >= 3) return 'MODERATE';
    return 'LOW';
  }

  const stats = (schools ?? []).map((school) => {
    const lost = lostMap.get(school.id) ?? 0;
    const gained = gainedMap.get(school.id) ?? 0;
    const totalClaims = claimsMap.get(school.id) ?? 0;
    const activityScore = lost + gained + totalClaims;

    return {
      schoolId: school.id,
      schoolName: school.name,
      abbreviation: school.abbreviation,
      slug: school.slug,
      primaryColor: school.primary_color,
      secondaryColor: school.secondary_color,
      conference: school.conference,
      mascot: school.mascot,
      playersLost: lost,
      playersGained: gained,
      totalClaims,
      avgStarRating: 0,
      netMovement: gained - lost,
      activityLevel: getActivityLevel(activityScore),
    };
  });

  // Summary stats from lightweight count queries (head:true = no row data transferred)
  const totalInPortal = inPortalRes.count ?? 0;
  const totalCommitted = committedRes.count ?? 0;
  const mostActive = [...stats].sort((a, b) =>
    (b.playersLost + b.playersGained + b.totalClaims) - (a.playersLost + a.playersGained + a.totalClaims)
  )[0];

  return (
    <div>
      <div className="feed-header">
        <h1 className="feed-title">Recruiting Desk</h1>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--faded-ink)', marginTop: 4 }}>
          Transfer portal activity and recruiting intelligence across all FBS programs.
        </p>
      </div>

      {/* Summary Row */}
      <div className="recruiting-summary">
        <div className="recruiting-summary-stat">
          <span className="recruiting-summary-value">{totalInPortal}</span>
          <span className="recruiting-summary-label">In Portal</span>
        </div>
        <div className="recruiting-summary-stat">
          <span className="recruiting-summary-value">{totalCommitted}</span>
          <span className="recruiting-summary-label">Committed</span>
        </div>
        <div className="recruiting-summary-stat">
          <span className="recruiting-summary-value">{stats.length}</span>
          <span className="recruiting-summary-label">FBS Programs</span>
        </div>
        {mostActive && (
          <div className="recruiting-summary-stat">
            <span className="recruiting-summary-value">{mostActive.abbreviation}</span>
            <span className="recruiting-summary-label">Most Active</span>
          </div>
        )}
      </div>

      <RecruitingClient stats={stats} />
    </div>
  );
}
