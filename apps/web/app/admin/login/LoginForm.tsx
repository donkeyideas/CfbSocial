'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Shield } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError('Authentication failed.');
      setLoading(false);
      return;
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profile?.role !== 'ADMIN') {
      await supabase.auth.signOut();
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Shield className="h-12 w-12 text-[var(--admin-accent)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--admin-text)]">
            CFB Social Admin
          </h1>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
            Sign in with your admin credentials
          </p>
        </div>

        <div className="admin-card p-6">
          {error && (
            <div className="mb-4 rounded-md bg-[var(--admin-error)]/10 p-3 text-sm text-[var(--admin-error)]">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-[var(--admin-text-secondary)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="admin-input w-full"
                placeholder="admin@cfbsocial.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--admin-text-secondary)]">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="admin-input w-full"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-admin w-full py-3"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
