// ============================================================
// Cloudflare Turnstile CAPTCHA provider
// Free, unlimited. Sign up at https://dash.cloudflare.com/?to=/:account/turnstile
// Needs NEXT_PUBLIC_TURNSTILE_SITE_KEY (client) + TURNSTILE_SECRET_KEY (server).
// When secret is missing, verify auto-passes (dev mode).
// ============================================================

const VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
}

/**
 * Verify a Turnstile token server-side.
 * Returns true when valid OR when TURNSTILE_SECRET_KEY is unset (dev mode).
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // dev mode — auto-pass

  if (!token || typeof token !== 'string') return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);

    const res = await fetch(VERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as TurnstileVerifyResponse;
    return !!json.success;
  } catch {
    return false;
  }
}

export function turnstileEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}
