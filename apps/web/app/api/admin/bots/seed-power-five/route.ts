import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { seedPowerFive } from '@/lib/admin/actions/bots';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const result = await seedPowerFive();
    return NextResponse.json(result);
  } catch (error) {
    console.error('P5 bot seeding failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
