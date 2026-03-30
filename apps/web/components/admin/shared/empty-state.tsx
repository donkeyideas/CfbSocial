import { Inbox, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-12 w-12 text-[var(--admin-text-muted)]" />
      <h3 className="mt-4 text-lg font-medium text-[var(--admin-text)]">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
