'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { createSave } from '@cfb-social/api';

interface Props { onClose: () => void; onCreated: () => void }

export function SaveComposer({ onClose, onCreated }: Props) {
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [year, setYear] = useState('1');
  const [season, setSeason] = useState('');
  const [record, setRecord] = useState('');
  const [isTeamBuilder, setIsTeamBuilder] = useState(false);
  const [teamBuilderName, setTeamBuilderName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const supabase = createClient();
      await createSave(supabase, {
        name: name.trim(),
        schoolId: isTeamBuilder ? null : (profile?.school_id ?? null),
        isTeamBuilder,
        teamBuilderName: isTeamBuilder ? (teamBuilderName.trim() || name.trim()) : null,
        currentYear: parseInt(year, 10) || 1,
        currentSeasonLabel: season.trim() || null,
        record: record.trim() || null,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the save.');
      setSubmitting(false);
    }
  }

  return (
    <div className="gr-modal-backdrop" onClick={onClose}>
      <div className="gr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gr-modal-head">
          <span className="gr-modal-title">Start a Dynasty Save</span>
          <button className="gr-modal-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="gr-modal-body">
          <label className="gr-field gr-field-full"><span>Save name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. LSU Rebuild" />
          </label>
          <div className="gr-field-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <label className="gr-field"><span>Year</span><input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" /></label>
            <label className="gr-field"><span>Season</span><input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2026" /></label>
            <label className="gr-field"><span>Record</span><input value={record} onChange={(e) => setRecord(e.target.value)} placeholder="12-2" /></label>
          </div>
          <label className="gr-toggle">
            <input type="checkbox" checked={isTeamBuilder} onChange={(e) => setIsTeamBuilder(e.target.checked)} />
            <span>Team Builder (custom team)</span>
          </label>
          {isTeamBuilder && (
            <label className="gr-field gr-field-full"><span>Team name</span>
              <input value={teamBuilderName} onChange={(e) => setTeamBuilderName(e.target.value)} placeholder="e.g. Horizon Hawks" />
            </label>
          )}
          {error && <div className="gr-error">{error}</div>}
        </div>
        <div className="gr-modal-foot">
          <button className="gr-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="gr-btn-primary" disabled={!name.trim() || submitting} onClick={submit} style={{ opacity: !name.trim() || submitting ? 0.5 : 1 }}>
            {submitting ? 'Creating…' : 'Create Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
