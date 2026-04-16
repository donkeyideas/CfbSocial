import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiChat } from '@/lib/admin/ai/router';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { postId } = await request.json();
  if (!postId) {
    return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
  }

  // Fetch the post content
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, content, author_id')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Check for existing fact check (within last 24h to avoid spam)
  const { data: existing } = await supabase
    .from('fact_checks')
    .select('id, verdict, evidence, ai_analysis, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Return existing fact check if it was done recently (24h)
    const age = Date.now() - new Date(existing.created_at).getTime();
    if (age < 24 * 60 * 60 * 1000) {
      return NextResponse.json({ factCheck: existing, cached: true });
    }
  }

  // Call DeepSeek for fact-check analysis
  const prompt = `You are a college football fact-checker for CFB Social. Analyze the following fan post for factual claims.

POST: "${post.content}"

Instructions:
- Identify the main factual claim(s) in this post.
- For each claim, assess if it's VERIFIED (clearly true), FALSE (clearly wrong), UNVERIFIABLE (opinion or can't be confirmed), or PENDING (needs more context).
- Give an overall verdict.
- Keep your response under 150 words.
- Be fair — distinguish between opinions/hot takes (which are UNVERIFIABLE) and actual factual claims.
- College football trash talk and opinions are NOT false claims.

Respond ONLY with valid JSON:
{
  "claim": "The main factual claim extracted from the post",
  "verdict": "VERIFIED" | "FALSE" | "UNVERIFIABLE" | "PENDING",
  "evidence": "Brief explanation of your reasoning (1-2 sentences)",
  "confidence": 0.0 to 1.0
}`;

  try {
    const raw = await aiChat(prompt, {
      feature: 'fact_checking',
      subType: 'claim_verification',
      temperature: 0.2,
      maxTokens: 300,
    });

    // Parse AI response
    let analysis;
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {
        claim: post.content.slice(0, 200),
        verdict: 'UNVERIFIABLE',
        evidence: 'Unable to parse AI analysis. The post may be opinion-based.',
        confidence: 0.5,
      };
    }

    // Store in fact_checks table
    const { data: factCheck, error: insertError } = await supabase
      .from('fact_checks')
      .insert({
        post_id: postId,
        requester_id: user.id,
        claim: (analysis.claim || post.content).slice(0, 500),
        verdict: analysis.verdict || 'PENDING',
        evidence: analysis.evidence || null,
        ai_analysis: analysis,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save fact check' }, { status: 500 });
    }

    return NextResponse.json({ factCheck, cached: false });
  } catch {
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: factCheck } = await supabase
    .from('fact_checks')
    .select('id, claim, verdict, evidence, ai_analysis, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ factCheck });
}
