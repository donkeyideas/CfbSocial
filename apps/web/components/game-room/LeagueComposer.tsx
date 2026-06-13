'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createLeague } from '@cfb-social/api';

interface Props { onClose: () => void; onCreated: () => void }

const TAG_OPTIONS = ['POWER_4', 'G5_ONLY', 'CASUAL', 'COMPETITIVE'];
const TAG_LABELS: Record<string, string> = {
  POWER_4: 'Power 4', G5_ONLY: 'G5 Only', CASUAL: 'Casual', COMPETITIVE: 'Competitive',
};

export function LeagueComposer({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [platform, setPlatform] = useState('PS5');
  const [maxUsers, setMaxUsers] = useState('32');
  const [crossPlay, setCrossPlay] = useState(true);
  const [style, setStyle] = useState('COMPETITIVE');
  const [simSchedule, setSimSchedule] = useState('');
  const [openSchools, setOpenSchools] = useState('');
  const [rules, setRules] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (t: string) => setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  async function submit() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const supabase = createClient();
      await createLeague(supabase, {
        name: name.trim(),
        platform,
        maxUsers: parseInt(maxUsers, 10) || 32,
        simSchedule: simSchedule.trim() || null,
        style,
        rules: rules.trim() || null,
        tags,
        openSchools: openSchools.trim() || null,
        joinCode: joinCode.trim() || null,
        joinPassword: joinPassword.trim() || null,
        isPrivate,
        crossPlay,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not list the league.');
      setSubmitting(false);
    }
  }

  return (
    <div className="gr-modal-backdrop" onClick={onClose}>
      <div className="gr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gr-modal-head">
          <span className="gr-modal-title">List Your League</span>
          <button className="gr-modal-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="gr-modal-body">
          <label className="gr-field gr-field-full"><span>League name (shown in the directory)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SEC After Dark" />
          </label>

          <div className="gr-im-assign">
            <div className="gr-im-assign-h">In-game join info (from your CFB Online Commissioner Settings)</div>
            <div className="gr-field-grid gr-assign-grid">
              <label className="gr-field"><span>League Name (join code)</span>
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g. JT112387" />
              </label>
              <label className="gr-field"><span>Visibility</span>
                <select value={isPrivate ? 'private' : 'public'} onChange={(e) => setIsPrivate(e.target.value === 'private')}>
                  <option value="public">Public — show password</option>
                  <option value="private">Private — request to join</option>
                </select>
              </label>
            </div>
            <label className="gr-field gr-field-full"><span>League Password</span>
              <input value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} placeholder="e.g. 35SVN9WRPN2MPN15NMY" />
            </label>
            {isPrivate && <div className="gr-edit-hint">Private: the password stays hidden in the directory — coaches request to join and you share it.</div>}
          </div>

          <div className="gr-field-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <label className="gr-field"><span>Platform</span>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)}><option>PS5</option><option>Xbox</option><option>PC</option></select>
            </label>
            <label className="gr-field"><span>Max users</span><input value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} inputMode="numeric" /></label>
            <label className="gr-field"><span>Cross-play</span>
              <select value={crossPlay ? 'on' : 'off'} onChange={(e) => setCrossPlay(e.target.value === 'on')}><option value="on">On</option><option value="off">Off</option></select>
            </label>
          </div>

          <div className="gr-field-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <label className="gr-field"><span>Style</span>
              <select value={style} onChange={(e) => setStyle(e.target.value)}><option value="COMPETITIVE">Competitive</option><option value="CASUAL">Casual</option></select>
            </label>
            <label className="gr-field"><span>Sim schedule</span>
              <input value={simSchedule} onChange={(e) => setSimSchedule(e.target.value)} placeholder="e.g. Tue / Fri, 9pm ET" />
            </label>
          </div>

          <label className="gr-field gr-field-full"><span>Open schools</span>
            <input value={openSchools} onChange={(e) => setOpenSchools(e.target.value)} placeholder="e.g. Vandy, Miss St, Arkansas" />
          </label>
          <label className="gr-field gr-field-full"><span>Rules / notes</span>
            <textarea value={rules} onChange={(e) => setRules(e.target.value)} rows={2} placeholder="House rules, advance policy…" />
          </label>
          <div style={{ marginTop: 12 }}>
            <div className="gr-tag-row">
              {TAG_OPTIONS.map((t) => (
                <button key={t} className={`gr-tag-chip ${tags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>{TAG_LABELS[t]}</button>
              ))}
            </div>
          </div>
          {error && <div className="gr-error">{error}</div>}
        </div>
        <div className="gr-modal-foot">
          <button className="gr-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="gr-btn-primary" disabled={!name.trim() || submitting} onClick={submit} style={{ opacity: !name.trim() || submitting ? 0.5 : 1 }}>
            {submitting ? 'Listing…' : 'List League'}
          </button>
        </div>
      </div>
    </div>
  );
}
