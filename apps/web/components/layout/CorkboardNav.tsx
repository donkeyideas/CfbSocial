'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

const navItems: { href: string; label: string; badgeKey?: 'notifications' | 'rivalry' }[] = [
  { href: '/feed', label: 'The Feed' },
  { href: '/war-room', label: 'War Room' },
  { href: '/rivalry', label: 'Rivalry Ring', badgeKey: 'rivalry' },
  { href: '/mascot-wars', label: 'Mascot Wars' },
  { href: '/dynasty', label: 'Dynasty Mode' },
  { href: '/coaches-call', label: "Coach's Call" },
  { href: '/hall-of-fame', label: 'Hall of Fame' },
  { href: '/portal', label: 'Portal Wire' },
  { href: '/notifications', label: 'Notifications', badgeKey: 'notifications' },
  { href: '/predictions', label: 'Predictions' },
  { href: '/recruiting', label: 'Recruiting Desk' },
  { href: '/vault', label: 'The Vault' },
  { href: '/receipts', label: 'My Receipts' },
];

interface CorkboardNavProps {
  onNavigate?: () => void;
}

export function CorkboardNav({ onNavigate }: CorkboardNavProps) {
  const pathname = usePathname();
  const { userId } = useAuth();
  const [badges, setBadges] = useState<{ notifications: number; rivalry: number }>({
    notifications: 0,
    rivalry: 0,
  });

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    Promise.all([
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false),
      supabase
        .from('challenges')
        .select('*', { count: 'exact', head: true })
        .eq('challenged_id', userId)
        .eq('status', 'PENDING'),
    ]).then(([notifResult, rivalryResult]) => {
      setBadges({
        notifications: notifResult.count ?? 0,
        rivalry: rivalryResult.count ?? 0,
      });
    });
  }, [userId]);

  return (
    <div>
      <div className="bulletin-title">The Bulletin Board</div>
      <div className="corkboard">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href) ?? false;
          const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`nav-pin ${isActive ? 'active' : ''}`}
            >
              <span className="nav-label">{item.label}</span>
              {badgeCount > 0 && (
                <span className="nav-badge">{badgeCount > 99 ? '99+' : badgeCount}</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Legal links */}
      <div style={{
        marginTop: 16,
        paddingTop: 12,
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px 12px',
      }}>
        {[
          { href: '/privacy', label: 'Privacy' },
          { href: '/terms', label: 'Terms' },
          { href: '/contact', label: 'Contact' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.65rem',
              color: 'var(--faded-ink)',
              textDecoration: 'none',
              letterSpacing: '0.3px',
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
