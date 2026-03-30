interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function ChartWrapper({ title, subtitle, children, action }: ChartWrapperProps) {
  return (
    <div className="admin-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--admin-text)]" style={{ fontFamily: 'var(--admin-serif)' }}>{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}
