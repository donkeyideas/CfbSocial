'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Menu, X } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/components/auth/AuthProvider';
import { ThemeToggle } from './ThemeToggle';
import { CreateProfileModal } from '@/components/profiles/CreateProfileModal';

interface MastheadProps {
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}

export function Masthead({ onMenuToggle, menuOpen }: MastheadProps) {
  const { isLoggedIn, profile, profiles, switchProfile } = useAuth();
  const username = profile?.username ?? null;
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [googlePlayUrl, setGooglePlayUrl] = useState('');
  const [appStoreUrl, setAppStoreUrl] = useState('');

  const otherProfiles = profiles.filter((p) => p.id !== profile?.id);

  useEffect(() => {
    fetch('/api/admin/app-links')
      .then((r) => r.json())
      .then((data) => {
        setGooglePlayUrl(data.links?.app_google_play_url || '');
        setAppStoreUrl(data.links?.app_apple_store_url || '');
      })
      .catch(() => {});
  }, []);

  const handleSwitch = useCallback((profileId: string) => {
    switchProfile(profileId);
    setAccountMenuOpen(false);
  }, [switchProfile]);

  const { dateStr, dayOfYear } = useMemo(() => {
    const today = new Date();
    return {
      dateStr: today.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).toUpperCase(),
      dayOfYear: Math.floor(
        (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
      ),
    };
  }, []);

  return (
    <>
      <div className="header-top-border" />
      <header className="masthead">
        <div className="masthead-inner">
          {/* Mobile menu button */}
          <button
            onClick={onMenuToggle}
            className="masthead-btn masthead-mobile-menu"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          {/* Left: Date & Edition */}
          <div className="masthead-left">
            <div>
              <div className="masthead-date" suppressHydrationWarning>{dateStr}</div>
              <div className="masthead-edition" suppressHydrationWarning>
                Vol. I &middot; No. {dayOfYear}
              </div>
            </div>
          </div>

          {/* Center: Brand */}
          <div className="masthead-brand">
            <Link href="/feed">
              <div className="masthead-title" role="banner">CFB SOCIAL</div>
            </Link>
            <div className="masthead-subtitle">
              College Football&apos;s Social Home &mdash; Est. 2026
            </div>
          </div>

          {/* Right: Actions */}
          <div className="masthead-actions">
            {googlePlayUrl && (
              <a href={googlePlayUrl} target="_blank" rel="noopener noreferrer" className="masthead-badge-link">
                <svg className="masthead-badge-icon" viewBox="0 0 512 512" fill="currentColor"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/></svg>
                <span>Google Play</span>
              </a>
            )}
            {appStoreUrl && (
              <a href={appStoreUrl} target="_blank" rel="noopener noreferrer" className="masthead-badge-link">
                <svg className="masthead-badge-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                <span>App Store</span>
              </a>
            )}
            <ThemeToggle />
            <button className="masthead-btn" aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
            {isLoggedIn === true ? (
              <>
                <NotificationBell />
                <div style={{ position: 'relative' }}>
                  {username ? (
                    <button
                      onClick={() => setAccountMenuOpen((prev) => !prev)}
                      className="masthead-profile"
                      style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0 }}
                    >
                      {profile?.avatar_url ? (
                        <Image src={profile.avatar_url} alt={username} width={36} height={36} className="masthead-profile-img" />
                      ) : (
                        username[0]?.toUpperCase()
                      )}
                    </button>
                  ) : (
                    <Link href="/settings" className="masthead-profile">
                      ?
                    </Link>
                  )}

                  {/* Profile switcher dropdown */}
                  {accountMenuOpen && (
                    <>
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                        onClick={() => setAccountMenuOpen(false)}
                      />
                      <div className="account-switcher-dropdown">
                        {/* Current profile */}
                        <Link
                          href={`/profile/${username}`}
                          className="account-switcher-item"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          <div className="account-switcher-avatar">
                            {profile?.avatar_url ? (
                              <Image src={profile.avatar_url} alt="" width={32} height={32} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (username?.[0] ?? '?').toUpperCase()
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="account-switcher-name">@{username}</p>
                            {profile?.display_name && (
                              <p className="account-switcher-email">{profile.display_name}</p>
                            )}
                          </div>
                          <span className="account-switcher-active">Active</span>
                        </Link>

                        <div className="account-switcher-divider" />

                        {/* Other profiles */}
                        {otherProfiles.map((p) => (
                          <button
                            key={p.id}
                            className="account-switcher-item"
                            onClick={() => handleSwitch(p.id)}
                          >
                            <div className="account-switcher-avatar">
                              {p.avatar_url ? (
                                <Image src={p.avatar_url} alt="" width={32} height={32} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                (p.username?.[0] ?? '?').toUpperCase()
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                              <p className="account-switcher-name">@{p.username}</p>
                              {p.display_name && (
                                <p className="account-switcher-email">{p.display_name}</p>
                              )}
                            </div>
                            <span className="account-switcher-switch">Switch</span>
                          </button>
                        ))}

                        <div className="account-switcher-divider" />

                        <button
                          className="account-switcher-item"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            setShowCreateModal(true);
                          }}
                        >
                          <span className="account-switcher-add">+ New Profile</span>
                        </button>

                        <Link
                          href="/settings"
                          className="account-switcher-item"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          <span className="account-switcher-add">Settings</span>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : isLoggedIn === false ? (
              <>
                <Link href="/login" className="masthead-auth-link">
                  Log In
                </Link>
                <Link href="/register" className="masthead-auth-btn">
                  Sign Up
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <CreateProfileModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
}
