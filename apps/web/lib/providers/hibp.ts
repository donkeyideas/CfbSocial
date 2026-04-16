// ============================================================
// HaveIBeenPwned Pwned Passwords provider
// Uses k-anonymity API: client hashes password with SHA-1,
// sends only the first 5 hex chars, server returns list of
// suffixes + breach counts for matching prefix. Full password
// hash never leaves the client.
//
// No API key. Unlimited. Safe to call client-side.
// Docs: https://haveibeenpwned.com/API/v3#PwnedPasswords
// ============================================================

/**
 * SHA-1 hash a string using the Web Crypto API.
 * Returns uppercase hex digest.
 */
async function sha1Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-1', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Check how many times a password has appeared in known breaches.
 * Returns 0 when clean, >0 when pwned, null on network/parse error.
 *
 * Safe: only the first 5 chars of the SHA-1 hash leave the client.
 */
export async function checkPasswordBreaches(password: string): Promise<number | null> {
  if (!password || password.length < 4) return 0;
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body = await res.text();

    for (const line of body.split(/\r?\n/)) {
      const [lineSuffix, countStr] = line.split(':');
      if (!lineSuffix || !countStr) continue;
      if (lineSuffix.trim().toUpperCase() === suffix) {
        const count = parseInt(countStr.trim(), 10);
        return Number.isFinite(count) ? count : 0;
      }
    }
    return 0;
  } catch {
    return null;
  }
}
