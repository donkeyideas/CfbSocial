import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';
import { deleteIssue } from '@cfb-social/api';

/** Delete one of the user's issues (its pages cascade). Body: { issueId } */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { issueId } = await req.json();
  if (!issueId) return NextResponse.json({ error: 'issueId required' }, { status: 400 });

  try {
    const result = await deleteIssue(createAdminClient(), user.id, issueId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
