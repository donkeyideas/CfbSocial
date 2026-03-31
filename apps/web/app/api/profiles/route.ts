import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** GET /api/profiles — list all profiles owned by the authenticated user */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, school_id, dynasty_tier, xp, level, post_count, correct_predictions, prediction_count, owner_id')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profiles: data });
}

/** POST /api/profiles — create a new alt profile */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { username, displayName, schoolId } = body;

  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 3 || cleanUsername.length > 24 || !/^[a-z0-9_]+$/.test(cleanUsername)) {
    return NextResponse.json({ error: 'Username must be 3-24 characters, letters/numbers/underscores only' }, { status: 400 });
  }

  // Check username uniqueness
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  // Limit alt profiles to 5 per user
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id);

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'Maximum 5 profiles per account' }, { status: 400 });
  }

  const newId = crypto.randomUUID();
  const { data: newProfile, error } = await supabase
    .from('profiles')
    .insert({
      id: newId,
      owner_id: user.id,
      username: cleanUsername,
      display_name: displayName?.trim() || null,
      school_id: schoolId || null,
    })
    .select('id, username, display_name, avatar_url, school_id, dynasty_tier, xp, level, post_count, correct_predictions, prediction_count, owner_id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: newProfile }, { status: 201 });
}
