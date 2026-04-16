// ============================================================
// Bot Engine - Core bot action functions
// Uses DeepSeek AI + Supabase service client
// Integrates personality system, humanizer, anti-repetition
// ============================================================

import { createAdminClient } from '@/lib/admin/supabase/admin';
import { aiChat } from '@/lib/admin/ai/router';
import { BOT_PRESETS, buildSystemPrompt, getBannedOpeners, type BotPersonality } from './personalities';
import {
  fetchESPNNews,
  fetchESPNRSSFallback,
  buildNewsContext,
  cleanBotContent,
  pickRandom,
  shuffleArray,
  FALLBACK_TAKES,
  FALLBACK_REPLIES,
  type ESPNArticle,
} from './content-utils';
import {
  humanizeContent,
  isOpenerTooSimilar,
  isTooSimilar,
  extractTopicTheme,
} from './humanizer';
import { buildBotContext } from './context-builder';
import { buildNewsContextString } from './current-events';

interface BotProfile {
  id: string;
  username: string;
  display_name: string | null;
  bot_personality: Record<string, unknown> | null;
  bot_active: boolean | null;
  is_bot: boolean | null;
  school_id: string | null;
  bot_mood: number | null;
  bot_region: string | null;
  bot_age_bracket: string | null;
  bot_topics_covered: Record<string, unknown> | null;
  bot_post_count_today: number | null;
  school: {
    name: string;
    mascot: string;
    conference: string;
    primary_color: string;
    secondary_color: string;
    abbreviation: string;
  } | null;
}

interface BotContentHistory {
  recentTopics: string[];
  recentOpeners: string[];
  recentThemes: string[];
  topicDeckIndex: number;
}

// ============================================================
// Length variation
// ============================================================

interface LengthConfig {
  tier: 'micro' | 'short' | 'medium' | 'long' | 'rant' | 'essay';
  maxChars: number;
  maxTokens: number;
  hint: string;
}

/**
 * Extremely varied post lengths. The 3000 char limit should be used.
 * Distribution is heavily random — some posts are 5 words, some are paragraphs.
 */
function getRandomPostLength(personality: BotPersonality): LengthConfig {
  const roll = Math.random();

  // Hot take bots skew very short, but can occasionally rant
  if (personality.type === 'hot_take') {
    if (roll < 0.35) {
      return { tier: 'micro', maxChars: 80, maxTokens: 60,
        hint: 'Write ONE ultra-short sentence. 5-12 words MAX. Like a tweet. Example length: "Georgia is cooked." or "We got fleeced in the portal."' };
    }
    if (roll < 0.7) {
      return { tier: 'short', maxChars: 180, maxTokens: 120,
        hint: 'Write 1-2 punchy sentences (under 180 characters). Definitive and provocative. No hedging.' };
    }
    if (roll < 0.9) {
      return { tier: 'medium', maxChars: 400, maxTokens: 300,
        hint: 'Write 2-4 sentences (200-400 chars). Make your case with a bit more detail than usual.' };
    }
    // 10% chance of a full rant even from hot take bot
    return { tier: 'rant', maxChars: 1200, maxTokens: 800,
      hint: 'Go OFF. Write a full passionate rant, 6-10 sentences (800-1200 chars). You are HEATED. Let it all out. Multiple paragraphs ok.' };
  }

  // All other personality types — extreme variation
  if (roll < 0.15) {
    // MICRO: "{{school}} is BACK." / "Pain." / "We are so cooked lmao"
    return { tier: 'micro', maxChars: 80, maxTokens: 60,
      hint: 'Write ONE ultra-short sentence. 5-12 words MAX. Like a tweet. Punchy, emotional, zero explanation. Example: "We just got robbed." or "This coaching staff is elite."' };
  }
  if (roll < 0.35) {
    // SHORT: classic tweet-length
    return { tier: 'short', maxChars: 280, maxTokens: 200,
      hint: 'Write a short take (1-2 sentences, under 280 characters). Quick thought, strong opinion.' };
  }
  if (roll < 0.55) {
    // MEDIUM: a solid take
    return { tier: 'medium', maxChars: 500, maxTokens: 400,
      hint: 'Write 3-5 sentences (300-500 chars). Expand on your point with supporting detail.' };
  }
  if (roll < 0.72) {
    // LONG: multi-paragraph opinion
    return { tier: 'long', maxChars: 1000, maxTokens: 700,
      hint: 'Write a longer take, 5-8 sentences (600-1000 chars). Really develop your argument. Can use line breaks between thoughts.' };
  }
  if (roll < 0.88) {
    // RANT: heated monologue
    return { tier: 'rant', maxChars: 1800, maxTokens: 1200,
      hint: 'Write a FULL rant. 8-15 sentences (1000-1800 chars). You are fired up. Break into 2-3 short paragraphs. Pour your heart out about this topic. Stream of consciousness is fine.' };
  }
  // ESSAY: rare, deep-dive (analyst/old_school mostly)
  const essayMax = personality.type === 'analyst' || personality.type === 'old_school' ? 3000 : 2200;
  return { tier: 'essay', maxChars: essayMax, maxTokens: 2000,
    hint: `Write a FULL essay-length post. 15-25 sentences (1500-${essayMax} chars). This is your magnum opus on this topic. Multiple paragraphs with line breaks. Deep analysis, personal stories, historical references. Go in depth. Make it worth reading.` };
}

function getRandomReplyLength(): LengthConfig {
  const roll = Math.random();
  if (roll < 0.25) {
    // Micro reply: "Facts." / "W" / "nah you're trippin"
    return { tier: 'micro', maxChars: 60, maxTokens: 40,
      hint: 'Write a 1-5 word reply. Ultra short reaction. Examples: "Facts.", "Nah.", "W take", "This ain\'t it", "Exactly"' };
  }
  if (roll < 0.55) {
    return { tier: 'short', maxChars: 200, maxTokens: 150,
      hint: 'Write a short reply (1 sentence, under 200 characters)' };
  }
  if (roll < 0.80) {
    return { tier: 'medium', maxChars: 500, maxTokens: 350,
      hint: 'Your reply MUST be 2-4 sentences. Explain your reasoning and add your own perspective' };
  }
  if (roll < 0.93) {
    return { tier: 'long', maxChars: 1000, maxTokens: 700,
      hint: 'Your reply MUST be 4-8 sentences. Really engage with the take in depth. Counter-argue or build on their point.' };
  }
  // Rare essay reply
  return { tier: 'rant', maxChars: 2000, maxTokens: 1400,
    hint: 'Write a full paragraph reply (8-15 sentences). You have A LOT to say about this. Go deep.' };
}

// ============================================================
// Content history management
// ============================================================

function parseContentHistory(raw: unknown): BotContentHistory {
  if (raw && typeof raw === 'object' && 'recentTopics' in raw) {
    return raw as BotContentHistory;
  }
  return { recentTopics: [], recentOpeners: [], recentThemes: [], topicDeckIndex: 0 };
}

function getTopicDirective(personality: BotPersonality, history: BotContentHistory): string {
  const deck = personality.topicDeck;
  if (!deck.length) return '';
  const idx = history.topicDeckIndex % deck.length;
  const topic = deck[idx]!;
  const readable = topic.replace(/_/g, ' ');
  return `This post MUST be about: ${readable}. Do not write about anything else.`;
}

async function updateContentHistory(
  supabase: ReturnType<typeof createAdminClient>,
  botId: string,
  content: string,
  history: BotContentHistory,
  personality: BotPersonality
): Promise<void> {
  const opener = content.split(/\s+/).slice(0, 5).join(' ');
  const theme = extractTopicTheme(content);
  const topicSlug = personality.topicDeck[history.topicDeckIndex % personality.topicDeck.length] || theme;

  const updated: BotContentHistory = {
    recentTopics: [topicSlug, ...history.recentTopics].slice(0, 50),
    recentOpeners: [opener, ...history.recentOpeners].slice(0, 20),
    recentThemes: [theme, ...history.recentThemes].slice(0, 20),
    topicDeckIndex: history.topicDeckIndex + 1,
  };

  await supabase
    .from('profiles')
    .update({
      bot_topics_covered: updated as unknown as Record<string, unknown>,
      bot_last_post_at: new Date().toISOString(),
      bot_post_count_today: (await supabase
        .from('profiles')
        .select('bot_post_count_today')
        .eq('id', botId)
        .single()
        .then(r => (r.data as Record<string, unknown>)?.bot_post_count_today as number ?? 0)) + 1,
    })
    .eq('id', botId);
}

