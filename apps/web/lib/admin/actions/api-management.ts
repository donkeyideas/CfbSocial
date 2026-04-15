import { createAdminClient } from '@/lib/admin/supabase/admin';

/* ── Provider definitions ─────────────────────────────────────── */

export interface ProviderConfig {
  id: string;
  name: string;
  slug: string;
  keys: { key: string; label: string }[];
  alwaysActive?: boolean;
}

export const API_PROVIDERS: ProviderConfig[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    slug: 'deepseek',
    keys: [{ key: 'deepseek_api_key', label: 'API Key' }],
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    slug: 'twitter',
    keys: [
      { key: 'twitter_api_key', label: 'API Key' },
      { key: 'twitter_api_secret', label: 'API Secret' },
      { key: 'twitter_access_token', label: 'Access Token' },
      { key: 'twitter_access_token_secret', label: 'Access Token Secret' },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    slug: 'linkedin',
    keys: [
      { key: 'linkedin_access_token', label: 'Access Token' },
      { key: 'linkedin_person_urn', label: 'Person URN' },
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    slug: 'facebook',
    keys: [
      { key: 'facebook_page_token', label: 'Page Access Token' },
      { key: 'facebook_page_id', label: 'Page ID' },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    slug: 'instagram',
    keys: [
      { key: 'instagram_access_token', label: 'Access Token' },
      { key: 'instagram_account_id', label: 'Account ID' },
    ],
  },
  {
    id: 'espn',
    name: 'ESPN',
    slug: 'espn',
    keys: [],
    alwaysActive: true,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    slug: 'supabase',
    keys: [],
    alwaysActive: true,
  },
];

/* ── Call History (from ai_interactions) ──────────────────────── */

export interface APICallEntry {
  id: string;
  feature: string;
  sub_type: string | null;
  provider: string;
  model: string | null;
  tokens_used: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  response_time_ms: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export async function getAPICallHistory(limit: number = 50): Promise<APICallEntry[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('ai_interactions')
    .select('id, feature, sub_type, provider, model, tokens_used, prompt_tokens, completion_tokens, cost, response_time_ms, success, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as APICallEntry[];
}

/* ── Usage Stats (aggregated from ai_interactions) ───────────── */

export interface ProviderStats {
  provider: string;
  calls: number;
  errors: number;
  errorRate: number;
  cost: number;
  tokens: number;
  avgLatency: number;
}

export interface UsageStats {
  totalCalls: number;
  totalCost: number;
  successRate: number;
  avgLatency: number;
  activeProviders: number;
  byProvider: ProviderStats[];
}

export async function getAPIUsageStats(days: number = 30): Promise<UsageStats> {
  const supabase = createAdminClient();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Supabase default limit is 1000 — paginate to get ALL rows
  const allRows: Array<{ provider: string; response_time_ms: number; cost: number; success: boolean; tokens_used: number }> = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await supabase
      .from('ai_interactions')
      .select('provider, response_time_ms, cost, success, tokens_used')
      .gte('created_at', startDate)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    const rows = (data ?? []) as typeof allRows;
    allRows.push(...rows);
    hasMore = rows.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  let totalCalls = 0;
  let totalCost = 0;
  let totalErrors = 0;
  let totalLatency = 0;
  const byProvider: Record<string, { calls: number; cost: number; errors: number; latency: number; tokens: number }> = {};

  for (const row of allRows) {
    totalCalls++;
    totalCost += row.cost || 0;
    totalLatency += row.response_time_ms || 0;
    if (!row.success) totalErrors++;

    const p = row.provider;
    if (!byProvider[p]) byProvider[p] = { calls: 0, cost: 0, errors: 0, latency: 0, tokens: 0 };
    byProvider[p].calls++;
    byProvider[p].cost += row.cost || 0;
    byProvider[p].latency += row.response_time_ms || 0;
    byProvider[p].tokens += row.tokens_used || 0;
    if (!row.success) byProvider[p].errors++;
  }

  const providerStats = Object.entries(byProvider).map(([provider, s]) => ({
    provider,
    calls: s.calls,
    errors: s.errors,
    errorRate: s.calls > 0 ? s.errors / s.calls : 0,
    cost: s.cost,
    tokens: s.tokens,
    avgLatency: s.calls > 0 ? Math.round(s.latency / s.calls) : 0,
  }));

  return {
    totalCalls,
    totalCost,
    successRate: totalCalls > 0 ? (totalCalls - totalErrors) / totalCalls : 1,
    avgLatency: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
    activeProviders: providerStats.length + API_PROVIDERS.filter((p) => p.alwaysActive).length,
    byProvider: providerStats,
  };
}

/* ── Daily Activity (for bar chart) ──────────────────────────── */

export interface DailyActivity {
  date: string;
  calls: number;
}

export async function getDailyActivity(days: number = 30): Promise<DailyActivity[]> {
  const supabase = createAdminClient();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Paginate to get ALL rows (Supabase default limit is 1000)
  const allDates: string[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await supabase
      .from('ai_interactions')
      .select('created_at')
      .gte('created_at', startDate)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    const rows = data ?? [];
    for (const row of rows) {
      allDates.push((row.created_at as string).slice(0, 10));
    }
    hasMore = rows.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  const counts: Record<string, number> = {};
  for (const day of allDates) {
    counts[day] = (counts[day] || 0) + 1;
  }

  // Fill in all days in range
  const result: DailyActivity[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, calls: counts[key] || 0 });
  }

  return result;
}

/* ── Provider Configuration (from admin_settings) ────────────── */

export interface ProviderConfigStatus {
  id: string;
  name: string;
  slug: string;
  keys: { key: string; label: string; hasValue: boolean }[];
  isConfigured: boolean;
  alwaysActive: boolean;
  lastTested: string | null;
  testResult: string | null;
}

export async function getAPIProviderConfigs(): Promise<ProviderConfigStatus[]> {
  const supabase = createAdminClient();

  // Gather all known keys
  const allKeys = API_PROVIDERS.flatMap((p) => [
    ...p.keys.map((k) => k.key),
    `${p.slug}_last_tested`,
    `${p.slug}_test_result`,
  ]);

  const { data } = await supabase
    .from('admin_settings')
    .select('key, value')
    .in('key', allKeys);

  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }

  return API_PROVIDERS.map((provider) => {
    const keyStatuses = provider.keys.map((k) => ({
      ...k,
      hasValue: !!settings[k.key],
    }));

    const isConfigured = provider.alwaysActive || keyStatuses.some((k) => k.hasValue);

    return {
      id: provider.id,
      name: provider.name,
      slug: provider.slug,
      keys: keyStatuses,
      isConfigured,
      alwaysActive: provider.alwaysActive ?? false,
      lastTested: settings[`${provider.slug}_last_tested`] ?? null,
      testResult: settings[`${provider.slug}_test_result`] ?? null,
    };
  });
}

/* ── Save / Test ──────────────────────────────────────────────── */

export async function saveProviderKeys(creds: Record<string, string>): Promise<{ error?: string; success?: true }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(creds)) {
    if (!value) continue;
    const { error } = await supabase.from('admin_settings').upsert({ key, value, updated_at: now }, { onConflict: 'key' });
    if (error) return { error: error.message };
  }
  return { success: true };
}

