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
import { type Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

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
}

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  userId: string | null;
  profile: AuthProfile | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  userId: null,
  profile: null,
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select(
        'id, username, display_name, avatar_url, banner_url, bio, school_id, dynasty_tier, xp, level, post_count, correct_predictions, prediction_count, follower_count, following_count, touchdown_count, fumble_count'
      )
      .eq('id', uid)
      .single();

    if (data) {
      setProfile({
        id: data.id,
        username: data.username ?? null,
        display_name: data.display_name ?? null,
        avatar_url: data.avatar_url ?? null,
        banner_url: data.banner_url ?? null,
        bio: data.bio ?? null,
        school_id: data.school_id ?? null,
        dynasty_tier: data.dynasty_tier ?? null,
        xp: data.xp ?? 0,
        level: data.level ?? 1,
        post_count: data.post_count ?? 0,
        correct_predictions: data.correct_predictions ?? 0,
        prediction_count: data.prediction_count ?? 0,
        follower_count: data.follower_count ?? 0,
        following_count: data.following_count ?? 0,
        touchdown_count: data.touchdown_count ?? 0,
        fumble_count: data.fumble_count ?? 0,
      });
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: initialSession }, error }) => {
      if (error) {
        // Refresh token expired/invalid — clear session and start fresh
        console.warn('Auth session error, signing out:', error.message);
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        userIdRef.current = null;
        setLoading(false);
        return;
      }
      setSession(initialSession);
      if (initialSession?.user) {
        userIdRef.current = initialSession.user.id;
        await fetchProfile(initialSession.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        userIdRef.current = newSession.user.id;
        fetchProfile(newSession.user.id);
      } else {
        userIdRef.current = null;
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (userIdRef.current) {
      await fetchProfile(userIdRef.current);
    }
  }, [fetchProfile]);

  const userId = session?.user?.id ?? null;

  const value = useMemo<AuthContextType>(
    () => ({ session, loading, userId, profile, refreshProfile }),
    [session, loading, userId, profile, refreshProfile]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