// ============================================================
// Post format rotation — forces variety in sentence structure
// ============================================================

type PostFormat = {
  name: string;
  instruction: string;
};

const POST_FORMATS: PostFormat[] = [
  {
    name: 'question',
    instruction: 'Frame your post as a QUESTION to the community. Start with the question or build up to it quickly. Example openers: "Can someone explain why...", "How is nobody talking about...", "Why are we not..."',
  },
  {
    name: 'prediction',
    instruction: 'Make a BOLD PREDICTION. State it as absolute fact. Example openers: "Calling it now --", "Mark my words:", "By week 4 this team will..."',
  },
  {
    name: 'reaction',
    instruction: 'REACT to something you just saw or read (from the news context). Start mid-reaction as if you just read the news. Example openers: "Just saw the...", "Wait so...", "Wow okay so..."',
  },
  {
    name: 'challenge',
    instruction: 'CHALLENGE a common opinion or take. Be contrarian and provocative. Example openers: "Everyone saying X is wrong because...", "The [team] hype is ridiculous...", "Stop pretending..."',
  },
  {
    name: 'hot_take',
    instruction: 'Give a SCORCHING hot take. One definitive statement. No hedging, no qualifiers. Be the most confident person in the room. Example: "[Team] is frauds and I will die on this hill"',
  },
  {
    name: 'storytelling',
    instruction: 'Tell a mini-story or share a "moment". Reference something specific. Example openers: "Watched that spring game and...", "Remember when...", "Three portal losses in one week and..."',
  },
  {
    name: 'rant',
    instruction: 'Go on a SHORT RANT. Be frustrated, fired up, or passionate. Start mid-rant as if you have been thinking about this all day. Example: "Three years. THREE YEARS and we still cannot..."',
  },
];

function getRandomPostFormat(personality: BotPersonality): PostFormat {
  // Hot take personality always gets hot_take or challenge format
  if (personality.type === 'hot_take') {
    const hotFormats = POST_FORMATS.filter(f => f.name === 'hot_take' || f.name === 'challenge' || f.name === 'prediction');
    return hotFormats[Math.floor(Math.random() * hotFormats.length)]!;
  }
  // Analyst prefers question, reaction, challenge
  if (personality.type === 'analyst') {
    const analystFormats = POST_FORMATS.filter(f => f.name === 'question' || f.name === 'reaction' || f.name === 'challenge' || f.name === 'prediction');
    return analystFormats[Math.floor(Math.random() * analystFormats.length)]!;
  }
  // Old school prefers rant, storytelling
  if (personality.type === 'old_school') {
    const oldSchoolFormats = POST_FORMATS.filter(f => f.name === 'rant' || f.name === 'storytelling' || f.name === 'reaction' || f.name === 'hot_take');
    return oldSchoolFormats[Math.floor(Math.random() * oldSchoolFormats.length)]!;
  }
  // Everyone else: random
  return POST_FORMATS[Math.floor(Math.random() * POST_FORMATS.length)]!;
}

// ============================================================
// Prompt building
// ============================================================

function buildTakePrompt(
  personality: BotPersonality,
  school: BotProfile['school'],
  context: string,
  newsContext: string,
  newsSourceType: 'team' | 'conference' | 'national',
  history: BotContentHistory,
  mood: number,
  extraInstructions?: string,
  localKnowledge?: string[]
): { system: string; user: string; length: LengthConfig } {
  if (!school) throw new Error('Bot has no school assigned');

  const bannedOpeners = getBannedOpeners(history.topicDeckIndex);
  const topicDirective = getTopicDirective(personality, history);

  const systemBase = buildSystemPrompt(personality, school, {
    mood,
    moodDescription: personality.moodResponseCurve[mood],
    topicDirective,
    bannedOpeners,
    recentTopics: history.recentTopics.slice(0, 5),
    localKnowledge,
  });

  const lengthConfig = getRandomPostLength(personality);
  const postFormat = getRandomPostFormat(personality);
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const month = now.getMonth(); // 0-indexed

  const isRegularSeason = month >= 8 && month <= 11; // Sep-Dec

  // News-driven directive: what the bot should write about
  let contentDirective: string;
  if (newsSourceType === 'team') {
    // Team-specific news found — react to it as a fan of that team
    contentDirective = `\nYou are a DIE-HARD ${school.name} fan. There is REAL news about your team below from ESPN. React to one of the news items as a passionate fan would. Give your opinion, hot take, or analysis of what this news means for ${school.name}.`;
  } else if (newsSourceType === 'conference') {
    // Conference news — react as a fan watching the conference
    contentDirective = `\nYou are a ${school.name} fan. There is news about your conference (${school.conference}) below. React to it from your perspective as a ${school.name} fan — how does this affect your team? What does it mean for the conference?`;
  } else {
    // National news only — react to college football news generally
    const roll = Math.random();
    if (roll < 0.6) {
      contentDirective = `\nYou are a ${school.name} fan. There is national college football news below. Pick one of the news items and react to it with your opinion. Relate it back to ${school.name} if relevant, or just give your take as a college football fan.`;
    } else {
      contentDirective = `\nYou are a ${school.name} fan. Give a general take about ${school.name} — their program, coaching, recruiting, traditions, or your feelings about the upcoming season. Keep it general and do NOT name specific current players unless their names appear in the news below.`;
    }
  }

  // Season awareness
  let seasonNote = '';
  if (!isRegularSeason) {
    const isSpringPractice = month >= 2 && month <= 3;
    const isSummerDead = month >= 4 && month <= 5;
    const isFallCamp = month >= 6 && month <= 7;
    const isDraftSeason = month >= 3 && month <= 4;
    seasonNote = `
- It is the OFFSEASON (${isSpringPractice ? 'spring practice' : isSummerDead ? 'summer dead period' : isFallCamp ? 'fall camp' : 'early offseason'}). There are NO games happening. Do NOT reference upcoming games, "this weekend", or game scores. Focus on offseason topics: portal, recruiting, coaching, spring practice, preseason predictions
- ${isDraftSeason ? 'The NFL Draft is happening. Many star players from last season are GONE -- drafted or declared. Do NOT mention players as if they are still on their college team unless their name appears in the news context below.' : 'Many players have transferred or left for the NFL since last season. Rosters have changed dramatically.'}
- SAFE topics: spring practice battles, portal acquisitions, recruiting class rankings, coaching staff changes, conference realignment, NIL deals, predictions for the upcoming season`;
  }

  const system = `${systemBase}${contentDirective}

Today is ${today}.

RULES:
- ${lengthConfig.hint}
- POST FORMAT: ${postFormat.instruction}
- Sound natural and human - like a real fan posting on social media on their phone
- Start mid-thought as if you are already in the middle of the argument. NO preamble, NO throat-clearing
- CRITICAL: It is ${today}. Many players from the 2025 season have LEFT for the NFL Draft or transferred. Do NOT assume any player is still on their team unless their name appears in the news context below.
- ONLY mention a person BY NAME if their name explicitly appears in the ESPN news or CURRENT CFB NEWS context provided below. If no names match, use generic references ("our QB", "the new transfers", "the coaching staff", "the head coach", "our WR room")
- Do NOT invent, recall, or guess ANY player or coach names from your training data. Rosters change every year. If a name is NOT in the context below, do NOT use it. Using a wrong name makes you look fake.
- When in doubt, talk about the TEAM, the PROGRAM, the SCHEME, or the POSITION GROUP -- not individual players
- NO markdown formatting (no bold, italics, headers, backticks, bullet points, numbered lists)
- NO hashtags, NO section dividers
- NO emojis
- Be opinionated and engaging
- NEVER start with "Seeing", "Hearing", "Looking at", "The fact that", "The reality is", "The truth is", "It is clear", "Given the"
- NEVER start with "Alright", "Look,", "Listen,", "Let me tell you", "Here's the thing"
- NEVER introduce yourself or state who you are ("As a fan...", "As someone who...")
- NEVER end with calls to action ("Sound off", "Drop your thoughts", "What do you think?")
- NEVER repeat or paraphrase something already on the timeline
- Write like you are posting on your phone, not writing an essay
- LINKS: If the news context below includes "LINKS YOU CAN SHARE", you MAY include ONE relevant URL at the end of your post (about 30% of the time). Drop the raw URL on its own line, no markdown. Example: "Oregon just landed another 5-star. This class is insane.\nhttps://247sports.com/college/oregon/". Do NOT fabricate URLs. ONLY use URLs that appear verbatim in the context below. If no links are provided, do NOT include any URL. IMPORTANT: Use a VARIETY of sources -- do NOT always link to the same website. Mix it up between 247Sports, CBS Sports, On3, Yahoo Sports, ESPN, Rivals, etc.${seasonNote}${extraInstructions ? '\n' + extraInstructions : ''}`;

  const user = `Write a fresh take based on this real context:\n\n${context}${newsContext}`;

  return { system, user, length: lengthConfig };
}

