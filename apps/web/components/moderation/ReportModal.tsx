'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { TurnstileWidget } from '@/components/turnstile/TurnstileWidget';

const reportReasons = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'HATE_SPEECH', label: 'Hate Speech' },
  { value: 'OFF_TOPIC', label: 'Off Topic' },
  { value: 'POLITICS', label: 'Politics' },
  { value: 'MISINFORMATION', label: 'Misinformation' },
  { value: 'OTHER', label: 'Other' },
];

interface ReportModalProps {
  postId: string;
  onClose: () => void;
}

export function ReportModal({ postId, onClose }: ReportModalProps) {
  const { profile } = useAuth();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleSubmit() {
    if (!reason) return;
    setSubmitting(true);
    setError('');

    try {
      if (!profile?.id) throw new Error('Not authenticated');

      // Verify Turnstile if enabled
      if (turnstileEnabled) {
        if (!turnstileToken) {
          setError('Please complete the CAPTCHA challenge.');
          setSubmitting(false);
          return;
        }
        const verifyRes = await fetch('/api/turnstile/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: turnstileToken }),
        });
        const verifyJson = (await verifyRes.json()) as { success: boolean };
        if (!verifyJson.success) {
          setError('CAPTCHA verification failed. Please try again.');
          setSubmitting(false);
          return;
        }
      }

      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          reason,
          description: description || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError('You have already reported this post.');
        } else {
          setError(data.error || 'Failed to submit report.');
        }
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Failed to submit report. Please try again.');
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={onClose}
        />
        <div
          className="gridiron-card"
          style={{
            position: 'relative',
            padding: 24,
            maxWidth: 400,
            width: '90%',
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>
            Report Filed
          </div>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Thank you. Our moderation team will review this report.
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '8px 24px',
              background: 'var(--ink)',
              color: 'var(--cream)',
              border: 'none',
              borderRadius: 2,
              fontFamily: 'var(--sans)',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
        }}
        onClick={onClose}
      />
      <div
        className="gridiron-card"
        style={{
          position: 'relative',
          padding: 24,
          maxWidth: 420,
          width: '90%',
        }}
      >
        <div style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--crimson)',
          marginBottom: 4,
        }}>
          Flag on the Play
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>
          Report This Post
        </div>

        {/* Reason selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {reportReasons.map((r) => (
            <label
              key={r.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                background: reason === r.value ? 'var(--surface)' : 'transparent',
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
                fontSize: '0.85rem',
              }}
            >
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={(e) => setReason(e.target.value)}
              />
              {r.label}
            </label>
          ))}
        </div>

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional details (optional)"
          maxLength={500}
          style={{
            width: '100%',
            padding: '8px 10px',
            fontFamily: 'var(--sans)',
            fontSize: '0.85rem',
            background: 'var(--warm-white, #faf8f0)',
            border: '1px solid var(--border)',
            borderRadius: 2,
            minHeight: 60,
            resize: 'vertical',
            color: 'var(--ink)',
            marginBottom: 12,
          }}
        />

        {turnstileEnabled && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <TurnstileWidget
              onVerify={(t) => setTurnstileToken(t)}
              onExpire={() => setTurnstileToken(null)}
            />
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--crimson)', fontSize: '0.8rem', fontFamily: 'var(--sans)', marginBottom: 8 }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            style={{
              flex: 1,
              padding: '8px 16px',
              background: reason ? 'var(--crimson)' : 'var(--text-muted)',
              color: 'var(--cream)',
              border: 'none',
              borderRadius: 2,
              fontFamily: 'var(--sans)',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: reason ? 'pointer' : 'not-allowed',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: 2,
              fontFamily: 'var(--sans)',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
