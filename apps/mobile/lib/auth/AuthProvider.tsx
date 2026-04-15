import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type PropsWithChildren,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const ACTIVE_PROFILE_KEY = 'cfb_active_profile';

interface AuthProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  school_id: string | null;
  dynasty_tier: string | null;
  xp: number;
  level: number;
  post_count: number;
  correct_predictions: number;
  prediction_count: number;
  follower_count: number;
  following_count: number;
  touchdown_count: number;
  fumble_count: number;
  owner_id: string;
}

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  /** The Supabase auth user ID (owner of all profiles) */
  userId: string | null;
  /** The currently active profile */
  profile: AuthProfile | null;
  /** All profiles owned by this user */
  profiles: AuthProfile[];
  /** Switch active profile (instant, no re-auth) */
  switchProfile: (profileId: string) => void;
  /** Re-fetch all profiles from DB */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  userId: null,
  profile: null,
  profiles: [],
  switchProfile: () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<AuthProfile[]>([]);
  const [activeProfileId, setActiveId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchProfiles = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, username, display_name, avatar_url, banner_url, bio, school_id, dynasty_tier, xp, level, post_count, correct_predictions, prediction_count, follower_count, following_count, touchdown_count, fumble_count, owner_id'
        )
        .eq('owner_id', uid)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('AuthProvider: failed to fetch profiles:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const mapped: AuthProfile[] = data.map((d: Record<string, unknown>) => ({
          id: d.id as string,
          username: (d.username as string) ?? null,
          display_name: (d.display_name as string) ?? null,
          avatar_url: (d.avatar_url as string) ?? null,
          banner_url: (d.banner_url as string) ?? null,
          bio: (d.bio as string) ?? null,
          school_id: (d.school_id as string) ?? null,
          dynasty_tier: (d.dynasty_tier as string) ?? null,
          xp: (d.xp as number) ?? 0,
          level: (d.level as number) ?? 1,
          post_count: (d.post_count as number) ?? 0,
          correct_predictions: (d.correct_predictions as number) ?? 0,
          prediction_count: (d.prediction_count as number) ?? 0,
          follower_count: (d.follower_count as number) ?? 0,
          following_count: (d.following_count as number) ?? 0,
          touchdown_count: (d.touchdown_count as number) ?? 0,
          fumble_count: (d.fumble_count as number) ?? 0,
          owner_id: (d.owner_id as string) ?? uid,
        }));

        setProfiles(mapped);

        // Determine active profile
        try {
          const stored = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
          const match = stored ? mapped.find((p) => p.id === stored) : null;
          if (match) {
            setActiveId(match.id);
          } else {
            const primary = mapped.find((p) => p.id === p.owner_id) ?? mapped[0];
            setActiveId(primary.id);
            AsyncStorage.setItem(ACTIVE_PROFILE_KEY, primary.id).catch(() => {});
          }
        } catch {
          const primary = mapped.find((p) => p.id === p.owner_id) ?? mapped[0];
          setActiveId(primary.id);
        }
      }
    } catch (err) {
      console.warn('AuthProvider: unexpected error fetching profiles:', err);
    }
  }, []);

  useEffect(() => {
    let settled = false;
    const settle = () => {
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    };

    // Safety timeout: if getSession hangs (e.g. stale token refresh on Android),
    // force loading to false so the app doesn't freeze on the splash screen.
    const timeout = setTimeout(() => {
      if (!settled) {
        console.warn('AuthProvider: getSession timed out after 8s, proceeding without session');
        settle();
      }
    }, 8000);

    supabase.auth.getSession().then(async ({ data: { session: initialSession }, error }) => {
      clearTimeout(timeout);
      if (error) {
        console.warn('Auth session error, signing out:', error.message);
        try { await supabase.auth.signOut(); } catch {}
        setSession(null);
        setProfiles([]);
        setActiveId(null);
        userIdRef.current = null;
        settle();
        return;
      }
      setSession(initialSession);
      if (initialSession?.user) {
        userIdRef.current = initialSession.user.id;
        await fetchProfiles(initialSession.user.id);
      }
      settle();
    }).catch((err) => {
      clearTimeout(timeout);
      console.warn('Auth getSession failed:', err);
      settle();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        userIdRef.current = newSession.user.id;
        fetchProfiles(newSession.user.id);
      } else {
        userIdRef.current = null;
        setProfiles([]);
        setActiveId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfiles]);

  const switchProfile = useCallback((profileId: string) => {
    const target = profiles.find((p) => p.id === profileId);
    if (target) {
      setActiveId(profileId);
      AsyncStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
    }
  }, [profiles]);

  const refreshProfile = useCallback(async () => {
    if (userIdRef.current) {
      await fetchProfiles(userIdRef.current);
    }
  }, [fetchProfiles]);

  const userId = session?.user?.id ?? null;

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  const value = useMemo<AuthContextType>(
    () => ({ session, loading, userId, profile: activeProfile, profiles, switchProfile, refreshProfile }),
    [session, loading, userId, activeProfile, profiles, switchProfile, refreshProfile]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
