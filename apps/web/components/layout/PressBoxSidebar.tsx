'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChaosMeter } from './ChaosMeter';
import { NewsModal } from './NewsModal';

interface ESPNArticle {
  id: number;
  headline: string;
  description: string;
  imageUrl: string | null;
  articleUrl: string;
  byline: string;
  published: string;
  clicks: number;
}

interface PortalPlayer {
  name: string;
  position: string;
  school: { abbreviation: string } | null;
}

interface RecruitingClaim {
  school: { abbreviation: string } | null;
  player: { name: string; star_rating: number | null } | null;
  created_at: string;
}

interface CFBDRecruit {
  name: string;
  stars: number;
  rating: number;
  position: string;
  committedTo: string | null;
  city: string;
  stateProvince: string;
  year: number;
  ranking: number;
}

interface CFBDTransfer {
  firstName: string;
  lastName: string;
  position: string;
  origin: string;
  destination: string | null;
  transferDate: string;
  stars: number;
  rating: number;
  eligibility: string;
}

interface LeaderboardEntry {
  username: string;
  xp: number;
  dynasty_tier: string;
  school: { abbreviation: string } | null;
}

// Historical CFB moments for The Vault
const vaultMoments = [
  { year: '2007', text: 'Appalachian State stuns #5 Michigan 34-32 at the Big House — the greatest upset in college football history.' },
  { year: '2013', text: 'Auburn\'s Chris Davis returns a missed field goal 109 yards to beat Alabama in the "Kick Six."' },
  { year: '1984', text: 'Doug Flutie throws a Hail Mary to beat Miami, forever etching Boston College into football lore.' },
  { year: '2006', text: 'Boise State defeats Oklahoma in the Fiesta Bowl with a Statue of Liberty play in overtime.' },
  { year: '1971', text: 'Nebraska and Oklahoma play the "Game of the Century" — the Huskers prevail 35-31.' },
  { year: '2018', text: 'Tua Tagovailoa enters in the second half to lead Alabama past Georgia 26-23 in OT for the national title.' },
  { year: '2005', text: 'Vince Young scores on 4th-and-5 with 19 seconds left to give Texas the national championship over USC.' },
];

function getClickCounts(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem('cfb-news-clicks') ?? '{}');
  } catch {
    return {};
  }
}

function trackClick(articleId: number) {
  const counts = getClickCounts();
  counts[String(articleId)] = (counts[String(articleId)] ?? 0) + 1;
  localStorage.setItem('cfb-news-clicks', JSON.stringify(counts));
}

