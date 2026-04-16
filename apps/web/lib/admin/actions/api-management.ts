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

/** Fetch ALL call history rows (paginated) for CSV/Excel export. */
export async function getAllCallHistoryForExport(): Promise<APICallEntry[]> {
  const supabase = createAdminClient();
  const allRows: APICallEntry[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await supabase
      .from('ai_interactions')
      .select('id, feature, sub_type, provider, model, tokens_used, prompt_tokens, completion_tokens, cost, response_time_ms, success, error_message, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const rows = (data ?? []) as APICallEntry[];
    allRows.push(...rows);
    hasMore = rows.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }
  return allRows;
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

/* ── Analytics (date-range filtered) ─────────────────────────── */

export interface DailyMetrics {
  date: string;
  calls: number;
  cost: number;
  tokens: number;
  errors: number;
  avgLatency: number;
}

export interface HourlyDistribution {
  hour: number; // 0-23
  calls: number;
}

export interface FeatureBreakdown {
  feature: string;
  calls: number;
  cost: number;
  tokens: number;
}

export interface ProviderBreakdown {
  provider: string;
  calls: number;
  cost: number;
  tokens: number;
}

export interface DailyProviderCost {
  date: string;
  totalCost: number;
  totalCalls: number;
  totalTokens: number;
  perProvider: Record<string, { calls: number; cost: number; tokens: number }>;
}

export interface AnalyticsData {
  range: { startDate: string; endDate: string };
  kpis: {
    totalCalls: number;
    totalCost: number;
    totalTokens: number;
    avgCostPerCall: number;
    avgTokensPerCall: number;
    avgLatency: number;
    successRate: number;
    peakDayCalls: number;
    peakDayDate: string | null;
  };
  daily: DailyMetrics[];
  hourly: HourlyDistribution[];
  byFeature: FeatureBreakdown[];
  byProvider: ProviderBreakdown[];
  dailyByProvider: DailyProviderCost[];
  providers: string[]; // ordered list of provider keys appearing in range
  monthly: { month: string; calls: number; cost: number; tokens: number }[];
}

export async function getAnalyticsData(
  startDate: string,
  endDate: string,
): Promise<AnalyticsData> {
  const supabase = createAdminClient();

  // Paginate through ALL rows in date range
  type Row = {
    feature: string;
    provider: string;
    cost: number;
    tokens_used: number;
    response_time_ms: number;
    success: boolean;
    created_at: string;
  };

  const allRows: Row[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await supabase
      .from('ai_interactions')
      .select('feature, provider, cost, tokens_used, response_time_ms, success, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    const rows = (data ?? []) as Row[];
    allRows.push(...rows);
    hasMore = rows.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  // Daily aggregation
  const dailyMap: Record<string, { calls: number; cost: number; tokens: number; errors: number; latency: number }> = {};
  const hourlyMap: Record<number, number> = {};
  const featureMap: Record<string, { calls: number; cost: number; tokens: number }> = {};
  const providerMap: Record<string, { calls: number; cost: number; tokens: number }> = {};
  const monthlyMap: Record<string, { calls: number; cost: number; tokens: number }> = {};
  const dailyProviderMap: Record<string, Record<string, { calls: number; cost: number; tokens: number }>> = {};

  let totalCost = 0;
  let totalTokens = 0;
  let totalErrors = 0;
  let totalLatency = 0;

  for (const row of allRows) {
    const d = new Date(row.created_at);
    const dayKey = row.created_at.slice(0, 10);
    const monthKey = row.created_at.slice(0, 7);
    const hour = d.getUTCHours();

    totalCost += row.cost || 0;
    totalTokens += row.tokens_used || 0;
    totalLatency += row.response_time_ms || 0;
    if (!row.success) totalErrors++;

    if (!dailyMap[dayKey]) dailyMap[dayKey] = { calls: 0, cost: 0, tokens: 0, errors: 0, latency: 0 };
    dailyMap[dayKey].calls++;
    dailyMap[dayKey].cost += row.cost || 0;
    dailyMap[dayKey].tokens += row.tokens_used || 0;
    dailyMap[dayKey].latency += row.response_time_ms || 0;
    if (!row.success) dailyMap[dayKey].errors++;

    hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;

    const feat = row.feature || 'unknown';
    if (!featureMap[feat]) featureMap[feat] = { calls: 0, cost: 0, tokens: 0 };
    featureMap[feat].calls++;
    featureMap[feat].cost += row.cost || 0;
    featureMap[feat].tokens += row.tokens_used || 0;

    const prov = row.provider || 'unknown';
    if (!providerMap[prov]) providerMap[prov] = { calls: 0, cost: 0, tokens: 0 };
    providerMap[prov].calls++;
    providerMap[prov].cost += row.cost || 0;
    providerMap[prov].tokens += row.tokens_used || 0;

    if (!dailyProviderMap[dayKey]) dailyProviderMap[dayKey] = {};
    if (!dailyProviderMap[dayKey][prov]) dailyProviderMap[dayKey][prov] = { calls: 0, cost: 0, tokens: 0 };
    dailyProviderMap[dayKey][prov].calls++;
    dailyProviderMap[dayKey][prov].cost += row.cost || 0;
    dailyProviderMap[dayKey][prov].tokens += row.tokens_used || 0;

    if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { calls: 0, cost: 0, tokens: 0 };
    monthlyMap[monthKey].calls++;
    monthlyMap[monthKey].cost += row.cost || 0;
    monthlyMap[monthKey].tokens += row.tokens_used || 0;
  }

  // Fill in all days in range with zeros
  const daily: DailyMetrics[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const d = dailyMap[key];
    daily.push({
      date: key,
      calls: d?.calls || 0,
      cost: d?.cost || 0,
      tokens: d?.tokens || 0,
      errors: d?.errors || 0,
      avgLatency: d && d.calls > 0 ? Math.round(d.latency / d.calls) : 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Hourly (fill 0-23)
  const hourly: HourlyDistribution[] = [];
  for (let h = 0; h < 24; h++) {
    hourly.push({ hour: h, calls: hourlyMap[h] || 0 });
  }

  // Peak day
  let peakDayCalls = 0;
  let peakDayDate: string | null = null;
  for (const d of daily) {
    if (d.calls > peakDayCalls) {
      peakDayCalls = d.calls;
      peakDayDate = d.date;
    }
  }

  const totalCalls = allRows.length;

  const byFeature: FeatureBreakdown[] = Object.entries(featureMap)
    .map(([feature, s]) => ({ feature, ...s }))
    .sort((a, b) => b.calls - a.calls);

  const byProvider: ProviderBreakdown[] = Object.entries(providerMap)
    .map(([provider, s]) => ({ provider, ...s }))
    .sort((a, b) => b.calls - a.calls);

  // Ordered providers list (by total cost desc)
  const providers = [...byProvider]
    .sort((a, b) => b.cost - a.cost)
    .map((p) => p.provider);

  // Daily by provider — one row per day, sorted newest first for the table
  const dailyByProvider: DailyProviderCost[] = Object.keys(dailyProviderMap)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const perProvider = dailyProviderMap[date] || {};
      let totalCost = 0;
      let totalCalls = 0;
      let totalTokens = 0;
      for (const p of Object.values(perProvider)) {
        totalCost += p.cost;
        totalCalls += p.calls;
        totalTokens += p.tokens;
      }
      return { date, totalCost, totalCalls, totalTokens, perProvider };
    });

  const monthly = Object.entries(monthlyMap)
    .map(([month, s]) => ({ month, ...s }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    range: { startDate, endDate },
    kpis: {
      totalCalls,
      totalCost,
      totalTokens,
      avgCostPerCall: totalCalls > 0 ? totalCost / totalCalls : 0,
      avgTokensPerCall: totalCalls > 0 ? Math.round(totalTokens / totalCalls) : 0,
      avgLatency: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
      successRate: totalCalls > 0 ? (totalCalls - totalErrors) / totalCalls : 1,
      peakDayCalls,
      peakDayDate,
    },
    daily,
    hourly,
    byFeature,
    byProvider,
    dailyByProvider,
    providers,
    monthly,
  };
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
    const { pingScoreboard } = await import('@/lib/providers/espn');
    const result = await pingScoreboard();
    return result.ok ? { success: true, message: result.message } : { error: result.message };
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
