// ============================================================
// AI blog generator (matchup previews).
// Builds a data-grounded prompt from buildMatchupContext and calls Groq
// (gpt-oss-120b) in JSON mode, mirroring the argufight approach but with
// anti-hallucination guardrails since real records/history are involved.
// ============================================================

import { aiChat } from '@/lib/admin/ai/groq';
import { buildMatchupContext, type MatchupContext } from './matchup-context';
import {
  buildWeekContext,
  buildPortalContext,
  buildRankingsContext,
  buildFreeformContext,
  type BlogContext,
} from './contexts';
import { matchupSlug } from '@/lib/seo/matchups';

export type BlogType = 'matchup' | 'weekly-recap' | 'portal-roundup' | 'power-rankings' | 'freeform';

export interface GeneratedBlog {
  title: string;
  content: string; // HTML
  excerpt: string;
  metaDescription: string;
  keywords: string;
  tags: string[];
  faqs: Array<{ question: string; answer: string }>;
}

const SYSTEM_PROMPT =
  'You are a veteran college football writer for CFB Social, a fan community. You write sharp, engaging, accurate matchup preview articles. You know the deep history of college football programs, coaches, and rivalries. You write with authority and energy, but you NEVER invent specific statistics, scores, dates, or records that are not given to you in the DATA block. For anything current or upcoming you rely ONLY on the provided data; for historical/program context you may use your own knowledge but keep specific claims general and factually safe. Never fabricate quotes.';

function buildUserPrompt(ctx: MatchupContext, notes?: string): string {
  const homeSlug = ctx.home.slug;
  const awaySlug = ctx.away.slug;
  const mslug = matchupSlug(homeSlug, awaySlug);
  return `Write a college football matchup preview blog post: ${ctx.away.name} vs ${ctx.home.name}.

DATA (ground truth — use these facts and do not contradict or invent beyond them):
${ctx.promptText}
${notes ? `\nEDITOR NOTES: ${notes}\n` : ''}
Requirements:
- Title: a compelling, specific headline for this matchup. Do NOT include the site name or the word "Issue".
- Content: 700-1100 words of HTML using ONLY <h2>, <h3>, <p>, <ul>/<li>, <strong>, <em>, and <a> tags. Do NOT include an <h1> or repeat the title. Structure it as: an intro hook, a "The Stakes" section (current-season context), a "The History" section (all-time series + program lore), a "Key Storylines" section, and a closing take.
- GROUND RULES: Use the DATA block for all current records, rankings, series numbers, dates, and venues. If the DATA says the game is not on the schedule, write an evergreen preview and do NOT invent a kickoff time or state a predicted final score as if it were fact. Historical context from your own knowledge is fine but keep specific claims safe and general. No fabricated quotes or stats.
- Internal links: weave in 2-4 natural links using ONLY these real relative URLs, with descriptive anchor text: <a href="/school/${homeSlug}">${ctx.home.name}</a>, <a href="/school/${awaySlug}">${ctx.away.name}</a>, <a href="/matchup/${mslug}">the matchup hub</a>, <a href="/rivalry">the Rivalry Ring</a>, <a href="/predictions">file a prediction</a>, <a href="/feed">the feed</a>. Do NOT invent other URLs.
- Close with a call-to-action inviting fans to debate the game and file a prediction on CFB Social.
- Excerpt: 2-3 plain-text sentences (no HTML).
- metaDescription: under 155 characters, SEO-friendly, plain text.
- keywords: 5-8 comma-separated keywords.
- tags: 3-5 short tag strings (team names, "rivalry", the conference, etc.).
- faqs: 2-4 {question, answer} pairs answering common fan questions about this matchup (answers 1-2 sentences, factually safe).

Respond ONLY with valid JSON (no markdown fences), exactly this shape:
{"title":"...","content":"<h2>...</h2>...","excerpt":"...","metaDescription":"...","keywords":"...","tags":["..."],"faqs":[{"question":"...","answer":"..."}]}`;
}

function parseGenerated(text: string): GeneratedBlog {
  let raw = (text ?? '').trim();
  if (!raw) throw new Error('AI returned an empty response — please try again.');
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) raw = fence[1].trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1);

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw);
  } catch {
    throw new Error('AI returned malformed content — please try generating again.');
  }
  if (!obj || typeof obj.content !== 'string' || !(obj.content as string).trim()) {
    throw new Error('AI returned malformed content — please try generating again.');
  }

  return {
    title: String(obj.title ?? '').trim() || 'College Football Matchup Preview',
    content: String(obj.content),
    excerpt: String(obj.excerpt ?? '').trim(),
    metaDescription: String(obj.metaDescription ?? '').trim().slice(0, 160),
    keywords: String(obj.keywords ?? '').trim(),
    tags: Array.isArray(obj.tags) ? obj.tags.map((t) => String(t)).slice(0, 6) : [],
    faqs: Array.isArray(obj.faqs)
      ? (obj.faqs as unknown[])
          .filter((f): f is { question: unknown; answer: unknown } => !!f && typeof f === 'object' && 'question' in f && 'answer' in f)
          .map((f) => ({ question: String(f.question), answer: String(f.answer) }))
          .filter((f) => f.question && f.answer)
          .slice(0, 5)
      : [],
  };
}

