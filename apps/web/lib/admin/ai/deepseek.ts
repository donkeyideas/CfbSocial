import OpenAI from 'openai';
import { createAdminClient } from '@/lib/admin/supabase/admin';

function getClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || 'missing',
    baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
  });
}

// DeepSeek pricing per 1M tokens (USD)
const COST_PER_1M_INPUT = 0.14;
const COST_PER_1M_OUTPUT = 0.28;

// Daily AI usage caps (safety net — prevent runaway cost spikes like 4/13-4/15)
// Features exempt from caps (manual admin actions, connection tests, etc.)
const EXEMPT_FEATURES = new Set(['api_test']);
const DEFAULT_DAILY_CALL_CAP = 500;
const DEFAULT_DAILY_COST_CAP_USD = 0.5;

// In-memory cache of today's totals (refreshed at most every 30s to avoid per-call DB load).
let usageCache: { date: string; calls: number; cost: number; fetchedAt: number } | null = null;

function todayUtcDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchTodayUsage(): Promise<{ calls: number; cost: number }> {
  const date = todayUtcDateKey();
  const now = Date.now();
  if (usageCache && usageCache.date === date && now - usageCache.fetchedAt < 30_000) {
    return { calls: usageCache.calls, cost: usageCache.cost };
  }
  try {
    const supabase = createAdminClient();
    const startOfDay = `${date}T00:00:00.000Z`;
    const { data, count } = await supabase
      .from('ai_interactions')
      .select('cost', { count: 'exact' })
      .gte('created_at', startOfDay);
    const cost = (data ?? []).reduce((sum: number, r: { cost: number | null }) => sum + (Number(r.cost) || 0), 0);
    const calls = count ?? 0;
    usageCache = { date, calls, cost, fetchedAt: now };
    return { calls, cost };
  } catch {
    // Fail open — never let the safety check break real calls on DB error
    return { calls: 0, cost: 0 };
  }
}

function bumpUsageCache(cost: number): void {
  const date = todayUtcDateKey();
  if (!usageCache || usageCache.date !== date) {
    usageCache = { date, calls: 1, cost, fetchedAt: Date.now() };
  } else {
    usageCache.calls += 1;
    usageCache.cost += cost;
  }
}

export class AiDailyCapExceeded extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiDailyCapExceeded';
  }
}

export async function enforceDailyCap(feature: string | undefined): Promise<void> {
  if (feature && EXEMPT_FEATURES.has(feature)) return;
  const callCap = Number(process.env.AI_DAILY_CALL_CAP ?? DEFAULT_DAILY_CALL_CAP);
  const costCap = Number(process.env.AI_DAILY_COST_CAP_USD ?? DEFAULT_DAILY_COST_CAP_USD);
  const { calls, cost } = await fetchTodayUsage();
  if (calls >= callCap) {
    throw new AiDailyCapExceeded(`Daily AI call cap reached (${calls}/${callCap})`);
  }
  if (cost >= costCap) {
    throw new AiDailyCapExceeded(`Daily AI cost cap reached ($${cost.toFixed(4)}/$${costCap})`);
  }
}

export async function aiChat(
  prompt: string,
  opts?: { feature?: string; subType?: string; temperature?: number; maxTokens?: number; timeout?: number; systemPrompt?: string },
): Promise<string> {
  // Safety net: short-circuit if daily caps exceeded
  await enforceDailyCap(opts?.feature);

  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
  const start = Date.now();
  let success = true;
  let errorMessage: string | null = null;
  let responseText = '';
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;

  try {
    // Use proper system/user message separation when systemPrompt is provided
    const messages: Array<{ role: 'system' | 'user'; content: string }> = opts?.systemPrompt
      ? [
          { role: 'system', content: opts.systemPrompt },
          { role: 'user', content: prompt },
        ]
      : [{ role: 'user', content: prompt }];

    const timeoutMs = opts?.timeout ?? 10_000;
    const response = await getClient().chat.completions.create(
      {
        model,
        messages,
        temperature: opts?.temperature ?? 0.7,
        max_tokens: opts?.maxTokens ?? 600,
      },
      { timeout: timeoutMs },
    );

    responseText = response.choices[0]?.message?.content?.trim() ?? '';
    promptTokens = response.usage?.prompt_tokens ?? 0;
    completionTokens = response.usage?.completion_tokens ?? 0;
    totalTokens = response.usage?.total_tokens ?? 0;

    return responseText;
  } catch (err) {
    success = false;
    errorMessage = err instanceof Error ? err.message : 'DeepSeek API error';
    throw err;
  } finally {
    const elapsed = Date.now() - start;
    const cost =
      (promptTokens / 1_000_000) * COST_PER_1M_INPUT +
      (completionTokens / 1_000_000) * COST_PER_1M_OUTPUT;

    // Keep in-memory cap tracker in sync so spikes within the 30s cache window still get throttled.
    bumpUsageCache(cost);

    // Log to ai_interactions -- fire and forget
    try {
      const supabase = createAdminClient();
      await supabase.from('ai_interactions').insert({
        feature: opts?.feature ?? 'social_posts',
        sub_type: opts?.subType ?? 'content_generation',
        provider: 'deepseek',
        model,
        prompt_text: prompt.substring(0, 2000),
        response_text: responseText.substring(0, 5000) || null,
        tokens_used: totalTokens,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cost: Math.round(cost * 1_000_000) / 1_000_000,
        response_time_ms: elapsed,
        success,
        error_message: errorMessage,
      });
    } catch {
      // Never let logging failures break the main flow
    }
  }
}

/**
 * Wraps aiChat() with 1 retry on failure after a 2-second delay.
 * Returns null on final failure instead of throwing.
 */
export async function aiChatWithRetry(
  prompt: string,
  opts?: { feature?: string; subType?: string; temperature?: number; maxTokens?: number; timeout?: number; systemPrompt?: string },
): Promise<string | null> {
  try {
    return await aiChat(prompt, opts);
  } catch {
    // Wait 2 seconds before retrying
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      return await aiChat(prompt, opts);
    } catch {
      return null;
    }
  }
}
