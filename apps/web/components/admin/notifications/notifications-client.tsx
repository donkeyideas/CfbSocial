'use client';

import { useState } from 'react';
import { TabNav } from '@/components/admin/shared/tab-nav';
import { EmptyState } from '@/components/admin/shared/empty-state';
import { timeAgo } from '@/lib/admin/utils/formatters';
import { Bell, UserPlus, Shield, Flag, Scale, AlertTriangle, MessageSquare } from 'lucide-react';

interface FeedItem {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  created_at: string;
  reference_id?: string;
}

interface Props {
  feed: FeedItem[];
}

const typeIcons: Record<string, typeof Bell> = {
  signup: UserPlus,
  moderation: Shield,
  report: Flag,
  appeal: Scale,
  system: AlertTriangle,
  contact: MessageSquare,
};

const severityColors: Record<string, string> = {
  success: 'text-[var(--admin-success)]',
  critical: 'text-[var(--admin-error)]',
  warning: 'text-[var(--admin-warning)]',
  info: 'text-[var(--admin-info)]',
};

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'signup', label: 'Signups' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'report', label: 'Reports' },
  { id: 'appeal', label: 'Appeals' },
];

export function NotificationsClient({ feed }: Props) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? feed : feed.filter((item) => item.type === filter);

  return (
    <div>
      <TabNav tabs={filterTabs} activeTab={filter} onTabChange={setFilter} />

      <div className="mt-6">
        {filtered.length === 0 ? (
          <EmptyState icon={Bell} title="No Notifications" description="Activity will appear here as events occur across the platform." />
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const Icon = typeIcons[item.type] || Bell;
              return (
                <div key={item.id} className="admin-card flex items-start gap-4 p-4">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${severityColors[item.severity] || severityColors.info}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-sm text-[var(--admin-text-secondary)]">{item.description}</p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--admin-text-muted)]">{timeAgo(item.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
