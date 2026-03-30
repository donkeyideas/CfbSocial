import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/admin/shared/loading-skeleton';
import { AIIntelligenceClient } from '@/components/admin/ai-intelligence/ai-intelligence-client';

export const metadata = {
  title: 'AI Intelligence',
};

export default function AIIntelligencePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Intelligence</h1>
        <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
          Knowledge base, usage analytics, and provider performance - every AI interaction stored for learning and optimization.
        </p>
      </div>
      <Suspense fallback={<LoadingSkeleton type="chart" />}>
        <AIIntelligenceData />
      </Suspense>
    </div>
  );
}

async function AIIntelligenceData() {
  const {
    getAISummaryStats,
    getAIInteractions,
    getAIUsageByFeature,
    getAIProviderPerformance,
    getAICostTrend,
    getAIDailyVolume,
  } = await import('@/lib/admin/actions/ai-intelligence');

  const [summary, interactions, usageByFeature, providerPerformance, costTrend, dailyVolume] = await Promise.all([
    getAISummaryStats(),
    getAIInteractions({ limit: 50, offset: 0 }),
    getAIUsageByFeature(),
    getAIProviderPerformance(),
    getAICostTrend(30),
    getAIDailyVolume(30),
  ]);

  return (
    <AIIntelligenceClient
      summary={summary}
      interactions={interactions}
      usageByFeature={usageByFeature}
      providerPerformance={providerPerformance}
      costTrend={costTrend}
      dailyVolume={dailyVolume}
    />
  );
}
