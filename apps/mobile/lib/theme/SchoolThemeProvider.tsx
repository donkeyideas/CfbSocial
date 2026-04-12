import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useColors } from './ThemeProvider';

interface SchoolData {
  id: string;
  name: string;
  abbreviation: string;
  mascot: string | null;
  primary_color: string;
  secondary_color: string;
  conference: string | null;
  slug: string | null;
  logo_url: string | null;
}

interface SchoolThemeContextValue {
  dark: string;
  accent: string;
  school: SchoolData | null;
  loading: boolean;
}

const SchoolThemeContext = createContext<SchoolThemeContextValue>({
  dark: '#8b1a1a',
  accent: '#c9a84c',
  school: null,
  loading: true,
});

export function useSchoolTheme() {
  return useContext(SchoolThemeContext);
}

export function SchoolThemeProvider({ children }: PropsWithChildren) {
  const themeColors = useColors();
  const { session, profile, loading: authLoading } = useAuth();
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [themeLoading, setThemeLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading before making any decisions
    if (authLoading) return;

    if (!session?.user || !profile?.school_id) {
      setSchool(null);
      setThemeLoading(false);
      return;
    }

    Promise.resolve(
      supabase
        .from('schools')
        .select('id, name, abbreviation, mascot, primary_color, secondary_color, conference, slug, logo_url')
        .eq('id', profile.school_id)
        .single()
    )
      .then(({ data, error }) => {
        if (error) {
          console.warn('SchoolThemeProvider: failed to load school:', error.message);
        }
        if (data) {
          setSchool(data as SchoolData);
        }
        setThemeLoading(false);
      })
      .catch((err: unknown) => {
        console.warn('SchoolThemeProvider: unexpected error:', err);
        setThemeLoading(false);
      });
  }, [authLoading, session?.user?.id, profile?.school_id]);

  const loading = authLoading || themeLoading;

  const dark = school?.primary_color || themeColors.crimson;
  const accent = school?.secondary_color || themeColors.secondary;

  return (
    <SchoolThemeContext.Provider value={{ dark, accent, school, loading }}>
      {children}
    </SchoolThemeContext.Provider>
  );
}
