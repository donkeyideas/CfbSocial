import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/post-signup
 * Called after signup to ensure profile has school_id set.
 * Authenticated: only the signed-in user can update their own profile.
 */
export async function POST(req: NextRequest) {
  try {
    const { schoolId } = await req.json();

    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 });
    }

    // Verify the caller is authenticated
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      },
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from('profiles')
      .update({ school_id: schoolId })
      .eq('id', user.id)
      .is('school_id', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
