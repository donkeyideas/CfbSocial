'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ExportType = 'users' | 'posts' | 'schools' | 'reports' | 'moderation_log' | 'challenges' | 'predictions';
type ExportFormat = 'json' | 'csv';

const exportOptions: { value: ExportType; label: string; description: string }[] = [
  { value: 'users', label: 'Users', description: 'All user profiles with school and tier info' },
  { value: 'posts', label: 'Posts', description: 'All published posts with author metadata' },
  { value: 'schools', label: 'Schools', description: 'School directory with colors and conferences' },
  { value: 'reports', label: 'Reports', description: 'Content reports and moderation decisions' },
  { value: 'moderation_log', label: 'Moderation Log', description: 'Full moderation action history' },
  { value: 'challenges', label: 'Challenges', description: 'All challenges and their statuses' },
  { value: 'predictions', label: 'Predictions', description: 'User predictions and outcomes' },
];

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]!);

  const escapeValue = (value: unknown): string => {
    const str = value === null || value === undefined ? '' : String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeValue).join(',');
  const rows = data.map((row) =>
    headers.map((header) => escapeValue(row[header])).join(',')
  );

  return [headerRow, ...rows].join('\n');
}

export function ExportsClient() {
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [format, setFormat] = useState<ExportFormat>('json');

  async function handleExport(type: ExportType) {
    setExporting(type);
    const supabase = createClient();

    let data: unknown[] | null = null;

    switch (type) {
      case 'users': {
        const result = await supabase.from('profiles').select('*').order('created_at');
        data = result.data;
        break;
      }
      case 'posts': {
        const result = await supabase.from('posts').select('*').order('created_at');
        data = result.data;
        break;
      }
      case 'schools': {
        const result = await supabase.from('schools').select('*').order('name');
        data = result.data;
        break;
      }
      case 'reports': {
        const result = await supabase.from('reports').select('*').order('created_at');
        data = result.data;
        break;
      }
      case 'moderation_log': {
        const result = await supabase.from('moderation_events').select('*').order('created_at');
        data = result.data;
        break;
      }
      case 'challenges': {
        const result = await supabase.from('challenges').select('*').order('created_at');
        data = result.data;
        break;
      }
      case 'predictions': {
        const result = await supabase.from('predictions').select('*').order('created_at');
        data = result.data;
        break;
      }
    }

    if (data && data.length > 0) {
      if (format === 'csv') {
        const csv = convertToCSV(data as Record<string, unknown>[]);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cfb-social-${type}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cfb-social-${type}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }

    setExporting(null);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Export Center</h1>

      {/* Format toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--admin-text-muted)]">Format:</span>
        <button
          onClick={() => setFormat('json')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            format === 'json'
              ? 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent-light)]'
              : 'text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-raised)] hover:text-[var(--admin-text)]'
          }`}
        >
          JSON
        </button>
        <button
          onClick={() => setFormat('csv')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            format === 'csv'
              ? 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent-light)]'
              : 'text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-raised)] hover:text-[var(--admin-text)]'
          }`}
        >
          CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exportOptions.map((option) => (
          <div key={option.value} className="admin-card p-6">
            <h3 className="font-semibold">{option.label}</h3>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              {option.description}
            </p>
            <button
              onClick={() => handleExport(option.value)}
              disabled={exporting !== null}
              className="btn-admin mt-4 flex items-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" />
              {exporting === option.value
                ? 'Exporting...'
                : `Export ${format.toUpperCase()}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
