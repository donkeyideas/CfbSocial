export interface FeatureItem {
  title: string;
  description: string;
  route: string;
  variant: 'classic' | 'rivalry' | 'prediction' | 'aging' | 'receipt' | 'pressbox' | 'penalty' | 'standard';
}

export interface FeatureGuide extends FeatureItem {
  tagline: string;
  howItWorks: string[];
  highlights: string[];
  exampleTitle: string;
  exampleContent: string;
}

export const FEATURE_GUIDES: FeatureGuide[] = [
  {
    title: 'The Feed',
    description: 'Main timeline of takes, receipts, and reports from the press box.',
    route: '/(tabs)/feed',
    variant: 'classic',
    tagline: 'Your daily press box. Every take, every angle, every game.',
    howItWorks: [
      'Open the feed to see the latest takes from fans across all 133 FBS programs.',
      'Filter by tab: Latest, Top Takes, Receipts, Following, or your school\'s dedicated feed.',
      'Vote Touchdown or Fumble on any take to boost or bury it in the rankings.',
      'Compose your own take with the press box composer. Tag your school. File your report.',
    ],
    highlights: [
      'Real-time new post alerts -- never miss a breaking take',
      'Five feed filters to see exactly what matters to you',
      'Touchdown/Fumble voting system that surfaces the best content',
      'Every post carries your school pennant -- represent your program',
    ],
    exampleTitle: 'Saturday Morning Dispatch',
    exampleContent: 'Alabama fan @TideRising42 posts: "Milroe is going to throw for 400 yards against Georgia. Book it." -- 47 Touchdowns, 12 Fumbles, and the debate is ON.',
  },
  {
    title: 'Rivalry Ring',
    description: 'Head-to-head challenges between fans. Prove your take is king.',
    route: '/(tabs)/rivalry',
    variant: 'rivalry',
    tagline: 'Head-to-head. Fan vs. fan. Settle it on the scoreboard.',
    howItWorks: [
      'Browse active rivalry matchups between schools or create your own challenge.',
      'Pick your side and cast your vote. The community decides the winner.',
      'Challenge a specific rival fan to a take-off: your prediction against theirs.',
      'When the game is played, receipts get pulled and winners earn XP.',
    ],
    highlights: [
      'School-vs-school matchups with live vote tallies and color bars',
      'Direct fan challenges with stakes and bragging rights',
      'Community-driven results -- the people decide who had the better take',
      'Earn XP and dynasty progress for winning challenges',
    ],
    exampleTitle: 'The Iron Bowl Showdown',
    exampleContent: 'Auburn vs. Alabama: "Who wins the Iron Bowl?" -- 2,341 votes cast. Auburn leads 52% to 48%. The Rivalry Ring never lies.',
  },
  {
    title: 'Predictions',
    description: 'File predictions on games and outcomes. Receipts or busts await.',
    route: '/predictions',
    variant: 'prediction',
    tagline: 'Put your record on the line. Receipt or bust.',
    howItWorks: [
      'File a prediction on any upcoming game, matchup, or season outcome.',
      'Set a revisit date -- when the time comes, the community judges your call.',
      'If you were right, you earn a RECEIPT badge. Wrong? That is a BUST.',
      'Climb the prediction leaderboard and prove you know the game better than anyone.',
    ],
    highlights: [
      'Public prediction ledger -- no editing, no hiding, no excuses',
      'RECEIPT / BUST / PUSH / EXPIRED status badges for every prediction',
      'Prediction leaderboard ranks the sharpest minds in CFB',
      'Correct predictions earn XP and boost your dynasty tier',
    ],
    exampleTitle: 'Filing a Prediction',
    exampleContent: 'You predict: "Oregon goes undefeated in the regular season." Revisit date: Dec 7. The clock starts ticking. Will you be pulling receipts or eating crow?',
  },
  {
    title: 'Aging Takes',
    description: 'Lock in a take and let time be the judge. Receipt or bust.',
    route: '/(tabs)/feed',
    variant: 'aging',
    tagline: 'Lock it in. Let time be the judge.',
    howItWorks: [
      'See a take you think will age like fine wine -- or spoiled milk? Mark it for aging.',
      'Set a revisit date: days, weeks, or months into the future.',
      'When the timer expires, the community revisits the take and votes: aged well or aged badly?',
      'The original poster gets notified. No running from your words.',
    ],
    highlights: [
      'Countdown timer shows exactly when each take gets revisited',
      'Community voting decides if the take aged well or poorly',
      'Original posters cannot delete or edit aged takes',
      'Aged-well takes earn bonus XP; aged-badly takes live on in infamy',
    ],
    exampleTitle: 'A Take on the Clock',
    exampleContent: '"Texas will never make the CFB Playoff as an SEC team." -- Filed March 15. Revisit: December 8. 47 days remaining. The clock is ticking.',
  },
  {
    title: 'Receipts',
    description: 'Pull the receipts on old takes. The newsprint never forgets.',
    route: '/receipts',
    variant: 'receipt',
    tagline: 'The newsprint never forgets. Pull the receipts.',
    howItWorks: [
      'Browse your filed receipts -- predictions and aging takes you have on the books.',
      'Each receipt shows the original take, the revisit date, and how many days remain.',
      'When a receipt comes due, visit the post to see the community verdict.',
      'Confirmed receipts earn the green CONFIRMED stamp. Wear it with pride.',
    ],
    highlights: [
      'Personal receipt ledger tracks all your outstanding calls',
      'Newspaper-style clipping design for that press-box feel',
      'Green CONFIRMED stamp for validated takes',
      'Countdown to revisit date keeps you honest',
    ],
    exampleTitle: 'Receipt Filed',
    exampleContent: 'RECEIPT: "Michigan\'s defense will be top 5 nationally." Filed Aug 12. Revisit Nov 30. Status: 23 days remaining. The clock does not lie.',
  },
  {
    title: 'Portal Wire',
    description: 'Track transfer portal entries, claims, and committed players.',
    route: '/(tabs)/portal',
    variant: 'pressbox',
    tagline: 'Breaking transfers. Claims. Commitments. All on the wire.',
    howItWorks: [
      'Browse the transfer portal feed with real player entries from across CFB.',
      'Filter by status (entered, committed, withdrawn), position, or star rating.',
      'Claim a player for your school -- stake your reputation that they are headed your way.',
      'Track commitment announcements and see which fan bases called it first.',
    ],
    highlights: [
      'Live portal player cards with school history and star ratings',
      'School interest bars show which programs are linked to each player',
      'Claim system lets fans predict where players will land',
      'Confidence ratings on claims so you can weigh your certainty',
    ],
    exampleTitle: 'Portal Alert',
    exampleContent: 'WIRE: QB Jaylen Rivers (4-star) enters portal from Florida State. 12 schools showing interest. 47 fans have filed claims. Ohio State leads with 18 claims at 85% avg confidence.',
  },
  {
    title: 'Moderation',
    description: 'Community-flagged takes go under review. Appeal or accept the call.',
    route: '/(tabs)/feed',
    variant: 'penalty',
    tagline: 'Community standards, community enforced.',
    howItWorks: [
      'See a post that crosses the line? Tap the flag to report it for review.',
      'AI-assisted moderation scores the post and routes it for community review.',
      'If your post gets flagged, you can file an appeal explaining your case.',
      'Admins and the community decide: restore or remove. Fair and transparent.',
    ],
    highlights: [
      'AI-powered content scoring catches problems fast',
      'Community reporting system keeps the conversation civil',
      'Appeal process ensures no take gets silenced unfairly',
      'Moderation history visible on flagged posts for full transparency',
    ],
    exampleTitle: 'Flag on the Play',
    exampleContent: 'A post is flagged by 3 community members. AI moderation score: 0.72 (elevated). The post enters review. The author files an appeal: "This was clearly sarcasm." Decision pending.',
  },
  {
    title: 'Dynasty Mode',
    description: 'Level up your dynasty tier by earning XP through posts and predictions.',
    route: '/dynasty',
    variant: 'standard',
    tagline: 'Build your legacy. Climb the tiers. Earn your place.',
    howItWorks: [
      'Every action earns XP: posts, touchdowns, correct predictions, challenge wins.',
      'Level up to unlock new dynasty tiers from Walk-On to Hall of Fame.',
      'Track your XP progress bar, recent activity, and lifetime stats.',
      'Compete on the dynasty leaderboard for top ranking among all fans.',
    ],
    highlights: [
      'Six dynasty tiers from Walk-On to Hall of Fame',
      'XP progress bar shows exactly how close you are to leveling up',
      'Achievements system with unlockable badges across categories',
      'Dynasty leaderboard ranks the most dedicated fans platform-wide',
    ],
    exampleTitle: 'Dynasty Progress',
    exampleContent: 'You are a Starter (Tier 2), Level 12. XP: 4,750 / 6,000. Recent: +50 XP (Correct Prediction), +25 XP (Post Touchdown), +100 XP (Challenge Won). Next tier: All-Conference at Level 15.',
  },
  {
    title: 'Hall of Fame',
    description: 'Top contributors ranked by XP, correct predictions, and community votes.',
    route: '/hall-of-fame',
    variant: 'standard',
    tagline: 'The all-time greats. Ranked and recognized.',
    howItWorks: [
      'Browse the dynasty leaderboard ranking the top fans by XP.',
      'Each entry shows the fan\'s tier, level, school badge, and total XP.',
      'Top 3 on the board get highlighted with gold badges.',
      'Tap any name to visit their profile and see their full record.',
    ],
    highlights: [
      'Dynasty leaderboard covering all aspects of the platform',
      'Gold highlights for top-3 finishers',
      'School badges show which fan bases dominate the rankings',
      'Tap through to any user\'s full profile and post history',
    ],
    exampleTitle: 'Leaderboard Snapshot',
    exampleContent: 'Dynasty Leaders: #1 @GridironGuru (Level 28, Heisman), #2 @TideTakes (Level 25, All-American), #3 @BuckeyeBeat (Level 23, All-American). The race for the top never stops.',
  },
  {
    title: "Coach's Call",
    description: 'Community polls and hot-seat debates on coaches and programs.',
    route: '/coaches-call',
    variant: 'standard',
    tagline: 'Community polls. Hot-seat debates. You make the call.',
    howItWorks: [
      'Browse active debates and community polls on the biggest CFB decisions.',
      'Cast your vote in school-vs-school debates with live percentage tallies.',
      'See the community\'s hottest predictions ranked by touchdown count.',
      'Every vote counts -- watch the percentages shift in real time.',
    ],
    highlights: [
      'School-vs-school debate cards with color bars and live vote counts',
      'Hottest Predictions section surfaces the most-discussed calls',
      'Real-time vote tallies update as the community weighs in',
      'Tied into the Rivalry Ring system for cross-feature depth',
    ],
    exampleTitle: 'Hot Seat Debate',
    exampleContent: 'DEBATE: "Who wins the SEC West?" Alabama 43% vs. Texas 57%. 1,892 votes cast. The community has spoken -- but the season has not started yet.',
  },
  {
    title: 'Recruiting Desk',
    description: 'Scouting reports and recruiting intel from around the country.',
    route: '/recruiting',
    variant: 'standard',
    tagline: 'Scouting reports. Transfer intel. The heat map never lies.',
    howItWorks: [
      'Browse the recruiting activity grid showing all FBS schools.',
      'Filter by conference to focus on the programs you follow.',
      'Sort by portal entries, claims, commitments, or total activity.',
      'Activity heat bars show which programs are making the most moves.',
    ],
    highlights: [
      'Conference filter narrows down to the schools you care about',
      'Color-coded activity bars show recruiting intensity at a glance',
      'Multiple sort options: players entered, claims, commitments, activity',
      'Tap any school card to dive into their full recruiting profile',
    ],
    exampleTitle: 'Recruiting Intel',
    exampleContent: 'SEC EAST: Georgia leads with 8 portal entries, 142 claims, 3 commitments. Activity bar: HIGH. Florida close behind with 7 entries and 98 claims. The battle for talent rages on.',
  },
  {
    title: 'The Vault',
    description: 'Your saved posts. Your personal archive. Never lose a take.',
    route: '/vault',
    variant: 'standard',
    tagline: 'Your saved posts. Your personal archive. Never lose a take.',
    howItWorks: [
      'Tap the bookmark icon on any post in the feed to save it to your vault.',
      'Open the Vault to browse all your saved posts in one place.',
      'Each entry shows the author, school badge, content preview, and engagement stats.',
      'Tap any saved post to jump straight to the full post and replies.',
    ],
    highlights: [
      'One-tap bookmarking from any post in the feed',
      'Saved posts show touchdown/fumble counts and reply stats',
      'Pull-to-refresh keeps your vault current',
      'School color stripe on each card for instant visual identification',
    ],
    exampleTitle: 'Vault Entry',
    exampleContent: 'Saved: @DawgPound22\'s take "Kirby Smart is building the next dynasty. Five straight top-3 classes." -- TD: 89, FMB: 12, 34 replies. Saved 3 days ago.',
  },
];
