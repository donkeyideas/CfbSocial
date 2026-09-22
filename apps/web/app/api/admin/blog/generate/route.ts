import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import {
  generateMatchupBlog,
  generateWeeklyRecap,
  generatePortalRoundup,
  generatePowerRankings,
  generateFreeform,
  type BlogType,
} from '@/lib/blog/generate';
import { matchupSlug } from '@/lib/seo/matchups';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  let body: {
    type?: BlogType;
    homeSlug?: string;
    awaySlug?: string;
    espnGameId?: string;
    title?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type: BlogType = body.type ?? 'matchup';

  try {
    if (type === 'matchup') {
      const homeSlug = body.homeSlug?.trim();
      const awaySlug = body.awaySlug?.trim();
      if (!homeSlug || !awaySlug) {
        return NextResponse.json({ error: 'homeSlug and awaySlug are required' }, { status: 400 });
      }
      if (homeSlug === awaySlug) {
        return NextResponse.json({ error: 'Pick two different schools' }, { status: 400 });
      }
      const { blog, context } = await generateMatchupBlog(homeSlug, awaySlug, {
        espnGameId: body.espnGameId,
        notes: body.notes,
      });
      return NextResponse.json({
        blog,
        context: {
          postType: 'MATCHUP',
          home: { id: context.home.id, name: context.home.name, slug: context.home.slug },
          away: { id: context.away.id, name: context.away.name, slug: context.away.slug },
          matchupSlug: matchupSlug(context.home.slug, context.away.slug),
          hasGame: !!context.game,
          dataPreview: context.promptText,
        },
      });
    }

    if (type === 'freeform') {
      const title = body.title?.trim();
      if (!title) return NextResponse.json({ error: 'A topic/title is required for freeform posts' }, { status: 400 });
      const { blog, context } = await generateFreeform(title, body.notes);
      return NextResponse.json({ blog, context: { postType: 'GENERAL', label: context.label, dataPreview: context.promptText } });
    }

    const runner =
      type === 'weekly-recap'
        ? generateWeeklyRecap
        : type === 'portal-roundup'
          ? generatePortalRoundup
          : type === 'power-rankings'
            ? generatePowerRankings
            : null;

    if (!runner) return NextResponse.json({ error: `Unknown post type: ${type}` }, { status: 400 });

    const { blog, context } = await runner(body.notes);
    return NextResponse.json({ blog, context: { postType: 'GENERAL', label: context.label, dataPreview: context.promptText } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
