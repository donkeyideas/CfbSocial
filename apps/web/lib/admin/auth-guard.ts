import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Verify that the current request is from an authenticated ADMIN user.
 * Returns the user if authorized, or a NextResponse error to return early.
 */
export async function requireAdmin(): Promise<
  { authorized: true; userId: string } | { authorized: false; response: NextResponse }
> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { authorized: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'ADMIN') {
      return { authorized: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    return { authorized: true, userId: user.id };
  } catch {
    return { authorized: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}