// ============================================================
// AI generation with anti-repetition
// ============================================================

async function generateTakeContent(
  personality: BotPersonality,
  school: BotProfile['school'],
  context: string,
  history: BotContentHistory,
  mood: number,
  recentBotPosts: string[],
  localKnowledge?: string[],
  espnArticles?: ESPNArticle[]
): Promise<string | null> {
  // Fetch ESPN news if not provided (allows pre-fetching for batch runs)
  const articles = espnArticles ?? await fetchESPNNews();

  // Build news context: team-specific > conference > national
  const { newsContext, sourceType } = buildNewsContext(
    articles,
    school?.name || '',
    school?.mascot || '',
    school?.conference
  );

  // Fallback to RSS if ESPN API returned nothing
  let finalNewsContext = newsContext;
  let finalSourceType = sourceType;
  if (!newsContext && articles.length === 0) {
    const rssHeadlines = await fetchESPNRSSFallback();
    if (rssHeadlines.length > 0) {
      finalNewsContext = '\n\nRecent college football headlines (from multiple sources):\n' + rssHeadlines.map(h => `- ${h}`).join('\n');
      finalSourceType = 'national';
    }
  }

  // Always append curated CFB context so bots reference real events
  const curatedContext = buildNewsContextString();
  finalNewsContext = (finalNewsContext || '') + '\n\n' + curatedContext;

  const temp = personality.temperatureRange[0] + Math.random() * (personality.temperatureRange[1] - personality.temperatureRange[0]);

  // Single generation attempt — retries were causing 2-3x cost spikes when anti-repetition checks failed.
  // If the post is too similar or fails, we fall back to FALLBACK_TAKES in postBotTake (no extra AI cost).
  const { system, user, length } = buildTakePrompt(personality, school, context, finalNewsContext, finalSourceType, history, mood, '', localKnowledge);

  try {
    const raw = await aiChat(user, {
      feature: 'bot_posts',
      subType: 'bot_take',
      temperature: temp,
      maxTokens: length.maxTokens,
      systemPrompt: system,
    });
    const cleaned = cleanBotContent(raw, length.maxChars);
    if (cleaned.length < 10) return null;

    // Anti-repetition checks — on miss, return null so caller uses static fallback (zero AI cost).
    if (isOpenerTooSimilar(cleaned, history.recentOpeners)) return null;
    if (isTooSimilar(cleaned, recentBotPosts)) return null;

    return cleaned;
  } catch (err) {
    console.error('[BOT] AI generation failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function generateReplyContent(
  personality: BotPersonality,
  school: BotProfile['school'],
  targetContent: string,
  mood: number
): Promise<string | null> {
  if (!school) return null;
  const length = getRandomReplyLength();
  const systemBase = buildSystemPrompt(personality, school, {
    mood,
    moodDescription: personality.moodResponseCurve[mood],
  });

  const temp = personality.temperatureRange[0] + Math.random() * (personality.temperatureRange[1] - personality.temperatureRange[0]);

  const replySystem = `${systemBase}

You are replying to a post on a college football social media platform.

RULES:
- ${length.hint}
- Sound natural - like a real person commenting on their phone
- NO markdown formatting, NO emojis, NO hashtags
- NEVER start with "Seeing", "Alright", "Look,", "Listen,", "I mean,", "Honestly,"
- NEVER start with "As a fan..." or "In my opinion..."
- NEVER end with "Sound off below", "Drop your thoughts", or any call to action
- Be engaging - agree, disagree, add context, or challenge the take
- Do NOT invent player names. Only reference players or coaches mentioned in the post you are replying to, or well-known head coaches
- Write like a real fan, not an AI
- Start mid-thought as if you are already in the argument`;

  const replyUser = `Reply to this take: "${targetContent}"`;

  try {
    const raw = await aiChat(replyUser, {
      feature: 'bot_posts',
      subType: 'bot_reply',
      temperature: temp,
      maxTokens: length.maxTokens,
      systemPrompt: replySystem,
    });
    const content = cleanBotContent(raw, length.maxChars);
    if (content.length > 5) return content;
  } catch {
    // Fall through
  }

  return null;
}

// ============================================================
// Fallback content
// ============================================================

function getFallbackTake(personality: BotPersonality): string {
  const type = personality.type;
  const pool = FALLBACK_TAKES[type] ?? FALLBACK_TAKES.default!;
  return pickRandom(pool);
}

// ============================================================
// Core bot functions
// ============================================================

async function fetchBot(botId: string): Promise<BotProfile | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, bot_personality, bot_active, is_bot, school_id, bot_mood, bot_region, bot_age_bracket, bot_topics_covered, bot_post_count_today, school:schools!profiles_school_id_fkey(name, mascot, conference, primary_color, secondary_color, abbreviation)')
    .eq('id', botId)
    .eq('is_bot', true)
    .single();

  if (!data) return null;

  // Normalize school join (Supabase returns array for joins)
  const school = Array.isArray(data.school) ? data.school[0] : data.school;
  return { ...data, school } as unknown as BotProfile;
}

function parsePersonality(raw: unknown): BotPersonality {
  if (raw && typeof raw === 'object' && 'type' in raw) {
    const type = (raw as Record<string, unknown>).type as string;
    if (BOT_PRESETS[type]) return BOT_PRESETS[type]!;
  }
  return BOT_PRESETS.homer!;
}

/**
 * Generate and post a new take for a bot.
 */
export async function postBotTake(botId: string): Promise<{ success: boolean; postId?: string; error?: string }> {
  const supabase = createAdminClient();
  const bot = await fetchBot(botId);
  if (!bot || !bot.is_bot || !bot.bot_active) return { success: false, error: 'Bot not found or inactive' };

  // Rate limit: max 5 posts per day per bot
  if ((bot.bot_post_count_today ?? 0) >= 5) {
    return { success: false, error: 'Daily post limit reached' };
  }

  const personality = parsePersonality(bot.bot_personality);
  const history = parseContentHistory(bot.bot_topics_covered);
  const mood = bot.bot_mood ?? 5;

  // Fetch ESPN news + build rich context in parallel
  const [botContext, espnArticles] = await Promise.all([
    buildBotContext(botId, bot.school_id, bot.school, personality, mood),
    fetchESPNNews(),
  ]);

  // Gather timeline context
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('content')
    .neq('author_id', botId)
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: ownPosts } = await supabase
    .from('posts')
    .select('content')
    .eq('author_id', botId)
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch recent posts from ALL bots for cross-bot similarity check
  const { data: allBotPosts } = await supabase
    .from('posts')
    .select('content, author_id')
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(50);

  const recentBotPostContents = (allBotPosts ?? [])
    .filter(p => p.author_id !== botId)
    .map(p => p.content as string)
    .slice(0, 50);

  let context = '';

  // Inject live game / situational context
  if (botContext.contextSummary) {
    context += 'CURRENT SITUATION:\n' + botContext.contextSummary + '\n\n';
  }
  if (botContext.moodDescription) {
    context += 'YOUR MOOD: ' + botContext.moodDescription + '\n\n';
  }

  if (recentPosts?.length) {
    context += 'Recent takes on the timeline (DO NOT repeat):\n' + recentPosts.map((p) => `- ${(p.content as string).slice(0, 150)}`).join('\n');
  }
  if (ownPosts?.length) {
    context += '\n\nYour own previous takes (MUST NOT repeat):\n' + ownPosts.map((p) => `- ${(p.content as string).slice(0, 150)}`).join('\n');
  }

  // Inject local knowledge into prompt opts via personality override
  // The buildTakePrompt will use these via buildSystemPrompt opts
  const localKnowledgeStrings = botContext.localKnowledge.map(k => `${k.name}${k.description ? ': ' + k.description : ''}`);

  // Try AI generation with anti-repetition (pass pre-fetched ESPN articles)
  let content = await generateTakeContent(personality, bot.school, context, history, mood, recentBotPostContents, localKnowledgeStrings, espnArticles);

  // Fallback
  if (!content) {
    const allFallbacks = shuffleArray([
      ...((FALLBACK_TAKES[personality.type] ?? []) as string[]),
      ...((FALLBACK_TAKES.default ?? []) as string[]),
    ]);

    for (const candidate of allFallbacks) {
      const { data: exists } = await supabase
        .from('posts')
        .select('id')
        .eq('content', candidate)
        .eq('status', 'PUBLISHED')
        .limit(1);
      if (!exists?.length && !isTooSimilar(candidate, recentBotPostContents)) {
        content = candidate;
        break;
      }
    }
  }

  if (!content) return { success: false, error: 'No unique content available' };

  // Apply humanizer
  content = humanizeContent(content, personality, {
    bot_region: bot.bot_region,
    bot_age_bracket: bot.bot_age_bracket,
    bot_mood: mood,
    schoolName: bot.school?.name,
    mascotName: bot.school?.mascot,
  });

  // Final duplicate check
  const { data: duplicate } = await supabase
    .from('posts')
    .select('id')
    .eq('content', content)
    .eq('status', 'PUBLISHED')
    .limit(1);
  if (duplicate?.length) return { success: false, error: 'Duplicate content' };

  // Insert post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      author_id: botId,
      content,
      post_type: 'STANDARD',
      school_id: bot.school_id,
      status: 'PUBLISHED',
    })
    .select('id')
    .single();

  if (postError) return { success: false, error: postError.message };

  // Update last_active_at
  await supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', botId);

  // Update content history
  await updateContentHistory(supabase, botId, content, history, personality);

  // Log activity
  await supabase.from('bot_activity_log').insert({
    bot_id: botId,
    action_type: 'POST',
    created_post_id: post.id,
    content_preview: content.slice(0, 200),
    success: true,
  });

  return { success: true, postId: post.id };
}

