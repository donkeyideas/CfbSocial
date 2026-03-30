'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART_COLORS, getChartConfig } from '@/lib/admin/utils/chart-theme';

interface Props {
  data: { month: string; users: number; posts: number; reactions: number }[];
}

export function GrowthChart({ data }: Props) {
  const cfg = getChartConfig();
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={cfg.gridColor} />
        <XAxis dataKey="month" tick={{ fill: cfg.axisColor, fontSize: cfg.fontSize }} tickLine={false} axisLine={{ stroke: cfg.gridColor }} />
        <YAxis tick={{ fill: cfg.axisColor, fontSize: cfg.fontSize }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ backgroundColor: cfg.tooltipBg, border: `1px solid ${cfg.tooltipBorder}`, borderRadius: '0.5rem', color: 'var(--admin-text)' }} />
        <Legend />
        <Bar dataKey="users" name="New Users" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
        <Bar dataKey="posts" name="Posts" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
        <Bar dataKey="reactions" name="Reactions" fill={CHART_COLORS.warning} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
