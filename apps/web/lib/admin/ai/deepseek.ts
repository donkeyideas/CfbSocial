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

export async function aiChat(
  prompt: string,
  opts?: { feature?: string; subType?: string; temperature?: number; maxTokens?: number; timeout?: number; systemPrompt?: string },
): Promise<string> {
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

    const response = await getClient().chat.completions.create({
      model,
      messages,
      temperature: opts?.temperature ?? 0.7,
      max_tokens: opts?.maxTokens ?? 600,
    });

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
