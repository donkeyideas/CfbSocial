'use client';

import { useState, useRef, useEffect } from 'react';
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
  const [generating, setGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showGenMenu, setShowGenMenu] = useState(false);
  const [result, setResult] = useState<{ success: boolean; sent?: number; failed?: number; error?: string } | null>(null);
  const genMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (genMenuRef.current && !genMenuRef.current.contains(e.target as Node)) {
        setShowGenMenu(false);
      }
    }
    if (showGenMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showGenMenu]);

  async function handleGenerate(mode: 'news' | 'general') {
    setShowGenMenu(false);
    setGenerating(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/generate-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });

      const data = await res.json();
      if (res.ok && data.title && data.body) {
        setTitle(data.title);
        setBody(data.body);
      } else {
        setResult({ success: false, error: data.error || 'Generation failed' });
      }
    } catch {
      setResult({ success: false, error: 'Network error' });
    } finally {
      setGenerating(false);
    }
  }

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

  const canSend = title.trim() && body.trim() && !sending && !generating && (audience === 'all' || targetId);

  return (
    <div className="compose-tab">
      <div className="compose-form">
        {/* Generate with AI */}
        <div className="compose-field" style={{ position: 'relative' }} ref={genMenuRef}>
          <button
            className="btn-admin"
            disabled={generating}
            onClick={() => setShowGenMenu(!showGenMenu)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--admin-accent-secondary, #444)',
              opacity: generating ? 0.6 : 1,
            }}
          >
            {generating ? 'Generating...' : 'Generate with AI'}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ marginLeft: 2 }}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
          {showGenMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                background: 'var(--admin-card-bg, #fff)',
                border: '1px solid var(--admin-border, #ccc)',
                borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 10,
                minWidth: 240,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => handleGenerate('news')}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--admin-border, #eee)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: 'var(--admin-text)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--admin-hover, rgba(0,0,0,0.04))')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <strong>Latest News</strong>
                <br />
                <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)' }}>
                  Generate from trending CFB headlines
                </span>
              </button>
              <button
                onClick={() => handleGenerate('general')}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: 'var(--admin-text)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--admin-hover, rgba(0,0,0,0.04))')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <strong>General</strong>
                <br />
                <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)' }}>
                  Promote platform features and engagement
                </span>
              </button>
            </div>
          )}
        </div>

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
