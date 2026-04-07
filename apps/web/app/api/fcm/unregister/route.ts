import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token } = await request.json();
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  // Deactivate the token
  await supabase
    .from('device_tokens')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('token', token)
    .eq('user_id', user.id);

  return NextResponse.json({ success: true });
}
