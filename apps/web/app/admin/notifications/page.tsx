import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/admin/shared/loading-skeleton';
import { NotificationCenterClient } from '@/components/admin/notifications/notification-center-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notification Center' };

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="admin-section-title">Notification Center</h1>
      <Suspense fallback={<LoadingSkeleton rows={10} />}>
        <NotificationCenterData />
      </Suspense>
    </div>
  );
}

async function NotificationCenterData() {
  const { getPushStats, getPushNotificationLog, getSystemNotifications, getSchoolsForPicker, getConferences } =
    await import('@/lib/admin/actions/push-notifications');

  const [stats, pushLogResult, broadcastsResult, schools, conferences] = await Promise.all([
    getPushStats(),
    getPushNotificationLog({ page: 1, limit: 25 }),
    getSystemNotifications({ page: 1, limit: 25 }),
    getSchoolsForPicker(),
    getConferences(),
  ]);

  return (
    <NotificationCenterClient
      stats={stats}
      pushLog={pushLogResult.data}
      pushLogTotal={pushLogResult.total}
      broadcasts={broadcastsResult.data}
      schools={schools}
      conferences={conferences}
    />
  );
}
