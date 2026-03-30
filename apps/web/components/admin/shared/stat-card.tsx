import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const colorMap = {
  default: 'var(--admin-text)',
  success: 'var(--admin-success)',
  warning: 'var(--admin-warning)',
  danger: 'var(--admin-error)',
  info: 'var(--admin-info)',
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

export function StatCard({ label, value, icon: Icon, trend, change, color = 'default' }: StatCardProps) {
  const TrendIcon = trend ? trendIcons[trend] : null;

  return (
    <div className="admin-stat-ticket">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]" style={{ fontFamily: 'var(--admin-mono)' }}>
          {label}
        </p>
        {Icon && <Icon className="h-4 w-4 text-[var(--admin-text-muted)]" />}
      </div>
      <p className="mt-2 text-2xl font-bold" style={{ color: colorMap[color], fontFamily: 'var(--admin-serif)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {(trend || change) && (
        <div className="mt-1 flex items-center gap-1">
          {TrendIcon && (
            <TrendIcon
              className={`h-3 w-3 ${
                trend === 'up' ? 'text-[var(--admin-success)]' : trend === 'down' ? 'text-[var(--admin-error)]' : 'text-[var(--admin-text-muted)]'
              }`}
            />
          )}
          {change && (
            <span className="text-xs text-[var(--admin-text-muted)]">{change}</span>
          )}
        </div>
      )}
    </div>
  );
}