export function PressBoxSidebar() {
  const [articles, setArticles] = useState<ESPNArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<ESPNArticle | null>(null);
  const [portalPlayers, setPortalPlayers] = useState<PortalPlayer[]>([]);
  const [claims, setClaims] = useState<RecruitingClaim[]>([]);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [recruits, setRecruits] = useState<CFBDRecruit[]>([]);
  const [transfers, setTransfers] = useState<CFBDTransfer[]>([]);

  useEffect(() => {
    const supabase = createClient();

    // Load ESPN news (with 5s timeout)
    async function loadNews() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(
          'https://site.api.espn.com/apis/site/v2/sports/football/college-football/news?limit=5',
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        if (!res.ok) throw new Error('ESPN fetch failed');
        const data = await res.json();
        const clickCounts = getClickCounts();

        const mapped: ESPNArticle[] = (data.articles ?? []).map((a: Record<string, unknown>) => {
          const images = a.images as Array<{ url: string }> | undefined;
          const links = a.links as { web?: { href?: string } } | undefined;
          return {
            id: a.id as number,
            headline: a.headline as string,
            description: (a.description as string) ?? '',
            imageUrl: images?.[0]?.url ?? null,
            articleUrl: links?.web?.href ?? '#',
            byline: (a.byline as string) ?? '',
            published: (a.published as string) ?? '',
            clicks: clickCounts[String(a.id)] ?? 0,
          };
        });

        // Sort: by clicks (desc), then recency
        mapped.sort((a, b) => {
          if (b.clicks !== a.clicks) return b.clicks - a.clicks;
          return new Date(b.published).getTime() - new Date(a.published).getTime();
        });

        setArticles(mapped);
      } catch {
        // ESPN unavailable — leave empty
      }
    }

    // Load portal players for ticker
    async function loadPortal() {
      const { data } = await supabase
        .from('portal_players')
        .select('name, position, school:schools!portal_players_previous_school_id_fkey(abbreviation)')
        .order('created_at', { ascending: false })
        .limit(8);
      if (data && data.length > 0) {
        setPortalPlayers(data as unknown as PortalPlayer[]);
      }
    }

    // Load recent roster claims for recruiting wire
    async function loadClaims() {
      const { data } = await supabase
        .from('roster_claims')
        .select('created_at, school:schools!roster_claims_school_id_fkey(abbreviation), player:portal_players!roster_claims_player_id_fkey(name, star_rating)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data && data.length > 0) {
        setClaims(data as unknown as RecruitingClaim[]);
      }
    }

    // Load leaderboard
    async function loadLeaders() {
      const { data } = await supabase
        .from('profiles')
        .select('username, xp, dynasty_tier, school:schools!profiles_school_id_fkey(abbreviation)')
        .order('xp', { ascending: false })
        .limit(5);
      if (data) setLeaders(data as unknown as LeaderboardEntry[]);
    }

    // Load CFBD recruiting commits (with 5s timeout)
    async function loadRecruits() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch('/api/cfbd?type=recruiting', { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return;
        const json = await res.json();
        const data = (json.data ?? []) as CFBDRecruit[];
        // Show top 5 committed recruits sorted by ranking
        const committed = data
          .filter((r) => r.committedTo)
          .sort((a, b) => (a.ranking || 9999) - (b.ranking || 9999))
          .slice(0, 5);
        if (committed.length > 0) setRecruits(committed);
      } catch { /* CFBD unavailable */ }
    }

    // Load CFBD transfer portal entries (with 5s timeout)
    async function loadTransfers() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch('/api/cfbd?type=portal', { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return;
        const json = await res.json();
        const data = (json.data ?? []) as CFBDTransfer[];
        // Show latest 5 transfers
        const sorted = data
          .sort((a, b) => new Date(b.transferDate || 0).getTime() - new Date(a.transferDate || 0).getTime())
          .slice(0, 5);
        if (sorted.length > 0) setTransfers(sorted);
      } catch { /* CFBD unavailable */ }
    }

    // Fire all data loads in parallel — allSettled so one failure doesn't block others
    Promise.allSettled([
      loadNews(),
      loadPortal(),
      loadClaims(),
      loadLeaders(),
      loadRecruits(),
      loadTransfers(),
    ]);
  }, []);

  function handleArticleClick(article: ESPNArticle) {
    trackClick(article.id);
    setSelectedArticle(article);
  }

  // Pick a random vault moment based on the day
  const dayIndex = new Date().getDate() % vaultMoments.length;
  const vault = vaultMoments[dayIndex]!;

  return (
    <div>
      {/* Section 0: Chaos Meter */}
      <ChaosMeter />

      {/* Section 1: Recruiting Wire */}
      <div className="sidebar-section">
        <div className="sidebar-title">Recruiting Wire</div>

        {/* Real CFBD recruiting commits */}
        {recruits.map((r, i) => (
          <div key={`recruit-${i}`} className="dispatch flash" style={{ marginBottom: 6 }}>
            <div className="dispatch-label">Commit</div>
            <div className="dispatch-text">
              {r.stars > 0 ? `${r.stars}-star ` : ''}{r.position} {r.name} commits to {r.committedTo}
            </div>
            <div className="dispatch-time">
              {r.city && r.stateProvince ? `${r.city}, ${r.stateProvince}` : `#${r.ranking} nationally`}
            </div>
          </div>
        ))}

        {/* Real CFBD transfer portal entries */}
        {transfers.map((t, i) => (
          <div key={`transfer-${i}`} className="dispatch bulletin" style={{ marginBottom: 6 }}>
            <div className="dispatch-label">Transfer</div>
            <div className="dispatch-text">
              {t.position} {t.firstName} {t.lastName}: {t.origin}{t.destination ? ` to ${t.destination}` : ' (entered portal)'}
            </div>
            <div className="dispatch-time">
              {t.transferDate
                ? new Date(t.transferDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : t.stars > 0 ? `${t.stars}-star` : ''}
            </div>
          </div>
        ))}

        {/* Fallback: user roster claims when no CFBD data */}
        {recruits.length === 0 && transfers.length === 0 && claims.length > 0 && (
          claims.map((claim, i) => (
            <div key={`claim-${i}`} className="dispatch bulletin" style={{ marginBottom: 6 }}>
              <div className="dispatch-label">Dispatch</div>
              <div className="dispatch-text">
                {claim.school?.abbreviation ?? 'UNK'} claims {claim.player?.name ?? 'Unknown'}
                {claim.player?.star_rating ? ` (${claim.player.star_rating}-star)` : ''}
              </div>
              <div className="dispatch-time">
                {new Date(claim.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))
        )}

        {/* Empty state */}
        {recruits.length === 0 && transfers.length === 0 && claims.length === 0 && (
          <div className="dispatch bulletin">
            <div className="dispatch-label">Bulletin</div>
            <div className="dispatch-text">
              No new dispatches. Check back during recruiting season.
            </div>
            <div className="dispatch-time">&mdash; CFB Social Wire Service</div>
          </div>
        )}
      </div>

      {/* Section 2: Portal Wire */}
      <div className="sidebar-section">
        <div className="sidebar-title">Portal Wire</div>
        <div className="portal-ticker">
          <div className="portal-ticker-track">
            {transfers.length > 0 ? (
              <>
                {transfers.slice(0, 8).map((t, i) => (
                  <span key={i} className="portal-name">
                    {t.firstName} {t.lastName} ({t.position}) &mdash; {t.origin}{t.destination ? ` to ${t.destination}` : ''}
                  </span>
                ))}
                {transfers.slice(0, 8).map((t, i) => (
                  <span key={`dup-${i}`} className="portal-name">
                    {t.firstName} {t.lastName} ({t.position}) &mdash; {t.origin}{t.destination ? ` to ${t.destination}` : ''}
                  </span>
                ))}
              </>
            ) : portalPlayers.length > 0 ? (
              <>
                {portalPlayers.map((p, i) => (
                  <span key={i} className="portal-name">
                    {p.name} ({p.position}) &mdash; {p.school?.abbreviation ?? 'UNK'}
                  </span>
                ))}
                {portalPlayers.map((p, i) => (
                  <span key={`dup-${i}`} className="portal-name">
                    {p.name} ({p.position}) &mdash; {p.school?.abbreviation ?? 'UNK'}
                  </span>
                ))}
              </>
            ) : (
              <>
                {['No portal activity', 'Check back during transfer season'].map((text, i) => (
                  <span key={i} className="portal-name">{text}</span>
                ))}
                {['No portal activity', 'Check back during transfer season'].map((text, i) => (
                  <span key={`dup-${i}`} className="portal-name">{text}</span>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Trending Stories (ESPN News) */}
      <div className="sidebar-section">
        <div className="sidebar-title">Trending Stories</div>
        {articles.length > 0 ? (
          articles.map((article, i) => (
            <div
              key={article.id}
              className="headline-item"
              onClick={() => handleArticleClick(article)}
            >
              <span className="headline-number">{i + 1}.</span>
              <span className="headline-text">
                {article.headline.length > 80
                  ? article.headline.slice(0, 80) + '...'
                  : article.headline}
              </span>
              <div className="headline-meta">
                {article.byline ? `${article.byline} \u00B7 ` : ''}
                {new Date(article.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))
        ) : (
          <div className="headline-item">
            <span className="headline-text" style={{ color: 'var(--faded-ink)' }}>
              Loading stories...
            </span>
          </div>
        )}
      </div>

      {/* Section 4: The Vault */}
      <div className="sidebar-section">
        <div className="sidebar-title">The Vault</div>
        <div className="vault-card">
          <div className="vault-year">{vault.year}</div>
          <div className="vault-text">{vault.text}</div>
        </div>
      </div>

      {/* Section 5: Hall of Fame */}
      <div className="sidebar-section">
        <div className="sidebar-title">Hall of Fame</div>
        <div className="plaque">
          <div className="plaque-title">Dynasty Leaderboard</div>
          {leaders.length > 0 ? (
            leaders.map((leader, i) => (
              <div key={leader.username} className="plaque-entry">
                <span className="plaque-rank">{i + 1}</span>
                <span className="plaque-name">@{leader.username}</span>
                {leader.school && (
                  <span className="plaque-school">{leader.school.abbreviation}</span>
                )}
                <span className="plaque-xp">{leader.xp?.toLocaleString() ?? 0} XP</span>
              </div>
            ))
          ) : (
            <div className="plaque-entry">
              <span className="plaque-name" style={{ color: 'var(--faded-ink)' }}>
                No leaders yet
              </span>
            </div>
          )}
        </div>
      </div>

      {/* News Modal */}
      {selectedArticle && (
        <NewsModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </div>
  );
}
