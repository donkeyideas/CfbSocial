import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { OrnamentDivider } from '@/components/ui/OrnamentDivider';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { DynastyBadge } from '@/components/ui/DynastyBadge';
import { PostCard, type PostData } from '@/components/posts/PostCard';
import { ChaosMeter } from '@/components/school/ChaosMeter';
import { useColors } from '@/lib/theme/ThemeProvider';
import { withAlpha } from '@/lib/theme/utils';
import { typography } from '@/lib/theme/typography';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';

interface SchoolData {
  id: string;
  name: string;
  abbreviation: string;
  mascot: string | null;
  conference: string | null;
  primary_color: string;
  secondary_color: string | null;
  stadium: string | null;
  slug: string | null;
  logo_url: string | null;
}

interface TopFan {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  dynasty_tier: string | null;
  xp: number;
}

const POST_SELECT = `
  *,
  author:profiles!posts_author_id_fkey(
    id, username, display_name, avatar_url, dynasty_tier,
    school:schools!profiles_school_id_fkey(abbreviation, primary_color, secondary_color, slug)
  )
`;

export default function SchoolHubScreen() {
  const colors = useColors();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { dark } = useSchoolTheme();

  const [school, setSchool] = useState<SchoolData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [topFans, setTopFans] = useState<TopFan[]>([]);
  const [fanCount, setFanCount] = useState(0);
  const [takesCount, setTakesCount] = useState(0);
  const [portalCount, setPortalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    loaderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
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
    schoolHeader: {
      alignItems: 'center',
      paddingHorizontal: 16,
      gap: 4,
    },
    schoolAvatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    schoolAvatarText: {
      fontFamily: typography.sansBold,
      fontSize: 20,
      color: '#f4efe4',
      letterSpacing: 1,
    },
    schoolName: {
      fontFamily: typography.serifBold,
      fontSize: 26,
      color: colors.ink,
      textAlign: 'center',
    },
    schoolConference: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    schoolMascot: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textMuted,
    },
    schoolStadium: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    colorBar: {
      flexDirection: 'row',
      height: 6,
      marginTop: 16,
      marginHorizontal: 16,
      borderRadius: 3,
      overflow: 'hidden',
    },
    colorBarHalf: {
      flex: 1,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      gap: 0,
    },
    statCell: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    statValue: {
      fontFamily: typography.serifBold,
      fontSize: 24,
    },
    statLabel: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    statDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.border,
    },
    postsList: {
      paddingHorizontal: 16,
      gap: 12,
    },
    emptyText: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 16,
    },
    leaderboard: {
      paddingHorizontal: 16,
      gap: 4,
    },
    fanRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: withAlpha(colors.border, 0.5),
      borderRadius: 8,
    },
    fanRowHighlighted: {
      backgroundColor: withAlpha(colors.secondary, 0.06),
    },
    rankBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: {
      fontFamily: typography.sansBold,
      fontSize: 12,
    },
    fanInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    fanName: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    fanXp: {
      fontFamily: typography.mono,
      fontSize: 12,
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    quickLinks: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 12,
    },
    quickLinkBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: 'center',
    },
    quickLinkText: {
      fontFamily: typography.sansBold,
      fontSize: 13,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  }), [colors]);

  const fetchSchoolData = useCallback(async () => {
    if (!slug) return;

    // Fetch the school first
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('*')
      .eq('slug', slug)
      .single();

    if (schoolError || !schoolData) {
      setLoading(false);
      return;
    }

    const s = schoolData as unknown as SchoolData;
    setSchool(s);
    const schoolId = s.id;

    // Fetch all related data in parallel
    try {
      const [
        fansRes,
        takesRes,
        portalRes,
        postsRes,
        topFansRes,
      ] = await Promise.all([
        // Fan count
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId),

        // Takes count
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'PUBLISHED'),

        // Portal count
        supabase
          .from('portal_players')
          .select('id', { count: 'exact', head: true })
          .or(`previous_school_id.eq.${schoolId},committed_school_id.eq.${schoolId}`),

        // Recent school feed posts
        supabase
          .from('posts')
          .select(POST_SELECT)
          .eq('school_id', schoolId)
          .eq('status', 'PUBLISHED')
          .order('created_at', { ascending: false })
          .limit(20),

        // Top fans (top 10 by xp)
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, dynasty_tier, xp')
          .eq('school_id', schoolId)
          .order('xp', { ascending: false })
          .limit(10),
      ]);

      setFanCount(fansRes.count ?? 0);
      setTakesCount(takesRes.count ?? 0);
      setPortalCount(portalRes.count ?? 0);
      if (postsRes.data) setPosts(postsRes.data as unknown as PostData[]);
      if (topFansRes.data) setTopFans(topFansRes.data as unknown as TopFan[]);
    } catch (err) {
      console.warn('SchoolHub: failed to fetch data:', err);
    }

    setLoading(false);
    setRefreshing(false);
  }, [slug]);

  useEffect(() => {
    fetchSchoolData();
  }, [fetchSchoolData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSchoolData();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={dark} />
        </View>
      </View>
    );
  }

  if (!school) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <EmptyState
          title="School not found"
          subtitle="This school hub doesn't exist."
        />
      </View>
    );
  }

  const primaryColor = school.primary_color || colors.crimson;
  const secondaryColor = school.secondary_color || colors.secondary;

  return (
    <View style={styles.container}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={dark}
          />
        }
      >
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: dark }]}>Back</Text>
        </Pressable>

        {/* School header */}
        <View style={styles.schoolHeader}>
          {/* School avatar circle */}
          <View
            style={[styles.schoolAvatar, { backgroundColor: primaryColor }]}
          >
            <Text style={styles.schoolAvatarText}>{school.abbreviation}</Text>
          </View>

          <Text style={styles.schoolName}>{school.name}</Text>

          {school.conference && (
            <Text style={styles.schoolConference}>{school.conference}</Text>
          )}

          {school.mascot && (
            <Text style={styles.schoolMascot}>{school.mascot}</Text>
          )}

          {school.stadium && (
            <Text style={styles.schoolStadium}>{school.stadium}</Text>
          )}
        </View>

        {/* Color bar */}
        <View style={styles.colorBar}>
          <View style={[styles.colorBarHalf, { backgroundColor: primaryColor }]} />
          <View style={[styles.colorBarHalf, { backgroundColor: secondaryColor }]} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: primaryColor }]}>
              {fanCount}
            </Text>
            <Text style={styles.statLabel}>Fans</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: primaryColor }]}>
              {takesCount}
            </Text>
            <Text style={styles.statLabel}>Takes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: primaryColor }]}>
              {portalCount}
            </Text>
            <Text style={styles.statLabel}>Portal</Text>
          </View>
        </View>

        <OrnamentDivider />

        {/* School feed */}
        <SectionLabel text="School Feed" />

        {posts.length === 0 ? (
          <EmptyState
            title="No takes yet"
            subtitle="Be the first to post for this school."
          />
        ) : (
          <View style={styles.postsList}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </View>
        )}

        <OrnamentDivider />

        {/* Top fans leaderboard */}
        <SectionLabel text="Top Fans" />

        {topFans.length === 0 ? (
          <Text style={styles.emptyText}>No fans registered yet.</Text>
        ) : (
          <View style={styles.leaderboard}>
            {topFans.map((fan, index) => {
              const rank = index + 1;
              const displayName = fan.display_name || fan.username || 'Fan';
              const isTop3 = rank <= 3;

              return (
                <Pressable
                  key={fan.id}
                  style={[styles.fanRow, isTop3 && styles.fanRowHighlighted]}
                  onPress={() =>
                    fan.username &&
                    router.push(`/profile/${fan.username}` as never)
                  }
                >
                  {/* Rank */}
                  <View
                    style={[
                      styles.rankBadge,
                      {
                        backgroundColor: isTop3
                          ? primaryColor
                          : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rankText,
                        { color: isTop3 ? '#f4efe4' : colors.textMuted },
                      ]}
                    >
                      {rank}
                    </Text>
                  </View>

                  <Avatar url={fan.avatar_url} name={displayName} size={32} />

                  <View style={styles.fanInfo}>
                    <Text style={styles.fanName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    {fan.dynasty_tier && (
                      <DynastyBadge tier={fan.dynasty_tier} />
                    )}
                  </View>

                  <Text style={styles.fanXp}>{fan.xp} XP</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <OrnamentDivider />

        {/* Chaos Meter */}
        <ChaosMeter />

        <OrnamentDivider />

        {/* Quick links */}
        <SectionLabel text="Quick Links" />

        <View style={styles.quickLinks}>
          <Pressable
            style={[styles.quickLinkBtn, { borderColor: primaryColor }]}
            onPress={() => router.push('/portal' as never)}
          >
            <Text style={[styles.quickLinkText, { color: primaryColor }]}>
              Portal Wire
            </Text>
          </Pressable>
          <Pressable
            style={[styles.quickLinkBtn, { borderColor: primaryColor }]}
            onPress={() => router.push('/rivalry' as never)}
          >
            <Text style={[styles.quickLinkText, { color: primaryColor }]}>
              Rivalries
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
