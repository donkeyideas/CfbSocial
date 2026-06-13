'use client';

import { useState } from 'react';
import Image from 'next/image';

export interface IssuePage { postId: string; coverUrl: string; title: string }

interface Props {
  initial: {
    issueId: string | null;
    title: string;
    coverHeadline?: string | null;
    coverSubtitle?: string | null;
    coverPostId?: string | null;
    pages?: IssuePage[];
  } | null;
  allIssues?: { id: string; issueNumber: number; title: string }[];
  onClose: () => void;
  onSaved: () => void;
}

/** Issue settings — masthead, cover text, and pick the cover image from the issue's pages. */
export function IssueManager({ initial, allIssues, onClose, onSaved }: Props) {
  const pages = initial?.pages ?? [];
  const [title, setTitle] = useState(initial?.title ?? '');
  const [coverHeadline, setCoverHeadline] = useState(initial?.coverHeadline ?? '');
  const [coverSubtitle, setCoverSubtitle] = useState(initial?.coverSubtitle ?? '');
  const [coverPostId, setCoverPostId] = useState<string | null>(initial?.coverPostId ?? (pages[0]?.postId ?? null));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function del(id: string) {
    if (deleting) return;
    if (!window.confirm('Delete this issue? This cannot be undone.')) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch('/api/game-room/delete-issue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ issueId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the issue.');
      setDeleting(false);
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/game-room/save-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueId: initial?.issueId ?? null,
          title: title.trim(),
          coverHeadline: coverHeadline.trim() || null,
          coverSubtitle: coverSubtitle.trim() || null,
          ...(pages.length > 0 ? { coverPostId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the issue.');
      setSaving(false);
    }
  }

  return (
    <div className="gr-modal-backdrop" onClick={onClose}>
      <div className="gr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gr-modal-head">
          <span className="gr-modal-title">{initial?.issueId ? 'Issue Settings' : 'New Issue'}</span>
          <button className="gr-modal-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="gr-modal-body">
          <div className="gr-edit-hint">Name your magazine and write the cover story text. Add pages by assigning moments to this issue from the <strong>Moments</strong> tab (Edit → Issue).</div>
          <label className="gr-field gr-field-full"><span>Magazine title (masthead)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Game Room Weekly — leave blank for default" />
          </label>
          <label className="gr-field gr-field-full"><span>Cover headline</span>
            <input value={coverHeadline} onChange={(e) => setCoverHeadline(e.target.value)} placeholder="Defaults to the cover moment's title" />
          </label>
          <label className="gr-field gr-field-full"><span>Cover subtitle (optional)</span>
            <input value={coverSubtitle} onChange={(e) => setCoverSubtitle(e.target.value)} placeholder="A line under the headline" />
          </label>

          {pages.length > 0 && (
            <div className="gr-im-assign">
              <div className="gr-im-assign-h">Cover image — click a page to use it</div>
              <div className="gr-cover-gallery">
                {pages.map((p) => (
                  <button
                    key={p.postId}
                    className={`gr-cover-pick ${coverPostId === p.postId ? 'on' : ''}`}
                    onClick={() => setCoverPostId(p.postId)}
                    title={p.title}
                  >
                    <Image src={p.coverUrl} alt={p.title} width={120} height={72} className="gr-cover-pick-img" sizes="120px" />
                    {coverPostId === p.postId && <span className="gr-cover-pick-badge">Cover</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allIssues && allIssues.length > 0 && (
            <div className="gr-im-assign">
              <div className="gr-im-assign-h">Your issues — delete junk/test issues here</div>
              <div className="gr-issue-list">
                {allIssues.map((iss) => (
                  <div className="gr-issue-row" key={iss.id}>
                    <span className="gr-issue-row-name">{iss.title} · No. {iss.issueNumber}{iss.id === initial?.issueId ? ' (editing)' : ''}</span>
                    <button className="gr-issue-del" onClick={() => del(iss.id)} disabled={deleting}>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="gr-error">{error}</div>}
        </div>
        <div className="gr-modal-foot">
          <button className="gr-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="gr-btn-primary" disabled={saving} onClick={save} style={{ opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Saving…' : initial?.issueId ? 'Save Settings' : 'Create Issue'}
          </button>
        </div>
      </div>
    </div>
  );
}
