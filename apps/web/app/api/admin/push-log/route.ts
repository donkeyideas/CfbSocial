import { NextRequest, NextResponse } from 'next/server';
import { getPushNotificationLog } from '@/lib/admin/actions/push-notifications';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '25', 10);
  const status = searchParams.get('status') || undefined;
  const platform = searchParams.get('platform') || undefined;

  const result = await getPushNotificationLog({ page, limit, status, platform });
  return NextResponse.json(result);
}
