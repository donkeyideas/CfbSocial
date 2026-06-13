import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveLeagueRequest } from '@cfb-social/api';

/**
 * Commissioner approves or declines a join request.
 * Body: { requestId, action: 'approve' | 'decline' }
 * Delegates to the resolve_league_request RPC (SECURITY DEFINER, commissioner-gated),
 * shared with mobile.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { requestId, action } = await req.json();
  if (!requestId || !['approve', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'requestId and action required' }, { status: 400 });
  }

  try {
    await resolveLeagueRequest(supabase, requestId, action);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
