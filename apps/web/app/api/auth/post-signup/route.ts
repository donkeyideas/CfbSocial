import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';

/**
 * POST /api/auth/post-signup
 * Called after signup to ensure profile has school_id set.
 * Uses service role to bypass RLS (user may not have session yet if email confirm is on).
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, schoolId } = await req.json();

    if (!userId || !schoolId) {
      return NextResponse.json({ error: 'Missing userId or schoolId' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('profiles')
      .update({ school_id: schoolId })
      .eq('id', userId)
      .is('school_id', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
