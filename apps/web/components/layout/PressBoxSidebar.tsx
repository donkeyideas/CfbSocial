'use client';

import { useEffect, useState } from 'react';
import { ChaosMeter } from './ChaosMeter';
import { NewsModal } from './NewsModal';

interface NewsArticle {
  id: string;
  headline: string;
  description: string;
  imageUrl: string | null;
  articleUrl: string;
  byline: string;
  published: string;
  source: string;
  category: 'recruiting' | 'portal' | 'trending';
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

interface ChaosStats {
  posts24h: number;
  challenges24h: number;
  flagged24h: number;
  portalMoves: number;
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
  { year: '1982', text: 'Cal\'s "The Play" — five laterals through the Stanford band to beat the Cardinal as time expired.' },
  { year: '2002', text: 'Ohio State upsets Miami 31-24 in double-OT for the BCS title on a controversial pass interference call.' },
  { year: '2014', text: 'Ohio State, with third-string QB Cardale Jones, wins the first College Football Playoff.' },
  { year: '1966', text: 'Notre Dame and Michigan State play to a 10-10 tie in the original "Game of the Century."' },
  { year: '1979', text: 'The Rose Bowl: USC\'s Charles White scores on a phantom touchdown to beat Michigan 17-10.' },
  { year: '1993', text: 'Charlie Ward leads Florida State to its first national title with a Heisman-winning season.' },
  { year: '2010', text: 'Cam Newton drags Auburn from a 24-0 hole at Bama to win the Iron Bowl and the national title.' },
  { year: '1997', text: 'Charles Woodson wins the Heisman over Peyton Manning — the first defensive player to do so.' },
  { year: '2008', text: 'Texas Tech\'s Michael Crabtree scores with 1 second left to stun #1 Texas 39-33.' },
  { year: '1988', text: 'Notre Dame\'s "Catholics vs. Convicts" — the Irish beat Miami 31-30 to start their title run.' },
  { year: '1995', text: 'Nebraska finishes a perfect 12-0 season, blowing out Florida 62-24 in the Fiesta Bowl.' },
  { year: '2017', text: 'Alabama\'s 2nd & 26 — Tua hits DeVonta Smith for the OT title-winning TD against Georgia.' },
  { year: '1985', text: 'Bo Jackson runs for 1,786 yards and wins the Heisman at Auburn before a Pro Bowl baseball career.' },
  { year: '2001', text: 'Miami\'s undefeated juggernaut routs Nebraska 37-14 in the Rose Bowl for the BCS title.' },
  { year: '1991', text: 'Desmond Howard\'s Heisman pose after a punt return TD against Ohio State — Michigan wins 31-3.' },
  { year: '2019', text: 'Joe Burrow throws for 5,671 yards and wins the Heisman by the largest margin in history at LSU.' },
  { year: '1989', text: 'Colorado dedicates its season to the late Sal Aunese and finishes 11-1, falling in the Orange Bowl.' },
  { year: '2015', text: 'Michigan State blocks a Michigan punt and returns it for a TD as time expires — "Trouble With the Snap."' },
];

function getClickCounts(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem('cfb-news-clicks') ?? '{}');
  } catch {
    return {};
  }
}

function trackClick(articleId: string) {
  const counts = getClickCounts();
  counts[articleId] = (counts[articleId] ?? 0) + 1;
  localStorage.setItem('cfb-news-clicks', JSON.stringify(counts));
}

