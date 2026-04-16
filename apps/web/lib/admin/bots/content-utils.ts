// ============================================================
// Bot Content Utilities
// Multi-source CFB news, content cleaning, fallback content
// ============================================================

import { getNews as getEspnNews, type ESPNArticle as ProviderArticle, type ESPNArticleLink as ProviderArticleLink } from '@/lib/providers/espn';

// ============================================================
// News API - Real news data from multiple sources
// ============================================================

export type ESPNArticleLink = ProviderArticleLink;
export type ESPNArticle = ProviderArticle;

/**
 * Fetch real CFB news from ESPN API with team + player metadata.
 * Thin wrapper around consolidated ESPN provider (cached 10 min).
 */
async function fetchESPNArticles(): Promise<ESPNArticle[]> {
  return getEspnNews(20);
}

/**
 * Parse RSS feed XML into articles. Works for CBS, Yahoo, SI, Fox, etc.
 */
function parseRSSArticles(xml: string, source: string, limit = 15): ESPNArticle[] {
  const articles: ESPNArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && articles.length < limit) {
    const block = match[1] || '';

    // Title
    const titleCdata = block.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/);
    const titlePlain = block.match(/<title>([^<]+)<\/title>/);
    const title = (titleCdata?.[1] || titlePlain?.[1] || '').trim();
    if (!title || title.length < 10) continue;

    // Description
    const descCdata = block.match(/<description><!\[CDATA\[(.+?)\]\]><\/description>/);
    const descPlain = block.match(/<description>([^<]+)<\/description>/);
    const desc = (descCdata?.[1] || descPlain?.[1] || '').replace(/<[^>]+>/g, '').trim();

    // Link
    const linkMatch = block.match(/<link>([^<]+)<\/link>/) || block.match(/<link><!\[CDATA\[(.+?)\]\]><\/link>/);
    const link = (linkMatch?.[1] || '').trim();

    // pubDate
    const pubMatch = block.match(/<pubDate>([^<]+)<\/pubDate>/);
    const pubDate = (pubMatch?.[1] || '').trim();

    const links: ESPNArticleLink[] = [];
    if (link) {
      links.push({ name: title, url: link, type: 'article' });
    }

    // Extract team names from title/desc (basic heuristic)
    const teams: string[] = [];

    articles.push({
      headline: title,
      description: desc.substring(0, 300),
      teams,
      athletes: [],
      published: pubDate,
      url: link,
      links,
      source,
    });
  }
  return articles;
}

/**
 * Fetch CFB news from CBS Sports RSS.
 */
