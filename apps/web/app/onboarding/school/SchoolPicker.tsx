'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SchoolOption {
  id: string;
  name: string;
}

export function SchoolPicker() {
  const router = useRouter();
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      // Check if user already has a school set
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (profile?.school_id) {
        // Already has a school, skip onboarding
        router.push('/feed');
        return;
      }

      // Fetch schools for picker
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (schoolData) setSchools(schoolData);
      setChecking(false);
    }

    init();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) {
      setError('Please select a school.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/post-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save school. Please try again.');
        setLoading(false);
        return;
      }

      router.push('/feed');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="py-8 text-center text-sm text-[var(--text-muted)]">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-center font-serif text-2xl font-semibold text-ink">
        Pick Your School
      </h2>
      <p className="mb-6 text-center text-sm text-[var(--text-secondary)]">
        Choose the school you rep on the gridiron. This determines your flair and community.
      </p>

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="school" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
            Your School
          </label>
          <select
            id="school"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            required
            className="gridiron-input w-full"
          >
            <option value="">Select your school...</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !schoolId}
          className="btn-crimson w-full py-3 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
