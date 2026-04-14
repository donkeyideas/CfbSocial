import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    let userId: string | null = null;

    // Try cookie-based auth (web)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
    }

    // Fallback: Bearer token auth (mobile app)
    if (!userId) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const admin = createAdminClient();
        const { data: { user: tokenUser } } = await admin.auth.getUser(token);
        if (tokenUser) {
          userId = tokenUser.id;
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Deactivate the token
    await admin
      .from('device_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('token', token)
      .eq('user_id', userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[FCM Unregister] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
