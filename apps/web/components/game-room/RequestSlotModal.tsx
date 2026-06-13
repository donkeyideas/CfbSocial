'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { requestSlot } from '@cfb-social/api';

interface Props {
  league: { id: string; name: string; platform: string; sim_schedule: string | null; open_schools: string | null };
  onClose: () => void;
  onSent: () => void;
}

export function RequestSlotModal({ league, onClose, onSent }: Props) {
  const [preferredSchool, setPreferredSchool] = useState('');
  const [platform, setPlatform] = useState(league.platform);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const supabase = createClient();
      await requestSlot(supabase, {
        leagueId: league.id,
        preferredSchool: preferredSchool.trim() || null,
        platform,
        message: message.trim() || null,
      });
      setSent(true);
      setTimeout(onSent, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the request.');
      setSubmitting(false);
    }
  }

  return (
    <div className="gr-modal-backdrop" onClick={onClose}>
      <div className="gr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gr-modal-head">
          <span className="gr-modal-title">Request a Slot</span>
          <button className="gr-modal-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="gr-modal-body">
          {sent ? (
            <div className="gr-sent">
              <div className="gr-sent-ic">✓</div>
              <strong>Request sent</strong>
              <span>The commissioner of {league.name} will review your request.</span>
            </div>
          ) : (
            <>
              <div className="gr-req-summary">
                <strong>{league.name}</strong>
                <span>{league.platform}{league.sim_schedule ? ` · ${league.sim_schedule}` : ''}{league.open_schools ? ` · Open: ${league.open_schools}` : ''}</span>
              </div>
              <div className="gr-field-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                <label className="gr-field"><span>Preferred school</span><input value={preferredSchool} onChange={(e) => setPreferredSchool(e.target.value)} placeholder="e.g. Coastal Carolina" /></label>
                <label className="gr-field"><span>Platform</span>
                  <select value={platform} onChange={(e) => setPlatform(e.target.value)}><option>PS5</option><option>Xbox</option><option>PC</option></select>
                </label>
              </div>
              <label className="gr-field gr-field-full"><span>Message to commissioner</span>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Tell them about your dynasty experience and availability…" />
              </label>
              {error && <div className="gr-error">{error}</div>}
            </>
          )}
        </div>
        {!sent && (
          <div className="gr-modal-foot">
            <button className="gr-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="gr-btn-primary" disabled={submitting} onClick={submit} style={{ opacity: submitting ? 0.5 : 1 }}>
              {submitting ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
