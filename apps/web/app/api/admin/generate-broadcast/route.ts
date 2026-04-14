import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { createAdminClient } from '@/lib/admin/supabase/admin';
import { aiChatWithRetry } from '@/lib/admin/ai/deepseek';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { mode } = await req.json();
  // mode: 'news' | 'general'

  const supabase = createAdminClient();

  // Get previous broadcasts to avoid duplicates
  const { data: previousBroadcasts } = await supabase
    .from('system_notifications')
    .select('title, body')
    .eq('target_audience', 'all')
    .order('created_at', { ascending: false })
    .limit(15);

  const previousList = (previousBroadcasts ?? [])
    .map((b, i) => `${i + 1}. "${b.title}" - ${(b.body || '').slice(0, 60)}`)
    .join('\n');

  let systemPrompt = '';
  let userPrompt = '';

  if (mode === 'news') {
    // Fetch latest news from the news-feeds API
    let newsContext = '';
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      const newsRes = await fetch(`${baseUrl}/api/news-feeds`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        const articles = (newsData.articles || []).slice(0, 10);
        newsContext = articles
          .map((a: { title?: string; source?: string; summary?: string }, i: number) =>
            `${i + 1}. [${a.source || 'Unknown'}] ${a.title || 'No title'}${a.summary ? ` - ${a.summary.slice(0, 80)}` : ''}`
          )
          .join('\n');
      }
    } catch {
      // Fallback: fetch recent posts from the feed
    }

    // If no news articles, try recent posts
    if (!newsContext) {
      const { data: recentPosts } = await supabase
        .from('posts')
        .select('body')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(10);

      newsContext = (recentPosts ?? [])
        .map((p, i) => `${i + 1}. ${(p.body || '').slice(0, 100)}`)
        .join('\n');
    }

    systemPrompt = `You are a community manager for CFB Social, the college football fan community. Generate a broadcast notification based on the latest news and trending topics in college football.

Rules:
- Title: 5-10 words max, catchy and direct, referencing the news
- Body: 1-2 sentences max, 20-40 words
- Tone: energetic, informed, breaking-news style
- Reference specific teams, players, or events from the news provided
- Never use markdown formatting or emojis
- Each broadcast must be unique from previous ones

Return ONLY valid JSON: {"title": "...", "body": "..."}`;

    userPrompt = `Here are the latest college football headlines:\n${newsContext || 'No specific headlines available — generate something about the current CFB landscape.'}\n\n${previousList ? `Previous broadcasts (avoid repeating):\n${previousList}\n\n` : ''}Generate a broadcast notification based on this news.`;

  } else {
    // General mode — about the platform and features
    systemPrompt = `You are a community manager for CFB Social, the college football fan community. Users post takes, debate rivalries, file predictions, track the transfer portal, vote in Mascot Wars, and build their dynasty.

Generate a broadcast notification that promotes platform features and encourages engagement.

Rules:
- Title: 5-10 words max, catchy and direct
- Body: 1-2 sentences max, 20-40 words
- Tone: energetic, competitive, passionate — like a sports broadcaster
- Never use markdown formatting or emojis
- Mix up topics: rivalry debates, prediction challenges, dynasty rankings, Mascot Wars voting, transfer portal tracking, school hubs, aging takes
- Each broadcast must be completely unique from previous ones

Return ONLY valid JSON: {"title": "...", "body": "..."}`;

    userPrompt = previousList
      ? `Previous broadcasts (DO NOT repeat themes or phrasings):\n${previousList}\n\nGenerate a completely new broadcast promoting a platform feature.`
      : 'Generate an engaging broadcast promoting a platform feature.';
  }

  const raw = await aiChatWithRetry(userPrompt, {
    feature: 'broadcast_generation',
    subType: mode === 'news' ? 'news_broadcast' : 'general_broadcast',
    temperature: 1.0,
    maxTokens: 200,
    systemPrompt,
  });

  if (!raw) {
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }

  let title = '';
  let body = '';
  try {
    const parsed = JSON.parse(raw);
    title = parsed.title || '';
    body = parsed.body || '';
  } catch {
    const titleMatch = raw.match(/"title"\s*:\s*"([^"]+)"/);
    const bodyMatch = raw.match(/"body"\s*:\s*"([^"]+)"/);
    title = titleMatch?.[1] || '';
    body = bodyMatch?.[1] || '';
  }

  title = title.replace(/[*#_~`>-]{2,}/g, '').trim();
  body = body.replace(/[*#_~`>-]{2,}/g, '').trim();

  if (!title || !body) {
    return NextResponse.json({ error: 'AI returned empty content' }, { status: 500 });
  }

  return NextResponse.json({ title, body });
}
