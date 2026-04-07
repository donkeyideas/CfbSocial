// ============================================================
// Bot Engine - Core bot action functions
// Uses DeepSeek AI + Supabase service client
// Integrates personality system, humanizer, anti-repetition
// ============================================================

import { createAdminClient } from '@/lib/admin/supabase/admin';
import { aiChat } from '@/lib/admin/ai/deepseek';
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
  tier: 'short' | 'medium' | 'long';
  maxChars: number;
  maxTokens: number;
  hint: string;
}

function getRandomPostLength(personality: BotPersonality): LengthConfig {
  // Hot takes are always short
  if (personality.type === 'hot_take') {
    return {
      tier: 'short',
      maxChars: 150,
      maxTokens: 100,
      hint: 'Write a single punchy take in 1-2 sentences (under 150 characters). Be definitive and provocative',
    };
  }

  const roll = Math.random();
  if (roll < 0.3) {
    return {
      tier: 'short',
      maxChars: 280,
      maxTokens: 200,
      hint: 'Write a single short college football take (1-2 sentences, under 280 characters)',
    };
  } else if (roll < 0.65) {
    return {
      tier: 'medium',
      maxChars: Math.min(500, personality.maxPostLength),
      maxTokens: 400,
      hint: 'Your response MUST be 3-5 sentences long (around 300-480 characters). Expand on your point with supporting evidence, specific games, players, or stats',
    };
  } else {
    return {
      tier: 'long',
      maxChars: Math.min(500, personality.maxPostLength),
      maxTokens: 600,
      hint: 'Your response MUST be a full paragraph of 5-8 sentences (400-500 characters). Break down your argument thoroughly, reference specific stats, players, games. Make your full case',
    };
  }
}