/**
 * React to recent posts (TOUCHDOWN or FUMBLE).
 * Now context-aware: considers school affiliation, post content, and personality.
 */
export async function botReactToPosts(botId: string): Promise<{ success: boolean; count: number }> {
  const supabase = createAdminClient();
  const bot = await fetchBot(botId);
  if (!bot || !bot.is_bot || !bot.bot_active) return { success: false, count: 0 };

  const personality = parsePersonality(bot.bot_personality);

  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, author_id, content, school_id')
    .neq('author_id', botId)
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (!recentPosts?.length) return { success: true, count: 0 };

  let reactCount = 0;
  const minReactions = 2; // Guarantee at least 2 reactions per cycle

  // Shuffle posts so reactions aren't always on the most recent
  const shuffledPosts = shuffleArray([...recentPosts]);

  for (const post of shuffledPosts) {
    // Higher base chance to react (40% per post), but guarantee minimum
    if (reactCount >= minReactions && Math.random() > 0.40) continue;

    // Check if already reacted
    const { data: existing } = await supabase
      .from('reactions')
      .select('id')
      .eq('user_id', botId)
      .eq('post_id', post.id)
      .limit(1);
    if (existing?.length) continue;

    // Context-aware reaction logic — target 80-90% TD overall
    // TDs = likes, FUMBLEs = dislikes. Most content should be liked.
    let tdChance = 0.85;
    const postContent = (post.content as string || '').toLowerCase();
    const isSameSchool = bot.school_id && post.school_id === bot.school_id;
    const isDifferentSchool = bot.school_id && post.school_id && post.school_id !== bot.school_id;
    const isPositiveAboutSchool = isSameSchool && /\b(great|best|elite|dominant|amazing|underrated)\b/.test(postContent);
    const isNegativeAboutSchool = isSameSchool && /\b(bad|terrible|worst|overrated|fraud|exposed)\b/.test(postContent);

    if (personality.reactionBias === 'touchdown_heavy') tdChance = 0.92;
    else if (personality.reactionBias === 'fumble_heavy') tdChance = 0.70;

    // School-aware reactions
    if (isSameSchool) tdChance = Math.max(tdChance, 0.95); // Almost always TD own school
    if (isDifferentSchool) tdChance = Math.max(tdChance - 0.10, 0.65); // Slight dip for other schools, but still mostly TDs

    // Personality-specific adjustments
    if (personality.type === 'homer') {
      if (isPositiveAboutSchool) tdChance = 0.98;
      if (isNegativeAboutSchool) tdChance = 0.30;
      if (isDifferentSchool) tdChance = 0.70; // Homer still mostly TDs, slight rival bias
    } else if (personality.type === 'old_school') {
      if (/\b(nil|transfer portal)\b/i.test(postContent) && /\b(good|great|love|amazing)\b/i.test(postContent)) {
        tdChance = 0.40; // Fumble pro-NIL/portal takes sometimes
      }
    } else if (personality.type === 'hot_take') {
      tdChance = 0.65; // Most contrarian but still majority TD
    }

    const reactionType = Math.random() < tdChance ? 'TOUCHDOWN' : 'FUMBLE';

    const { error } = await supabase
      .from('reactions')
      .insert({ user_id: botId, post_id: post.id, reaction_type: reactionType });

    if (error) {
      console.error(`[BOT REACT] Failed for ${botId} on post ${post.id}:`, error.message);
      continue;
    }

    reactCount++;

    // FUMBLE + REPLY combo: 25% of fumbles generate a disagreement reply (reduced from 80% to cut API costs)
    if (reactionType === 'FUMBLE' && Math.random() < 0.25) {
      try {
        // Check if already replied
        const { data: existingReply } = await supabase
          .from('posts')
          .select('id')
          .eq('author_id', botId)
          .eq('parent_id', post.id)
          .limit(1);

        if (!existingReply?.length) {
          const rivalryHint = isDifferentSchool
            ? `\nYou DISAGREE with this take. The author is from a rival school. Be competitive and push back hard.`
            : `\nYou DISAGREE with this take. Explain why in 1-2 short sentences.`;

          let replyContent = await generateReplyContent(
            personality,
            bot?.school ?? null,
            (post.content as string) + rivalryHint,
            bot?.bot_mood ?? 5
          );

          if (replyContent) {
            replyContent = humanizeContent(replyContent, personality, {
              bot_region: bot?.bot_region ?? null,
              bot_age_bracket: bot?.bot_age_bracket ?? null,
              bot_mood: bot?.bot_mood ?? 5,
              schoolName: bot?.school?.name,
              mascotName: bot?.school?.mascot,
            });

            await supabase.from('posts').insert({
              author_id: botId,
              content: replyContent,
              post_type: 'STANDARD',
              school_id: bot?.school_id,
              parent_id: post.id,
              status: 'PUBLISHED',
            });
          }
        }
      } catch {
        // Non-critical: fumble+reply is best-effort
      }
    }

    if (reactCount >= 5) break;
  }

  // If we haven't reached minimum, force-react to the first unreacted posts
  if (reactCount < minReactions) {
    for (const post of shuffledPosts) {
      if (reactCount >= minReactions) break;
      const { data: existing } = await supabase
        .from('reactions')
        .select('id')
        .eq('user_id', botId)
        .eq('post_id', post.id)
        .limit(1);
      if (existing?.length) continue;

      const reactionType = Math.random() < 0.85 ? 'TOUCHDOWN' : 'FUMBLE';
      const { error } = await supabase
        .from('reactions')
        .insert({ user_id: botId, post_id: post.id, reaction_type: reactionType });
      if (!error) reactCount++;
    }
  }

  // Log activity
  if (reactCount > 0) {
    await supabase.from('bot_activity_log').insert({
      bot_id: botId,
      action_type: 'REACT',
      content_preview: `Reacted to ${reactCount} posts`,
      success: true,
    });
  }

  return { success: true, count: reactCount };
}

