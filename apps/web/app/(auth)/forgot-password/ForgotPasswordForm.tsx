'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?redirect=/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center">
        <h2 className="mb-2 font-serif text-2xl font-semibold text-ink">
          Check Your Email
        </h2>

        <div className="mx-auto mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-8">
          <div className="mb-4 font-serif text-4xl text-crimson">@</div>
          <h3 className="mb-4 font-serif text-xl font-semibold text-ink">
            Password Reset Link Sent
          </h3>
          <p className="mb-3 text-sm text-[var(--text-secondary)]">
            We sent a password reset link to<br />
            <strong>{email}</strong>
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Click the link in the email to set a new password.
          </p>
        </div>

        <Link
          href="/login"
          className="btn-crimson mt-6 inline-block w-full py-3 text-center"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-center font-serif text-2xl font-semibold text-ink">
        Reset Password
      </h2>
      <p className="mb-6 text-center text-sm text-[var(--text-secondary)]">
        Enter your email and we will send you a link to reset your password.
      </p>

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="gridiron-input w-full"
            placeholder="your@email.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-crimson w-full py-3 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Remember your password?{' '}
        <Link href="/login" className="font-semibold text-crimson hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
