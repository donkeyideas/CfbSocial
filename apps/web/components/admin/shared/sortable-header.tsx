'use client';

import { useState, useMemo } from 'react';

/* ── Types ─────────────────────────────────────────────────────── */

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

/* ── Hook ──────────────────────────────────────────────────────── */

/**
 * Generic sorting hook for admin tables.
 *
 * @param data        - array of items to sort
 * @param accessors   - optional map of sortKey → value-extractor functions
 * @param defaultSort - optional initial sort
 */
export function useSortableTable<T>(
  data: T[],
  accessors?: Record<string, (item: T) => string | number | boolean | null | undefined>,
  defaultSort?: SortConfig,
) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(defaultSort ?? null);

  const sorted = useMemo(() => {
    if (!sortConfig) return data;
    const { key, direction } = sortConfig;
    const accessor = accessors?.[key];

    return [...data].sort((a, b) => {
      const aVal = accessor ? accessor(a) : (a as Record<string, unknown>)[key];
      const bVal = accessor ? accessor(b) : (b as Record<string, unknown>)[key];

      // nulls always last
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // booleans: true before false in asc
      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        if (aVal === bVal) return 0;
        return direction === 'asc'
          ? (aVal ? -1 : 1)
          : (aVal ? 1 : -1);
      }

      // numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // strings
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const cmp = aStr.localeCompare(bStr);
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [data, sortConfig, accessors]);

  function requestSort(key: string) {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return null; // third click clears sort
    });
  }

  return { sorted, sortConfig, requestSort };
}

/* ── Component ─────────────────────────────────────────────────── */

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
  style?: React.CSSProperties;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  sortConfig,
  onSort,
  style,
  className,
}: SortableHeaderProps) {
  const active = sortConfig?.key === sortKey;
  const dir = active ? sortConfig!.direction : null;

  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{ cursor: 'pointer', userSelect: 'none', ...style }}
      className={className}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            lineHeight: 1,
            fontSize: '0.55em',
            opacity: active ? 1 : 0.3,
          }}
        >
          <span style={{ opacity: dir === 'asc' ? 1 : 0.35 }}>&#9650;</span>
          <span style={{ marginTop: -2, opacity: dir === 'desc' ? 1 : 0.35 }}>&#9660;</span>
        </span>
      </span>
    </th>
  );
}