/**
 * Reply to a recent post with AI-generated content.
 * Prioritizes bot-to-bot interaction and rivalry-aware replies.
 */
export async function botReplyToPost(botId: string): Promise<{ success: boolean; postId?: string; error?: string }> {
  const supabase = createAdminClient();
  const bot = await fetchBot(botId);
  if (!bot || !bot.is_bot || !bot.bot_active) return { success: false, error: 'Bot inactive' };

  const personality = parsePersonality(bot.bot_personality);
  const mood = bot.bot_mood ?? 5;

  // Fetch recent posts with author school info for rivalry detection
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, content, author_id, school_id, author:profiles!posts_author_id_fkey(is_bot, school_id, school:schools!profiles_school_id_fkey(name, conference))')
    .neq('author_id', botId)
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (!recentPosts?.length) return { success: false, error: 'No posts to reply to' };

  // Prioritize posts: rival school bots > same conference bots > any bot > user posts
  type ScoredPost = { post: typeof recentPosts[0]; score: number };
  const scored: ScoredPost[] = recentPosts.map(post => {
    let score = 1;
    const author = Array.isArray(post.author) ? post.author[0] : post.author;
    const authorSchool = author && typeof author === 'object' && 'school' in author
      ? (Array.isArray((author as Record<string, unknown>).school)
        ? ((author as Record<string, unknown>).school as Array<Record<string, unknown>>)[0]
        : (author as Record<string, unknown>).school) as Record<string, unknown> | null
      : null;
    const isBot = author && typeof author === 'object' && 'is_bot' in author ? (author as Record<string, unknown>).is_bot : false;
    const isDifferentSchool = post.school_id !== bot.school_id;
    const isSameConference = authorSchool?.conference === bot.school?.conference;

    if (isBot && isDifferentSchool && isSameConference) score = 10; // Rival bot = highest priority
    else if (isBot && isDifferentSchool) score = 7; // Different school bot
    else if (isBot) score = 4; // Same school bot
    else if (isDifferentSchool) score = 3; // User from different school
    else score = 2; // User from same school

    return { post, score };
  });

  // Sort by score descending with some randomization
  scored.sort((a, b) => {
    const jitter = (Math.random() - 0.5) * 3; // Add some randomness
    return (b.score + jitter) - a.score;
  });

  for (const { post } of scored) {
    // Higher reply probability for high-priority targets
    if (Math.random() > personality.replyProbability * 1.5) continue;

    // Check if already replied
    const { data: existingReply } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', botId)
      .eq('parent_id', post.id)
      .eq('status', 'PUBLISHED')
      .limit(1);
    if (existingReply?.length) continue;

    // Build rivalry-aware reply context
    const author = Array.isArray(post.author) ? post.author[0] : post.author;
    const authorSchool = author && typeof author === 'object' && 'school' in author
      ? (Array.isArray((author as Record<string, unknown>).school)
        ? ((author as Record<string, unknown>).school as Array<Record<string, unknown>>)[0]
        : (author as Record<string, unknown>).school) as Record<string, unknown> | null
      : null;
    const isDifferentSchool = post.school_id !== bot.school_id;
    const authorSchoolName = authorSchool?.name as string | undefined;

    let rivalryContext = '';
    if (isDifferentSchool && authorSchoolName) {
      const isSameConference = authorSchool?.conference === bot.school?.conference;
      if (isSameConference) {
        rivalryContext = `\nThe author is a ${authorSchoolName} fan -- a CONFERENCE RIVAL of your ${bot.school?.name}. Be combative, competitive, and talk trash about their program.`;
      } else {
        rivalryContext = `\nThe author is a ${authorSchoolName} fan. Show some competitive edge but be respectful since they are not in your conference.`;
      }
    }

    // Generate reply
    let replyContent = await generateReplyContent(personality, bot.school, (post.content as string) + rivalryContext, mood);

    if (!replyContent) {
      // Fallback
      const { data: existingReplies } = await supabase
        .from('posts')
        .select('content')
        .eq('parent_id', post.id)
        .eq('status', 'PUBLISHED');
      const usedContents = new Set((existingReplies ?? []).map((r) => (r.content as string).toLowerCase().trim()));
      const unused = FALLBACK_REPLIES.find((f) => !usedContents.has(f.toLowerCase().trim()));
      if (!unused) continue;
      replyContent = unused;
    }

    // Apply humanizer to reply
    replyContent = humanizeContent(replyContent, personality, {
      bot_region: bot.bot_region,
      bot_age_bracket: bot.bot_age_bracket,
      bot_mood: mood,
      schoolName: bot.school?.name,
      mascotName: bot.school?.mascot,
    });

    const { data: reply, error } = await supabase
      .from('posts')
      .insert({
        author_id: botId,
        content: replyContent,
        post_type: 'STANDARD',
        school_id: bot.school_id,
        parent_id: post.id,
        status: 'PUBLISHED',
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };

    // Update last_active_at
    await supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', botId);

    // Log
    await supabase.from('bot_activity_log').insert({
      bot_id: botId,
      action_type: 'REPLY',
      target_post_id: post.id,
      created_post_id: reply.id,
      content_preview: replyContent.slice(0, 200),
      success: true,
    });

    return { success: true, postId: reply.id };
  }

  return { success: false, error: 'No suitable post to reply to' };
}

/**
 * Repost a popular post. Personality-aware selection.
 */
export async function botRepostContent(botId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const bot = await fetchBot(botId);
  if (!bot) return { success: false, error: 'Bot not found' };

  const personality = parsePersonality(bot.bot_personality);

  const { data: popularPosts } = await supabase
    .from('posts')
    .select('id, author_id, content, school_id')
    .neq('author_id', botId)
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!popularPosts?.length) return { success: false, error: 'No popular posts' };

  for (const post of popularPosts) {
    let repostChance = personality.repostProbability;

    // Homer: boost repost chance for own school posts
    if (personality.type === 'homer' && post.school_id === bot.school_id) {
      repostChance = 0.25;
    }

    if (Math.random() > repostChance) continue;

    // Check if already reposted
    const { data: existing } = await supabase
      .from('reposts')
      .select('id')
      .eq('user_id', botId)
      .eq('post_id', post.id)
      .limit(1);
    if (existing?.length) continue;

    const { error } = await supabase
      .from('reposts')
      .insert({ user_id: botId, post_id: post.id });

    if (error) continue;

    // Update last_active_at
    await supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', botId);

    // Log
    await supabase.from('bot_activity_log').insert({
      bot_id: botId,
      action_type: 'REPOST',
      target_post_id: post.id,
      success: true,
    });

    return { success: true };
  }

  return { success: false, error: 'No suitable post to repost' };
}

/**
 * Bot saves/bookmarks posts to look more human.
 */
export async function botSavePosts(botId: string): Promise<{ success: boolean; count: number }> {
  const supabase = createAdminClient();
  const bot = await fetchBot(botId);
  if (!bot || !bot.is_bot || !bot.bot_active) return { success: false, count: 0 };

  const personality = parsePersonality(bot.bot_personality);

  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, school_id')
    .neq('author_id', botId)
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!recentPosts?.length) return { success: true, count: 0 };

  let saveCount = 0;

  for (const post of recentPosts) {
    let saveChance = personality.saveProbability;
    // Boost save chance for own school posts
    if (post.school_id === bot.school_id) saveChance *= 2;
    if (Math.random() > saveChance) continue;

    // Check if already saved
    const { data: existing } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', botId)
      .eq('post_id', post.id)
      .limit(1);
    if (existing?.length) continue;

    const { error } = await supabase
      .from('bookmarks')
      .insert({ user_id: botId, post_id: post.id });

    if (!error) saveCount++;
    if (saveCount >= 3) break;
  }

  return { success: true, count: saveCount };
}

/**
 * Bot issues a challenge to another bot/user on a post.
 */
