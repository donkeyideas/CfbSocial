'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
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

  const otherProfiles = profiles.filter((p) => p.id !== profile?.id);

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
              <div className="masthead-date">{dateStr}</div>
              <div className="masthead-edition">
                Vol. I &middot; No. {dayOfYear}
              </div>
            </div>
          </div>

          {/* Center: Brand */}
          <div className="masthead-brand">
            <Link href="/feed">
              <h1 className="masthead-title">CFB SOCIAL</h1>
            </Link>
            <div className="masthead-subtitle">
              College Football&apos;s Social Home &mdash; Est. 2026
            </div>
          </div>

          {/* Right: Actions */}
          <div className="masthead-actions">
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
                        <img src={profile.avatar_url} alt={username} className="masthead-profile-img" />
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
                              <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
