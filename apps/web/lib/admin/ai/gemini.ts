// ============================================================
// Google Gemini AI provider (raw REST — no SDK dependency)
// Free tier: https://aistudio.google.com/apikey — Gemini 2.0 Flash.
// Needs GEMINI_API_KEY. Throws when missing (router handles fallback).
// ============================================================

import { createAdminClient } from '@/lib/admin/supabase/admin';
import { enforceDailyCap } from './deepseek';

// Gemini 2.0 Flash free tier is $0 but we track indicative token cost for logs
const COST_PER_1M_INPUT = 0.075;
const COST_PER_1M_OUTPUT = 0.3;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string };
}

export async function aiChat(
  prompt: string,
  opts?: { feature?: string; subType?: string; temperature?: number; maxTokens?: number; timeout?: number; systemPrompt?: string },
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  await enforceDailyCap(opts?.feature);

  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  const start = Date.now();
  let success = true;
  let errorMessage: string | null = null;
  let responseText = '';
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;

  try {
    const body: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: opts?.temperature ?? 0.7,
        maxOutputTokens: opts?.maxTokens ?? 600,
      },
    };
    if (opts?.systemPrompt) {
      body.systemInstruction = {
        role: 'system',
        parts: [{ text: opts.systemPrompt }],
      };
    }

    const timeoutMs = opts?.timeout ?? 10_000;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const json = (await res.json()) as GeminiResponse;
    if (!res.ok) {
      throw new Error(json.error?.message ?? `Gemini ${res.status}`);
    }
    responseText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    promptTokens = json.usageMetadata?.promptTokenCount ?? 0;
    completionTokens = json.usageMetadata?.candidatesTokenCount ?? 0;
    totalTokens = json.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens;

    return responseText;
  } catch (err) {
    success = false;
    errorMessage = err instanceof Error ? err.message : 'Gemini API error';
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
        provider: 'gemini',
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
