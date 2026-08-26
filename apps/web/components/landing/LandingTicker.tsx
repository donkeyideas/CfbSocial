'use client';

import { useEffect, useState } from 'react';
import type { LandingTickerItem } from '@/lib/landing/data';

interface LandingTickerProps {
  initialItems: LandingTickerItem[];
}

export function LandingTicker({ initialItems }: LandingTickerProps) {
  const [items, setItems] = useState<LandingTickerItem[]>(initialItems);

  // Refresh ticker items every 90s
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/landing');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && Array.isArray(data.ticker) && data.ticker.length > 0) {
          setItems(data.ticker);
        }
      } catch {
        // Keep existing items
      }
    }, 90000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (items.length === 0) return null;

  // Duplicate the item set once so the CSS marquee loops seamlessly.
  const rendered = [...items, ...items];

  return (
    <div className="ticker">
      <div className="ticker-track">
        {rendered.map((item, i) => (
          <span className="ticker-item" key={i}>
            {item.live ? <span className="live-dot"></span> : null}
            <span className="tag">{item.tag}</span> {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
