'use client';

import { StatusBadge } from '@/components/admin/shared/status-badge';
import { EmptyState } from '@/components/admin/shared/empty-state';
import { timeAgo } from '@/lib/admin/utils/formatters';
import { Megaphone } from 'lucide-react';

interface SystemNotificationEntry {
  id: string;
  title: string;
  body: string;
  target_audience: string;
  target_id: string | null;
  created_by: string;
  sent_count: number;
  failed_count: number;
  read_count: number;
  status: string;
  created_at: string;
  sent_at: string | null;
  creator?: { username: string | null; display_name: string | null } | null;
}

interface Props {
  data: SystemNotificationEntry[];
}

function audienceLabel(audience: string): string {
  switch (audience) {
    case 'all': return 'All Users';
    case 'school': return 'School';
    case 'conference': return 'Conference';
    default: return audience;
  }
}

export function BroadcastsTab({ data }: Props) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Megaphone}
        title="No Broadcasts"
        description="System broadcasts sent from the Compose tab will appear here."
      />
    );
  }

  return (
    <div className="broadcasts-list">
      {data.map((notif) => (
        <div key={notif.id} className="admin-card broadcast-card">
          <div className="broadcast-header">
            <h3 className="broadcast-title">{notif.title}</h3>
            <StatusBadge
              status={notif.status}
              variant={notif.status === 'sent' ? 'success' : notif.status === 'failed' ? 'error' : 'warning'}
            />
          </div>
          <p className="broadcast-body">{notif.body}</p>
          <div className="broadcast-meta">
            <span className="broadcast-audience">
              Audience: {audienceLabel(notif.target_audience)}
            </span>
            <span className="broadcast-stats">
              Sent: {notif.sent_count} | Failed: {notif.failed_count} | Read: {notif.read_count}
            </span>
          </div>
          <div className="broadcast-footer">
            <span>By {notif.creator?.display_name || notif.creator?.username || 'Admin'}</span>
            <span>{notif.sent_at ? timeAgo(notif.sent_at) : timeAgo(notif.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