export async function testProviderConnection(provider: string): Promise<{ error?: string; success?: true; message?: string }> {
  // Reuse the social posts test logic for social platforms
  const { testConnection } = await import('./social-posts');
  const socialPlatforms = ['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM'];

  if (socialPlatforms.includes(provider.toUpperCase())) {
    const result = await testConnection(provider.toUpperCase());

    // Record test result
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    await supabase.from('admin_settings').upsert(
      { key: `${provider.toLowerCase()}_last_tested`, value: now, updated_at: now },
      { onConflict: 'key' },
    );
    await supabase.from('admin_settings').upsert(
      { key: `${provider.toLowerCase()}_test_result`, value: result.success ? 'ok' : (result.error ?? 'failed'), updated_at: now },
      { onConflict: 'key' },
    );

    return result;
  }

  if (provider === 'deepseek') {
    try {
      const { aiChat } = await import('@/lib/admin/ai/deepseek');
      const response = await aiChat('Reply with exactly: OK', { feature: 'api_test', subType: 'connection_test', maxTokens: 10, temperature: 0 });

      const supabase = createAdminClient();
      const now = new Date().toISOString();
      await supabase.from('admin_settings').upsert(
        { key: 'deepseek_last_tested', value: now, updated_at: now },
        { onConflict: 'key' },
      );
      await supabase.from('admin_settings').upsert(
        { key: 'deepseek_test_result', value: 'ok', updated_at: now },
        { onConflict: 'key' },
      );

      return { success: true, message: `DeepSeek responded: ${response.slice(0, 50)}` };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'DeepSeek connection failed' };
    }
  }

  if (provider === 'espn') {
    try {
      const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?limit=1');
      if (!res.ok) return { error: `ESPN API returned ${res.status}` };
      return { success: true, message: 'ESPN API is reachable' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'ESPN connection failed' };
    }
  }

  if (provider === 'supabase') {
    try {
      const supabase = createAdminClient();
      const { count, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      if (error) return { error: error.message };
      return { success: true, message: `Supabase connected (${count} profiles)` };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Supabase connection failed' };
    }
  }

  return { error: `Unknown provider: ${provider}` };
}
