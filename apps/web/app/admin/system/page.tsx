import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/admin/shared/loading-skeleton';
import { SystemHealthClient } from '@/components/admin/system/system-health-client';

export const metadata = { title: 'System Health' };

export default function SystemPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Health</h1>
      <Suspense fallback={<LoadingSkeleton type="cards" rows={4} />}>
        <SystemData />
      </Suspense>
    </div>
  );
}

async function SystemData() {
  const { runHealthCheck, getTableStats, getJobQueue } = await import('@/lib/admin/actions/system-health');
  const [healthChecks, tableStats, jobs] = await Promise.all([
    runHealthCheck(),
    getTableStats(),
    getJobQueue(),
  ]);
  return <SystemHealthClient healthChecks={healthChecks} tableStats={tableStats} jobs={jobs} />;
}
