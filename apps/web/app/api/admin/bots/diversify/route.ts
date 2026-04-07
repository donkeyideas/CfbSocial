import { NextResponse } from 'next/server';
import { diversifyBots } from '@/lib/admin/actions/bots';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST() {
  try {
    const result = await diversifyBots();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Bot diversification failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