function getRandomReplyLength(): LengthConfig {
  const roll = Math.random();
  if (roll < 0.4) {
    return { tier: 'short', maxChars: 200, maxTokens: 150, hint: 'Write a short reply (1 sentence, under 200 characters)' };
  } else if (roll < 0.75) {
    return { tier: 'medium', maxChars: 400, maxTokens: 300, hint: 'Your reply MUST be 2-4 sentences. Explain your reasoning and add your own perspective' };
  } else {
    return { tier: 'long', maxChars: 500, maxTokens: 400, hint: 'Your reply MUST be 4-6 sentences. Really engage with the take in depth' };
  }
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
    seasonNote = `
- It is the OFFSEASON (${isSpringPractice ? 'spring practice' : isSummerDead ? 'summer dead period' : isFallCamp ? 'fall camp' : 'early offseason'}). There are NO games happening. Do NOT reference upcoming games, "this weekend", or game scores. Focus on offseason topics: portal, recruiting, coaching, spring practice, preseason predictions`;
  }

  const system = `${systemBase}${contentDirective}

Today is ${today}.

RULES:
- ${lengthConfig.hint}
- Sound natural and human - like a real fan posting on social media on their phone
- ONLY mention a person BY NAME if their name appears in the ESPN news or context provided below. If no names are given, use generic references ("our QB", "the new transfers", "the coaching staff", "the head coach")
- Do NOT invent, recall, or guess ANY names — not players, not coaches, not historical players. Rosters and staffs change constantly. The ONLY names you may use are those explicitly listed in the news context below
- NO markdown formatting (no bold, italics, headers, backticks, bullet points, numbered lists)
- NO hashtags, NO section dividers
- NO emojis
- Be opinionated and engaging
- NEVER start with "Alright", "Look,", "Listen,", "Let me tell you", "Here's the thing"
- NEVER introduce yourself or state who you are ("As a fan...", "As someone who...")
- NEVER end with calls to action ("Sound off", "Drop your thoughts", "What do you think?")
- NEVER repeat or paraphrase something already on the timeline
- Write like you are posting on your phone, not writing an essay${seasonNote}${extraInstructions ? '\n' + extraInstructions : ''}`;

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
      finalNewsContext = '\n\nRecent college football headlines (from ESPN):\n' + rssHeadlines.map(h => `- ${h}`).join('\n');
      finalSourceType = 'national';
    }
  }

  const temp = personality.temperatureRange[0] + Math.random() * (personality.temperatureRange[1] - personality.temperatureRange[0]);

  // Attempt up to 3 generations with escalating anti-repetition instructions
  for (let attempt = 0; attempt < 3; attempt++) {
    let extraInstructions = '';
    if (attempt === 1) {
      extraInstructions = '- Your previous attempt was too similar to existing posts. Write something COMPLETELY different in topic and wording.';
    } else if (attempt === 2) {
      extraInstructions = '- CRITICAL: Pick a totally unexpected angle. Surprise the reader. Do NOT write about common topics.';
    }

    const { system, user, length } = buildTakePrompt(personality, school, context, finalNewsContext, finalSourceType, history, mood, extraInstructions, localKnowledge);

    try {
      const raw = await aiChat(`${system}\n\n${user}`, {
        feature: 'bot_posts',
        subType: 'bot_take',
        temperature: Math.min(temp + attempt * 0.05, 1.0),
        maxTokens: length.maxTokens,
      });
      const cleaned = cleanBotContent(raw, length.maxChars);
      if (cleaned.length < 10) continue;

      // Anti-repetition checks
      if (isOpenerTooSimilar(cleaned, history.recentOpeners)) continue;
      if (isTooSimilar(cleaned, recentBotPosts)) continue;

      return cleaned;
    } catch (err) {
      console.error(`[BOT] AI generation attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
    }
  }

  return null;
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

  const prompt = `${systemBase}

You are replying to a post on a college football social media platform.

RULES:
- ${length.hint}
- Sound natural - like a real person commenting on their phone
- NO markdown formatting, NO emojis, NO hashtags
- NEVER start with "Alright", "Look,", "Listen,"
- NEVER start with "As a fan..." or "In my opinion..."
- NEVER end with "Sound off below", "Drop your thoughts", or any call to action
- Be engaging - agree, disagree, add context, or challenge the take
- Do NOT invent player names. Only reference players or coaches mentioned in the post you are replying to, or well-known head coaches
- Write like a real fan, not an AI

Reply to this take: "${targetContent}"`;

  try {
    const raw = await aiChat(prompt, {
      feature: 'bot_posts',
      subType: 'bot_reply',
      temperature: temp,
      maxTokens: length.maxTokens,
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

  for (const post of recentPosts) {
    if (Math.random() > 0.25) continue; // 25% chance per post

    // Check if already reacted
    const { data: existing } = await supabase
      .from('reactions')
      .select('id')
      .eq('user_id', botId)
      .eq('post_id', post.id)
      .limit(1);
    if (existing?.length) continue;

    // Context-aware reaction logic
    let tdChance = 0.5;
    const postContent = (post.content as string || '').toLowerCase();
    const isAboutBotSchool = bot.school_id && post.school_id === bot.school_id;
    const isPositiveAboutSchool = isAboutBotSchool && /\b(great|best|elite|dominant|amazing|underrated)\b/.test(postContent);
    const isNegativeAboutSchool = isAboutBotSchool && /\b(bad|terrible|worst|overrated|fraud|exposed)\b/.test(postContent);

    if (personality.reactionBias === 'touchdown_heavy') tdChance = 0.8;
    else if (personality.reactionBias === 'fumble_heavy') tdChance = 0.3;

    // Personality-specific adjustments
    if (personality.type === 'homer') {
      if (isPositiveAboutSchool) tdChance = 0.95;
      if (isNegativeAboutSchool) tdChance = 0.05;
    } else if (personality.type === 'old_school') {
      if (/\b(nil|transfer portal)\b/i.test(postContent) && /\b(good|great|love|amazing)\b/i.test(postContent)) {
        tdChance = 0.1; // Fumble pro-NIL/portal takes
      }
    } else if (personality.type === 'hot_take') {
      // Contrarian: fumble popular-seeming takes
      tdChance = 0.35;
    }

    const reactionType = Math.random() < tdChance ? 'TOUCHDOWN' : 'FUMBLE';

    const { error } = await supabase
      .from('reactions')
      .insert({ user_id: botId, post_id: post.id, reaction_type: reactionType });

    if (!error) reactCount++;
    if (reactCount >= 5) break;
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
 * Now uses personality-aware reply with humanizer.
 */
export async function botReplyToPost(botId: string): Promise<{ success: boolean; postId?: string; error?: string }> {
  const supabase = createAdminClient();
  const bot = await fetchBot(botId);
  if (!bot || !bot.is_bot || !bot.bot_active) return { success: false, error: 'Bot inactive' };

  const personality = parsePersonality(bot.bot_personality);
  const mood = bot.bot_mood ?? 5;

  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, content, author_id')
    .neq('author_id', botId)
    .eq('status', 'PUBLISHED')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!recentPosts?.length) return { success: false, error: 'No posts to reply to' };

  for (const post of recentPosts) {
    if (Math.random() > personality.replyProbability) continue;

    // Check if already replied
    const { data: existingReply } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', botId)
      .eq('parent_id', post.id)
      .eq('status', 'PUBLISHED')
      .limit(1);
    if (existingReply?.length) continue;

    // Generate reply
    let replyContent = await generateReplyContent(personality, bot.school, post.content as string, mood);

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
    .gte('touchdown_count', 1)
    .order('touchdown_count', { ascending: false })
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

    // Log
    await supabase.from('bot_activity_log').insert({
      bot_id: botId,
      action_type: 'POST',
      target_post_id: post.id,
      created_post_id: challenge.id,
      content_preview: `Challenge issued: ${topic.slice(0, 100)}`,
      success: true,
      trigger_type: 'bot_challenge',
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

    await supabase.from('bot_activity_log').insert({
      bot_id: botId,
      action_type: 'POST',
      target_post_id: post.id,
      content_preview: `Filed receipt for aging (revisit in ${daysOut} days)`,
      success: true,
      trigger_type: 'bot_aging',
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
  if (personality.type !== 'analyst') return { success: false, error: 'Only analyst bots fact check' };
  if (Math.random() > personality.factCheckProbability) return { success: false, error: 'Skipped by probability' };

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

      await supabase.from('bot_activity_log').insert({
        bot_id: botId,
        action_type: 'POST',
        target_post_id: post.id,
        created_post_id: factCheck.id,
        content_preview: 'Fact check requested',
        success: true,
        trigger_type: 'bot_fact_check',
      });

      return { success: true };
    } catch {
      continue;
    }
  }

  return { success: false, error: 'No suitable posts to fact check' };
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

  if (isSaturday && adjustedHour >= 10 && adjustedHour <= 23) return 1.0;
  if (isSunday && adjustedHour >= 6 && adjustedHour < 12) return 0.3;
  if (adjustedHour >= 0 && adjustedHour < 6) return 0.05;
  if (adjustedHour >= 18 && adjustedHour <= 23) return 0.7;
  if (adjustedHour >= 9 && adjustedHour < 17) return 0.4;
  return 0.5;
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

  // Time-of-day check
  const activityMod = getTimeActivityMultiplier();
  if (Math.random() > activityMod) {
    return { ...emptyResult, globalActive: true };
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

  // Pick 2-4 random bots
  const maxBots = Math.min(4, activeBots.length);
  const numBots = Math.max(2, Math.floor(Math.random() * maxBots) + 1);
  const selectedBots = shuffleArray(activeBots).slice(0, numBots);

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
    // 70% chance to post
    if (Math.random() < 0.7) {
      try {
        const result = await postBotTake(bot.id);
        if (result.success) posted++;
        else if (result.error) errors.push(`Post[${bot.username}]: ${result.error}`);
      } catch (err) {
        errors.push(`Post[${bot.username}]: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 60% chance to react
    if (Math.random() < 0.6) {
      try {
        const result = await botReactToPosts(bot.id);
        if (result.count > 0) reacted += result.count;
      } catch (err) {
        errors.push(`React[${bot.username}]: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Reply (probability from personality)
    if (Math.random() < 0.4) {
      try {
        const result = await botReplyToPost(bot.id);
        if (result.success) replied++;
      } catch (err) {
        errors.push(`Reply[${bot.username}]: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 25% chance to repost
    if (Math.random() < 0.25) {
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

    // Fact check (analyst only)
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
