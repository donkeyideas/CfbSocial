import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { AppHeader } from '@/components/navigation/AppHeader';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { SchoolBadge } from '@/components/ui/SchoolBadge';
import { DynastyBadge } from '@/components/ui/DynastyBadge';
import { OrnamentDivider } from '@/components/ui/OrnamentDivider';
import { ProfilePortrait } from '@/components/profile/ProfilePortrait';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { DynastyPlaque } from '@/components/profile/DynastyPlaque';
import { FollowButton } from '@/components/profile/FollowButton';
import { BlockButton } from '@/components/profile/BlockButton';
import { ProfileEditButton } from '@/components/profile/ProfileEditButton';
import { PostCard, type PostData } from '@/components/posts/PostCard';
import { useColors, useTheme } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { readableSchoolColor } from '@/lib/utils/colorContrast';

interface ProfileData {
  id: string;
  owner_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  xp: number;
  level: number;
  dynasty_tier: string | null;
  post_count: number;
  touchdown_count: number;
  fumble_count: number;
  follower_count: number;
  following_count: number;
  correct_predictions: number;
  prediction_count: number;
  school: {
    id: string;
    name: string;
    abbreviation: string;
    primary_color: string;
    slug: string | null;
  } | null;
}

export default function ProfileScreen() {
  const colors = useColors();
  const { isDark } = useTheme();
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { userId, profile: authProfile, refreshProfile } = useAuth();
  const { dark } = useSchoolTheme();
  const { showAlert } = useThemedAlert();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    listContent: {
      paddingBottom: 40,
    },
    backButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    backText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 15,
      color: colors.crimson,
    },
    banner: {
      height: 140,
    },
    profileSection: {
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 6,
    },
    portraitRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: -58,
    },
    actionArea: {
      paddingBottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    displayName: {
      fontFamily: typography.serifBold,
      fontSize: 24,
      color: colors.ink,
      marginTop: 8,
    },
    username: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textMuted,
    },
    bio: {
      fontFamily: typography.sans,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      marginTop: 8,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
      marginBottom: 14,
    },
    plaqueContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    signOutContainer: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      alignItems: 'center',
    },
    signOutButton: {
      paddingVertical: 10,
      paddingHorizontal: 32,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
    },
    signOutText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.textSecondary,
    },
    postsHeading: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    postsHeadingText: {
      fontFamily: typography.serifBold,
      fontSize: 18,
      color: colors.ink,
    },
  }), [colors]);

  const isOwnProfile = !!userId && !!profile && (userId === profile.id || userId === profile.owner_id);

  const fetchProfile = useCallback(async () => {
    if (!username) return;

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, owner_id, username, display_name, avatar_url, banner_url, bio,
        xp, level, dynasty_tier,
        post_count, touchdown_count, fumble_count,
        follower_count, following_count,
        correct_predictions, prediction_count,
        school:schools!profiles_school_id_fkey(
          id, name, abbreviation, primary_color, slug
        )
      `)
      .eq('username', username)
      .single();

    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setProfile(data as unknown as ProfileData);
    setNotFound(false);
  }, [username]);

  const fetchPosts = useCallback(async () => {
    if (!profile?.id) return;

    const { data } = await supabase
      .from('posts')
      .select(`
        id, content, post_type, status, author_id, school_id,
        touchdown_count, fumble_count, reply_count, repost_count, created_at,
        author:profiles!posts_author_id_fkey(
          id, username, display_name, avatar_url, dynasty_tier,
          school:schools!profiles_school_id_fkey(
            abbreviation, primary_color, slug
          )
        )
      `)
      .eq('author_id', profile.id)
      .neq('status', 'REMOVED')
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setPosts(data as unknown as PostData[]);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile?.id) {
      fetchPosts();
    }
  }, [profile?.id, fetchPosts]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchProfile();
    if (profile?.id) {
      await fetchPosts();
    }
    if (isOwnProfile) {
      await refreshProfile();
    }
    setRefreshing(false);
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showAlert('Error', 'Failed to sign out. Please try again.');
      return;
    }
    router.replace('/' as never);
  }

  async function handleProfileSaved() {
    await refreshProfile();
    await fetchProfile();
  }

  const renderItem = useCallback(
    ({ item }: { item: PostData }) => <PostCard post={item} />,
    []
  );

  if (loading && !profile) {
    return <LoadingScreen />;
  }

  if (notFound) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: dark }]}>Back</Text>
        </Pressable>
        <EmptyState
          title="Profile not found"
          subtitle="This user may not exist or has been removed."
        />
      </View>
    );
  }

  if (!profile) {
    return <LoadingScreen />;
  }

  const displayName = profile.display_name || profile.username;
  const schoolColor = profile.school?.primary_color
    ? readableSchoolColor(profile.school.primary_color, isDark)
    : undefined;

  const headerComponent = (
    <View>
      {/* Back button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={[styles.backText, { color: dark }]}>Back</Text>
      </Pressable>

      {/* Banner */}
      {profile.banner_url ? (
        <Image
          source={{ uri: profile.banner_url }}
          style={[styles.banner, { backgroundColor: schoolColor || colors.crimson }]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.banner,
            { backgroundColor: schoolColor || colors.crimson },
          ]}
        />
      )}

      {/* Portrait + Info */}
      <View style={styles.profileSection}>
        <View style={styles.portraitRow}>
          <ProfilePortrait
            avatarUrl={profile.avatar_url}
            name={displayName}
            schoolColor={schoolColor}
          />
          <View style={styles.actionArea}>
            {isOwnProfile ? (
              <ProfileEditButton onSaved={handleProfileSaved} />
            ) : (
              <>
                <FollowButton targetUserId={profile.id} />
                <BlockButton targetUserId={profile.id} />
              </>
            )}
          </View>
        </View>

        {/* Name and username */}
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.username}>@{profile.username}</Text>

        {/* Bio */}
        {profile.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : null}

        {/* School and Dynasty badges */}
        <View style={styles.badgeRow}>
          {profile.school && (
            <SchoolBadge
              abbreviation={profile.school.abbreviation}
              color={profile.school.primary_color}
              slug={profile.school.slug}
            />
          )}
          <DynastyBadge tier={profile.dynasty_tier} />
        </View>
      </View>

      {/* Stats */}
      <ProfileStats
        touchdownCount={profile.touchdown_count}
        fumbleCount={profile.fumble_count}
        followerCount={profile.follower_count}
        followingCount={profile.following_count}
        postCount={profile.post_count}
      />

      {/* Dynasty Plaque */}
      <View style={styles.plaqueContainer}>
        <DynastyPlaque
          level={profile.level}
          xp={profile.xp}
          tier={profile.dynasty_tier}
          accentColor={schoolColor}
          posts={profile.post_count}
          touchdowns={profile.touchdown_count}
          predictions={profile.correct_predictions}
        />
      </View>

      {/* Sign Out (own profile only) */}
      {isOwnProfile && (
        <View style={styles.signOutContainer}>
          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      )}

      <OrnamentDivider />

      {/* Recent Posts heading */}
      <View style={styles.postsHeading}>
        <Text style={styles.postsHeadingText}>Recent Posts</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        removeClippedSubviews
        maxToRenderPerBatch={8}
        initialNumToRender={6}
        windowSize={5}
        ListHeaderComponent={headerComponent}
        ListEmptyComponent={
          <EmptyState
            title="No posts yet"
            subtitle={
              isOwnProfile
                ? 'Start posting to fill your profile with takes.'
                : 'This user has not posted yet.'
            }
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={dark}
          />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}
