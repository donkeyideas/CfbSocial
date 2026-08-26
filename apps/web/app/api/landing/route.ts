import { NextResponse } from 'next/server';
import { getLandingData } from '@/lib/landing/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getLandingData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch {
    return NextResponse.json(
      {
        games: [],
        hotTakes: [],
        stats: { schools: 653, liveThreads: 0, posts: 0 },
        ticker: [],
      },
      { status: 200 },
    );
  }
}
