interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'purple';
}

const variantStyles: Record<string, string> = {
  success: 'text-[var(--admin-success)]',
  warning: 'text-[var(--admin-warning)]',
  danger: 'text-[var(--admin-error)]',
  info: 'text-[var(--admin-info)]',
  muted: 'text-[var(--admin-text-secondary)]',
  purple: 'text-purple-400',
};

export function StatusBadge({ status, variant = 'muted' }: StatusBadgeProps) {
  return (
    <span className={`text-xs font-semibold ${variantStyles[variant]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
