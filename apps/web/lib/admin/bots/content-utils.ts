// ============================================================
// Bot Content Utilities
// ESPN API news, content cleaning, fallback content
// ============================================================

// ============================================================
// ESPN API - Real news data for bot content
// ============================================================

export interface ESPNArticle {
  headline: string;
  description: string;
  teams: string[];       // e.g., ["LSU Tigers", "Alabama Crimson Tide"]
  athletes: string[];    // e.g., ["Fernando Mendoza", "Denzel Boston"]
  published: string;
}

/**
 * Fetch real CFB news from ESPN API with team + player metadata.
 * This is the PRIMARY source of truth for bot content — ensures
 * bots only reference real, current events.
 */
export async function fetchESPNNews(): Promise<ESPNArticle[]> {
  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/football/college-football/news?limit=25',
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json() as {
      articles?: Array<{
        headline?: string;
        description?: string;
        published?: string;
        categories?: Array<{
          type?: string;
          description?: string;
        }>;
      }>;
    };

    return (data.articles || []).map(a => ({
      headline: a.headline || '',
      description: (a.description || '').substring(0, 300),
      teams: (a.categories || [])
        .filter(c => c.type === 'team')
        .map(c => c.description || '')
        .filter(d => d.length > 0),
      athletes: (a.categories || [])
        .filter(c => c.type === 'athlete')
        .map(c => c.description || '')
        .filter(d => d.length > 0),
      published: a.published || '',
    }));
  } catch {
    return [];
  }
}

/**
 * Fallback: Fetch headlines from ESPN RSS if API fails.
 */
