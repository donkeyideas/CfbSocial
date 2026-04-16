// ============================================================
// Resend transactional email provider
// Free: 3k emails/month. Sign up at https://resend.com
// Needs RESEND_API_KEY and RESEND_FROM_EMAIL.
// Returns { ok: false, skipped: true } when key is missing.
// ============================================================

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

/**
 * Send a transactional email via Resend.
 * No-op (returns { ok: false, skipped: true }) when RESEND_API_KEY is missing.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) return { ok: false, skipped: true };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, error: `Resend ${res.status}: ${errText.slice(0, 200)}` };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, id: json.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================
// Pre-built email templates
// ============================================================

export function welcomeEmail(username: string): { subject: string; html: string; text: string } {
  const subject = 'Welcome to CFB Social';
  const text = `Welcome to CFB Social, @${username}!

The press box is yours. File hot takes, debate rivals, track recruiting, and build your dynasty.

- Post your first take: https://www.cfbsocial.com/feed
- Visit your school hub: https://www.cfbsocial.com
- Questions? Just reply to this email.

See you on the field,
The CFB Social Team`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #2b2018;">
  <h1 style="color: #770011; margin-bottom: 12px;">Welcome to CFB Social</h1>
  <p>Welcome aboard, <strong>@${escapeHtml(username)}</strong>.</p>
  <p>The press box is yours. File hot takes, debate rivals, track recruiting, and build your dynasty.</p>
  <ul>
    <li><a href="https://www.cfbsocial.com/feed" style="color: #770011;">File your first take</a></li>
    <li><a href="https://www.cfbsocial.com" style="color: #770011;">Visit your school hub</a></li>
  </ul>
  <p style="color: #6b5a47; font-size: 13px; margin-top: 24px;">Questions? Just reply to this email.</p>
  <p style="color: #6b5a47; font-size: 13px;">— The CFB Social Team</p>
</body>
</html>`;

  return { subject, html, text };
}

export function appealOutcomeEmail(
  username: string,
  outcome: 'APPROVED' | 'DENIED',
  reason?: string,
): { subject: string; html: string; text: string } {
  const approved = outcome === 'APPROVED';
  const subject = approved
    ? 'Your appeal has been approved'
    : 'Your appeal has been reviewed';

  const text = `Hi @${username},

Your appeal has been ${approved ? 'APPROVED' : 'DENIED'}.

${reason ? `Moderator note: ${reason}\n\n` : ''}${
    approved
      ? 'Your post has been restored and is visible again on CFB Social.'
      : 'After review, our moderation team has upheld the original decision.'
  }

View your posts: https://www.cfbsocial.com/feed

— The CFB Social Team`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #2b2018;">
  <h1 style="color: ${approved ? '#2d5016' : '#770011'}; margin-bottom: 12px;">
    Appeal ${approved ? 'Approved' : 'Reviewed'}
  </h1>
  <p>Hi <strong>@${escapeHtml(username)}</strong>,</p>
  <p>Your appeal has been <strong>${outcome}</strong>.</p>
  ${reason ? `<p><em>Moderator note: ${escapeHtml(reason)}</em></p>` : ''}
  <p>${
    approved
      ? 'Your post has been restored and is visible again on CFB Social.'
      : 'After review, our moderation team has upheld the original decision.'
  }</p>
  <p><a href="https://www.cfbsocial.com/feed" style="color: #770011;">View your posts</a></p>
  <p style="color: #6b5a47; font-size: 13px; margin-top: 24px;">— The CFB Social Team</p>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}