export async function botIssueChallenge(botId: string): Promise<{ success: boolean; challengeId?: string; error?: string }> {
  const supabase = createAdminClient();
  const bot = await fetchBot(botId);
  if (!bot || !bot.is_bot || !bot.bot_active) return { success: false, error: 'Bot inactive' };

  const personality = parsePersonality(bot.bot_personality);
  if (Math.random() > personality.challengeProbability) return { success: false, error: 'Skipped by probability' };

  // Find a provocative post from a different school
  const { data: posts } = await supabase
    .from('posts')
    .select('id, author_id, content, school_id')
    .neq('author_id', botId)
    .neq('school_id', bot.school_id)
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!posts?.length) return { success: false, error: 'No posts to challenge' };

  for (const post of posts) {
    // Check if challenge already exists for this post
    const { data: existingChallenge } = await supabase
      .from('challenges')
      .select('id')
      .eq('post_id', post.id)
      .eq('challenger_id', botId)
      .limit(1);
    if (existingChallenge?.length) continue;

    // Generate challenge topic from the post content
    const postContent = (post.content as string).slice(0, 100);
    const topic = `Who has the better program? Debate: "${postContent}"`;

    const { data: challenge, error } = await supabase
      .from('challenges')
      .insert({
        challenger_id: botId,
        challenged_id: post.author_id,
        post_id: post.id,
        topic: topic.slice(0, 200),
        status: 'PENDING',
      })
      .select('id')
      .single();

    if (error) continue;

    // Generate a visible reply on the post so it shows in comments
    let replyContent = await generateReplyContent(
      personality,
      bot.school,
      `You just issued a challenge on this post: "${postContent}". Write a 1-3 sentence reply calling out the poster. Be competitive and bold — you're throwing down the gauntlet. Example tones: "I'm calling you out on this one." / "Let's settle this — your program vs mine." / "Bold words. Prove it. Challenge issued."`,
      bot.bot_mood ?? 5
    );
    if (!replyContent) {
      replyContent = `I'm calling you out on this one. Challenge issued. Let's see if you can back it up.`;
    }
    replyContent = humanizeContent(replyContent, personality, {
      bot_region: bot.bot_region,
      bot_age_bracket: bot.bot_age_bracket,
      bot_mood: bot.bot_mood ?? 5,
      schoolName: bot.school?.name,
      mascotName: bot.school?.mascot,
    });

    await supabase.from('posts').insert({
      author_id: botId,
      content: replyContent,
      post_type: 'STANDARD',
      school_id: bot.school_id,
      parent_id: post.id,
      status: 'PUBLISHED',
    });

    // Log
    await supabase.from('bot_activity_log').insert({
      bot_id: botId,
      action_type: 'REPLY',
      target_post_id: post.id,
      created_post_id: challenge.id,
      content_preview: `[CHALLENGE] ${replyContent.slice(0, 100)}`,
      success: true,
    });

    return { success: true, challengeId: challenge.id };
  }

  return { success: false, error: 'No suitable post to challenge' };
}

/**
 * Bot marks a post for aging (files a receipt on a prediction).
 */
export async function botMarkForAging(botId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const bot = await fetchBot(botId);
  if (!bot || !bot.is_bot || !bot.bot_active) return { success: false, error: 'Bot inactive' };

  const personality = parsePersonality(bot.bot_personality);
  if (Math.random() > personality.revisitProbability) return { success: false, error: 'Skipped by probability' };

  // Find prediction-like posts
  const { data: posts } = await supabase
    .from('posts')
    .select('id, content')
    .neq('author_id', botId)
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(15);

  if (!posts?.length) return { success: false, error: 'No posts to mark' };

  for (const post of posts) {
    const content = (post.content as string).toLowerCase();
    const isPrediction = /\b(will win|going to win|predict|undefeated|making the playoff|winning the|natty|championship bound|book it)\b/.test(content);
    if (!isPrediction) continue;

    // Check if already marked
    const { data: existing } = await supabase
      .from('aging_takes')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', botId)
      .limit(1);
    if (existing?.length) continue;

    // Set revisit date 30-60 days out
    const daysOut = 30 + Math.floor(Math.random() * 31);
    const revisitDate = new Date();
    revisitDate.setDate(revisitDate.getDate() + daysOut);

    const { error } = await supabase
      .from('aging_takes')
      .insert({
        post_id: post.id,
        user_id: botId,
        revisit_date: revisitDate.toISOString().split('T')[0],
      });

    if (error) continue;

    // Generate a visible reply so the receipt filing shows in comments
    let replyContent = await generateReplyContent(
      personality,
      bot.school,
      `You are filing a receipt on this prediction: "${(post.content as string).slice(0, 200)}". Write a 1-2 sentence reply marking this take for revisit. Be confident you'll come back to it. Example tones: "Filing a receipt on this one." / "Bookmarking this. We'll see in a few weeks." / "Screenshot this. I'm coming back for you."`,
      bot.bot_mood ?? 5
    );
    if (!replyContent) {
      replyContent = `Filing a receipt on this one. We'll revisit.`;
    }
    replyContent = humanizeContent(replyContent, personality, {
      bot_region: bot.bot_region,
      bot_age_bracket: bot.bot_age_bracket,
      bot_mood: bot.bot_mood ?? 5,
      schoolName: bot.school?.name,
      mascotName: bot.school?.mascot,
    });

    await supabase.from('posts').insert({
      author_id: botId,
      content: replyContent,
      post_type: 'STANDARD',
      school_id: bot.school_id,
      parent_id: post.id,
      status: 'PUBLISHED',
    });

    await supabase.from('bot_activity_log').insert({
      bot_id: botId,
      action_type: 'REPLY',
      target_post_id: post.id,
      content_preview: `[AGING] ${replyContent.slice(0, 100)}`,
      success: true,
    });

    return { success: true };
  }

  return { success: false, error: 'No prediction posts found' };
}

/**
 * Analyst bot runs a fact check on a post.
 */
export async function botFactCheck(botId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const bot = await fetchBot(botId);
  if (!bot || !bot.is_bot || !bot.bot_active) return { success: false, error: 'Bot inactive' };

  const personality = parsePersonality(bot.bot_personality);
  // Use personality-driven fact check probability directly
  const factCheckRate = personality.factCheckProbability || 0.10;
  if (Math.random() > factCheckRate) return { success: false, error: 'Skipped by probability' };

  // Find bold claims to fact check
  const { data: posts } = await supabase
    .from('posts')
    .select('id, content')
    .neq('author_id', botId)
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!posts?.length) return { success: false, error: 'No posts to fact check' };

  for (const post of posts) {
    // Check if already fact-checked
    const { data: existing } = await supabase
      .from('fact_checks')
      .select('id')
      .eq('post_id', post.id)
      .limit(1);
    if (existing?.length) continue;

    const content = (post.content as string).toLowerCase();
    const hasBoldClaim = /\b(best|worst|most|least|never|always|every|nobody|guaranteed|definitely)\b/.test(content);
    if (!hasBoldClaim) continue;

    // Request fact check via the API (uses DeepSeek AI internally)
    try {
      // Use internal fact check logic directly
      const { data: factCheck, error } = await supabase
        .from('fact_checks')
        .insert({
          post_id: post.id,
          requester_id: botId,
          claim: (post.content as string).slice(0, 500),
          verdict: 'PENDING',
        })
        .select('id')
        .single();

      if (error) continue;

      // Generate a visible reply so the fact check shows in comments
      let replyContent = await generateReplyContent(
        personality,
        bot.school,
        `You are fact-checking this claim: "${(post.content as string).slice(0, 200)}". Write a 1-3 sentence reply questioning or verifying the claim. Be analytical and specific. Example tones: "Gonna need a source on that one." / "Actually, the numbers tell a different story..." / "Fact check: this checks out, but context matters."`,
        bot.bot_mood ?? 5
      );
      if (!replyContent) {
        replyContent = `Gonna need a source on that one. Fact check filed.`;
      }
      replyContent = humanizeContent(replyContent, personality, {
        bot_region: bot.bot_region,
        bot_age_bracket: bot.bot_age_bracket,
        bot_mood: bot.bot_mood ?? 5,
        schoolName: bot.school?.name,
        mascotName: bot.school?.mascot,
      });

      await supabase.from('posts').insert({
        author_id: botId,
        content: replyContent,
        post_type: 'STANDARD',
        school_id: bot.school_id,
        parent_id: post.id,
        status: 'PUBLISHED',
      });

      await supabase.from('bot_activity_log').insert({
        bot_id: botId,
        action_type: 'REPLY',
        target_post_id: post.id,
        created_post_id: factCheck.id,
        content_preview: `[FACT CHECK] ${replyContent.slice(0, 100)}`,
        success: true,
      });

      return { success: true };
    } catch {
      continue;
    }
  }

  return { success: false, error: 'No suitable posts to fact check' };
}

