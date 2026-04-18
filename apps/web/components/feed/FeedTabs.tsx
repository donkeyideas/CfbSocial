'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const tabs = [
  { value: 'latest', label: 'Latest' },
  { value: 'my-school', label: 'My School' },
  { value: 'top', label: 'Top Takes' },
  { value: 'receipts', label: 'Receipts' },
  { value: 'following', label: 'Following' },
] as const;

export type FeedTab = (typeof tabs)[number]['value'];

export function FeedTabs() {
  const searchParams = useSearchParams();
  const activeTab = (searchParams?.get('tab') as FeedTab) || 'latest';

  return (
    <div className="feed-tabs">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.value === 'latest' ? '/feed' : `/feed?tab=${tab.value}`}
          className={`feed-tab ${activeTab === tab.value ? 'active' : ''}`}
          prefetch={false}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
