// ============================================================
// AI Provider Router
// Drop-in replacement for the deepseek aiChat() signature.
//
// Picks a provider via weighted-random selection using AI_PROVIDER_WEIGHTS
// (e.g. "deepseek:70,groq:20,gemini:10"). Falls through to the next
// highest-weight provider on error (API down, rate-limit, missing key).
//
// Default: 100% deepseek when AI_PROVIDER_WEIGHTS is unset — zero
// behavior change until the operator opts in.
// ============================================================

import { aiChat as deepseekChat, aiChatWithRetry as deepseekWithRetry } from './deepseek';
import { aiChat as groqChat } from './groq';
import { aiChat as geminiChat } from './gemini';

type Provider = 'deepseek' | 'groq' | 'gemini';

type ChatFn = (
  prompt: string,
  opts?: { feature?: string; subType?: string; temperature?: number; maxTokens?: number; timeout?: number; systemPrompt?: string },
) => Promise<string>;

const PROVIDERS: Record<Provider, ChatFn> = {
  deepseek: deepseekChat,
  groq: groqChat,
  gemini: geminiChat,
};

function providerAvailable(p: Provider): boolean {
  switch (p) {
    case 'deepseek':
      return !!process.env.DEEPSEEK_API_KEY;
    case 'groq':
      return !!process.env.GROQ_API_KEY;
    case 'gemini':
      return !!process.env.GEMINI_API_KEY;
  }
}

/**
 * Parse AI_PROVIDER_WEIGHTS env (e.g. "deepseek:70,groq:20,gemini:10").
 * Returns sorted list by descending weight. Skips providers whose keys are missing.
 */
function parseWeights(): Array<{ provider: Provider; weight: number }> {
  const raw = process.env.AI_PROVIDER_WEIGHTS ?? 'deepseek:100';
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const entries: Array<{ provider: Provider; weight: number }> = [];
  for (const part of parts) {
    const [name, weightStr] = part.split(':').map((s) => s.trim());
    if (!name || !weightStr) continue;
    const provider = name.toLowerCase() as Provider;
    if (!(provider in PROVIDERS)) continue;
    const weight = Number(weightStr) || 0;
    if (weight <= 0) continue;
    if (!providerAvailable(provider)) continue;
    entries.push({ provider, weight });
  }
  // Sort descending so fallback order is sensible (highest weight first)
  entries.sort((a, b) => b.weight - a.weight);
  return entries;
}

function pickWeighted(entries: Array<{ provider: Provider; weight: number }>): Provider | null {
  if (entries.length === 0) return null;
  const total = entries.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e.provider;
  }
  return entries[0]!.provider;
}

/**
 * Drop-in replacement for deepseek.aiChat().
 * Tries weighted-random provider first; falls through to remaining
 * providers on error. Throws only when every configured provider fails.
 */
export async function aiChat(
  prompt: string,
  opts?: { feature?: string; subType?: string; temperature?: number; maxTokens?: number; timeout?: number; systemPrompt?: string },
): Promise<string> {
  const entries = parseWeights();

  // No providers available at all — fall back to deepseek direct (which will throw its own missing-key error).
  if (entries.length === 0) {
    return deepseekChat(prompt, opts);
  }

  // Pick weighted-random, then try others in descending-weight order on failure
  const first = pickWeighted(entries)!;
  const order: Provider[] = [first, ...entries.map((e) => e.provider).filter((p) => p !== first)];

  let lastError: unknown = null;
  for (const provider of order) {
    try {
      return await PROVIDERS[provider](prompt, opts);
    } catch (err) {
      lastError = err;
      // Try next provider
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All AI providers failed');
}

/**
 * Router-aware retry wrapper.
 * Delegates to deepseek.aiChatWithRetry when deepseek is the sole provider
 * (preserves existing retry semantics), otherwise relies on router fallthrough.
 */
export async function aiChatWithRetry(
  prompt: string,
  opts?: { feature?: string; subType?: string; temperature?: number; maxTokens?: number; timeout?: number; systemPrompt?: string },
): Promise<string | null> {
  const entries = parseWeights();
  if (entries.length <= 1 && (entries[0]?.provider ?? 'deepseek') === 'deepseek') {
    return deepseekWithRetry(prompt, opts);
  }
  try {
    return await aiChat(prompt, opts);
  } catch {
    return null;
  }
}

// Re-export for call sites that import types/errors from deepseek directly
export { AiDailyCapExceeded } from './deepseek';
