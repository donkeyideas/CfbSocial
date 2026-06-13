import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';
import { assignMomentToIssue } from '@cfb-social/api';

/**
 * Assign a moment (post) to an issue at a given page; optionally set it as cover.
 * Shared logic lives in @cfb-social/api so web + mobile behave identically.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body.postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

  try {
    const result = await assignMomentToIssue(createAdminClient(), user.id, body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
