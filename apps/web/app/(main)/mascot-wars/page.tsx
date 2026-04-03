import { MascotWarsClient } from './MascotWarsClient';

export const revalidate = 60;

export const metadata = {
  title: 'Mascot Wars | College Football Mascot Tournament Bracket',
  description: '64 college football mascots enter the bracket. Vote in head-to-head matchups to crown the ultimate CFB mascot champion. A CFB fan community tradition.',
  openGraph: {
    title: 'Mascot Wars | CFB Social',
    description: '64 mascots enter. One survives. Vote in the college football mascot tournament.',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Mascot Wars | CFB Social',
    description: '64 mascots enter. One survives. Vote in the college football mascot tournament.',
  },
  alternates: {
    canonical: 'https://cfbsocial.com/mascot-wars',
  },
};

export default async function MascotWarsPage() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  // Get active bracket
  const { data: bracket } = await supabase
    .from('mascot_brackets')
    .select('*')
    .eq('status', 'ACTIVE')
    .maybeSingle();

  let matchups: Array<Record<string, unknown>> = [];
  let userVotes: Array<Record<string, unknown>> = [];

  if (bracket) {
    // Fetch matchups and user in PARALLEL
    const [matchupsRes, userRes] = await Promise.all([
      supabase
        .from('mascot_matchups')
        .select(`
          *,
          school_1:schools!mascot_matchups_school_1_id_fkey(
            id, name, abbreviation, slug, primary_color, secondary_color, mascot
          ),
          school_2:schools!mascot_matchups_school_2_id_fkey(
            id, name, abbreviation, slug, primary_color, secondary_color, mascot
          )
        `)
        .eq('bracket_id', bracket.id)
        .eq('round', bracket.current_round)
        .order('position'),
      supabase.auth.getUser(),
    ]);

    matchups = matchupsRes.data ?? [];

    const user = userRes.data?.user;
    if (user) {
      const matchupIds = matchups.map((m) => m.id as string);
      if (matchupIds.length > 0) {
        const { data: v } = await supabase
          .from('mascot_votes')
          .select('*')
          .eq('user_id', user.id)
          .in('matchup_id', matchupIds);
        userVotes = v ?? [];
      }
    }
  }

  return (
    <div>
      <div className="feed-header">
        <h1 className="feed-title">Mascot Wars</h1>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--faded-ink)', marginTop: 4 }}>
          64 mascots enter. One survives. Cast your votes.
        </p>
      </div>

      <MascotWarsClient
        bracket={bracket}
        matchups={matchups}
        userVotes={userVotes}
      />
    </div>
  );
}
