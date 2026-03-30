import { createAdminClient } from '@/lib/admin/supabase/admin';

export async function getAISummaryStats() {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data: all } = await supabase
    .from('ai_interactions')
    .select('tokens_used, cost, response_time_ms, success, created_at');

  const rows = all ?? [];
  const recent = rows.filter((r) => r.created_at >= thirtyDaysAgo);

  const totalInteractions = rows.length;
  const totalCost30d = recent.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalTokens30d = recent.reduce((sum, r) => sum + (r.tokens_used || 0), 0);
  const avgResponseTime = recent.length > 0
    ? Math.round(recent.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / recent.length)
    : 0;

  return { totalInteractions, totalCost30d, totalTokens30d, avgResponseTime };
}

export async function getAIInteractions(params: {
  search?: string;
  feature?: string;
  provider?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}) {
  const supabase = createAdminClient();
  const { search, feature, provider, success, limit = 50, offset = 0 } = params;

  let query = supabase
    .from('ai_interactions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (feature) query = query.eq('feature', feature);
  if (provider) query = query.eq('provider', provider);
  if (success !== undefined) query = query.eq('success', success);
  if (search) query = query.or(`prompt_text.ilike.%${search}%,response_text.ilike.%${search}%,feature.ilike.%${search}%,provider.ilike.%${search}%`);

  const { data, count } = await query;
  return { interactions: data ?? [], total: count ?? 0 };
}

export async function getAIUsageByFeature() {
  const supabase = createAdminClient();
  const { data } = await supabase.from('ai_interactions').select('feature, tokens_used, cost, response_time_ms, success');

  const features: Record<string, { calls: number; tokens: number; cost: number; totalLatency: number; errors: number }> = {};
  for (const row of data ?? []) {
    const f = row.feature;
    if (!features[f]) features[f] = { calls: 0, tokens: 0, cost: 0, totalLatency: 0, errors: 0 };
    features[f].calls++;
    features[f].tokens += row.tokens_used || 0;
    features[f].cost += row.cost || 0;
    features[f].totalLatency += row.response_time_ms || 0;
    if (!row.success) features[f].errors++;
  }

  return Object.entries(features).map(([feature, stats]) => ({
    feature,
    calls: stats.calls,
    tokens: stats.tokens,
    cost: stats.cost,
    avgLatency: stats.calls > 0 ? Math.round(stats.totalLatency / stats.calls) : 0,
    successRate: stats.calls > 0 ? (stats.calls - stats.errors) / stats.calls : 1,
  })).sort((a, b) => b.calls - a.calls);
}

export async function getAIProviderPerformance() {
  const supabase = createAdminClient();
  const { data } = await supabase.from('ai_interactions').select('provider, tokens_used, cost, response_time_ms, success');

  const providers: Record<string, { calls: number; tokens: number; cost: number; totalLatency: number; errors: number }> = {};
  for (const row of data ?? []) {
    const p = row.provider;
    if (!providers[p]) providers[p] = { calls: 0, tokens: 0, cost: 0, totalLatency: 0, errors: 0 };
    providers[p].calls++;
    providers[p].tokens += row.tokens_used || 0;
    providers[p].cost += row.cost || 0;
    providers[p].totalLatency += row.response_time_ms || 0;
    if (!row.success) providers[p].errors++;
  }

  return Object.entries(providers).map(([provider, stats]) => ({
    provider,
    calls: stats.calls,
    tokens: stats.tokens,
    cost: stats.cost,
    avgLatency: stats.calls > 0 ? Math.round(stats.totalLatency / stats.calls) : 0,
    successRate: stats.calls > 0 ? (stats.calls - stats.errors) / stats.calls : 1,
    errors: stats.errors,
  }));
}

export async function getAICostTrend(days: number = 30) {
  const supabase = createAdminClient();
  const startDate = new Date(Date.now() - days * 86400000);

  const { data } = await supabase
    .from('ai_interactions')
    .select('cost, created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at');

  const daily: Record<string, { date: string; cost: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    daily[key] = { date: key, cost: 0 };
  }

  for (const row of data ?? []) {
    const key = new Date(row.created_at).toISOString().slice(0, 10);
    if (daily[key]) daily[key].cost += row.cost || 0;
  }

  return Object.values(daily);
}

export async function getAIDailyVolume(days: number = 30) {
  const supabase = createAdminClient();
  const startDate = new Date(Date.now() - days * 86400000);

  const { data } = await supabase
    .from('ai_interactions')
    .select('feature, created_at')
    .gte('created_at', startDate.toISOString());

  const daily: Record<string, Record<string, number>> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    daily[d.toISOString().slice(0, 10)] = {};
  }

  for (const row of data ?? []) {
    const key = new Date(row.created_at).toISOString().slice(0, 10);
    if (daily[key]) {
      daily[key][row.feature] = (daily[key][row.feature] || 0) + 1;
    }
  }

  return Object.entries(daily).map(([date, features]) => ({
    date,
    total: Object.values(features).reduce((a, b) => a + b, 0),
    ...features,
  }));
}
