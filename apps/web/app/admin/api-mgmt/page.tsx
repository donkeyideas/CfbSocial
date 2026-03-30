import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/admin/shared/loading-skeleton';
import { APIClient } from '@/components/admin/api/api-client';

export const metadata = { title: 'API Management' };

export default function APIPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">API Management</h1>
      <Suspense fallback={<LoadingSkeleton rows={8} />}>
        <APIData />
      </Suspense>
    </div>
  );
}

async function APIData() {
  const {
    getAPICallHistory,
    getAPIUsageStats,
    getDailyActivity,
    getAPIProviderConfigs,
  } = await import('@/lib/admin/actions/api-management');

  const [callHistory, usage, dailyActivity, providers] = await Promise.all([
    getAPICallHistory(50),
    getAPIUsageStats(30),
    getDailyActivity(30),
    getAPIProviderConfigs(),
  ]);

  return (
    <APIClient
      callHistory={callHistory}
      usage={usage}
      dailyActivity={dailyActivity}
      providers={providers}
    />
  );
}
