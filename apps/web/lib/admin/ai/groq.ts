// ============================================================
// Groq AI provider (OpenAI-compatible)
// Free tier: https://console.groq.com — Llama 3.3 / Mixtral / etc.
// Needs GROQ_API_KEY. Throws when missing (router handles fallback).
// ============================================================

import OpenAI from 'openai';
import { createAdminClient } from '@/lib/admin/supabase/admin';
import { enforceDailyCap } from './deepseek';

function getClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY || 'missing',
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

// Groq pricing per 1M tokens (USD) — using Llama 3.3 70B as default
// (Groq is free tier currently; cost is informational for logs.)
const COST_PER_1M_INPUT = 0.59;
const COST_PER_1M_OUTPUT = 0.79;

export async function aiChat(
  prompt: string,
  opts?: { feature?: string; subType?: string; temperature?: number; maxTokens?: number; timeout?: number; systemPrompt?: string },
): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set');
  }

  // Shared daily cap with DeepSeek (counts toward same ai_interactions ledger)
  await enforceDailyCap(opts?.feature);

  const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
  const start = Date.now();
  let success = true;
  let errorMessage: string | null = null;
  let responseText = '';
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;

  try {
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
    errorMessage = err instanceof Error ? err.message : 'Groq API error';
    throw err;
  } finally {
    const elapsed = Date.now() - start;
    const cost =
      (promptTokens / 1_000_000) * COST_PER_1M_INPUT +
      (completionTokens / 1_000_000) * COST_PER_1M_OUTPUT;

    try {
      const supabase = createAdminClient();
      await supabase.from('ai_interactions').insert({
        feature: opts?.feature ?? 'social_posts',
        sub_type: opts?.subType ?? 'content_generation',
        provider: 'groq',
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
