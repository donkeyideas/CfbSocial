import { NextRequest, NextResponse } from 'next/server';
import { verifyTurnstileToken } from '@/lib/providers/turnstile';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) {
    return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 });
  }
  const remoteIp =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    undefined;
  const ok = await verifyTurnstileToken(token, remoteIp);
  return NextResponse.json({ success: ok });
}
