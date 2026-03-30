'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { SERIES_COLORS, getChartConfig } from '@/lib/admin/utils/chart-theme';

interface Props {
  data: { name: string; value: number }[];
}

export function ContentPieChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--admin-text-muted)]">No content data.</p>;
  }

  const cfg = getChartConfig();
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" nameKey="name">
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: cfg.tooltipBg, border: `1px solid ${cfg.tooltipBorder}`, borderRadius: '0.5rem', color: 'var(--admin-text)' }} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
