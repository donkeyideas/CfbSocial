'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';

interface School {
  id: string;
  name: string;
}

interface CreateProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProfileModal({ open, onClose }: CreateProfileModalProps) {
  const { refreshProfiles, switchProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && schools.length === 0) {
      const supabase = createClient();
      supabase
        .from('schools')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
        .then(({ data }) => {
          if (data) setSchools(data);
        });
    }
  }, [open, schools.length]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim(),
        displayName: displayName.trim() || null,
        schoolId: schoolId || null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Failed to create profile');
      setSubmitting(false);
      return;
    }

    // Refresh profiles list and switch to the new one
    await refreshProfiles();
    switchProfile(data.profile.id);

    // Reset and close
    setUsername('');
    setDisplayName('');
    setSchoolId('');
    setSubmitting(false);
    onClose();
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-container" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">Create New Profile</h2>
          <button onClick={onClose} className="modal-close" aria-label="Close">
            X
          </button>
        </div>

        {error && (
          <div className="modal-error">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="modal-field">
            <label htmlFor="cp-username" className="modal-label">
              Username
            </label>
            <input
              id="cp-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={24}
              pattern="^[a-zA-Z0-9_]+$"
              placeholder="my_alt_account"
              className="gridiron-input w-full"
            />
            <p className="modal-hint">3-24 characters, letters/numbers/underscores</p>
          </div>

          <div className="modal-field">
            <label htmlFor="cp-display" className="modal-label">
              Display Name (optional)
            </label>
            <input
              id="cp-display"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="gridiron-input w-full"
            />
          </div>

          <div className="modal-field">
            <label htmlFor="cp-school" className="modal-label">
              School Affiliation
            </label>
            <select
              id="cp-school"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="gridiron-input w-full"
            >
              <option value="">No school selected</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting || !username.trim()}
            className="btn-crimson w-full py-3 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Profile'}
          </button>
        </form>
      </div>
    </>
  );
}
