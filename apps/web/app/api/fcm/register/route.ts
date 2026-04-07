import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token, platform } = await request.json();
  if (!token || !platform) {
    return NextResponse.json({ error: 'Token and platform required' }, { status: 400 });
  }

  // Upsert device token — if token already exists, update user and reactivate
  const { error } = await supabase
    .from('device_tokens')
    .upsert(
      {
        user_id: user.id,
        token,
        platform,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    );

  if (error) {
    console.error('[FCM Register] Error:', error);
    return NextResponse.json({ error: 'Failed to register token' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
