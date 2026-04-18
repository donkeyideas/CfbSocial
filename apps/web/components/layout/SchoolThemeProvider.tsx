'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { readableSchoolColor } from '@/lib/utils/color-contrast';

/**
 * Darken a hex color by reducing its HSL lightness.
 * amount=0.25 means reduce lightness by 25% (matching mock pattern).
 */
function darkenHex(hex: string, amount = 0.25): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  l = Math.max(l * (1 - amount), 0.05);

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p2 = 2 * l - q2;
  const r2 = Math.round(hue2rgb(p2, q2, h + 1 / 3) * 255);
  const g2 = Math.round(hue2rgb(p2, q2, h) * 255);
  const b2 = Math.round(hue2rgb(p2, q2, h - 1 / 3) * 255);

  return `#${r2.toString(16).padStart(2, '0')}${g2.toString(16).padStart(2, '0')}${b2.toString(16).padStart(2, '0')}`;
}

export function SchoolThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.school_id) return;

    const supabase = createClient();

    async function loadSchoolColors() {
      const { data: school } = await supabase
        .from('schools')
        .select('primary_color, secondary_color')
        .eq('id', profile!.school_id!)
        .single();

      if (school) {
        const root = document.documentElement;
        root.style.setProperty('--school-primary', school.primary_color);
        root.style.setProperty('--school-secondary', school.secondary_color);
        root.style.setProperty('--school-dark', darkenHex(school.primary_color));
        root.style.setProperty('--school-primary-text', readableSchoolColor(school.primary_color, true, 0.50));
      }
    }

    loadSchoolColors();

    return () => {
      const root = document.documentElement;
      root.style.removeProperty('--school-primary');
      root.style.removeProperty('--school-secondary');
      root.style.removeProperty('--school-dark');
      root.style.removeProperty('--school-primary-text');
    };
  }, [profile?.school_id]);

  return <>{children}</>;
}
