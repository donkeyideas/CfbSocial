import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { createAdminClient } from '@/lib/admin/supabase/admin';

const APP_LINK_KEYS = [
  'app_google_play_url',
  'app_apple_store_url',
];

export async function GET() {
  // Public endpoint — no admin check needed (footer reads this)
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('admin_settings')
    .select('key, value')
    .in('key', APP_LINK_KEYS);

  const links: Record<string, string> = {};
  for (const row of data ?? []) {
    links[row.key as string] = row.value as string;
  }

  return NextResponse.json({ links });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await request.json();
  const { links } = body as { links: Record<string, string> };

  if (!links || typeof links !== 'object') {
    return NextResponse.json({ error: 'links object required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const errors: string[] = [];

  for (const [key, value] of Object.entries(links)) {
    if (!APP_LINK_KEYS.includes(key)) continue;
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
