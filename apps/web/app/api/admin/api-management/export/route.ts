import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { getAllCallHistoryForExport } from '@/lib/admin/actions/api-management';

/** Escape CSV field: wrap in quotes if it contains comma, quote, or newline. */
function csvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const rows = await getAllCallHistoryForExport();

    const headers = [
      'id',
      'created_at',
      'provider',
      'model',
      'feature',
      'sub_type',
      'success',
      'response_time_ms',
      'prompt_tokens',
      'completion_tokens',
      'tokens_used',
      'cost',
      'error_message',
    ];

    const lines: string[] = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        [
          csvField(r.id),
          csvField(r.created_at),
          csvField(r.provider),
          csvField(r.model),
          csvField(r.feature),
          csvField(r.sub_type),
          csvField(r.success ? 'true' : 'false'),
          csvField(r.response_time_ms),
          csvField(r.prompt_tokens),
          csvField(r.completion_tokens),
          csvField(r.tokens_used),
          csvField(r.cost),
          csvField(r.error_message),
        ].join(','),
      );
    }

    const csv = lines.join('\n');
    const timestamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="api-call-history-${timestamp}.csv"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 },
    );
  }
}