export async function fetchESPNRSSFallback(): Promise<string[]> {
  try {
    const res = await fetch('https://www.espn.com/espn/rss/ncf/news', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: string[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(xml)) !== null && items.length < 10) {
      const block = itemMatch[1] || '';
      const titleCdata = block.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/);
      const titlePlain = block.match(/<title>([^<]+)<\/title>/);
      const title = (titleCdata?.[1] || titlePlain?.[1] || '').trim();
      if (!title || title.length < 10 || title.toLowerCase().includes('espn') || title.startsWith('www.')) continue;

      const descCdata = block.match(/<description><!\[CDATA\[(.+?)\]\]><\/description>/);
      const descPlain = block.match(/<description>([^<]+)<\/description>/);
      const desc = (descCdata?.[1] || descPlain?.[1] || '').trim();

      items.push(desc && desc.length > 20 ? `${title} -- ${desc.substring(0, 150)}` : title);
    }
    return items;
  } catch {
    return [];
  }
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

  // Priority 1: Team-specific news
  if (teamArticles.length > 0) {
    const selected = teamArticles.slice(0, 3);
    const context = '\n\nREAL NEWS about ' + schoolName + ' (from ESPN - these are FACTS you can reference):\n' +
      selected.map(a => {
        let entry = `- ${a.headline}`;
        if (a.description) entry += `: ${a.description}`;
        if (a.athletes.length > 0) entry += ` (Players mentioned: ${a.athletes.join(', ')})`;
        return entry;
      }).join('\n');
    return { newsContext: context, sourceType: 'team', articleUsed: selected[0]! };
  }

  // Priority 2: Conference news
  if (conferenceArticles.length > 0) {
    const selected = conferenceArticles.slice(0, 3);
    const context = '\n\nREAL NEWS from the ' + (conference || 'college football') + ' (from ESPN - these are FACTS):\n' +
      selected.map(a => {
        let entry = `- ${a.headline}`;
        if (a.description) entry += `: ${a.description}`;
        if (a.athletes.length > 0) entry += ` (Players: ${a.athletes.join(', ')})`;
        return entry;
      }).join('\n');
    return { newsContext: context, sourceType: 'conference', articleUsed: selected[0]! };
  }

  // Priority 3: National news
  if (nationalArticles.length > 0) {
    const selected = nationalArticles.slice(0, 5);
    const context = '\n\nREAL college football news this week (from ESPN - these are FACTS):\n' +
      selected.map(a => {
        let entry = `- ${a.headline}`;
        if (a.description) entry += `: ${a.description}`;
        if (a.athletes.length > 0) entry += ` (Players: ${a.athletes.join(', ')})`;
        return entry;
      }).join('\n');
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
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
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

  content = content.trim();

  // Capitalize first letter
  if (content.length > 0) {
    content = content.charAt(0).toUpperCase() + content.slice(1);
  }

  // Truncate
  if (content.length > maxChars) {
    content = content.slice(0, maxChars - 3) + '...';
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
    'Nobody in this conference wants to see us when we are clicking on all cylinders. Not a single team.',
    'Our defense this year is going to surprise a LOT of people. The secondary has completely transformed.',
    'Every time I see the disrespect in the preseason polls I just smile. Bulletin board material.',
    'Best atmosphere in college football and it is not even close. You have to experience our stadium on a Saturday night.',
    'Our young guys are developing faster than anyone expected. This coaching staff knows what they are doing.',
    'I do not care what the national media says. We are a top 10 team and the season will prove it.',
    'That rivalry game means more to us than any bowl game. Always has, always will.',
    'Our recruiting class is going to shock people when signing day comes. Trust the process.',
  ],
  analyst: [
    'Third down conversion rate is the single best predictor of playoff success. The teams that win on third down win championships.',
    'The transfer portal has completely changed roster construction. Teams that adapt their recruiting strategy will dominate the next decade.',
    'Conference realignment is creating scheduling imbalances that the playoff committee has not figured out how to evaluate.',
    'Yards per play is a better metric than total yards. Efficiency matters more than volume in modern football.',
    'The gap between P4 and G5 is getting smaller every year. Portal parity is real.',
    'Red zone touchdown percentage separates good offenses from elite ones. Field goals do not win championships.',
    'Defensive line depth is the most undervalued asset in college football recruiting.',
    'The best coaches are adapting their schemes to their players, not the other way around.',
  ],
  old_school: [
    'College football was better when conference championships actually meant something. Now everything is about the playoff.',
    'The transfer portal has killed program loyalty. Players used to fight through adversity instead of running to the next school.',
    'NIL was supposed to level the playing field. Instead it just made the rich programs richer.',
    'Back in my day, bowl games were a reward for a great season. Now teams with 6 wins get invited.',
    'Conference realignment destroyed rivalries that had been played for over a century. That is unforgivable.',
    'These kids today do not understand what it means to bleed for your school. Four years, one team.',
    'The option offense would still work in modern football. Nobody practices defending it anymore.',
    'Walk-on culture used to be the backbone of college football. NIL has made that almost impossible.',
  ],
  hot_take: [
    'The most overrated team in the country is not who you think it is. Their schedule was a joke.',
    'That coach is living off one good season five years ago. Hot seat should be scorching.',
    'Bold prediction: the playoff champion this year will come from a conference nobody expects.',
    'Half the teams in the top 25 would not be ranked if they played in our conference. Soft schedules inflate records.',
    'The best quarterback in college football is a backup right now. Just wait until he gets his shot.',
    'Conference championship games are more important than the regular season at this point. Just win that one.',
    'That five-star recruit everyone is excited about will transfer within two years. Book it.',
    'Coaching carousel season is the real championship of college football.',
  ],
  recruiting_insider: [
    'The portal window is about to get very interesting. I am hearing multiple starters from top programs are exploring options.',
    'This recruiting class has the potential to be program-changing. The staff is locked in on the right targets.',
    'NIL collectives are the new arms race. The programs that figure this out first will dominate recruiting.',
    'Keep an eye on the JUCO market this cycle. There are some hidden gems that could contribute immediately.',
    'The early signing period changed recruiting forever. Programs that close early have a massive advantage.',
    'Official visit weekends are where championships are won. The experience sells itself.',
    'Position of need this cycle is obvious. The staff knows it and they are prioritizing accordingly.',
    'The 2026 class has generational talent at several positions. Going to be a wild recruiting cycle.',
  ],
  default: [
    'College football Saturday is the best day of the week. Nothing else comes close.',
    'That game last week was an instant classic. This sport never lets you down.',
    'Rivalry week hits different. The energy, the traditions, the history. This is what college football is about.',
    'Playoff expansion was the best thing to happen to this sport in decades.',
    'Nothing beats a night game under the lights with 100,000 fans going crazy.',
    'College football is the only sport where the regular season matters this much. Every game is a playoff.',
    'Spring practice footage has me unreasonably hyped for the season. Cannot wait.',
    'The pageantry of college football is unmatched. The bands, the traditions, the tailgates.',
  ],
};

export const FALLBACK_REPLIES: string[] = [
  'Facts. People do not want to hear the truth though.',
  'This is exactly what I have been saying all season.',
  'Respectfully disagree. I have seen way too many games that prove otherwise.',
  'W take. More people need to see this.',
  'The film backs this up 100 percent.',
  'Interesting perspective. I never thought about it that way.',
  'This take is going to age really well. Saving this one.',
  'Nah, this is not it. Come on now.',
  'Could not have said it better myself.',
  'Bold claim but I respect the confidence.',
  'This is the kind of content I am here for.',
  'Been saying this for YEARS and everyone called me crazy.',
  'That is a fair point actually. Got me reconsidering.',
  'The stat check on this would be interesting.',
];
