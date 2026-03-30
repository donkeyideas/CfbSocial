import { createAdminClient } from '@/lib/admin/supabase/admin';

export async function getContacts(params: {
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = createAdminClient();
  const { status, category, limit = 50, offset = 0 } = params;

  let query = supabase
    .from('contact_submissions')
    .select('*, school:schools(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (category) query = query.eq('category', category);

  const { data, count } = await query;
  return { contacts: data ?? [], total: count ?? 0 };
}

export async function getContactById(id: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('contact_submissions')
    .select('*, school:schools(name)')
    .eq('id', id)
    .single();
  return data;
}

export async function updateContactStatus(id: string, status: 'new' | 'read' | 'replied', adminId?: string) {
  const supabase = createAdminClient();
  const updates: Record<string, unknown> = { status };
  if (status === 'replied') {
    updates.replied_at = new Date().toISOString();
    if (adminId) updates.replied_by = adminId;
  }
  const { error } = await supabase.from('contact_submissions').update(updates).eq('id', id);
  return { error };
}

export async function addContactNote(id: string, note: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('contact_submissions').update({ admin_notes: note }).eq('id', id);
  return { error };
}

export async function getContactStats() {
  const supabase = createAdminClient();
  const [total, unread] = await Promise.all([
    supabase.from('contact_submissions').select('*', { count: 'exact', head: true }),
    supabase.from('contact_submissions').select('*', { count: 'exact', head: true }).eq('status', 'new'),
  ]);
  return { total: total.count ?? 0, unread: unread.count ?? 0 };
}
