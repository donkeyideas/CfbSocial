import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { createAdminClient } from '@/lib/admin/supabase/admin';

const BROADCAST_SETTING_KEYS = [
  'auto_broadcast_enabled',
  'auto_broadcast_interval_hours',
];

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('admin_settings')
    .select('key, value')
    .in('key', BROADCAST_SETTING_KEYS);

  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    settings[row.key as string] = row.value as string;
  }

  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await request.json();
  const { settings } = body as { settings: Record<string, string> };

  if (!settings || typeof settings !== 'object') {
    return NextResponse.json({ error: 'settings object required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const errors: string[] = [];

  for (const [key, value] of Object.entries(settings)) {
    if (!BROADCAST_SETTING_KEYS.includes(key)) continue;
    const { error } = await supabase
      .from('admin_settings')
      .upsert({ key, value: String(value) }, { onConflict: 'key' });
    if (error) errors.push(`${key}: ${error.message}`);
  }

  if (errors.length) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
