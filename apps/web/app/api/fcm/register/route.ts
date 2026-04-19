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

    // Fallback: Bearer token auth (mobile app sends access_token as Bearer)
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

    const { token, platform } = await request.json();
    if (!token || !platform) {
      return NextResponse.json({ error: 'Token and platform required' }, { status: 400 });
    }

    const isExpo = token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
    const isRawApns = platform === 'ios' && /^[0-9a-f]{64}$/i.test(token);

    console.log(`[FCM Register] userId=${userId} platform=${platform} isExpo=${isExpo} isRawApns=${isRawApns} tokenPrefix=${token.substring(0, 30)}`);

    // Reject raw APNs tokens — they can't be sent via FCM or Expo
    if (isRawApns) {
      console.warn('[FCM Register] Rejected raw APNs token — use Expo push tokens instead');
      return NextResponse.json({ error: 'Raw APNs tokens not supported. Use Expo push tokens.' }, { status: 400 });
    }

    // Warn if iOS token is not Expo format (likely will fail when sending)
    if (platform === 'ios' && !isExpo) {
      console.warn(`[FCM Register] iOS token is NOT Expo format — push may fail. Token: ${token.substring(0, 40)}...`);
    }

    const admin = createAdminClient();

    // Deactivate any old tokens for this user on this platform before registering new one
    await admin
      .from('device_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('platform', platform)
      .neq('token', token);

    // Upsert device token — if token already exists, update user and reactivate
    const { error } = await admin
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
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

    return NextResponse.json({ success: true, tokenType: isExpo ? 'expo' : 'fcm' });
  } catch (err) {
    console.error('[FCM Register] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
