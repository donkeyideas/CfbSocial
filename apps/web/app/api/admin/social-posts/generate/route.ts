import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { generateSocialPosts } from '@/lib/admin/actions/social-posts';
import type { ToneType, SocialPlatform } from '@/lib/admin/actions/social-posts';

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const { topic, tone, platforms } = body as {
      topic?: string;
      tone: ToneType;
      platforms: SocialPlatform[];
    };

    if (!tone || !platforms || platforms.length === 0) {
      return NextResponse.json({ error: 'Missing tone or platforms' }, { status: 400 });
    }

    const result = await generateSocialPosts({ topic: topic || undefined, tone, platforms });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ posts: result.posts, errors: result.errors });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
