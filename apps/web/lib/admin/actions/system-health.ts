import { createAdminClient } from '@/lib/admin/supabase/admin';

interface ServiceStatus {
  service: string;
  healthy: boolean;
  latency: number;
  details: string;
}

export async function runHealthCheck(): Promise<ServiceStatus[]> {
  const supabase = createAdminClient();
  const results: ServiceStatus[] = [];

  // Database
  const dbStart = Date.now();
  const { error: dbError } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  results.push({ service: 'Database', healthy: !dbError, latency: Date.now() - dbStart, details: dbError ? dbError.message : 'Connected' });

  // Auth
  const authStart = Date.now();
  try {
    const { error: authError } = await supabase.auth.getSession();
    results.push({ service: 'Auth Service', healthy: !authError, latency: Date.now() - authStart, details: authError ? authError.message : 'Operational' });
  } catch {
    results.push({ service: 'Auth Service', healthy: false, latency: Date.now() - authStart, details: 'Connection failed' });
  }

  // Storage
  const storageStart = Date.now();
  try {
    const { error: storageError } = await supabase.storage.listBuckets();
    results.push({ service: 'Storage', healthy: !storageError, latency: Date.now() - storageStart, details: storageError ? storageError.message : 'Operational' });
  } catch {
    results.push({ service: 'Storage', healthy: false, latency: Date.now() - storageStart, details: 'Connection failed' });
  }

  // DeepSeek
  const dsStart = Date.now();
  try {
    const res = await fetch('https://api.deepseek.com/v1/models', {
      headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    results.push({ service: 'DeepSeek API', healthy: res.ok, latency: Date.now() - dsStart, details: res.ok ? 'Connected' : `HTTP ${res.status}` });
  } catch {
    results.push({ service: 'DeepSeek API', healthy: false, latency: Date.now() - dsStart, details: 'Timeout or unreachable' });
  }

  return results;
}

const DB_TABLES = [
  'profiles', 'posts', 'reactions', 'reports', 'schools', 'challenges',
  'predictions', 'portal_players', 'moderation_events', 'follows',
  'rivalries', 'xp_log', 'achievements', 'user_achievements',
  'ai_moderation_log', 'api_call_log', 'job_queue', 'platform_insights',
  'ai_interactions', 'email_templates', 'contact_submissions', 'admin_activity_feed',
  'social_media_posts',
] as const;

export async function getTableStats() {
  const supabase = createAdminClient();
  const results = await Promise.all(
    DB_TABLES.map(async (table) => {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      return { table, count: count ?? 0, error: error?.message };
    })
  );
  return results;
}

export async function getJobQueue(status?: string) {
  const supabase = createAdminClient();
  let query = supabase.from('job_queue').select('*').order('created_at', { ascending: false }).limit(50);
  if (status) query = query.eq('status', status);
  const { data } = await query;
  return data ?? [];
}

export async function triggerJob(jobType: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('job_queue').insert({
    job_type: jobType,
    status: 'pending',
    priority: 1,
  }).select().single();
  return { job: data, error };
}