export function PressBoxSidebar() {
  const [trendingArticles, setTrendingArticles] = useState<NewsArticle[]>([]);
  const [recruitingNews, setRecruitingNews] = useState<NewsArticle[]>([]);
  const [portalNews, setPortalNews] = useState<NewsArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [portalPlayers, setPortalPlayers] = useState<PortalPlayer[]>([]);
  const [claims, setClaims] = useState<RecruitingClaim[]>([]);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [recruits, setRecruits] = useState<CFBDRecruit[]>([]);
  const [transfers, setTransfers] = useState<CFBDTransfer[]>([]);
  const [chaosStats, setChaosStats] = useState<ChaosStats | null>(null);

  useEffect(() => {
    // Load multi-source CFB news (ESPN, CBS, Yahoo, 247Sports)
    async function loadNews() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch('/api/news-feeds', { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('News feeds fetch failed');
        const data = await res.json();
        const clickCounts = getClickCounts();

        // Add click counts and sort trending by clicks then recency
        if (data.trending?.length > 0) {
          const withClicks = (data.trending as NewsArticle[]).map(a => ({
            ...a,
            _clicks: clickCounts[a.id] ?? 0,
          }));
          withClicks.sort((a, b) => {
            if (b._clicks !== a._clicks) return b._clicks - a._clicks;
            return new Date(b.published || 0).getTime() - new Date(a.published || 0).getTime();
          });
          setTrendingArticles(withClicks.slice(0, 5));
        }
        if (data.recruiting?.length > 0) setRecruitingNews(data.recruiting);
        if (data.portal?.length > 0) setPortalNews(data.portal);
      } catch {
        // News feeds unavailable
      }
    }

    // Load consolidated sidebar data (portal, claims, leaders, chaos) in ONE call
    async function loadSidebarData() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch('/api/sidebar', { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return;
        const data = await res.json();
        if (data.portalPlayers?.length > 0) setPortalPlayers(data.portalPlayers);
        if (data.claims?.length > 0) setClaims(data.claims);
        if (data.leaders) setLeaders(data.leaders);
        if (data.chaos) setChaosStats(data.chaos);
      } catch {
        // Sidebar data unavailable
      }
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

    // Fire all data loads in parallel — 4 calls
    // 1. /api/news-feeds (multi-source: ESPN, CBS, Yahoo, 247Sports)
    // 2. /api/sidebar (portal + claims + leaders + chaos — consolidated)
    // 3. /api/cfbd?type=recruiting (already cached)
    // 4. /api/cfbd?type=portal (already cached)
    Promise.allSettled([
      loadNews(),
      loadSidebarData(),
      loadRecruits(),
      loadTransfers(),
    ]);
  }, []);

  function handleArticleClick(article: NewsArticle) {
    trackClick(article.id);
    setSelectedArticle(article);
  }

  // Only surface roster claims from the last 21 days as "dispatches" — older
  // ones read as stale/hardcoded when CFBD data is unavailable.
  const CLAIM_MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000;
  const recentClaims = claims.filter(
    (c) => c.created_at && Date.now() - new Date(c.created_at).getTime() < CLAIM_MAX_AGE_MS,
  );

  // Rotate vault moment by day-of-year so adjacent days never collide
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const vault = vaultMoments[dayOfYear % vaultMoments.length]!;

  return (
    <div>
      {/* Section 0: Chaos Meter */}
      <ChaosMeter chaos={chaosStats} />

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

        {/* Fallback: user roster claims when no CFBD data — but only RECENT
            ones, so a months-old claim never masquerades as a fresh dispatch. */}
        {recruits.length === 0 && transfers.length === 0 && recentClaims.length > 0 && (
          recentClaims.map((claim, i) => (
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

        {/* Recruiting news headlines from multiple sources */}
        {recruitingNews.length > 0 && recruitingNews.slice(0, 3).map((article) => (
          <div
            key={article.id}
            className="dispatch bulletin"
            style={{ marginBottom: 6, cursor: 'pointer' }}
            onClick={() => handleArticleClick(article)}
          >
            <div className="dispatch-label">{article.source}</div>
            <div className="dispatch-text">
              {article.headline.length > 90 ? article.headline.slice(0, 90) + '...' : article.headline}
            </div>
            <div className="dispatch-time">
              {article.published
                ? new Date(article.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : ''}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {recruits.length === 0 && transfers.length === 0 && recentClaims.length === 0 && recruitingNews.length === 0 && (
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

        {/* Portal news headlines from multiple sources */}
        {portalNews.length > 0 && portalNews.slice(0, 3).map((article) => (
          <div
            key={article.id}
            className="dispatch bulletin"
            style={{ marginTop: 8, marginBottom: 4, cursor: 'pointer' }}
            onClick={() => handleArticleClick(article)}
          >
            <div className="dispatch-label">{article.source}</div>
            <div className="dispatch-text">
              {article.headline.length > 90 ? article.headline.slice(0, 90) + '...' : article.headline}
            </div>
            <div className="dispatch-time">
              {article.published
                ? new Date(article.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Section 3: Trending Stories (multi-source) */}
      <div className="sidebar-section">
        <div className="sidebar-title">Trending Stories</div>
        {trendingArticles.length > 0 ? (
          trendingArticles.map((article, i) => (
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
                {article.source}
                {article.byline ? ` \u00B7 ${article.byline}` : ''}
                {article.published ? ` \u00B7 ${new Date(article.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
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
