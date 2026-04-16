// ============================================================
// Google Perspective API provider
// Free via Google (request access at https://perspectiveapi.com)
// Rate limit: 1 QPS default. We cache identical text for 60s.
// Needs PERSPECTIVE_API_KEY. Returns null when key is missing.
// ============================================================

import { cached } from './cache';

const ENDPOINT = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

export interface PerspectiveScores {
  toxicity: number;
  severeToxicity: number;
  insult: number;
  threat: number;
  identityAttack: number;
  profanity: number;
}

interface PerspectiveResponse {
  attributeScores?: Record<
    string,
    { summaryScore?: { value?: number } }
  >;
}

/**
 * Analyze text for toxicity, insult, threat, identity attack, profanity.
 * Returns null when PERSPECTIVE_API_KEY is missing or on error.
 * Caches identical text for 60s to respect 1 QPS free-tier limit.
 */
export async function getToxicityScores(text: string): Promise<PerspectiveScores | null> {
  const key = process.env.PERSPECTIVE_API_KEY;
  if (!key) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const cacheKey = `perspective:${trimmed.slice(0, 200)}:${trimmed.length}`;

  return cached(cacheKey, 60_000, async () => {
    try {
      const body = {
        comment: { text: trimmed },
        languages: ['en'],
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          INSULT: {},
          THREAT: {},
          IDENTITY_ATTACK: {},
          PROFANITY: {},
        },
      };
      const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as PerspectiveResponse;
      const attrs = json.attributeScores ?? {};
      const pick = (k: string) => attrs[k]?.summaryScore?.value ?? 0;
      return {
        toxicity: pick('TOXICITY'),
        severeToxicity: pick('SEVERE_TOXICITY'),
        insult: pick('INSULT'),
        threat: pick('THREAT'),
        identityAttack: pick('IDENTITY_ATTACK'),
        profanity: pick('PROFANITY'),
      };
    } catch {
      return null;
    }
  });
}

