'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Platform',
    items: [
      { href: '/admin', label: 'Overview' },
      { href: '/admin/users', label: 'Users' },
      { href: '/admin/schools', label: 'Schools' },
      { href: '/admin/referrals', label: 'Referrals' },
      { href: '/admin/xp-economy', label: 'XP Economy' },
    ],
  },
  {
    label: 'Moderation',
    items: [
      { href: '/admin/moderation', label: 'Moderation' },
      { href: '/admin/reports', label: 'Reports' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/content', label: 'Content' },
      { href: '/admin/engagement', label: 'Engagement' },
      { href: '/admin/bots', label: 'AI Bots' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/admin/ai-analytics', label: 'AI & Content' },
      { href: '/admin/ai-intelligence', label: 'AI Intelligence' },
      { href: '/admin/analytics', label: 'Analytics' },
      { href: '/admin/user-signals', label: 'User Signals' },
      { href: '/admin/data-intelligence', label: 'Data Intelligence' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/api-mgmt', label: 'API Management' },
      { href: '/admin/system', label: 'System Health' },
      { href: '/admin/notifications', label: 'Notification Center' },
      { href: '/admin/email-templates', label: 'Email Templates' },
      { href: '/admin/social-posts', label: 'Social Posts' },
      { href: '/admin/contacts', label: 'Contacts' },
      { href: '/admin/exports', label: 'Exports' },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('cfb-admin-theme');
    setDark(stored !== 'light');

    // Listen for theme changes from the header toggle
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  function isActive(href: string) {
    if (!pathname) return false;
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  // Dark-aware colors
  const sidebarBg = dark
    ? 'linear-gradient(135deg, #1e1b18 0%, #1a1714 50%, #1e1b18 100%)'
    : 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(164,137,69,0.08) 10px, rgba(164,137,69,0.08) 11px), linear-gradient(135deg, #c9a96e 0%, #b89855 30%, #c4a265 50%, #b89855 70%, #c9a96e 100%)';
  const sidebarBorder = dark ? '3px solid #3e3a34' : '3px solid #8b7340';
  const sidebarShadow = dark ? 'inset 0 2px 6px rgba(0,0,0,0.4)' : 'inset 0 2px 6px rgba(0,0,0,0.25)';
  const logoText = dark ? '#ddd8ce' : '#3b2f1e';
  const logoBorder = dark ? '2px solid rgba(62,58,52,0.7)' : '2px solid rgba(139,115,64,0.5)';
  const sectionLabel = dark ? '#c9a84c' : '#3b2f1e';
  const sectionBorder = dark ? '#504a42' : '#3b2f1e';
  const navBg = dark ? '#262320' : '#f9f6ee';
  const navActiveBg = dark ? '#2e2a24' : '#fff';
  const navText = dark ? '#ddd8ce' : '#3b2f1e';
  const navActiveText = dark ? '#c9a84c' : '#8b1a1a';
  const activeBorderLeft = dark ? '3px solid #c9a84c' : '3px solid #8b1a1a';
  const bottomBorder = dark ? '2px dashed rgba(62,58,52,0.7)' : '2px dashed rgba(139,115,64,0.5)';

  return (
    <aside
      className="sticky top-0 flex w-64 shrink-0 flex-col"
      data-sidebar
      style={{
        background: sidebarBg,
        borderRight: sidebarBorder,
        boxShadow: sidebarShadow,
      }}
    >
      {/* Logo */}
      <div style={{
        borderBottom: logoBorder,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <Image src="/logo.png" alt="CFB Social" width={32} height={32} style={{ borderRadius: '4px', objectFit: 'cover' }} />
        <span style={{
          fontFamily: 'var(--admin-serif)',
          fontSize: '1.1rem',
          fontWeight: 900,
          color: logoText,
          letterSpacing: '3px',
          textTransform: 'uppercase',
        }}>
          CFB Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="overflow-y-auto" style={{ padding: '16px 12px', scrollbarWidth: 'none' }}>
        {navSections.map((section) => (
          <div key={section.label} style={{ marginBottom: '20px' }}>
            {/* Section label */}
            <p style={{
              fontFamily: 'var(--admin-serif)',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: sectionLabel,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              textAlign: 'center',
              marginBottom: '14px',
              paddingBottom: '6px',
              borderBottom: `2px solid ${sectionBorder}`,
              position: 'relative',
            }}>
              {section.label}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '7px 12px',
                      borderRadius: '4px',
                      fontFamily: 'var(--admin-sans)',
                      fontSize: '0.82rem',
                      color: active ? navActiveText : navText,
                      textDecoration: 'none',
                      background: active ? navActiveBg : 'transparent',
                      borderLeft: active ? activeBorderLeft : '3px solid transparent',
                      fontWeight: active ? 600 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span style={{
                        display: 'flex',
                        height: '18px',
                        minWidth: '18px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        background: '#8b1a1a',
                        padding: '0 5px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#fff',
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: bottomBorder, padding: '12px' }}>
        <Link
          href="/admin/settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '7px 12px',
            borderRadius: '4px',
            fontFamily: 'var(--admin-sans)',
            fontSize: '0.82rem',
            color: isActive('/admin/settings') ? navActiveText : navText,
            textDecoration: 'none',
            background: isActive('/admin/settings') ? navActiveBg : 'transparent',
            borderLeft: isActive('/admin/settings') ? activeBorderLeft : '3px solid transparent',
            fontWeight: isActive('/admin/settings') ? 600 : 400,
            transition: 'all 0.15s',
          }}
        >
          Settings
        </Link>
      </div>
    </aside>
  );
}