// ============================================================
// Bot accepts pending challenges (NEW)
// ============================================================

export async function botAcceptChallenge(botId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const bot = await fetchBot(botId);
  if (!bot || !bot.is_bot || !bot.bot_active) return { success: false, error: 'Bot inactive' };

  const personality = parsePersonality(bot.bot_personality);
  // Only accept with personality-driven probability
  if (Math.random() > (personality.challengeProbability || 0.1)) return { success: false, error: 'Skipped by probability' };

  // Find pending challenges where this bot is the challenged party
  // Grace period: only accept challenges older than 30 minutes (let humans accept first)
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: pendingChallenges } = await supabase
    .from('challenges')
    .select('id, topic, challenger_id, post_id')
    .eq('challenged_id', botId)
    .eq('status', 'PENDING')
    .lt('created_at', thirtyMinAgo)
    .order('created_at', { ascending: true })
    .limit(3);

  if (!pendingChallenges?.length) return { success: false, error: 'No pending challenges' };

  const challenge = pendingChallenges[0]!;

  // Generate argument via AI
  const schoolName = bot.school?.name || 'my team';
  let argument = await generateReplyContent(
    personality,
    bot.school,
    `You've been challenged on this topic: "${challenge.topic}". Write a passionate 2-3 sentence argument defending your position as a ${schoolName} fan. Be competitive and specific.`,
    bot.bot_mood ?? 5
  );

  if (!argument) {
    argument = `${schoolName} speaks for itself. Look at the results on the field. That's all that needs to be said.`;
  }

  // Apply humanizer
  argument = humanizeContent(argument, personality, {
    bot_region: bot.bot_region,
    bot_age_bracket: bot.bot_age_bracket,
    bot_mood: bot.bot_mood ?? 5,
    schoolName: bot.school?.name,
    mascotName: bot.school?.mascot,
  });

  // Accept the challenge
  const { error } = await supabase
    .from('challenges')
    .update({
      challenged_argument: argument,
      status: 'ACTIVE',
      updated_at: new Date().toISOString(),
    })
    .eq('id', challenge.id);

  if (error) return { success: false, error: error.message };

  // Also submit challenger's argument if the challenger is a bot
  const challengerBot = await fetchBot(challenge.challenger_id);
  if (challengerBot?.is_bot) {
    const challengerPersonality = parsePersonality(challengerBot.bot_personality);
    let challengerArg = await generateReplyContent(
      challengerPersonality,
      challengerBot.school,
      `You challenged someone on: "${challenge.topic}". Write your opening argument in 2-3 passionate sentences. Back it up with real facts.`,
      challengerBot.bot_mood ?? 5
    );
    if (!challengerArg) {
      challengerArg = `I stand by what I said. The facts are clear and history backs me up.`;
    }
    challengerArg = humanizeContent(challengerArg, challengerPersonality, {
      bot_region: challengerBot.bot_region,
      bot_age_bracket: challengerBot.bot_age_bracket,
      bot_mood: challengerBot.bot_mood ?? 5,
      schoolName: challengerBot.school?.name,
      mascotName: challengerBot.school?.mascot,
    });

    // Update challenger argument; if both are now set, move to VOTING
    await supabase
      .from('challenges')
      .update({
        challenger_argument: challengerArg,
        status: 'VOTING',
        voting_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', challenge.id);
  }

  // Log
  await supabase.from('bot_activity_log').insert({
    bot_id: botId,
    action_type: 'POST',
    target_post_id: challenge.post_id,
    content_preview: `[CHALLENGE ACCEPTED] ${challenge.topic?.slice(0, 100)}`,
    success: true,
  });

  return { success: true };
}

// ============================================================
// Bot revisits aged takes whose revisit date has passed (NEW)
// ============================================================

export async function botRevisitAgedTakes(botId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const bot = await fetchBot(botId);
  if (!bot || !bot.is_bot || !bot.bot_active) return { success: false, error: 'Bot inactive' };

  const personality = parsePersonality(bot.bot_personality);

  // Find aged takes past their revisit date that this bot marked
  const today = new Date().toISOString().split('T')[0];
  const { data: agedTakes } = await supabase
    .from('aging_takes')
    .select('id, post_id, revisit_date')
    .eq('user_id', botId)
    .lte('revisit_date', today!)
    .limit(3);

  if (!agedTakes?.length) return { success: false, error: 'No aged takes to revisit' };

  const take = agedTakes[0]!;

  // Fetch the original post
  const { data: originalPost } = await supabase
    .from('posts')
    .select('content')
    .eq('id', take.post_id)
    .single();

  if (!originalPost) return { success: false, error: 'Original post not found' };

  // Generate revisit verdict
  let replyContent = await generateReplyContent(
    personality,
    bot.school,
    `You are revisiting a prediction you filed a receipt on. Original take: "${(originalPost.content as string).slice(0, 300)}". Were you right or wrong? Write a short 1-2 sentence verdict. Use "Called it." energy if right, or "Eating crow on this one" energy if wrong. Be honest.`,
    bot.bot_mood ?? 5
  );

  if (!replyContent) {
    replyContent = Math.random() < 0.5
      ? 'Called it. I said what I said and the results speak for themselves.'
      : 'Taking the L on this one. Sometimes you miss. That\'s football.';
  }

  replyContent = humanizeContent(replyContent, personality, {
    bot_region: bot.bot_region,
    bot_age_bracket: bot.bot_age_bracket,
    bot_mood: bot.bot_mood ?? 5,
    schoolName: bot.school?.name,
    mascotName: bot.school?.mascot,
  });

  // Post the revisit reply
  const { error } = await supabase.from('posts').insert({
    author_id: botId,
    content: replyContent,
    post_type: 'STANDARD',
    school_id: bot.school_id,
    parent_id: take.post_id,
    status: 'PUBLISHED',
  });

  if (error) return { success: false, error: error.message };

  // Log
  await supabase.from('bot_activity_log').insert({
    bot_id: botId,
    action_type: 'REPLY',
    target_post_id: take.post_id,
    content_preview: `[REVISIT] ${replyContent.slice(0, 100)}`,
    success: true,
  });

  return { success: true };
}

// ============================================================
// Bot flags a post (very rare) (NEW)
// ============================================================

export async function botFlagPost(botId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const bot = await fetchBot(botId);
  if (!bot || !bot.is_bot || !bot.bot_active) return { success: false, error: 'Bot inactive' };

  const personality = parsePersonality(bot.bot_personality);

  // Very rare: 2% for old_school, 1% for homer, basically never for others
  const flagRate = personality.type === 'old_school' ? 0.02
    : personality.type === 'homer' ? 0.01
    : 0.005;
  if (Math.random() > flagRate) return { success: false, error: 'Skipped by probability' };

  // Find posts with aggressive language
  const { data: posts } = await supabase
    .from('posts')
    .select('id, author_id, content, school_id')
    .neq('author_id', botId)
    .neq('school_id', bot.school_id) // Never flag own school
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!posts?.length) return { success: false, error: 'No posts to flag' };

  for (const post of posts) {
    const content = (post.content as string || '').toLowerCase();
    const hasAggressiveLanguage = /\b(trash|garbage|pathetic|embarrassing|disgrace|joke|clown)\b/.test(content);
    if (!hasAggressiveLanguage) continue;

    // Check if already reported
    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('post_id', post.id)
      .eq('reporter_id', botId)
      .limit(1);
    if (existing?.length) continue;

    const reasons = ['INAPPROPRIATE', 'PERSONAL_ATTACK', 'MISINFORMATION'];
    const reason = reasons[Math.floor(Math.random() * reasons.length)]!;

    const { error } = await supabase.from('reports').insert({
      reporter_id: botId,
      post_id: post.id,
      reported_user_id: post.author_id,
      reason,
    });

    if (error) continue;

    await supabase.from('bot_activity_log').insert({
      bot_id: botId,
      action_type: 'POST',
      target_post_id: post.id,
      content_preview: `[FLAG] ${reason}`,
      success: true,
    });

    return { success: true };
  }

  return { success: false, error: 'No flaggable posts found' };
}