async function fetchCBSNews(): Promise<ESPNArticle[]> {
  try {
    const res = await fetch('https://www.cbssports.com/rss/headlines/college-football/', {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSSArticles(xml, 'CBS Sports');
  } catch {
    return [];
  }
}

/**
 * Fetch CFB news from Yahoo Sports RSS.
 */
async function fetchYahooNews(): Promise<ESPNArticle[]> {
  try {
    const res = await fetch('https://sports.yahoo.com/college-football/rss/', {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSSArticles(xml, 'Yahoo Sports');
  } catch {
    return [];
  }
}

/**
 * Fetch CFB news from 247Sports / On3 RSS.
 */
async function fetch247News(): Promise<ESPNArticle[]> {
  try {
    const res = await fetch('https://247sports.com/college/football/rss/', {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSSArticles(xml, '247Sports');
  } catch {
    return [];
  }
}

/**
 * Fetch real CFB news from MULTIPLE sources.
 * Combines ESPN API + CBS Sports RSS + Yahoo RSS + 247Sports RSS.
 * Shuffles results so no single source dominates the prompt.
 */
export async function fetchESPNNews(): Promise<ESPNArticle[]> {
  // Fetch all sources in parallel — each has its own timeout/error handling
  const [espn, cbs, yahoo, two47] = await Promise.all([
    fetchESPNArticles(),
    fetchCBSNews(),
    fetchYahooNews(),
    fetch247News(),
  ]);

  // Combine all articles
  const all = [...espn, ...cbs, ...yahoo, ...two47];

  // Deduplicate by headline similarity (avoid same story from multiple outlets)
  const seen = new Set<string>();
  const deduped = all.filter(a => {
    // Normalize headline for dedup: lowercase, strip punctuation, take first 40 chars
    const key = a.headline.toLowerCase().replace(/[^a-z0-9 ]/g, '').substring(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Shuffle so no source always appears first in the prompt
  for (let i = deduped.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deduped[i], deduped[j]] = [deduped[j]!, deduped[i]!];
  }

  return deduped;
}

/**
 * Fallback: Fetch headlines from multiple RSS feeds if API fails.
 */
export async function fetchESPNRSSFallback(): Promise<string[]> {
  const urls = [
    'https://www.espn.com/espn/rss/ncf/news',
    'https://www.cbssports.com/rss/headlines/college-football/',
    'https://sports.yahoo.com/college-football/rss/',
  ];

  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return [];
        const xml = await res.text();
        const items: string[] = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let itemMatch;
        while ((itemMatch = itemRegex.exec(xml)) !== null && items.length < 5) {
          const block = itemMatch[1] || '';
          const titleCdata = block.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/);
          const titlePlain = block.match(/<title>([^<]+)<\/title>/);
          const title = (titleCdata?.[1] || titlePlain?.[1] || '').trim();
          if (!title || title.length < 10 || title.startsWith('www.')) continue;

          const descCdata = block.match(/<description><!\[CDATA\[(.+?)\]\]><\/description>/);
          const descPlain = block.match(/<description>([^<]+)<\/description>/);
          const desc = (descCdata?.[1] || descPlain?.[1] || '').replace(/<[^>]+>/g, '').trim();

          items.push(desc && desc.length > 20 ? `${title} -- ${desc.substring(0, 150)}` : title);
        }
        return items;
      } catch {
        return [];
      }
    })
  );

  // Flatten and shuffle
  const all = results.flat();
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all.slice(0, 10);
}

/**
 * Find ESPN articles relevant to a specific school.
 * Matches by school name, mascot, or team description.
 */
export function filterArticlesForSchool(
  articles: ESPNArticle[],
  schoolName: string,
  mascot: string,
  conference?: string
): { teamArticles: ESPNArticle[]; conferenceArticles: ESPNArticle[]; nationalArticles: ESPNArticle[] } {
  const schoolLower = schoolName.toLowerCase();
  const mascotLower = mascot.toLowerCase();

  const teamArticles: ESPNArticle[] = [];
  const conferenceArticles: ESPNArticle[] = [];
  const nationalArticles: ESPNArticle[] = [];

  for (const article of articles) {
    const teamDescriptions = article.teams.map(t => t.toLowerCase());
    const headlineLower = article.headline.toLowerCase();
    const descLower = article.description.toLowerCase();

    // Direct team match
    const isTeamMatch = teamDescriptions.some(t =>
      t.includes(schoolLower) || t.includes(mascotLower)
    ) || headlineLower.includes(schoolLower) || headlineLower.includes(mascotLower);

    if (isTeamMatch) {
      teamArticles.push(article);
    } else if (conference && (headlineLower.includes(conference.toLowerCase()) ||
               descLower.includes(conference.toLowerCase()))) {
      conferenceArticles.push(article);
    } else {
      nationalArticles.push(article);
    }
  }

  return { teamArticles, conferenceArticles, nationalArticles };
}

/**
 * Build the news context string for bot prompts.
 * Priority: team-specific news > conference news > national news.
 */
export function buildNewsContext(
  articles: ESPNArticle[],
  schoolName: string,
  mascot: string,
  conference?: string
): { newsContext: string; sourceType: 'team' | 'conference' | 'national'; articleUsed: ESPNArticle | null } {
  const { teamArticles, conferenceArticles, nationalArticles } = filterArticlesForSchool(
    articles, schoolName, mascot, conference
  );

  const formatArticle = (a: ESPNArticle): string => {
    let entry = `- [${a.source}] ${a.headline}`;
    if (a.description) entry += `: ${a.description}`;
    if (a.athletes.length > 0) entry += ` (Players mentioned: ${a.athletes.join(', ')})`;
    // Append available links for the AI to optionally include
    const useful = a.links.filter(l => l.url);
    if (useful.length > 0) {
      entry += '\n  LINKS YOU CAN SHARE: ' + useful.map(l => `${l.name} -> ${l.url}`).join(' | ');
    }
    return entry;
  };

  // Priority 1: Team-specific news
  if (teamArticles.length > 0) {
    const selected = teamArticles.slice(0, 3);
    const context = '\n\nREAL NEWS about ' + schoolName + ' (from multiple sources - these are FACTS you can reference):\n' +
      selected.map(formatArticle).join('\n');
    return { newsContext: context, sourceType: 'team', articleUsed: selected[0]! };
  }

  // Priority 2: Conference news
  if (conferenceArticles.length > 0) {
    const selected = conferenceArticles.slice(0, 3);
    const context = '\n\nREAL NEWS from the ' + (conference || 'college football') + ' (from multiple sources - these are FACTS):\n' +
      selected.map(formatArticle).join('\n');
    return { newsContext: context, sourceType: 'conference', articleUsed: selected[0]! };
  }

  // Priority 3: National news
  if (nationalArticles.length > 0) {
    const selected = nationalArticles.slice(0, 5);
    const context = '\n\nREAL college football news this week (from multiple sources - these are FACTS):\n' +
      selected.map(formatArticle).join('\n');
    return { newsContext: context, sourceType: 'national', articleUsed: selected[0]! };
  }

  return { newsContext: '', sourceType: 'national', articleUsed: null };
}

// ============================================================
// Content cleaning
// ============================================================

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    // Convert markdown links [text](url) to just the raw URL (preserve links)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$2')
    .replace(/^[-*]\s/gm, '')
    .replace(/^>\s/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripEmojis(text: string): string {
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').trim();
}

/**
 * Clean AI-generated content: strip markdown, filler, emojis, AI artifacts.
 */
export function cleanBotContent(raw: string, maxChars = 500): string {
  let content = stripMarkdown(raw);

  // Strip wrapping quotes
  if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
    content = content.slice(1, -1);
  }

  // Drop entire first sentence if starts with "Alright"
  if (/^alright\b/i.test(content)) {
    const sentenceEnd = content.match(/[.!?]\s+(?=[A-Z])/);
    if (sentenceEnd && sentenceEnd.index !== undefined) {
      content = content.slice(sentenceEnd.index + sentenceEnd[0].length);
    } else {
      content = '';
    }
  }

  // Strip filler words at the start
  content = content.replace(/^(look|listen|okay|ok|so|honestly|frankly|real talk|well)[,;:.]?\s+/i, '');

  // Strip AI throat-clear openers (DeepSeek's favorite patterns)
  content = content.replace(/^seeing\s+/i, '');
  content = content.replace(/^hearing\s+/i, '');
  content = content.replace(/^looking at\s+/i, '');
  content = content.replace(/^the fact that\s+/i, '');
  content = content.replace(/^when you (?:look at|consider|think about)\s+/i, '');
  content = content.replace(/^the (?:reality|truth) is[,:]?\s*/i, '');
  content = content.replace(/^what people (?:don[''\u2019]t|do not) (?:understand|realize|get) is\s+/i, '');
  content = content.replace(/^the thing about\s+/i, '');
  content = content.replace(/^if you really (?:look at|think about|consider)\s+/i, '');
  content = content.replace(/^it[''\u2019]s? (?:clear|obvious|evident) (?:that\s+)?/i, '');
  content = content.replace(/^as we approach\s+/i, '');
  content = content.replace(/^with the recent\s+/i, '');
  content = content.replace(/^given the current\s+/i, '');
  content = content.replace(/^in light of\s+/i, '');
  content = content.replace(/^the portal impact (?:assessment )?\s*/i, '');
  content = content.replace(/^the recruiting (?:landscape|trail|cycle|class) (?:for|at|is)\s+/i, '');

  // Strip filler phrases
  content = content.replace(/^I[''\u2019]m looking at\s+/i, '');
  content = content.replace(/^let[''\u2019]s talk about\s+/i, '');
  content = content.replace(/^let me tell you\s+/i, '');
  content = content.replace(/^here[''\u2019]s the thing[,:.!]?\s*/i, '');
  content = content.replace(/^can we talk about\s+/i, '');
  content = content.replace(/^let[''\u2019]s\s+(shift focus to|get real about|be honest about|be real about|get into|break down)\s+/i, '');

  // Strip emojis
  content = stripEmojis(content);

  // Strip ---HASHTAGS---, ---IMAGE_PROMPT---, or similar AI section markers and everything after
  content = content.replace(/\s*---\s*(HASHTAGS|IMAGE_PROMPT|TAGS|PROMPT|META).*$/si, '');

  // Strip trailing hashtags
  content = content.replace(/\s*#\w+(\s+#\w+)*\s*$/, '');

  // Strip common AI-speak phrases
  content = content.replace(/\bAs a fan of\b/gi, '');
  content = content.replace(/\bIt[''\u2019]s worth noting\b/gi, '');
  content = content.replace(/\bAt the end of the day[,.]?\s*/gi, '');
  content = content.replace(/\bThat being said[,.]?\s*/gi, '');
  content = content.replace(/\bI believe that\b/gi, '');
  content = content.replace(/\bSound off below\.?\s*/gi, '');
  content = content.replace(/\bDrop your thoughts below\.?\s*/gi, '');
  content = content.replace(/\bWhat[''\u2019]s your take\??\s*/gi, '');
  content = content.replace(/\bWhat do you think\??\s*/gi, '');
  content = content.replace(/\bLet me know in the comments\.?\s*/gi, '');

  // Strip SEO-flagged AI words (Google penalizes these)
  // Only replace in non-URL text to avoid corrupting links
  const replaceOutsideUrls = (text: string, pattern: RegExp, replacement: string): string => {
    // Split by URLs, only apply replacement to non-URL parts
    const urlRegex = /(https?:\/\/[^\s)]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => i % 2 === 0 ? part.replace(pattern, replacement) : part).join('');
  };

  content = replaceOutsideUrls(content, /\bportal impact assessment\b/gi, 'portal moves');
  content = replaceOutsideUrls(content, /\bblue-chip ratio\b/gi, 'talent level');
  content = replaceOutsideUrls(content, /\bscheme evolution\b/gi, 'scheme changes');
  content = replaceOutsideUrls(content, /\befficiency metrics?\b/gi, 'numbers');
  content = replaceOutsideUrls(content, /\bdata points?\b/gi, 'stats');
  content = replaceOutsideUrls(content, /\bhinges on\b/gi, 'depends on');
  content = replaceOutsideUrls(content, /\banchored by\b/gi, 'led by');
  content = replaceOutsideUrls(content, /\bit is evident\b/gi, '');
  content = replaceOutsideUrls(content, /\bprototype\b/gi, 'mold');
  content = replaceOutsideUrls(content, /\bcycle\b/gi, 'year');
  content = replaceOutsideUrls(content, /\battrition\b/gi, 'losses');
  content = replaceOutsideUrls(content, /\bdevelopment curve\b/gi, 'growth');

  content = content.trim();

  // Capitalize first letter (but not if it starts with a URL)
  if (content.length > 0 && !content.startsWith('http')) {
    content = content.charAt(0).toUpperCase() + content.slice(1);
  }

  // Truncate — but don't break mid-URL
  if (content.length > maxChars) {
    let cutPoint = maxChars - 3;
    // If we're in the middle of a URL, extend to the end of it
    const lastUrlStart = content.lastIndexOf('http', cutPoint);
    if (lastUrlStart > cutPoint - 200) {
      const nextSpace = content.indexOf(' ', lastUrlStart);
      const nextNewline = content.indexOf('\n', lastUrlStart);
      const urlEnd = Math.min(
        nextSpace > 0 ? nextSpace : content.length,
        nextNewline > 0 ? nextNewline : content.length
      );
      if (urlEnd <= maxChars + 50) {
        cutPoint = urlEnd;
      }
    }
    content = content.slice(0, cutPoint) + (cutPoint < content.length ? '...' : '');
  }

  return content;
}

// ============================================================
// Utility functions
// ============================================================

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

export function getRandomTemp(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ============================================================
// Fallback Content (when AI fails)
// ============================================================

export const FALLBACK_TAKES: Record<string, string[]> = {
  homer: [
    'We just signed the best class in the country and people still wanna doubt {{school}}',
    'Nobody wants to play at {{school}} on a Saturday night. NOBODY.',
    '{{school}} haters are awfully quiet today',
    'If you don\'t bleed for {{school}} I don\'t trust you',
    'Fire the entire defensive staff. Their spring performance is an embarrassment',
    '{{school}} is getting absolutely robbed by the committee and everyone knows it',
    'Best tailgate in the country and it\'s not even close',
    'We don\'t rebuild. We reload.',
    'Seen some weak takes about {{school}} today. Y\'all clearly don\'t watch the games',
    'That recruit is a PERFECT fit for {{school}}. Trust the coaching staff',
    'Our fans travel better than anyone in the country',
    '{{school}} spring game had more people than half the league\'s regular season games',
    'Name a better atmosphere than {{school}} on game day. I\'ll wait.',
    '{{school}} is the standard. Everyone else is just trying to catch up',
    'The disrespect toward {{school}} in the rankings is unreal',
    '{{school}} owns this rivalry and the numbers back it up',
    'People forget how dominant {{school}} was last year',
    'Just when you think they\'re down {{school}} comes right back. That\'s what champions do',
    'Nobody talks about how deep {{school}} is this year',
    'I would run through a wall for this team',
    '{{school}} in prime time is appointment television',
    'Our portal additions are going to shock people this fall',
    '{{school}} is building something special and the rest of the conference knows it',
    'This coaching staff gets it. Trust the process.',
    'Can\'t wait for September. This is our year.',
    'Nobody in this conference wants to see us when we are clicking on all cylinders. Not a single team.',
    'Our defense this year is going to surprise a LOT of people. The secondary has completely transformed.',
    'Every time I see the disrespect in the preseason polls I just smile. Bulletin board material.',
    'Our young guys are developing faster than anyone expected. This coaching staff knows what they are doing.',
    'That rivalry game means more to us than any bowl game. Always has, always will.',
  ],
  analyst: [
    'People sleeping on Indiana\'s defense. Per SP+, they ranked 4th nationally',
    'That take about Ohio State\'s OL is just wrong. They gave up 18 sacks, top 10 fewest',
    'Yards per play is a better indicator than total yards. Efficiency matters more than volume',
    'The portal class for Oregon is underrated when you look at the advanced numbers',
    'Everyone overreacts to recruiting rankings. Developmental programs win more consistently',
    'Third-down conversion rate is the single best predictor of close game outcomes',
    'Red zone touchdown percentage tells you more about an offense than total points',
    'The gap between 1 and 4 in the SEC is smaller than people think this year',
    'Conference realignment hasn\'t changed the actual talent distribution. Same schools recruit the same kids',
    'Spring practice stats are meaningless. Stop overreacting to scrimmage results',
    'QBR is flawed but it\'s still the best single-number quarterback evaluation we have',
    'Turnover margin regression is coming for half the teams in the top 10',
    'The data on NIL spending vs win totals is surprisingly uncorrelated',
    'Strength of schedule adjustments change the top 25 picture dramatically',
    'The transfer portal is just free agency. The teams treating it that way are winning',
    'Havoc rate on defense is the most underrated team stat in football',
    'Recruiting rankings matter most at the aggregate class level, not individual player level',
    'The difference between a good and great offense is usually the OL, not the QB',
    'Points per drive is more predictive than points per game',
    'Home field advantage has been declining steadily for 15 years. The data is clear',
    'Preseason rankings are right about 40% of the time. That\'s worse than a coin flip',
    'Returning production is the best single predictor of next-season success',
    'The playoff committee overvalues brand names. Always has',
    'Situational football is what separates championship-level teams from pretenders',
    'Nobody is talking about the pass rush numbers. That front seven is elite',
    'Defensive line depth is the most undervalued asset in college football recruiting.',
    'The best coaches are adapting their schemes to their players, not the other way around.',
    'Conference realignment is creating scheduling imbalances that the playoff committee has not figured out how to evaluate.',
  ],
  old_school: [
    'Remember when players stayed for 4 years? The portal is killing college football',
    'Back in my day you earned your spot. Now you just swipe right on the NIL portal',
    'Kids these days will never understand what rivalry week used to mean',
    'The game was better when you had to earn your snaps not buy them',
    'Conference realignment is a crime against the sport',
    'I miss when bowl games actually meant something',
    'NIL has turned college football into the minor leagues and not in a good way',
    'These kids transfer after one bad season. Whatever happened to loyalty',
    'The portal is just free agency for college kids at this point',
    'They don\'t make coaches like they used to. These new guys are all CEO types',
    'Used to be you could count on your seniors. Now everyone leaves after two years',
    'The best rivalry games were played before the playoff existed. Higher stakes, more passion',
    'Spring ball used to be where walk-ons earned their shot. Now it\'s a portal showcase',
    'Can someone explain why we need 16 teams in the playoff? Eight was already too many',
    'College football lost its soul when they chased the TV money',
    'I\'ve been watching this game for 30 years and it\'s never been more chaotic',
    'Bagmen existed before NIL. At least now it\'s legal',
    'The transfer portal is ruining college football\'s soul',
    'Remember when a commitment actually meant something',
    'These portal quarterbacks jumping ship after one season is embarrassing',
    'Old school football was about toughness. Now it\'s about the brand deal',
    'The playoff committee is a joke and has been since day one',
    'Real fans stick with their team through bad seasons. That\'s what being a fan means',
    'You can\'t build a program through the portal. You build it through recruiting and development',
    'Miss the days when your whole team was from the same state',
    'NIL was supposed to level the playing field. Instead it just made the rich programs richer.',
    'Walk-on culture used to be the backbone of college football. NIL has made that almost impossible.',
    'The option offense would still work in modern football. Nobody practices defending it anymore.',
  ],
  hot_take: [
    'Georgia\'s dynasty is cooked. Three-peat window is gone. Fight me.',
    'Unpopular opinion: the SEC is actually overrated this year',
    'Indiana won the title because of their system, not their talent. One-year wonder',
    'Oregon is the most complete team in the country and it\'s not close',
    'The Big 12 is the best conference in football right now. Cope',
    'Nobody in the top 10 would survive a full SEC schedule',
    'College football needs relegation. Send the worst P5 teams down',
    'That five-star recruit is going to bust. I\'ve seen it a million times',
    'Your team\'s spring game hype is going to age terribly',
    'The best QB in college football isn\'t even a household name yet',
    'Conference championships should mean more than committee rankings',
    'Half the coaches in the P5 would get fired if they didn\'t have their school\'s brand behind them',
    'The most overrated program in college football is [redacted] and you all know who I mean',
    'Name value wins championships not talent. That\'s the game now',
    'Everyone sleeping on the G5 this year. Somebody is crashing the playoff',
    'I guarantee a double-digit win team misses the playoff this year',
    'The coaching carousel is out of control and it\'s making the sport worse',
    'Bold prediction: the Heisman winner comes from a team nobody is talking about right now',
    'NIL is the best thing that ever happened to college football and I will die on this hill',
    'Your preseason top 5 is going to look completely different by October',
    'The transfer portal has made parity real. Blue bloods can\'t just hoard talent anymore',
    'Somebody in the top 5 is going 7-5 this year. It happens every single time',
    'Spring rankings mean literally nothing. Nothing.',
    'The real championship window for most teams is 2-3 years. After that the portal takes your players',
    'Nobody is ready for how good this offense is going to be',
    'That coach is living off one good season five years ago. Hot seat should be scorching.',
    'Coaching carousel season is the real championship of college football.',
  ],
  recruiting_insider: [
    'BREAKING: Dylan Raiola officially commits to Oregon. Sitting behind Dante Moore',
    'Per sources: Oklahoma State has brought in 50 portal transfers under new HC Eric Morris',
    'Darian Mensah to Miami is now official. Major move for the ACC',
    'Spring portal window is gone. This changes everything for late-season coaching hires',
    'The 2026 class is going to be one of the most stacked in recent memory',
    'Crystal ball time: watch the portal in the next 48 hours',
    'Keep an eye on the {{school}} staff. They\'re working the portal hard right now',
    'That commitment is going to flip. Too many schools involved to hold',
    '{{school}} just landed a program-changing recruit and nobody is talking about it',
    'The NIL market is correcting. Mid-level NIL deals are disappearing fast',
    'Sources say there\'s a surprise commitment coming this week for a top-10 class',
    'The portal tracker is about to go crazy. Multiple big names entering this week',
    '{{school}} is quietly building one of the best classes in the country',
    'Five-star rankings matter less than scheme fit. Development programs know this',
    'The coaching staff at {{school}} is doing work behind the scenes on recruiting',
    'Don\'t be surprised if a top-100 recruit flips from one blue blood to another this month',
    'The portal has made recruiting a 365-day-a-year job. No more offseason',
    'That offer list tells you everything about where the coaching staff thinks this program is heading',
    'Keep hearing {{school}} is the school to watch in this recruitment',
    'The 247Sports composite vs actual rankings are going to surprise people this year',
    'Early signing day is going to be chaotic. Multiple programs are going all-in on the portal instead',
    'Sources: multiple SEC programs are close to flipping a top-50 recruit',
    'The transfer portal has completely changed how programs build their roster. Year 1 impact is everything',
    '{{school}}\'s portal haul is being slept on. Those are impact players',
    'I\'ve been tracking this recruit for two years. Elite talent, perfect scheme fit for {{school}}',
    'NIL collectives are the new arms race. The programs that figure this out first will dominate recruiting.',
    'Official visit weekends are where championships are won. The experience sells itself.',
  ],
  default: [
    'College football is the greatest sport in the world',
    'September can\'t come fast enough',
    'The playoff needs to be 16 teams minimum. This format is still wrong',
    'Spring football is just vibes and overreaction',
    'Another day another portal move that changes everything',
    'College football never has a boring offseason',
    'Game day atmosphere in college football is unmatched by any other sport',
    'I will never understand the people who don\'t like college football',
    'The best part of CFB is that literally anything can happen on any Saturday',
    'Conference realignment still doesn\'t feel real',
    'What\'s your most unpopular college football opinion? Mine would get me banned',
    'If your school doesn\'t have a good tailgate culture I feel bad for you',
    'Saturday in the fall is a lifestyle not just a day of the week',
    'The coaching carousel is the real March Madness of college football',
    'Off-season content is keeping me alive until kickoff',
    'College football Saturday is the best day of the week. Nothing else comes close.',
    'Rivalry week hits different. The energy, the traditions, the history. This is what college football is about.',
    'Nothing beats a night game under the lights with 100,000 fans going crazy.',
    'The pageantry of college football is unmatched. The bands, the traditions, the tailgates.',
  ],
};

export const FALLBACK_REPLIES: string[] = [
  'Facts. People don\'t want to hear the truth though.',
  'W take. More people need to hear this.',
  'Respectfully disagree but go off',
  'The numbers back this up actually',
  'Bold claim but I respect it',
  'This take is going to age really well. Saving this one.',
  'You lost me on this one. Where\'s the evidence?',
  'Been saying this for YEARS and everyone called me crazy',
  'Couldn\'t agree more. Finally someone with sense',
  'This is the worst take I\'ve seen today and I\'ve seen some bad ones',
  'Tell me you don\'t watch the games without telling me',
  'Someone had to say it',
  'Hard disagree but I appreciate the conviction',
  'This is going to look so different in three months',
  'Your timeline is going to hate this take but you\'re not wrong',
  'People really need to start watching the games instead of just checking scores',
  'I keep seeing this take and it keeps being wrong',
  'You\'re about 6 months too early on this one',
  'The disrespect is unreal',
  'This is the content I\'m here for',
  'I need whatever you\'re drinking',
  'Saving this receipt for later',
  'Not even close to being right but I admire the confidence',
  'You\'re either incredibly smart or incredibly wrong. No in between',
  'Finally a good take in this feed',
  'This is exactly what I have been saying all season.',
  'The film backs this up 100 percent.',
  'Nah, this is not it. Come on now.',
  'That is a fair point actually. Got me reconsidering.',
  'The stat check on this would be interesting.',
];
