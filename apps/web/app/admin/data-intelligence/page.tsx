import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/admin/shared/loading-skeleton';
import { DataIntelligenceClient } from '@/components/admin/data-intelligence/data-intelligence-client';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Data Intelligence' };

export default function DataIntelligencePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Data Intelligence</h1>
      <Suspense fallback={<LoadingSkeleton type="cards" rows={4} />}>
        <DataIntelligenceData />
      </Suspense>
    </div>
  );
}

async function DataIntelligenceData() {
  const { calculateHealthScore, getPlatformInsights } = await import('@/lib/admin/actions/data-intelligence');

  const [healthScore, insights] = await Promise.all([
    calculateHealthScore(),
    getPlatformInsights(),
  ]);

  return <DataIntelligenceClient healthScore={healthScore} insights={insights} />;
}
