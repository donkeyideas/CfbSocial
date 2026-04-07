'use client';

import { useState, useMemo } from 'react';
import { EmptyState } from '@/components/admin/shared/empty-state';
import { useSortableTable, SortableHeader } from '@/components/admin/shared/sortable-header';
import { timeAgo } from '@/lib/admin/utils/formatters';
import { MessageSquare, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  school: { name: string } | null;
}

interface Props {
  contacts: Contact[];
}

const statusColors: Record<string, string> = {
  new: 'text-[var(--admin-info)]',
  read: 'text-[var(--admin-warning)]',
  replied: 'text-[var(--admin-success)]',
};

export function ContactsClient({ contacts }: Props) {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filter === 'all' ? contacts : contacts.filter((c) => c.status === filter);

  const contactAccessors = useMemo(() => ({
    name: (c: Contact) => c.name.toLowerCase(),
    email: (c: Contact) => c.email.toLowerCase(),
    subject: (c: Contact) => c.subject.toLowerCase(),
    category: (c: Contact) => c.category,
    status: (c: Contact) => c.status,
    date: (c: Contact) => c.created_at,
  }), []);
  const { sorted, sortConfig, requestSort } = useSortableTable(filtered, contactAccessors);

  if (contacts.length === 0) {
    return <EmptyState icon={MessageSquare} title="No Contact Submissions" description="Submissions will appear here when users fill out the contact form." />;
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {['all', 'new', 'read', 'replied'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === s ? 'bg-[var(--admin-accent)] text-white' : 'bg-[var(--admin-surface-raised)] text-[var(--admin-text-secondary)]'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="admin-card overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} onSort={requestSort} />
              <SortableHeader label="Email" sortKey="email" sortConfig={sortConfig} onSort={requestSort} />
              <SortableHeader label="Subject" sortKey="subject" sortConfig={sortConfig} onSort={requestSort} />
              <SortableHeader label="Category" sortKey="category" sortConfig={sortConfig} onSort={requestSort} />
              <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={requestSort} />
              <SortableHeader label="Date" sortKey="date" sortConfig={sortConfig} onSort={requestSort} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <>
                <tr key={c.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-xs">{c.email}</td>
                  <td className="max-w-[200px] truncate text-sm">{c.subject}</td>
                  <td className="text-xs text-[var(--admin-text-muted)]">{c.category}</td>
                  <td><span className={`text-xs font-semibold ${statusColors[c.status] || ''}`}>{c.status}</span></td>
                  <td className="text-xs text-[var(--admin-text-muted)]">{timeAgo(c.created_at)}</td>
                  <td>{expandedId === c.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</td>
                </tr>
                {expandedId === c.id && (
                  <tr key={`${c.id}-detail`}>
                    <td colSpan={7} className="bg-[var(--admin-bg)] p-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-[var(--admin-text-muted)]">Message</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--admin-text-secondary)]">{c.message}</p>
                        </div>
                        {c.school && (
                          <p className="text-xs text-[var(--admin-text-muted)]">School: {c.school.name}</p>
                        )}
                        {c.admin_notes && (
                          <div>
                            <p className="text-xs font-semibold text-[var(--admin-text-muted)]">Admin Notes</p>
                            <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">{c.admin_notes}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button className="btn-admin btn-admin-sm">Mark as Read</button>
                          <button className="btn-admin-outline btn-admin-sm">Mark as Replied</button>
                          <a href={`mailto:${c.email}?subject=Re: ${c.subject}`} className="btn-admin-outline btn-admin-sm">Reply via Email</a>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
