'use client';

import { useState } from 'react';
import { TabNav } from '@/components/admin/shared/tab-nav';
import { NotificationStats } from './notification-stats';
import { PushLogTab } from './push-log-tab';
import { BroadcastsTab } from './broadcasts-tab';
import { ComposeTab } from './compose-tab';
import { AutoBroadcastTab } from './auto-broadcast-tab';

interface PushStats {
  totalSentToday: number;
  totalFailedToday: number;
  deliveryRate: number;
  activeDevices: number;
  totalSystemNotifications: number;
}

interface PushLogEntry {
  id: string;
  notification_id: string | null;
  system_notification_id: string | null;
  user_id: string;
  device_token: string;
  platform: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  recipient?: { username: string | null; display_name: string | null } | null;
  notification_type?: string | null;
}

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

interface School {
  id: string;
  name: string;
  conference: string | null;
}

interface Props {
  stats: PushStats;
  pushLog: PushLogEntry[];
  pushLogTotal: number;
  broadcasts: SystemNotificationEntry[];
  schools: School[];
  conferences: string[];
}

const tabs = [
  { id: 'compose', label: 'Compose' },
  { id: 'auto-broadcast', label: 'Auto-Broadcast' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'push-log', label: 'Push Log' },
  { id: 'broadcasts', label: 'System Broadcasts' },
];

export function NotificationCenterClient({
  stats,
  pushLog,
  pushLogTotal,
  broadcasts,
  schools,
  conferences,
}: Props) {
  const [activeTab, setActiveTab] = useState('compose');

  return (
    <div>
      <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'dashboard' && (
          <div className="notification-dashboard">
            <NotificationStats stats={stats} />
            <div className="mt-6">
              <h3 className="admin-subsection-title">Recent Push Activity</h3>
              <PushLogTab initialData={pushLog} initialTotal={pushLogTotal} />
            </div>
          </div>
        )}

        {activeTab === 'push-log' && (
          <PushLogTab initialData={pushLog} initialTotal={pushLogTotal} />
        )}

        {activeTab === 'broadcasts' && (
          <BroadcastsTab data={broadcasts} />
        )}

        {activeTab === 'compose' && (
          <ComposeTab schools={schools} conferences={conferences} />
        )}

        {activeTab === 'auto-broadcast' && (
          <AutoBroadcastTab />
        )}
      </div>
    </div>
  );
}
