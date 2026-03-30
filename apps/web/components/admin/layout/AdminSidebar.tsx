'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Shield,
  Users,
  FileText,
  TrendingUp,
  GraduationCap,
  Flag,
  Server,
  Download,
  Settings,
  Brain,
  Sparkles,
  BarChart3,
  Lightbulb,
  Plug,
  Bell,
  Mail,
  Share2,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
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
      { href: '/admin', label: 'Overview', icon: LayoutDashboard },
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/schools', label: 'Schools', icon: GraduationCap },
    ],
  },
  {
    label: 'Moderation',
    items: [
      { href: '/admin/moderation', label: 'Moderation', icon: Shield },
      { href: '/admin/reports', label: 'Reports', icon: Flag },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/content', label: 'Content', icon: FileText },
      { href: '/admin/engagement', label: 'Engagement', icon: TrendingUp },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/admin/ai-analytics', label: 'AI & Content', icon: Brain },
      { href: '/admin/ai-intelligence', label: 'AI Intelligence', icon: Sparkles },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/admin/data-intelligence', label: 'Data Intelligence', icon: Lightbulb },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/api-mgmt', label: 'API Management', icon: Plug },
      { href: '/admin/system', label: 'System Health', icon: Server },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell },
      { href: '/admin/email-templates', label: 'Email Templates', icon: Mail },
      { href: '/admin/social-posts', label: 'Social Posts', icon: Share2 },
      { href: '/admin/contacts', label: 'Contacts', icon: MessageSquare },
      { href: '/admin/exports', label: 'Exports', icon: Download },
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
  const navShadow = dark ? '1px 2px 4px rgba(0,0,0,0.3)' : '1px 2px 4px rgba(0,0,0,0.15)';
  const navActiveShadow = dark ? '2px 3px 6px rgba(0,0,0,0.4)' : '2px 3px 6px rgba(0,0,0,0.2)';
  const activeBorderLeft = dark ? '3px solid #c9a84c' : '3px solid #8b1a1a';
  const bottomBorder = dark ? '2px dashed rgba(62,58,52,0.7)' : '2px dashed rgba(139,115,64,0.5)';

  return (
    <aside
      className="sticky top-0 flex h-screen w-64 shrink-0 flex-col"
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="CFB Social" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
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
      <nav className="flex-1 overflow-y-auto" style={{ padding: '16px 12px', scrollbarWidth: 'none' }}>
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
            {/* Nav pins */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {section.items.map((item, idx) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const rotation = idx % 3 === 0 ? -0.5 : idx % 3 === 1 ? 0.3 : -0.8;
                const pinColors = ['#8b1a1a', '#2a5a9e', '#2a7a2a', '#b8952a', '#8b1a1a'];
                const pinColor = pinColors[idx % pinColors.length];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      background: active ? navActiveBg : navBg,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      fontFamily: 'var(--admin-sans)',
                      fontSize: '0.82rem',
                      color: active ? navActiveText : navText,
                      textDecoration: 'none',
                      position: 'relative',
                      boxShadow: active ? navActiveShadow : navShadow,
                      transform: active ? 'rotate(0deg)' : `rotate(${rotation}deg)`,
                      borderLeft: active ? activeBorderLeft : 'none',
                      fontWeight: active ? 600 : 400,
                      transition: 'all 0.15s',
                      marginTop: idx === 0 ? '6px' : '0',
                    }}
                  >
                    {/* Pushpin dot */}
                    <span style={{
                      position: 'absolute',
                      top: '-5px',
                      left: idx % 2 === 0 ? '12px' : 'auto',
                      right: idx % 2 === 1 ? '14px' : 'auto',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: `radial-gradient(circle at 35% 35%, color-mix(in srgb, ${pinColor} 60%, #fff), ${pinColor})`,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    }} />
                    <Icon className="h-4 w-4 shrink-0" />
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
            background: isActive('/admin/settings') ? navActiveBg : navBg,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            fontFamily: 'var(--admin-sans)',
            fontSize: '0.82rem',
            color: isActive('/admin/settings') ? navActiveText : navText,
            textDecoration: 'none',
            position: 'relative',
            boxShadow: navShadow,
            transform: 'rotate(-0.3deg)',
            borderLeft: isActive('/admin/settings') ? activeBorderLeft : 'none',
            fontWeight: isActive('/admin/settings') ? 600 : 400,
            transition: 'all 0.15s',
          }}
        >
          <span style={{
            position: 'absolute',
            top: '-5px',
            left: '12px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, color-mix(in srgb, #8b1a1a 60%, #fff), #8b1a1a)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }} />
          <Settings className="h-4 w-4 shrink-0" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
