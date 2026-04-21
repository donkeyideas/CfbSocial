'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { checkPasswordBreaches } from '@/lib/providers/hibp';
import { TurnstileWidget } from '@/components/turnstile/TurnstileWidget';
import type { SchoolRow } from '@cfb-social/types';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breachCount, setBreachCount] = useState<number | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const turnstileEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Pre-fill referral code from URL query param
  useEffect(() => {
    const ref = searchParams?.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase().slice(0, 20));
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchSchools() {
      const supabase = createClient();
      const { data } = await supabase
        .from('schools')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (data) setSchools(data);
    }
    fetchSchools();
  }, []);

  async function handlePasswordBlur() {
    if (password.length < 8) {
      setBreachCount(null);
      return;
    }
    const count = await checkPasswordBreaches(password);
    setBreachCount(count);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Safety check: block if password known to be breached
    if (breachCount && breachCount > 0) {
      setError('This password has appeared in known data breaches. Please choose a different one.');
      setLoading(false);
      return;
    }

    // Verify Turnstile if enabled
    if (turnstileEnabled) {
      if (!turnstileToken) {
        setError('Please complete the CAPTCHA challenge.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/turnstile/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: turnstileToken }),
        });
        const json = (await res.json()) as { success: boolean };
        if (!json.success) {
          setError('CAPTCHA verification failed. Please try again.');
          setLoading(false);
          return;
        }
      } catch {
        setError('CAPTCHA verification failed. Please try again.');
        setLoading(false);
        return;
      }
    }

    const supabase = createClient();

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          school_id: schoolId,
          referral_code: referralCode || undefined,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      // Ensure school_id is set on profile (trigger may not handle it)
      if (schoolId) {
        fetch('/api/auth/post-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authData.user.id, schoolId }),
        }).catch(() => {});
      }

      // Fire-and-forget welcome email (no-op when RESEND_API_KEY is unset)
      fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, username }),
      }).catch(() => {});

      if (authData.session) {
        // Email confirmation disabled — go straight to feed
        router.push('/feed');
        router.refresh();
      } else {
        // Email confirmation required — show confirmation screen
        setConfirmationSent(true);
        setLoading(false);
      }
    }
  }

  if (confirmationSent) {
    return (
      <div className="text-center">
        <h2 className="mb-2 font-serif text-2xl font-semibold text-ink">
          Check Your Email
        </h2>

        <div className="mx-auto mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-8">
          <div className="mb-4 font-serif text-4xl text-crimson">@</div>
          <h3 className="mb-4 font-serif text-xl font-semibold text-ink">
            Confirmation Sent
          </h3>
          <p className="mb-3 text-sm text-[var(--text-secondary)]">
            We sent a confirmation link to<br />
            <strong>{email}</strong>
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Click the link in the email to activate your account, then come back and sign in.
          </p>
        </div>

        <Link
          href="/login"
          className="btn-crimson mt-6 inline-block w-full py-3 text-center"
        >
          Go to Sign In
        </Link>

        <button
          type="button"
          className="mt-4 text-sm font-semibold text-crimson hover:underline"
          onClick={() => {
            setConfirmationSent(false);
            setError(null);
          }}
        >
          Back to Registration
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-center font-serif text-2xl font-semibold text-ink">
        Join CFB Social
      </h2>

      {error && (
        <div className="mb-4 rounded-md bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={24}
            pattern="^[a-zA-Z0-9_]+$"
            className="gridiron-input w-full"
            placeholder="your_handle"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Letters, numbers, and underscores only
          </p>
        </div>

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

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setBreachCount(null);
            }}
            onBlur={handlePasswordBlur}
            required
            minLength={8}
            className="gridiron-input w-full"
          />
          {breachCount && breachCount > 0 ? (
            <p className="mt-1 text-xs text-[var(--error)]">
              This password has appeared in {breachCount.toLocaleString()} known breaches. Please choose a different one.
            </p>
          ) : (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Minimum 8 characters
            </p>
          )}
        </div>

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

        <div>
          <label htmlFor="referralCode" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
            Referral Code (optional)
          </label>
          <input
            id="referralCode"
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase().slice(0, 20))}
            maxLength={20}
            className="gridiron-input w-full"
            placeholder="e.g. BAMA_FAN_X7K2"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Got a code from a friend? Enter it here.
          </p>
        </div>

        {turnstileEnabled && (
          <div className="mt-2 flex justify-center">
            <TurnstileWidget
              onVerify={(t) => setTurnstileToken(t)}
              onExpire={() => setTurnstileToken(null)}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-crimson w-full py-3 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      {/* Divider */}
      <div className="gridiron-ornament my-6">
        <span className="text-xs">OR</span>
      </div>

      {/* Google OAuth */}
      <button
        onClick={async () => {
          const supabase = createClient();
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback?redirect=/feed`,
            },
          });
        }}
        className="gridiron-input flex w-full items-center justify-center gap-2 py-3 font-medium transition-colors hover:bg-[var(--surface)]"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Sign up with Google
      </button>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-crimson hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
