'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART_COLORS, getChartConfig } from '@/lib/admin/utils/chart-theme';

interface Props {
  data: { date: string; posts: number; reactions: number; newUsers: number }[];
}

export function EngagementAreaChart({ data }: Props) {
  const cfg = getChartConfig();
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={cfg.gridColor} />
        <XAxis
          dataKey="date"
          tick={{ fill: cfg.axisColor, fontSize: cfg.fontSize }}
          tickLine={false}
          axisLine={{ stroke: cfg.gridColor }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: cfg.axisColor, fontSize: cfg.fontSize }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: cfg.tooltipBg,
            border: `1px solid ${cfg.tooltipBorder}`,
            borderRadius: '0.5rem',
            color: 'var(--admin-text)',
          }}
        />
        <Legend />
        <Area type="monotone" dataKey="posts" name="Posts" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.1} />
        <Area type="monotone" dataKey="reactions" name="Reactions" stroke={CHART_COLORS.success} fill={CHART_COLORS.success} fillOpacity={0.1} />
        <Area type="monotone" dataKey="newUsers" name="New Users" stroke={CHART_COLORS.warning} fill={CHART_COLORS.warning} fillOpacity={0.1} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
