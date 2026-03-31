import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** DELETE /api/profiles/[id] — delete an alt profile (cannot delete primary) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Cannot delete primary profile (where id = owner_id = auth user id)
  if (id === user.id) {
    return NextResponse.json({ error: 'Cannot delete your primary profile' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
