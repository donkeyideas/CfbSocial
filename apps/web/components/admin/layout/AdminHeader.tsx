'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Sun, Moon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function AdminHeader() {
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAdminEmail(user.email ?? null);
    });

    const stored = localStorage.getItem('cfb-admin-theme');
    const isDark = stored !== 'light';
    setDark(isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cfb-admin-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cfb-admin-theme', 'light');
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );

  // Dark-aware colors
  const headerBg = dark ? '#1e1b18' : '#f9f6ee';
  const headerBgImage = dark
    ? 'none'
    : 'linear-gradient(180deg, rgba(212,197,160,0.15) 0%, transparent 100%), repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(59,47,30,0.02) 1px, rgba(59,47,30,0.02) 2px)';
  const borderColor = dark ? '#3e3a34' : '#8b1a1a';
  const titleColor = dark ? '#c9a84c' : '#8b1a1a';
  const subtitleColor = dark ? '#8a8070' : '#9a8c7a';
  const dateColor = dark ? '#a09888' : '#6b5d4d';
  const editionColor = dark ? '#6a6050' : '#9a8c7a';
  const btnBorder = dark ? '#c9a84c' : '#8b1a1a';
  const btnColor = dark ? '#c9a84c' : '#8b1a1a';
  const emailColor = dark ? '#a09888' : '#6b5d4d';

  return (
    <>
      {/* Crimson stripe bar */}
      <div style={{
        height: '6px',
        background: '#8b1a1a',
        backgroundImage: 'repeating-linear-gradient(90deg, #8b1a1a 0px, #8b1a1a 20px, #a02020 20px, #a02020 21px)',
      }} />

      {/* Masthead */}
      <header style={{
        background: headerBg,
        backgroundImage: headerBgImage,
        borderBottom: `3px double ${borderColor}`,
        padding: '14px 24px',
        position: 'relative',
      }}>
        {/* Center: Title — absolutely positioned for true centering */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <h1 style={{
            fontFamily: 'var(--admin-serif)',
            fontSize: '2rem',
            fontWeight: 900,
            color: titleColor,
            letterSpacing: '8px',
            textTransform: 'uppercase',
            lineHeight: 1,
            margin: 0,
            whiteSpace: 'nowrap',
          }}>
            The Press Box
          </h1>
          <p style={{
            fontFamily: 'var(--admin-sans)',
            fontSize: '0.72rem',
            color: subtitleColor,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginTop: '4px',
          }}>
            CFB Social Admin &mdash; Est. 2026
          </p>
        </div>

        {/* Left + Right in a flex row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          {/* Left: Date & Edition */}
          <div>
            <div style={{
              fontFamily: 'var(--admin-mono)',
              fontSize: '0.72rem',
              color: dateColor,
              letterSpacing: '1px',
            }}>
              {dateStr}
            </div>
            <div style={{
              fontFamily: 'var(--admin-serif)',
              fontSize: '0.7rem',
              fontStyle: 'italic',
              color: editionColor,
            }}>
              Vol. I &middot; No. {dayOfYear}
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={toggleTheme}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={dark ? 'Light mode' : 'Dark mode'}
              style={{
                background: 'none',
                border: `1.5px solid ${btnBorder}`,
                color: btnColor,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {adminEmail && (
              <span style={{
                fontFamily: 'var(--admin-mono)',
                fontSize: '0.68rem',
                color: emailColor,
              }}>
                {adminEmail}
              </span>
            )}

            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              style={{
                background: 'none',
                border: `1.5px solid ${btnBorder}`,
                color: btnColor,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Ticker */}
      <div style={{
        background: dark ? '#141210' : '#3b2f1e',
        backgroundImage: dark
          ? 'none'
          : 'linear-gradient(90deg, #3b2f1e 0%, #2a1f14 50%, #3b2f1e 100%), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 5px)',
        borderBottom: `2px solid ${dark ? '#3e3a34' : '#8b1a1a'}`,
        padding: '6px 0',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <AdminTicker />
      </div>
    </>
  );
}

function AdminTicker() {
  const [stats, setStats] = useState<{users: number; posts: number; reports: number; flagged: number} | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const [usersRes, postsRes, reportsRes, flaggedRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
          supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
          supabase.from('posts').select('id', { count: 'exact', head: true }).not('flagged_at', 'is', null).is('removed_at', null),
        ]);
        setStats({
          users: usersRes.count ?? 0,
          posts: postsRes.count ?? 0,
          reports: reportsRes.count ?? 0,
          flagged: flaggedRes.count ?? 0,
        });
      } catch {
        // silent fail
      }
    }
    load();
  }, []);

  const items = stats ? [
    `USERS: ${stats.users}`,
    `PUBLISHED: ${stats.posts}`,
    `PENDING REPORTS: ${stats.reports}`,
    `FLAGGED: ${stats.flagged}`,
  ] : ['Loading stats...'];

  // Duplicate for seamless scroll
  const tickerContent = [...items, ...items, ...items];

  return (
    <div style={{
      display: 'flex',
      animation: 'admin-ticker-scroll 30s linear infinite',
      whiteSpace: 'nowrap',
    }}>
      {tickerContent.map((item, i) => (
        <span key={i} style={{
          fontFamily: 'var(--admin-mono)',
          fontSize: '0.72rem',
          color: '#d4c5a0',
          padding: '0 28px',
          letterSpacing: '0.5px',
        }}>
          {item}
          <span style={{ color: '#c9a84c', margin: '0 16px' }}>&bull;</span>
        </span>
      ))}
    </div>
  );
}
