'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AuthProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  school_id: string | null;
  dynasty_tier: string | null;
  xp: number;
  level: number;
  post_count: number;
  correct_predictions: number;
  prediction_count: number;
}

interface AuthContextValue {
  /** null = still loading, false = not logged in */
  isLoggedIn: boolean | null;
  /** The Supabase user id, available immediately after auth check */
  userId: string | null;
  /** Profile data from the profiles table */
  profile: AuthProfile | null;
  /** Re-fetch profile data from the database */
  refreshProfile: () => Promise<void>;
}

const noop = async () => {};

const AuthContext = createContext<AuthContextValue>({
  isLoggedIn: null,
  userId: null,
  profile: null,
  refreshProfile: noop,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (uid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, school_id, dynasty_tier, xp, level, post_count, correct_predictions, prediction_count')
      .eq('id', uid)
      .single();

    if (data) {
      setProfile({
        id: data.id,
        username: data.username ?? null,
        avatar_url: data.avatar_url ?? null,
        school_id: data.school_id ?? null,
        dynasty_tier: data.dynasty_tier ?? null,
        xp: data.xp ?? 0,
        level: data.level ?? 1,
        post_count: data.post_count ?? 0,
        correct_predictions: data.correct_predictions ?? 0,
        prediction_count: data.prediction_count ?? 0,
      });
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Use getSession() instead of getUser() to avoid navigator lock contention
    // in React Strict Mode (double-mount). getSession() reads from storage
    // without acquiring a lock.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);
      setUserId(session.user.id);
      userIdRef.current = session.user.id;
      fetchProfile(session.user.id);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setIsLoggedIn(false);
          setUserId(null);
          setProfile(null);
          userIdRef.current = null;
          return;
        }

        setIsLoggedIn(true);
        setUserId(session.user.id);
        userIdRef.current = session.user.id;
        fetchProfile(session.user.id);
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (userIdRef.current) {
      await fetchProfile(userIdRef.current);
    }
  }, [fetchProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({ isLoggedIn, userId, profile, refreshProfile }),
    [isLoggedIn, userId, profile, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
