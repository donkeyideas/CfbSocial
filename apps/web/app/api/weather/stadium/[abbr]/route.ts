import { NextResponse } from 'next/server';
import { getStadiumCoord } from '@/lib/data/stadium-coords';
import { getStadiumForecast } from '@/lib/providers/weather';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ abbr: string }> },
) {
  const { abbr } = await params;
  const coord = getStadiumCoord(abbr);
  if (!coord) {
    return NextResponse.json({ forecast: null, reason: 'unknown_stadium' });
  }
  const forecast = await getStadiumForecast(coord.lat, coord.lon);
  return NextResponse.json({ forecast, stadium: coord.stadium });
}
