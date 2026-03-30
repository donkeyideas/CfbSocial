import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/admin/shared/loading-skeleton';
import { SearchAIClient } from '@/components/admin/ai-analytics/search-ai-client';

export const metadata = { title: 'Search & AI Analytics' };

export const dynamic = 'force-dynamic';

export default function SearchAIPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<LoadingSkeleton type="chart" />}>
        <SearchAIData />
      </Suspense>
    </div>
  );
}

async function SearchAIData() {
  const { crawlOwnSite } = await import('@/lib/admin/crawl/self-audit');

  let audit;
  try {
    audit = await crawlOwnSite();
  } catch {
    audit = {
      pages: [],
      crawledAt: new Date().toISOString(),
      siteUrl: process.env.WEB_APP_URL ?? 'http://localhost:4200',
      totalPages: 0,
      seoScore: 0,
      aeoScore: 0,
      geoScore: 0,
      croScore: 0,
      technicalScore: 0,
      contentScore: 0,
      issues: [],
    };
  }

  return <SearchAIClient audit={audit} />;
}
