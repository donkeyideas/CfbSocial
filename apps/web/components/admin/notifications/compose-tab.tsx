'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/admin/shared/confirm-dialog';

interface School {
  id: string;
  name: string;
  conference: string | null;
}

interface Props {
  schools: School[];
  conferences: string[];
}

export function ComposeTab({ schools, conferences }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'school' | 'conference'>('all');
  const [targetId, setTargetId] = useState('');
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<{ success: boolean; sent?: number; failed?: number; error?: string } | null>(null);

  async function handleSend() {
    setShowConfirm(false);
    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          targetAudience: audience,
          targetId: audience !== 'all' ? targetId : null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, sent: data.sent, failed: data.failed });
        setTitle('');
        setBody('');
        setAudience('all');
        setTargetId('');
      } else {
        setResult({ success: false, error: data.error });
      }
    } catch {
      setResult({ success: false, error: 'Network error' });
    } finally {
      setSending(false);
    }
  }

  const canSend = title.trim() && body.trim() && !sending && (audience === 'all' || targetId);

  return (
    <div className="compose-tab">
      <div className="compose-form">
        <div className="compose-field">
          <label className="admin-label">Title</label>
          <input
            type="text"
            className="admin-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            maxLength={100}
          />
        </div>

        <div className="compose-field">
          <label className="admin-label">Body</label>
          <textarea
            className="admin-input compose-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notification message"
            maxLength={500}
            rows={4}
          />
          <span className="compose-char-count">{body.length}/500</span>
        </div>

        <div className="compose-field">
          <label className="admin-label">Target Audience</label>
          <div className="compose-audience-options">
            <label className="compose-radio">
              <input
                type="radio"
                name="audience"
                checked={audience === 'all'}
                onChange={() => { setAudience('all'); setTargetId(''); }}
              />
              <span>All Users</span>
            </label>
            <label className="compose-radio">
              <input
                type="radio"
                name="audience"
                checked={audience === 'school'}
                onChange={() => setAudience('school')}
              />
              <span>Specific School</span>
            </label>
            <label className="compose-radio">
              <input
                type="radio"
                name="audience"
                checked={audience === 'conference'}
                onChange={() => setAudience('conference')}
              />
              <span>Conference</span>
            </label>
          </div>
        </div>

        {audience === 'school' && (
          <div className="compose-field">
            <label className="admin-label">Select School</label>
            <select
              className="admin-input"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              <option value="">Choose a school...</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.conference ? `(${s.conference})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {audience === 'conference' && (
          <div className="compose-field">
            <label className="admin-label">Select Conference</label>
            <select
              className="admin-input"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              <option value="">Choose a conference...</option>
              {conferences.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Preview */}
        {title && body && (
          <div className="compose-preview">
            <div className="compose-preview-label">Preview</div>
            <div className="compose-preview-card">
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          </div>
        )}

        <button
          className="btn-admin compose-send-btn"
          disabled={!canSend}
          onClick={() => setShowConfirm(true)}
          style={{ opacity: canSend ? 1 : 0.5 }}
        >
          {sending ? 'Sending...' : 'Send Notification'}
        </button>

        {result && (
          <div className={`compose-result ${result.success ? 'compose-result-success' : 'compose-result-error'}`}>
            {result.success
              ? `Notification sent. Delivered: ${result.sent}, Failed: ${result.failed}`
              : `Failed: ${result.error}`
            }
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmDialog
          title="Send System Notification"
          message={`Send "${title}" to ${audience === 'all' ? 'all users' : audience === 'school' ? 'a school' : 'a conference'}? This action cannot be undone.`}
          confirmLabel="Send"
          onConfirm={handleSend}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
