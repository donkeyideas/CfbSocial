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
  { href: '/game-room', label: 'Game Room' },
  { href: '/dynasty', label: 'Dynasty Mode' },
  { href: '/coaches-call', label: "Coach's Call" },
  { href: '/hall-of-fame', label: 'Hall of Fame' },
  { href: '/portal', label: 'Portal Wire' },
  { href: '/notifications', label: 'Notifications', badgeKey: 'notifications' },
  { href: '/predictions', label: 'Predictions' },
  { href: '/recruiting', label: 'Recruiting Desk' },
  { href: '/vault', label: 'The Vault' },
  { href: '/schools', label: 'All Schools' },
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
          const isGameRoom = item.href === '/game-room';
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`nav-pin ${isActive ? 'active' : ''} ${isGameRoom ? 'nav-pin-game' : ''}`}
            >
              <span className="nav-label">{item.label}</span>
              {badgeCount > 0 && (
                <span className="nav-badge">{badgeCount > 99 ? '99+' : badgeCount}</span>
              )}
            </Link>
          );
        })}
      </div>

    </div>
  );
}
