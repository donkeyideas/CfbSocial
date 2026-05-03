'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Redirect to feed after a short delay
    setTimeout(() => {
      router.push('/feed');
      router.refresh();
    }, 2000);
  }

  if (success) {
    return (
      <div className="text-center">
        <h2 className="mb-4 font-serif text-2xl font-semibold text-ink">
          Password Updated
        </h2>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Your password has been reset successfully. Redirecting you to the feed...
        </p>
        <Link href="/feed" className="btn-crimson inline-block w-full py-3 text-center">
          Go to Feed
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-center font-serif text-2xl font-semibold text-ink">
        Set New Password
      </h2>
      <p className="mb-6 text-center text-sm text-[var(--text-secondary)]">
        Choose a new password for your account.
      </p>

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="gridiron-input w-full"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">Minimum 8 characters</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="gridiron-input w-full"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-crimson w-full py-3 disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
