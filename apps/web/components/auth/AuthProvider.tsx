'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveProfileId, setActiveProfileId } from '@/lib/account-store';

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
  display_name: string | null;
  owner_id: string;
}

interface AuthContextValue {
  /** null = still loading, false = not logged in */
  isLoggedIn: boolean | null;
  /** The Supabase user id (auth owner), available immediately after auth check */
  userId: string | null;
  /** The active profile data */
  profile: AuthProfile | null;
  /** All profiles owned by this user */
  profiles: AuthProfile[];
  /** Switch the active profile (instant, no re-auth) */
  switchProfile: (profileId: string) => void;
  /** Re-fetch all profiles from the database */
  refreshProfiles: () => Promise<void>;
}

const noop = async () => {};
const noopSync = () => {};

const AuthContext = createContext<AuthContextValue>({
  isLoggedIn: null,
  userId: null,
  profile: null,
  profiles: [],
  switchProfile: noopSync,
  refreshProfiles: noop,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<AuthProfile[]>([]);
  const [activeProfileId, setActiveId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchProfiles = useCallback(async (uid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, school_id, dynasty_tier, xp, level, post_count, correct_predictions, prediction_count, owner_id')
      .eq('owner_id', uid)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const mapped: AuthProfile[] = data.map((d: Record<string, unknown>) => ({
        id: d.id as string,
        username: (d.username as string) ?? null,
        display_name: (d.display_name as string) ?? null,
        avatar_url: (d.avatar_url as string) ?? null,
        school_id: (d.school_id as string) ?? null,
        dynasty_tier: (d.dynasty_tier as string) ?? null,
        xp: (d.xp as number) ?? 0,
        level: (d.level as number) ?? 1,
        post_count: (d.post_count as number) ?? 0,
        correct_predictions: (d.correct_predictions as number) ?? 0,
        prediction_count: (d.prediction_count as number) ?? 0,
        owner_id: (d.owner_id as string) ?? uid,
      }));

      setProfiles(mapped);

      // Determine active profile
      const stored = getActiveProfileId();
      const match = stored ? mapped.find((p) => p.id === stored) : null;
      if (match) {
        setActiveId(match.id);
      } else {
        // Default to primary profile (id === owner_id)
        const primary = mapped.find((p) => p.id === p.owner_id) ?? mapped[0];
        setActiveId(primary.id);
        setActiveProfileId(primary.id);
      }
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);
      setUserId(session.user.id);
      userIdRef.current = session.user.id;
      fetchProfiles(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setIsLoggedIn(false);
          setUserId(null);
          setProfiles([]);
          setActiveId(null);
          userIdRef.current = null;
          return;
        }

        setIsLoggedIn(true);
        setUserId(session.user.id);
        userIdRef.current = session.user.id;
        fetchProfiles(session.user.id);
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfiles]);

  const switchProfile = useCallback((profileId: string) => {
    const target = profiles.find((p) => p.id === profileId);
    if (target) {
      setActiveId(profileId);
      setActiveProfileId(profileId);
    }
  }, [profiles]);

  const refreshProfiles = useCallback(async () => {
    if (userIdRef.current) {
      await fetchProfiles(userIdRef.current);
    }
  }, [fetchProfiles]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoggedIn,
      userId,
      profile: activeProfile,
      profiles,
      switchProfile,
      refreshProfiles,
    }),
    [isLoggedIn, userId, activeProfile, profiles, switchProfile, refreshProfiles],
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
