import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, welcomeEmail } from '@/lib/providers/resend';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { to, username } = (await req.json().catch(() => ({}))) as {
    to?: string;
    username?: string;
  };
  if (!to || !username) {
    return NextResponse.json({ error: 'Missing to/username' }, { status: 400 });
  }
  const tpl = welcomeEmail(username);
  const result = await sendEmail({ to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  return NextResponse.json(result);
}
