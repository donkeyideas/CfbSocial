import Link from 'next/link';
import { Playfair_Display, Zilla_Slab, Spectral } from 'next/font/google';
import { getLandingData } from '@/lib/landing/data';
import { LandingHeroLive } from './LandingHeroLive';
import { LandingTicker } from './LandingTicker';
import { LandingMagazineRotator } from './LandingMagazineRotator';
import { LandingTrendingRotator } from './LandingTrendingRotator';
import './landing.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});
const zilla = Zilla_Slab({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-slab',
  display: 'swap',
});
const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
});

function deriveInitials(username: string, abbr: string): string {
  if (abbr) return abbr.slice(0, 2).toUpperCase();
  const clean = (username || '').replace(/[^a-zA-Z]/g, '');
  if (clean.length >= 2) return clean.slice(0, 2).toUpperCase();
  if (clean.length === 1) return clean.toUpperCase();
  return 'CF';
}

export async function LandingPage() {
  const data = await getLandingData();

  /* ── Feed take card ── */
  const feedTake = data.featureTake;
  const feedInitials = deriveInitials(feedTake.author.username, feedTake.school.abbr);
  const feedSchoolLabel = feedTake.school.name || feedTake.school.abbr;

  /* ── War Room scoreboard card ── */
  const fg = data.featureGame;
  const warRoom = (() => {
    if (!fg) {
      return {
        isLive: false,
        headLabel: 'Scoreboard · Off Season',
        away: { name: 'Michigan', score: '', color: '#0021a5' },
        home: { name: 'Ohio State', score: '', color: '#bb0000' },
        awayWin: false,
        homeWin: false,
        footLeft: 'No games right now',
        footRight: 'Check back on game day',
      };
    }
    const isLive = fg.statusState === 'in';
    const isUpcoming = fg.statusState === 'pre';
    const awayNum = Number(fg.away.score);
    const homeNum = Number(fg.home.score);
    const showScores = !isUpcoming && (fg.away.score !== '' || fg.home.score !== '');
    const awayWin = showScores && !Number.isNaN(awayNum) && !Number.isNaN(homeNum) && awayNum > homeNum;
    const homeWin = showScores && !Number.isNaN(awayNum) && !Number.isNaN(homeNum) && homeNum > awayNum;
    const headLabel = isLive
      ? `Live Scoreboard · ${fg.statusLabel}`
      : isUpcoming
        ? 'Scoreboard · Upcoming'
        : `Scoreboard · ${fg.statusLabel}`;
    return {
      isLive,
      headLabel,
      away: { name: fg.away.name || fg.away.abbr, score: isUpcoming ? '' : fg.away.score, color: fg.away.color },
      home: { name: fg.home.name || fg.home.abbr, score: isUpcoming ? '' : fg.home.score, color: fg.home.color },
      awayWin,
      homeWin,
      footLeft: isUpcoming ? fg.kickoffLabel : isLive ? 'In the game thread' : 'Final',
      footRight: isUpcoming ? 'Kickoff scheduled' : 'In the game thread',
    };
  })();

  /* ── Rivalry / aging take ── */
  const rivalry = data.rivalry;
  const agingTake = data.agingTake;

  /* ── Mascot bracket ── */
  const mb = data.mascotBracket;
  const topPair = mb.pairs[0] ?? { a: 'TBD', b: 'TBD', winner: null as 'a' | 'b' | null };
  const botPair = mb.pairs[1] ?? { a: 'TBD', b: 'TBD', winner: null as 'a' | 'b' | null };
  const topWinner = topPair.winner === 'b' ? topPair.b : topPair.a;
  const botWinner = botPair.winner === 'b' ? botPair.b : botPair.a;
  const mascotChamp = mb.champ ?? topWinner;

  /* ── Dynasty leader ── */
  const dynastyLeader = data.dynastyLeader;

  return (
    <div className={`lp ${playfair.variable} ${zilla.variable} ${spectral.variable}`}>
      {/* ============ MASTHEAD ============ */}
      <header className="masthead">
        <div className="wrap">
          <div className="masthead-top">
            <Link className="brand" href="#top" aria-label="CFB Social home">
              <span className="wordmark">CFB&nbsp;SOCIAL</span>
              <span className="kicker">Est. 2026</span>
            </Link>
            <nav className="nav" aria-label="Primary">
              <div className="nav-links">
                <Link href="/feed">Feed</Link>
                <Link href="/war-room">War Room</Link>
                <Link href="/rivalry">Rivalry Ring</Link>
                <Link href="/portal">Portal</Link>
                <Link href="/game-room">Game Room</Link>
              </div>
              <div className="nav-auth">
                <Link className="login-link" href="/login">Log In</Link>
                <Link className="btn" href="/register">Sign Up</Link>
                <button className="menu-toggle" aria-label="Menu">
                  <span></span>
                  <span></span>
                  <span></span>
                </button>
              </div>
            </nav>
          </div>
          <div className="masthead-dateline">
            <span>Vol. I &middot; No. 1 &middot; Est. 2026</span>
            <span className="mid">All Football &middot; All The Time</span>
            <span className="side-r">Wednesday, August 26, 2026 &middot; 653 Programs</span>
          </div>
        </div>
      </header>

      {/* ============ TICKER ============ */}
      <LandingTicker initialItems={data.ticker} />

      <main id="top">
        {/* ============ HERO ============ */}
        <section className="hero">
          <div className="wrap">
            <div className="hero-eyebrow-row">
              <span className="eyebrow">The Front Page of College Football</span>
              <span className="hero-credibility"><span className="live-dot"></span>653 Schools &middot; Live Now</span>
            </div>
            <div className="hero-grid">
              <div className="hero-main">
                <h1 className="hero-headline">
                  <span className="line"><span>STAKE YOUR CLAIM.</span></span>
                  <span className="line"><span className="crimson">CALL YOUR SHOTS.</span></span>
                  <span className="line"><span>BUILD YOUR DYNASTY.</span></span>
                </h1>
                <p className="hero-deck">
                  <span className="drop">C</span>FB Social is the college football social network &mdash; the home field for takes, receipts, and rivalries across all 653 programs. File your opinions, let the community vote them Touchdown or Fumble, track the transfer portal, and watch your predictions age into receipts that prove you called it first.
                </p>
                <div className="hero-cta">
                  <Link className="btn btn-lg" href="/register">Start Your Dynasty &mdash; Free
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 7h11M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </Link>
                  <Link className="btn btn-ghost btn-lg" href="/feed">Read the Feed</Link>
                </div>
                <div className="hero-meta">
                  <span><b>10,000+</b> takes filed</span>
                  <span><b>Live</b> game threads nightly</span>
                  <span><b>Receipts</b> kept forever</span>
                </div>
              </div>

              <aside className="hero-aside">
                <LandingHeroLive
                  initialGames={data.games}
                  initialHotTakes={data.hotTakes}
                />
              </aside>
            </div>
          </div>
        </section>

        {/* ============ STAT BAND ============ */}
        <section className="statband" aria-label="By the numbers">
          <div className="wrap">
            <div className="stat-grid">
              <div className="stat"><div className="num">{data.stats.schools.toLocaleString()}</div><div className="label">Schools</div></div>
              <div className="stat"><div className="num">{data.stats.liveThreads > 0 ? data.stats.liveThreads.toLocaleString() : 'Live'}</div><div className="label">Game Threads</div></div>
              <div className="stat"><div className="num">{data.stats.posts.toLocaleString()}<span className="accent">+</span></div><div className="label">Takes Filed</div></div>
              <div className="stat"><div className="num">&infin;</div><div className="label">Receipts Kept Forever</div></div>
            </div>
            <p className="stat-note">Live figures &middot; the community box score, updated nightly</p>
          </div>
        </section>

        {/* ============ FEATURES ============ */}
        <section className="features" id="feed">
          <div className="wrap">
            <div className="features-masthead">
              <div>
                <span className="eyebrow">Inside This Edition</span>
                <div className="biglabel">Sections of the Paper</div>
              </div>
              <div className="edition">Everything a college<br />football fan does &mdash; in one paper</div>
            </div>

            {/* LEAD 2x2 */}
            <div className="lead-grid">
              {/* The Feed */}
              <article className="feat">
                <span className="num-tag">01</span>
                <span className="eyebrow">The Feed</span>
                <h3>File Your Takes.<br />Let The Room Vote.</h3>
                <p>Post your hottest opinions and the community rules on every one &mdash; Touchdown if you nailed it, Fumble if you whiffed.</p>
                <div className="mock">
                  <div className="m-take">
                    <div className="row">
                      <span className="m-avatar" style={{ background: feedTake.school.color }}>{feedInitials}</span>
                      <span className="m-meta"><b>@{feedTake.author.username}</b>{feedSchoolLabel ? <> &middot; {feedSchoolLabel}</> : null}{feedTake.timeLabel ? <> &middot; {feedTake.timeLabel}</> : null}</span>
                    </div>
                    <p className="quote">&quot;{feedTake.content}&quot;</p>
                    <div className="m-votes">
                      <button className="m-vote td"><svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1v10M2 5l4-4 4 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg> TD <span className="n">{feedTake.td.toLocaleString()}</span></button>
                      <button className="m-vote fm"><svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 11V1M2 7l4 4 4-4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg> Fumble <span className="n">{feedTake.fumble.toLocaleString()}</span></button>
                    </div>
                  </div>
                </div>
              </article>

              {/* War Room */}
              <article className="feat" id="warroom">
                <span className="num-tag">02</span>
                <span className="eyebrow">War Room</span>
                <h3>Live Game-Day<br />Threads, In Real Time.</h3>
                <p>Every Saturday night gets its own room &mdash; a live scoreboard, real-time chat, and a fanbase reacting play by play.</p>
                <div className="mock">
                  <div className="m-scores">
                    <div className="head">{warRoom.isLive ? <span className="live-dot"></span> : null}{warRoom.headLabel}</div>
                    <div className="m-sc-row">
                      <span className="m-sc-team"><span className="dot" style={{ background: warRoom.away.color }}></span>{warRoom.away.name}</span>
                      <span className={`m-sc-score${warRoom.awayWin ? ' win' : ''}`}>{warRoom.away.score}</span>
                    </div>
                    <div className="m-sc-row">
                      <span className="m-sc-team"><span className="dot" style={{ background: warRoom.home.color }}></span>{warRoom.home.name}</span>
                      <span className={`m-sc-score${warRoom.homeWin ? ' win' : ''}`}>{warRoom.home.score}</span>
                    </div>
                    <div className="m-sc-foot"><span>{warRoom.footLeft}</span><span>{warRoom.footRight}</span></div>
                  </div>
                </div>
              </article>

              {/* Rivalry Ring */}
              <article className="feat" id="rivalry">
                <span className="num-tag">03</span>
                <span className="eyebrow">Rivalry Ring</span>
                <h3>Settle It.<br />Head To Head.</h3>
                <p>Challenge any user to a one-on-one debate. State your case, then the community judges who actually won the argument.</p>
                <div className="mock">
                  <div className="m-rivalry">
                    <div className="m-riv-head">
                      <span>{rivalry.a.name || rivalry.a.abbr}</span><span className="vs">VS</span><span>{rivalry.b.name || rivalry.b.abbr}</span>
                    </div>
                    <div className="m-bar">
                      <span className="side a" style={{ width: `${rivalry.pctA}%` }}>{rivalry.pctA}%</span>
                      <span className="side b" style={{ width: `${rivalry.pctB}%` }}>{rivalry.pctB}%</span>
                    </div>
                    <div className="m-riv-foot">{rivalry.footLabel}</div>
                  </div>
                </div>
              </article>

              {/* Predictions & Receipts */}
              <article className="feat">
                <span className="num-tag">04</span>
                <span className="eyebrow">Predictions &amp; Receipts</span>
                <h3>Call It Now.<br />Get The Receipt Later.</h3>
                <p>File a prediction and it starts aging. When it comes true, it turns into a receipt &mdash; permanent proof you called it first.</p>
                <div className="mock">
                  <div className="m-receipt">
                    <div className="stamp" style={{ position: 'absolute', top: '-10px', right: '8px' }} aria-hidden="true">
                      <svg className="stamp-svg" width="58" height="58" viewBox="0 0 70 70">
                        <circle cx="35" cy="35" r="32" fill="none" stroke="#b8892b" strokeWidth="2" />
                        <circle cx="35" cy="35" r="27" fill="none" stroke="#b8892b" strokeWidth="1" />
                        <text x="35" y="31" textAnchor="middle" fill="#b8892b" fontFamily="Zilla Slab, serif" fontWeight="700" fontSize="9">CALLED</text>
                        <text x="35" y="43" textAnchor="middle" fill="#b8892b" fontFamily="Zilla Slab, serif" fontWeight="700" fontSize="9">IT</text>
                      </svg>
                    </div>
                    <p className="quote">&quot;{agingTake.content}&quot;</p>
                    <div className="m-timer">
                      <span>Aging</span>
                      <span className="track"><span className="fill" style={{ width: `${agingTake.progressPct}%` }}></span></span>
                      <span>{agingTake.daysLabel}</span>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            {/* MORE IN EVERY EDITION */}
            <div className="more-head">
              <h3>More In Every Edition</h3>
              <span className="k">Six more sections &middot; turn the page</span>
            </div>
            <div className="more-grid">
              {/* Trending Stories */}
              <article className="mcard" id="trending">
                <span className="eyebrow">Trending Stories</span>
                <h4>Around College Football</h4>
                <p>The headlines fans are arguing about right now, pulled live from across the sport.</p>
                <div className="mock">
                  <LandingTrendingRotator />
                </div>
              </article>

              {/* Mascot Wars */}
              <article className="mcard">
                <span className="eyebrow">Mascot Wars</span>
                <h4>The 64-Team Bracket</h4>
                <p>Vote your mascot through the rounds all the way to the title.</p>
                <div className="mock">
                  <svg className="bracket" viewBox="0 0 200 96" role="img" aria-label="Mascot bracket motif">
                    <g className={topPair.winner === 'a' ? 'win' : undefined}>
                      <rect x="4" y="8" width="52" height="14" rx="1" />
                      <text x="10" y="18">{topPair.a}</text>
                    </g>
                    <g className={topPair.winner === 'b' ? 'win' : undefined}>
                      <rect x="4" y="28" width="52" height="14" rx="1" />
                      <text x="10" y="38">{topPair.b}</text>
                    </g>
                    <g className={botPair.winner === 'a' ? 'win' : undefined}>
                      <rect x="4" y="56" width="52" height="14" rx="1" />
                      <text x="10" y="66">{botPair.a}</text>
                    </g>
                    <g className={botPair.winner === 'b' ? 'win' : undefined}>
                      <rect x="4" y="76" width="52" height="14" rx="1" />
                      <text x="10" y="86">{botPair.b}</text>
                    </g>

                    <path d="M56 15 H70 V35 H56 M70 25 H84" />
                    <path d="M56 63 H70 V83 H56 M70 73 H84" />

                    <g className="win"><rect x="84" y="18" width="52" height="14" rx="1" /><text x="90" y="28">{topWinner}</text></g>
                    <rect x="84" y="66" width="52" height="14" rx="1" />
                    <text x="90" y="76">{botWinner}</text>

                    <path d="M136 25 H150 V73 H136 M150 49 H164" />
                    <g className="win"><rect x="164" y="42" width="32" height="14" rx="1" /><text x="169" y="52">{mascotChamp}</text></g>
                  </svg>
                </div>
              </article>

              {/* Game Room */}
              <article className="mcard" id="gameroom">
                <span className="eyebrow">Game Room</span>
                <h4>Your Dynasty, A Magazine</h4>
                <p>Turn your EA College Football dynasty into a cover story and find online leagues.</p>
                <div className="mock">
                  <LandingMagazineRotator magazines={data.magazines} />
                </div>
              </article>

              {/* Recruiting Heat Map */}
              <article className="mcard">
                <span className="eyebrow">Heat Map</span>
                <h4>Recruiting Heat Map</h4>
                <p>See which programs are actually winning the offseason.</p>
                <div className="mock">
                  {data.recruitingHeat.map((h, i) => (
                    <div className="heat-row" key={`${h.abbr}-${i}`}><span className="nm">{h.abbr}</span><span className="heat-track"><span className="heat-fill" style={{ width: `${h.widthPct}%` }}></span></span></div>
                  ))}
                </div>
              </article>

              {/* Dynasty Mode */}
              <article className="mcard">
                <span className="eyebrow">Dynasty Mode</span>
                <h4>Walk-On To Hall Of Fame</h4>
                <p>Earn XP for every take, climb the tiers, and unlock achievements.</p>
                <div className="mock">
                  <div className="m-xp">
                    <span className="tier"><svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1l1.5 3.2L11 4.7 8.5 7.2 9.2 11 6 9.1 2.8 11l.7-3.8L1 4.7l3.5-.5z" fill="currentColor" /></svg>{dynastyLeader.tierLabel}</span>
                    <div className="lvl"><span>Level {dynastyLeader.level}</span><span>{dynastyLeader.xp.toLocaleString()} / {dynastyLeader.nextThreshold.toLocaleString()} XP</span></div>
                    <div className="xp-track"><span className="xp-fill" style={{ width: `${dynastyLeader.progressPct}%` }}></span></div>
                  </div>
                </div>
              </article>

              {/* School Hubs */}
              <article className="mcard">
                <span className="eyebrow">School Hubs</span>
                <h4>A Home For All 653</h4>
                <p>Every program gets a hub &mdash; your school&apos;s fans, feed, and rivals in one place.</p>
                <div className="mock">
                  <div className="hubs">
                    {data.schoolHubs.schools.map((s) => (
                      <Link className="hub-pill" href={`/school/${s.slug}`} key={s.slug}>{s.name}</Link>
                    ))}
                    <Link className="hub-pill" href="/schools">+{data.schoolHubs.moreCount.toLocaleString()} more</Link>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section className="how">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">The Playbook</span>
              <h2 className="section-title">Three Steps To The Field</h2>
            </div>
            <div className="how-grid" style={{ marginTop: '1.6rem' }}>
              <div className="step">
                <span className="n">1</span>
                <h4>Pick Your School</h4>
                <p>Claim your program from all 653 and join a fanbase that argues like you do.</p>
                <span className="arrow-x" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="12" fill="#f4efe3" stroke="#8b1a1a" strokeWidth="1.5" /><path d="M9 13h8M14 9l4 4-4 4" stroke="#8b1a1a" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </div>
              <div className="step">
                <span className="n">2</span>
                <h4>File Takes &amp; Predictions</h4>
                <p>Post your opinions, call your shots, and let the community vote you Touchdown or Fumble.</p>
                <span className="arrow-x" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="12" fill="#f4efe3" stroke="#8b1a1a" strokeWidth="1.5" /><path d="M9 13h8M14 9l4 4-4 4" stroke="#8b1a1a" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </div>
              <div className="step">
                <span className="n">3</span>
                <h4>Build Your Dynasty</h4>
                <p>Rack up receipts, climb from Walk-On to Hall of Fame, and run your fanbase.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ FAQ / THE RULEBOOK ============ */}
        <section className="faq" id="faq" aria-labelledby="faq-title">
          <div className="wrap">
            <div className="faq-head">
              <span className="eyebrow">The Rulebook</span>
              <h2 className="section-title" id="faq-title">Frequently Asked</h2>
            </div>
            <div className="faq-grid">
              <div className="faq-item">
                <h3>What is CFB Social?</h3>
                <p>CFB Social is a free social network built for college football fans. File your takes, debate rivalries, track the transfer portal, make predictions, and build a dynasty across all 653 college football programs.</p>
              </div>
              <div className="faq-item">
                <h3>Is CFB Social free to join?</h3>
                <p>Yes. Creating an account is completely free. Pick your school, file your first take, and start building your dynasty in seconds. No credit card required.</p>
              </div>
              <div className="faq-item">
                <h3>How do rivalry challenges work?</h3>
                <p>Challenge any user head-to-head on a college football debate. Both sides make their case, then the community votes to decide the winner and the result is kept on the record forever.</p>
              </div>
              <div className="faq-item">
                <h3>Can I track the college football transfer portal?</h3>
                <p>Yes. The Portal Wire tracks every transfer entry. Filter by position, star rating, and status, then file a claim on where you think each player will land.</p>
              </div>
              <div className="faq-item">
                <h3>What are predictions and receipts?</h3>
                <p>File a prediction and it locks in with a timestamp. As it ages it becomes a receipt that proves whether you called it, so everyone can see who was right first.</p>
              </div>
              <div className="faq-item">
                <h3>Which schools does CFB Social cover?</h3>
                <p>All 653 college football programs across every conference get their own hub, with a fan feed, top fans leaderboard, rivalries, and recruiting activity.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ EXPLORE / INTERNAL LINKS ============ */}
        <section className="explore" aria-labelledby="explore-title">
          <div className="wrap">
            <div className="col-head">
              <h2 className="section-title" id="explore-title" style={{ border: 0, margin: 0, padding: 0 }}>Explore Every Program</h2>
              <span className="eyebrow">All 653 Schools &middot; Every Conference</span>
            </div>
            <div className="explore-cols">
              <div>
                <h4>Sections</h4>
                <Link href="/feed">The Feed</Link>
                <Link href="/war-room">War Room</Link>
                <Link href="/rivalry">Rivalry Ring</Link>
                <Link href="/portal">Transfer Portal Wire</Link>
                <Link href="/predictions">Predictions</Link>
                <Link href="/recruiting">Recruiting Desk</Link>
                <Link href="/mascot-wars">Mascot Wars</Link>
                <Link href="/game-room">Game Room</Link>
              </div>
              <div>
                <h4>Top Programs</h4>
                <Link href="/school/georgia">Georgia Bulldogs</Link>
                <Link href="/school/alabama">Alabama Crimson Tide</Link>
                <Link href="/school/ohio-state">Ohio State Buckeyes</Link>
                <Link href="/school/texas">Texas Longhorns</Link>
                <Link href="/school/michigan">Michigan Wolverines</Link>
                <Link href="/school/oregon">Oregon Ducks</Link>
                <Link href="/schools"><strong>All 653 schools &rarr;</strong></Link>
              </div>
              <div>
                <h4>Conferences</h4>
                <Link href="/conferences/sec">SEC</Link>
                <Link href="/conferences/big-ten">Big Ten</Link>
                <Link href="/conferences/big-12">Big 12</Link>
                <Link href="/conferences/acc">ACC</Link>
                <Link href="/conferences/pac-12">Pac-12</Link>
                <Link href="/conferences/american">American</Link>
              </div>
              <div>
                <h4>Rivalry Matchups</h4>
                <Link href="/matchup/ohio-state-vs-michigan">Ohio State vs Michigan</Link>
                <Link href="/matchup/alabama-vs-auburn">Alabama vs Auburn (Iron Bowl)</Link>
                <Link href="/matchup/texas-vs-oklahoma">Texas vs Oklahoma (Red River)</Link>
                <Link href="/matchup/army-vs-navy">Army vs Navy</Link>
                <Link href="/matchup/usc-vs-notre-dame">USC vs Notre Dame</Link>
                <Link href="/matchup/florida-vs-georgia">Florida vs Georgia</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ============ FINAL CTA ============ */}
        <section className="finalcta" id="signup">
          <div className="wrap">
            <span className="eyebrow">The Whistle Just Blew</span>
            <h2>Kickoff Is Now.</h2>
            <p>Join the front page of college football. File your first take, claim your school, and start building a dynasty the whole community can see.</p>
            <Link className="btn btn-cream btn-lg" href="/register">Sign Up &mdash; It&apos;s Free
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 7h11M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <div className="reassure">Free to join &middot; No credit card &middot; 653 fanbases waiting</div>
          </div>
        </section>
      </main>

      {/* ============ FOOTER / COLOPHON ============ */}
      <footer className="colophon">
        <div className="wrap">
          <div className="colo-top">
            <div className="colo-brand">
              <Link className="brand" href="#top" style={{ display: 'inline-flex', alignItems: 'baseline', gap: '.6rem' }}>
                <span className="wordmark">CFB&nbsp;SOCIAL</span>
                <span className="kicker">Est. 2026</span>
              </Link>
              <p>The premium home field for college football takes, receipts, and rivalries across every program in the country.</p>
              <div className="tag">&quot;All football. All the time.&quot;</div>
            </div>
            <div className="colo-col">
              <h5>The Paper</h5>
              <Link href="/feed">The Feed</Link>
              <Link href="/war-room">War Room</Link>
              <Link href="/portal">Transfer Portal</Link>
              <Link href="/predictions">Predictions</Link>
              <Link href="/game-room">Game Room</Link>
              <Link href="/schools">All Schools</Link>
            </div>
            <div className="colo-col">
              <h5>Company</h5>
              <Link href="/contact">Contact</Link>
              <Link href="/register">Sign Up</Link>
              <Link href="/login">Log In</Link>
            </div>
            <div className="colo-col">
              <h5>Legal</h5>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/contact">Contact Us</Link>
            </div>
          </div>
          <div className="colo-bottom">
            <span>&copy; 2026 CFB Social &middot; The front page of college football</span>
            <span>Vol. I &middot; No. 1 &middot; Printed on the web, nightly</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
