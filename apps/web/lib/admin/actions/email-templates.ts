import { createAdminClient } from '@/lib/admin/supabase/admin';

export async function getEmailTemplates(category?: string) {
  const supabase = createAdminClient();
  let query = supabase.from('email_templates').select('*').order('category').order('name');
  if (category) query = query.eq('category', category);
  const { data } = await query;
  return data ?? [];
}

export async function getEmailTemplate(slug: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from('email_templates').select('*').eq('slug', slug).single();
  return data;
}

export async function updateEmailTemplate(slug: string, updates: {
  subject?: string;
  body_html?: string;
  body_text?: string;
  is_active?: boolean;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('email_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('slug', slug);
  return { error };
}

export async function toggleEmailTemplate(slug: string, isActive: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('email_templates')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('slug', slug);
  return { error };
}
