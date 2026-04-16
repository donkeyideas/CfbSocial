import { NextResponse } from 'next/server';
import { searchGifs } from '@/lib/providers/giphy';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '12', 10) || 12, 24);

  if (!q.trim()) return NextResponse.json({ gifs: [] });
  const gifs = await searchGifs(q, limit);
  return NextResponse.json({ gifs });
}
