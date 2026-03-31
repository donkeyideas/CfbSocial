'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface School {
  id: string;
  name: string;
  abbreviation: string;
  primary_color: string;
}

interface ClaimButtonProps {
  playerId: string;
  playerStatus: string | null;
  schools: School[];
  existingClaim?: { school_id: string; confidence: number } | null;
}

export function ClaimButton({ playerId, playerStatus, schools, existingClaim }: ClaimButtonProps) {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const [expanded, setExpanded] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [confidence, setConfidence] = useState(50);
  const [reasoning, setReasoning] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [claimed, setClaimed] = useState(!!existingClaim);

  if (playerStatus === 'COMMITTED' || playerStatus === 'WITHDRAWN') {
    return null;
  }

  if (claimed) {
    const claimedSchool = schools.find((s) => s.id === existingClaim?.school_id);
    return (
      <div
        style={{
          padding: '12px 16px',
          border: '1px dashed var(--border)',
          borderRadius: 2,
          fontFamily: 'var(--sans)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}
      >
        Claim filed{claimedSchool ? ` for ${claimedSchool.abbreviation}` : ''} at {existingClaim?.confidence ?? confidence}% confidence
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          width: '100%',
          padding: '10px 16px',
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
        Claim for Roster
      </button>
    );
  }

  async function handleSubmit() {
    if (!selectedSchool || !userId) return;
    setSubmitting(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('roster_claims')
        .insert({
          player_id: playerId,
          user_id: userId,
          school_id: selectedSchool,
          confidence,
          reasoning: reasoning || null,
        });

      if (error) throw error;
      setClaimed(true);
      setExpanded(false);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        padding: 16,
        border: '2px solid var(--gold)',
        borderRadius: 2,
        background: 'var(--surface)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          marginBottom: 12,
        }}
      >
        File Your Claim
      </div>

      {/* School selector */}
      <select
        value={selectedSchool}
        onChange={(e) => setSelectedSchool(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 10px',
          marginBottom: 10,
          fontFamily: 'var(--sans)',
          fontSize: '0.85rem',
          background: 'var(--warm-white, #faf8f0)',
          border: '1px solid var(--border)',
          borderRadius: 2,
          color: 'var(--ink)',
        }}
      >
        <option value="">Select destination school...</option>
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.abbreviation})
          </option>
        ))}
      </select>

      {/* Confidence slider */}
      <div style={{ marginBottom: 10 }}>
        <label
          style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            display: 'block',
            marginBottom: 4,
          }}
        >
          Confidence: {confidence}%
        </label>
        <input
          type="range"
          min={1}
          max={100}
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Reasoning */}
      <textarea
        value={reasoning}
        onChange={(e) => setReasoning(e.target.value)}
        placeholder="Why do you think they'll commit here? (optional)"
        maxLength={280}
        style={{
          width: '100%',
          padding: '8px 10px',
          fontFamily: 'var(--mono, monospace)',
          fontSize: '0.8rem',
          background: 'var(--warm-white, #faf8f0)',
          border: '1px solid var(--border)',
          borderRadius: 2,
          minHeight: 60,
          resize: 'vertical',
          color: 'var(--ink)',
        }}
      />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          onClick={handleSubmit}
          disabled={!selectedSchool || submitting}
          style={{
            flex: 1,
            padding: '8px 16px',
            background: selectedSchool ? 'var(--crimson)' : 'var(--text-muted)',
            color: 'var(--cream)',
            border: 'none',
            borderRadius: 2,
            fontFamily: 'var(--sans)',
            fontSize: '0.8rem',
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: selectedSchool ? 'pointer' : 'not-allowed',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'Filing...' : 'File Claim'}
        </button>
        <button
          onClick={() => setExpanded(false)}
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
  );
}
