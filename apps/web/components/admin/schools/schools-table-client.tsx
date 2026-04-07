'use client';

import { useMemo } from 'react';
import { useSortableTable, SortableHeader } from '@/components/admin/shared/sortable-header';

interface SchoolRow {
  id: string;
  name: string;
  mascot: string;
  abbreviation: string;
  conference: string;
  primary_color: string;
  secondary_color: string;
  is_fbs: boolean;
  userCount: number;
  postCount: number;
}

interface Props {
  schools: SchoolRow[];
}

export function SchoolsTableClient({ schools }: Props) {
  const accessors = useMemo(() => ({
    school: (s: SchoolRow) => s.name.toLowerCase(),
    conference: (s: SchoolRow) => s.conference ?? '',
    users: (s: SchoolRow) => s.userCount,
    posts: (s: SchoolRow) => s.postCount,
    fbs: (s: SchoolRow) => s.is_fbs,
  }), []);

  const { sorted, sortConfig, requestSort } = useSortableTable(
    schools,
    accessors,
    { key: 'users', direction: 'desc' },
  );

  return (
    <div className="admin-card overflow-hidden overflow-x-auto">
      <table className="admin-table">
        <thead>
          <tr>
            <SortableHeader label="School" sortKey="school" sortConfig={sortConfig} onSort={requestSort} />
            <SortableHeader label="Conference" sortKey="conference" sortConfig={sortConfig} onSort={requestSort} />
            <SortableHeader label="Users" sortKey="users" sortConfig={sortConfig} onSort={requestSort} />
            <SortableHeader label="Posts" sortKey="posts" sortConfig={sortConfig} onSort={requestSort} />
            <th>Colors</th>
            <SortableHeader label="FBS" sortKey="fbs" sortConfig={sortConfig} onSort={requestSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((school) => (
            <tr key={school.id}>
              <td>
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full"
                    style={{ backgroundColor: school.primary_color }}
                  />
                  <div>
                    <p className="font-medium">{school.name}</p>
                    <p className="text-xs text-[var(--admin-text-muted)]">
                      {school.mascot} &middot; {school.abbreviation}
                    </p>
                  </div>
                </div>
              </td>
              <td className="text-sm text-[var(--admin-text-secondary)]">
                {school.conference}
              </td>
              <td className="text-sm font-medium">
                {school.userCount}
              </td>
              <td className="text-sm font-medium">
                {school.postCount}
              </td>
              <td>
                <div className="flex gap-1">
                  <div
                    className="h-5 w-5 rounded"
                    style={{ backgroundColor: school.primary_color }}
                    title={school.primary_color}
                  />
                  <div
                    className="h-5 w-5 rounded"
                    style={{ backgroundColor: school.secondary_color }}
                    title={school.secondary_color}
                  />
                </div>
              </td>
              <td>
                <span
                  className={`text-xs font-semibold ${
                    school.is_fbs
                      ? 'text-[var(--admin-success)]'
                      : 'text-[var(--admin-text-muted)]'
                  }`}
                >
                  {school.is_fbs ? 'FBS' : 'FCS'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
