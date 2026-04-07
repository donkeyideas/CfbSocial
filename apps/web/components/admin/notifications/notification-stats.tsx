'use client';

import { Send, AlertTriangle, Smartphone, Megaphone } from 'lucide-react';
import { StatCard } from '@/components/admin/shared/stat-card';

interface PushStats {
  totalSentToday: number;
  totalFailedToday: number;
  deliveryRate: number;
  activeDevices: number;
  totalSystemNotifications: number;
}

export function NotificationStats({ stats }: { stats: PushStats }) {
  return (
    <div className="admin-stats-grid">
      <StatCard
        icon={Send}
        label="Sent Today"
        value={stats.totalSentToday.toLocaleString()}
      />
      <StatCard
        icon={AlertTriangle}
        label="Delivery Rate"
        value={`${stats.deliveryRate}%`}
      />
      <StatCard
        icon={Smartphone}
        label="Active Devices"
        value={stats.activeDevices.toLocaleString()}
      />
      <StatCard
        icon={Megaphone}
        label="System Broadcasts"
        value={stats.totalSystemNotifications.toLocaleString()}
      />
    </div>
  );
}