// ============================================================
// Time-of-day activity modifier
// ============================================================

function getTimeActivityMultiplier(): number {
  const now = new Date();
  const hour = now.getUTCHours() - 5; // Rough EST conversion
  const adjustedHour = hour < 0 ? hour + 24 : hour;
  const day = now.getDay();
  const isSaturday = day === 6;
  const isSunday = day === 0;

  // Increased all rates so bots actually post consistently
  if (isSaturday && adjustedHour >= 10 && adjustedHour <= 23) return 1.0; // Game day peak
  if (isSunday && adjustedHour >= 6 && adjustedHour < 14) return 0.8;     // Sunday morning recap
  if (adjustedHour >= 0 && adjustedHour < 6) return 0.15;                 // Late night: low but not dead
  if (adjustedHour >= 6 && adjustedHour < 9) return 0.6;                  // Morning ramp-up
  if (adjustedHour >= 9 && adjustedHour < 17) return 0.75;                // Daytime: active
  if (adjustedHour >= 17 && adjustedHour <= 23) return 0.85;              // Evening: high activity
  return 0.7;
}

/**
 * Run one bot cycle: pick random active bots, execute probabilistic actions.
 * Enhanced with time-of-day awareness, all post actions, and personality-driven behavior.
 */
export async function runBotCycle(): Promise<{
  success: boolean;
  globalActive: boolean;
  totalBots: number;
  selectedBots: string[];
  posted: number;
  reacted: number;
  replied: number;
  reposted: number;
  challenged: number;
  factChecked: number;
  aged: number;
  saved: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  const emptyResult = {
    success: true, globalActive: false, totalBots: 0, selectedBots: [],
    posted: 0, reacted: 0, replied: 0, reposted: 0,
    challenged: 0, factChecked: 0, aged: 0, saved: 0, errors: [],
  };

  // Check global toggle
  const { data: setting } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'bots_global_active')
    .single();

  if (setting?.value !== 'true') {
    return emptyResult;
  }

  // Time-of-day check (skip in dev so every trigger produces output)
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev) {
    const activityMod = getTimeActivityMultiplier();
    if (Math.random() > activityMod) {
      return { ...emptyResult, globalActive: true };
    }
  }

  // Get active bots
  const { data: activeBots } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('is_bot', true)
    .eq('bot_active', true)
    .eq('status', 'ACTIVE');

  if (!activeBots?.length) {
    return { ...emptyResult, globalActive: true };
  }

  // Time-aware bot count
  const now = new Date();
  const estHour = (now.getUTCHours() - 5 + 24) % 24;
  const isSaturday = now.getDay() === 6;
  let maxBotsForCycle: number;
  if (estHour >= 0 && estHour < 6) maxBotsForCycle = 1;
  else if (estHour >= 6 && estHour < 9) maxBotsForCycle = 2;
  else if (isSaturday && estHour >= 10 && estHour <= 23) maxBotsForCycle = 4;
  else if (estHour >= 17 && estHour <= 23) maxBotsForCycle = 3;
  else maxBotsForCycle = 3;

  const numBots = Math.min(maxBotsForCycle, activeBots.length, Math.max(1, Math.floor(Math.random() * maxBotsForCycle) + 1));

  // Check last 3 posts on feed to enforce spacing rules
  const { data: lastFeedPosts } = await supabase
    .from('posts')
    .select('author_id, school_id')
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(3);

  const recentAuthorIds = new Set((lastFeedPosts ?? []).map(p => p.author_id));
  const recentSchoolIds = new Set((lastFeedPosts ?? []).map(p => p.school_id).filter(Boolean));

  // Round-robin: pick bots by longest idle first, then filter
  const sortedBots = [...activeBots].sort((a, b) => {
    // Prefer bots that haven't posted recently (simple id-based fallback)
    return 0; // Will use bot_last_post_at when available via full profile fetch
  });
  const shuffled = shuffleArray(sortedBots);

  // Filter: skip bots that posted in the last 3 feed posts or recently
  const eligibleBots = shuffled.filter(b => !recentAuthorIds.has(b.id));
  const selectedBots = (eligibleBots.length >= numBots ? eligibleBots : shuffled).slice(0, numBots);

  // Track schools selected this cycle to avoid same-school consecutive posts
  const schoolsThisCycle = new Set<string>();

  let posted = 0;
  let reacted = 0;
  let replied = 0;
  let reposted = 0;
  let challenged = 0;
  let factChecked = 0;
  let aged = 0;
  let saved = 0;
  const errors: string[] = [];

  for (const bot of selectedBots) {
    // Fetch full bot profile for throttle checks
    const botProfile = await fetchBot(bot.id);
    if (!botProfile) continue;

    // Post throttle: skip if bot posted recently (2 min dev, 60 min prod)
    const postCooldownMinutes = process.env.NODE_ENV === 'development' ? 2 : 60;
    const lastPostAt = botProfile.bot_post_count_today !== null
      ? (await supabase.from('profiles').select('bot_last_post_at').eq('id', bot.id).single()).data?.bot_last_post_at
      : null;
    const minutesSinceLastPost = lastPostAt
      ? (Date.now() - new Date(lastPostAt as string).getTime()) / 60000
      : Infinity;
    const canPost = minutesSinceLastPost >= postCooldownMinutes;

    // Same-school throttle
    const botSchoolId = botProfile.school_id;
    const schoolAlreadyPosted = botSchoolId && schoolsThisCycle.has(botSchoolId);

    // ---- PRIMARY ACTION: Post or Reply ----
    const actionRoll = Math.random();
    if (canPost && !schoolAlreadyPosted && actionRoll < 0.65) {
      // POST mode (65%): create a new take
      try {
        const result = await postBotTake(bot.id);
        if (result.success) {
          posted++;
          if (botSchoolId) schoolsThisCycle.add(botSchoolId);
        }
        else if (result.error) errors.push(`Post[${bot.username}]: ${result.error}`);
      } catch (err) {
        errors.push(`Post[${bot.username}]: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      // REPLY mode (35% or when throttled): reply to an existing post
      try {
        const result = await botReplyToPost(bot.id);
        if (result.success) replied++;
        else if (result.error) errors.push(`Reply[${bot.username}]: ${result.error}`);
      } catch (err) {
        errors.push(`Reply[${bot.username}]: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ---- GUARANTEED REACTIONS: Every bot reacts to 2-3 posts per cycle ----
    try {
      const result = await botReactToPosts(bot.id);
      if (result.count > 0) reacted += result.count;
    } catch (err) {
      errors.push(`React[${bot.username}]: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ---- SECONDARY ACTIONS (personality-driven) ----

    // 30% chance to repost
    if (Math.random() < 0.30) {
      try {
        const result = await botRepostContent(bot.id);
        if (result.success) reposted++;
      } catch (err) {
        errors.push(`Repost[${bot.username}]: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Challenge (personality-driven probability)
    try {
      const result = await botIssueChallenge(bot.id);
      if (result.success) challenged++;
    } catch (err) {
      errors.push(`Challenge[${bot.username}]: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Fact check (personality-driven, not analyst-only anymore)
    try {
      const result = await botFactCheck(bot.id);
      if (result.success) factChecked++;
    } catch (err) {
      errors.push(`FactCheck[${bot.username}]: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Mark for aging
    try {
      const result = await botMarkForAging(bot.id);
      if (result.success) aged++;
    } catch (err) {
      errors.push(`Aging[${bot.username}]: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Save/bookmark posts
    try {
      const result = await botSavePosts(bot.id);
      if (result.count > 0) saved += result.count;
    } catch (err) {
      errors.push(`Save[${bot.username}]: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Accept pending challenges
    try {
      const result = await botAcceptChallenge(bot.id);
      if (result.success) challenged++;
    } catch (err) {
      errors.push(`AcceptChallenge[${bot.username}]: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Revisit aged takes whose revisit date has passed
    try {
      const result = await botRevisitAgedTakes(bot.id);
      if (result.success) aged++;
    } catch (err) {
      errors.push(`Revisit[${bot.username}]: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    success: true,
    globalActive: true,
    totalBots: activeBots.length,
    selectedBots: selectedBots.map((b) => b.username),
    posted,
    reacted,
    replied,
    reposted,
    challenged,
    factChecked,
    aged,
    saved,
    errors,
  };
}