async function runBlogGen(userPrompt: string, subType: string): Promise<GeneratedBlog> {
  const text = await aiChat(userPrompt, {
    feature: 'blog',
    subType,
    systemPrompt: SYSTEM_PROMPT,
    model: process.env.GROQ_BLOG_MODEL ?? 'openai/gpt-oss-120b',
    temperature: 0.7,
    maxTokens: 4000,
    timeout: 45_000,
    jsonMode: true,
  });
  return parseGenerated(text);
}

export async function generateMatchupBlog(
  homeSlug: string,
  awaySlug: string,
  opts?: { espnGameId?: string; notes?: string },
): Promise<{ blog: GeneratedBlog; context: MatchupContext }> {
  const context = await buildMatchupContext(homeSlug, awaySlug, opts?.espnGameId);
  if (!context) throw new Error('Could not find one or both schools by slug.');
  const blog = await runBlogGen(buildUserPrompt(context, opts?.notes), 'matchup_preview');
  return { blog, context };
}

/* ── Non-matchup post types ────────────────────────────────────── */

// Shared internal-link + output-format spec for the editorial types.
const SHARED_OUTPUT_SPEC = `
- Content: 650-1000 words of HTML using ONLY <h2>, <h3>, <p>, <ul>/<li>, <strong>, <em>, and <a> tags. Do NOT include an <h1> or repeat the title.
- GROUND RULES: use the DATA block for all specific scores, rankings, records, and player movements. Do NOT invent numbers, results, or names beyond the data. General analysis and well-known program context from your own knowledge is fine.
- Internal links: weave in 2-4 natural links using ONLY these real relative URLs with descriptive anchor text: <a href="/feed">the feed</a>, <a href="/rivalry">the Rivalry Ring</a>, <a href="/predictions">file a prediction</a>, <a href="/portal">the Transfer Portal Wire</a>, <a href="/recruiting">Recruiting</a>, <a href="/schools">all 653 schools</a>. Do NOT invent other URLs.
- End with a call-to-action inviting fans to weigh in on CFB Social.
- Excerpt: 2-3 plain-text sentences. metaDescription: under 155 chars. keywords: 5-8 comma-separated. tags: 3-5 short strings. faqs: 2-4 {question,answer} pairs (factually safe).
Respond ONLY with valid JSON (no fences), exactly: {"title":"...","content":"<h2>...</h2>...","excerpt":"...","metaDescription":"...","keywords":"...","tags":["..."],"faqs":[{"question":"...","answer":"..."}]}`;

function editorialPrompt(kind: string, guidance: string, ctx: BlogContext, notes?: string): string {
  return `Write a college football ${kind} for CFB Social.

${guidance}

DATA (ground truth — use these facts, do not invent beyond them):
${ctx.promptText}
${notes ? `\nEDITOR NOTES: ${notes}\n` : ''}
Requirements:
- Title: a compelling, specific headline. Do NOT include the site name.${SHARED_OUTPUT_SPEC}`;
}

export async function generateWeeklyRecap(notes?: string): Promise<{ blog: GeneratedBlog; context: BlogContext }> {
  const context = await buildWeekContext();
  const blog = await runBlogGen(
    editorialPrompt(
      'weekly recap column',
      'Summarize the biggest results and storylines of the current slate, react to the rankings, and set up what to watch next. Energetic, opinionated, but accurate.',
      context,
      notes,
    ),
    'weekly_recap',
  );
  return { blog, context };
}

export async function generatePortalRoundup(notes?: string): Promise<{ blog: GeneratedBlog; context: BlogContext }> {
  const context = await buildPortalContext();
  const blog = await runBlogGen(
    editorialPrompt(
      'transfer portal roundup',
      'Break down the most notable recent transfer portal moves, who won and lost, and what it means. Only reference players/moves that appear in the DATA.',
      context,
      notes,
    ),
    'portal_roundup',
  );
  return { blog, context };
}

export async function generatePowerRankings(notes?: string): Promise<{ blog: GeneratedBlog; context: BlogContext }> {
  const context = await buildRankingsContext();
  const blog = await runBlogGen(
    editorialPrompt(
      'power rankings reaction column',
      'React to the current poll: who is overrated, underrated, and on the move. Use ONLY the ranking numbers in the DATA; do not invent a ranking.',
      context,
      notes,
    ),
    'power_rankings',
  );
  return { blog, context };
}

export async function generateFreeform(
  topic: string,
  notes?: string,
): Promise<{ blog: GeneratedBlog; context: BlogContext }> {
  const context = await buildFreeformContext(topic);
  const blog = await runBlogGen(
    editorialPrompt(
      'opinion article',
      `Write an engaging, well-structured college football article on this topic: "${topic}".`,
      context,
      notes,
    ),
    'freeform',
  );
  return { blog, context };
}
