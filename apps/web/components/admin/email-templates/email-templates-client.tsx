'use client';

import { useState } from 'react';
import { Mail, Eye, X, Edit2, Check } from 'lucide-react';
import { EmptyState } from '@/components/admin/shared/empty-state';

interface Template {
  id: string;
  slug: string;
  name: string;
  category: string;
  subject: string;
  body_html: string;
  variables: string[];
  is_active: boolean;
  trigger_description: string;
}

interface Props {
  templates: Template[];
}

const categoryLabels: Record<string, string> = {
  transactional: 'Transactional',
  lifecycle: 'Lifecycle',
  notification: 'Notification',
  authentication: 'Authentication',
};

export function EmailTemplatesClient({ templates }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);

  // Group by category
  const grouped = templates.reduce<Record<string, Template[]>>((acc, t) => {
    const cat = t.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  function handleEdit(t: Template) {
    setSelectedTemplate(t);
    setEditSubject(t.subject);
    setEditBody(t.body_html);
    setEditOpen(true);
  }

  async function handleSave() {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      await fetch(`/api/email-templates/${selectedTemplate.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: editSubject, body_html: editBody }),
      });
      window.location.reload();
    } catch {
      setSaving(false);
    }
  }

  if (templates.length === 0) {
    return <EmptyState icon={Mail} title="No Email Templates" description="Email templates will appear here once the database is seeded." />;
  }

  return (
    <div>
      {Object.entries(grouped).map(([category, temps]) => (
        <div key={category} className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
            {categoryLabels[category] || category}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {temps.map((t) => (
              <div key={t.id} className="admin-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{t.name}</h3>
                    <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{t.trigger_description}</p>
                  </div>
                  <span className={`text-xs font-semibold ${
                    t.is_active ? 'text-[var(--admin-success)]' : 'text-[var(--admin-text-muted)]'
                  }`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--admin-text-secondary)]">
                  Subject: {t.subject}
                </p>
                {t.variables && t.variables.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.variables.map((v) => (
                      <span key={v} className="rounded bg-[var(--admin-surface-raised)] px-1.5 py-0.5 text-xs text-[var(--admin-text-muted)]">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { setSelectedTemplate(t); setPreviewOpen(true); }} className="btn-admin-outline btn-admin-sm flex items-center gap-1">
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                  <button onClick={() => handleEdit(t)} className="btn-admin-outline btn-admin-sm flex items-center gap-1">
                    <Edit2 className="h-3 w-3" /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Preview Modal */}
      {previewOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPreviewOpen(false)}>
          <div className="admin-card w-full max-w-2xl max-h-[80vh] overflow-auto p-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-6 py-4">
              <h2 className="text-lg font-semibold">Preview: {selectedTemplate.name}</h2>
              <button onClick={() => setPreviewOpen(false)} className="p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-2 text-sm text-[var(--admin-text-muted)]">Subject: {selectedTemplate.subject}</p>
              <div className="rounded-lg border border-[var(--admin-border)] bg-white p-4 text-black" dangerouslySetInnerHTML={{ __html: selectedTemplate.body_html }} />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditOpen(false)}>
          <div className="admin-card w-full max-w-2xl max-h-[80vh] overflow-auto p-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-6 py-4">
              <h2 className="text-lg font-semibold">Edit: {selectedTemplate.name}</h2>
              <button onClick={() => setEditOpen(false)} className="p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--admin-text-muted)]">Subject</label>
                <input type="text" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="admin-input w-full" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--admin-text-muted)]">Body (HTML)</label>
                <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="admin-textarea w-full" rows={12} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditOpen(false)} className="btn-admin-outline">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-admin flex items-center gap-2">
                  <Check className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
