import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ClaimButton } from '@/components/portal/ClaimButton';
import { SchoolInterestBar } from '@/components/portal/SchoolInterestBar';

export const dynamic = 'force-dynamic';

interface PortalDetailProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PortalDetailProps) {
  const { id } = await params;
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: player } = await supabase
    .from('portal_players')
    .select('name, position')
    .eq('id', id)
    .single();

  if (!player) return { title: 'Player Not Found' };

  const title = `${player.name} - ${player.position} | College Football Transfer Portal`;
  const description = `Track ${player.name} (${player.position}) in the college football transfer portal. See school interest, fan predictions, and commitment status on CFB Social.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary' as const, title, description },
  };
}

export default async function PortalDetailPage({ params }: PortalDetailProps) {
  const { id } = await params;
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  // Fetch player with school joins
  const { data: player, error } = await supabase
    .from('portal_players')
    .select(`
      *,
      previous_school:schools!portal_players_previous_school_id_fkey(
        id, name, abbreviation, primary_color, secondary_color, logo_url, mascot
      ),
      committed_school:schools!portal_players_committed_school_id_fkey(
        id, name, abbreviation, primary_color, secondary_color, logo_url, mascot
      )
    `)
    .eq('id', id)
    .single();

  if (error || !player) notFound();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch claims for this player
  const { data: claims } = await supabase
    .from('roster_claims')
    .select(`
      *,
      user:profiles!roster_claims_user_id_fkey(
        id, username, display_name, avatar_url, dynasty_tier
      ),
      school:schools!roster_claims_school_id_fkey(
        id, name, abbreviation, primary_color, logo_url
      )
    `)
    .eq('player_id', id)
    .order('created_at', { ascending: false });

  // Check if current user already claimed
  const existingClaim = user
    ? (claims ?? []).find((c) => c.user_id === user.id)
    : null;

  // Aggregate claims by school for interest bar
  const schoolCounts: Record<string, { school: { id: string; name: string; abbreviation: string; primary_color: string }; count: number; totalConf: number }> = {};
  for (const c of claims ?? []) {
    const sch = c.school as { id: string; name: string; abbreviation: string; primary_color: string } | null;
    if (!sch) continue;
    if (!schoolCounts[sch.id]) {
      schoolCounts[sch.id] = { school: sch, count: 0, totalConf: 0 };
    }
    schoolCounts[sch.id]!.count++;
    schoolCounts[sch.id]!.totalConf += c.confidence ?? 50;
  }
  const interestData = Object.values(schoolCounts)
    .map((d) => ({
      school: d.school,
      count: d.count,
      avgConfidence: d.count > 0 ? Math.round(d.totalConf / d.count) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Fetch all schools for the claim dropdown
  const { data: allSchools } = await supabase
    .from('schools')
    .select('id, name, abbreviation, primary_color')
    .order('name');

  const stars = player.star_rating ?? 0;
  const statusColor =
    player.status === 'COMMITTED'
      ? 'var(--success, #2d6a4f)'
      : player.status === 'WITHDRAWN'
        ? 'var(--text-muted)'
        : 'var(--gold)';

  const enteredDate = player.entered_portal_at
    ? new Date(player.entered_portal_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown';

  return (
    <div>
      {/* Back link */}
      <Link
        href="/portal"
        style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          textDecoration: 'none',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        &larr; Back to Portal Wire
      </Link>

      {/* Player header */}
      <div
        className="gridiron-card"
        style={{
          marginTop: 12,
          padding: 24,
          borderLeft: `4px solid ${(player.previous_school as Record<string, string> | null)?.primary_color ?? 'var(--crimson)'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* Avatar */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: (player.previous_school as Record<string, string> | null)?.primary_color ?? 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--serif)',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--cream)',
              flexShrink: 0,
            }}
          >
            {player.name[0]?.toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '1.8rem',
                fontWeight: 700,
                color: 'var(--ink)',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {player.name}
            </h1>

            {/* Stars */}
            {stars > 0 && (
              <div
                style={{
                  color: 'var(--gold)',
                  fontSize: '1.1rem',
                  marginTop: 4,
                }}
              >
                {'\u2605'.repeat(stars)} ({stars}-Star)
              </div>
            )}

            {/* Meta line */}
            <div
              style={{
                fontFamily: 'var(--sans)',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                marginTop: 6,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px 12px',
              }}
            >
              <span>{player.position}</span>
              {player.class_year && <span>{player.class_year}</span>}
              {player.height && <span>{player.height}</span>}
              {player.weight && <span>{player.weight}</span>}
            </div>
          </div>

          {/* Status badge */}
          <span
            style={{
              padding: '4px 14px',
              borderRadius: 2,
              fontSize: '0.75rem',
              fontWeight: 700,
              fontFamily: 'var(--sans)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: statusColor,
              border: `2px solid ${statusColor}`,
            }}
          >
            {player.status?.replace('_', ' ') ?? 'IN PORTAL'}
          </span>
        </div>

        {/* School info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 16,
            padding: '12px 0',
            borderTop: '1px solid var(--border)',
            fontFamily: 'var(--sans)',
            fontSize: '0.85rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Previous School
            </span>
            <div style={{ fontWeight: 600, marginTop: 2 }}>
              {(player.previous_school as Record<string, string> | null)?.name ?? player.previous_school_name ?? 'Unknown'}
            </div>
          </div>

          {player.committed_school && (
            <>
              <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>&rarr;</span>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Committed To
                </span>
                <div style={{ fontWeight: 600, marginTop: 2, color: 'var(--success, #2d6a4f)' }}>
                  {(player.committed_school as Record<string, string> | null)?.name ?? 'Unknown'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Entered date */}
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginTop: 8,
          }}
        >
          Entered portal: {enteredDate}
          {player.portal_window && <> ({player.portal_window} window)</>}
        </div>
      </div>

      {/* Community Claims / Interest Bar */}
      <div className="gridiron-card" style={{ marginTop: 12, padding: 20 }}>
        <SchoolInterestBar
          claims={interestData}
          totalClaims={claims?.length ?? 0}
        />
      </div>

      {/* Claim Button */}
      <div style={{ marginTop: 12 }}>
        <ClaimButton
          playerId={player.id}
          playerStatus={player.status}
          schools={(allSchools ?? []) as { id: string; name: string; abbreviation: string; primary_color: string }[]}
          existingClaim={existingClaim ? { school_id: existingClaim.school_id, confidence: existingClaim.confidence ?? 50 } : null}
        />
      </div>

      {/* Recent Claims List */}
      {(claims ?? []).length > 0 && (
        <div className="gridiron-card" style={{ marginTop: 12, padding: 20 }}>
          <div
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              marginBottom: 12,
            }}
          >
            Recent Claims
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(claims ?? []).slice(0, 10).map((claim) => {
              const claimUser = claim.user as { username?: string; display_name?: string; avatar_url?: string } | null;
              const claimSchool = claim.school as { abbreviation?: string; primary_color?: string } | null;

              return (
                <div
                  key={claim.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    paddingBottom: 10,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <Link
                    href={`/profile/${claimUser?.username ?? 'unknown'}`}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: claimSchool?.primary_color ?? 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--cream)',
                      textDecoration: 'none',
                      flexShrink: 0,
                    }}
                  >
                    {(claimUser?.display_name ?? claimUser?.username ?? '?')[0]?.toUpperCase()}
                  </Link>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/profile/${claimUser?.username ?? 'unknown'}`}
                      style={{
                        fontFamily: 'var(--sans)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--ink)',
                        textDecoration: 'none',
                      }}
                    >
                      @{claimUser?.username ?? 'unknown'}
                    </Link>
                    {claim.reasoning && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        &ldquo;{claim.reasoning}&rdquo;
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 2,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: claimSchool?.primary_color ?? 'var(--surface)',
                        color: 'var(--cream)',
                        fontFamily: 'var(--sans)',
                      }}
                    >
                      {claimSchool?.abbreviation ?? '???'}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {claim.confidence ?? 50}% conf
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
