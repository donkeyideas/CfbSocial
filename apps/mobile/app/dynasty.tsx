import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { AuthGate } from '@/components/ui/AuthGate';
import { Avatar } from '@/components/ui/Avatar';
import { DynastyBadge } from '@/components/ui/DynastyBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { OrnamentDivider } from '@/components/ui/OrnamentDivider';
import { DynastyLeaderboard } from '@/components/dynasty/DynastyLeaderboard';
import { AchievementCard, type AchievementData } from '@/components/dynasty/AchievementCard';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

type DynastyTab = 'my-dynasty' | 'leaderboard' | 'achievements';

interface XpLogEntry {
  id: string;
  source: string;
  amount: number;
  created_at: string;
}

const ACHIEVEMENT_CATEGORIES = ['SOCIAL', 'PREDICTION', 'RIVALRY', 'RECRUITING', 'ENGAGEMENT', 'MILESTONE'];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

function formatSource(source: string): string {
  return source
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DynastyScreen() {
  const colors = useColors();
  const { session, userId, profile, refreshProfile } = useAuth();
  const { dark } = useSchoolTheme();
  const [activeTab, setActiveTab] = useState<DynastyTab>('my-dynasty');
  const [xpLog, setXpLog] = useState<XpLogEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [userAchievementIds, setUserAchievementIds] = useState<Set<string>>(new Set());
  const [userAchievementDates, setUserAchievementDates] = useState<Record<string, string>>({});
  const [loadingXp, setLoadingXp] = useState(false);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    tabRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
      color: colors.textMuted,
    },
    loaderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
    },
    profileInfo: {
      flex: 1,
      gap: 4,
    },
    profileName: {
      fontFamily: typography.serifBold,
      fontSize: 20,
      color: colors.textPrimary,
    },
    tierRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    levelLabel: {
      fontFamily: typography.mono,
      fontSize: 12,
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    xpSection: {
      marginTop: 16,
      gap: 6,
    },
    xpLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    xpLabel: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    xpValue: {
      fontFamily: typography.mono,
      fontSize: 12,
      color: colors.textMuted,
      letterSpacing: 0.3,
    },
    xpBarBg: {
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    xpBarFill: {
      height: '100%',
      borderRadius: 5,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    statCell: {
      width: '48%',
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      gap: 4,
    },
    statValue: {
      fontFamily: typography.serifBold,
      fontSize: 24,
      color: colors.textPrimary,
    },
    statLabel: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
    subheading: {
      fontFamily: typography.serifBold,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 10,
    },
    emptyText: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 12,
    },
    xpLogList: {
      gap: 6,
    },
    xpLogRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    xpLogInfo: {
      flex: 1,
      gap: 2,
    },
    xpLogSource: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    xpLogDate: {
      fontFamily: typography.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
    xpLogAmount: {
      fontFamily: typography.mono,
      fontSize: 13,
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    achievementsList: {
      gap: 8,
    },
    categorySection: {
      marginBottom: 20,
    },
    categoryTitle: {
      fontFamily: typography.serifBold,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 6,
    },
  }), [colors]);

  // ---------- Fetch XP log ----------
  const fetchXpLog = useCallback(async () => {
    if (!userId) return;
    setLoadingXp(true);
    const { data } = await supabase
      .from('xp_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setXpLog(data as XpLogEntry[]);
    }
    setLoadingXp(false);
  }, [userId]);

  // ---------- Fetch achievements ----------
  const fetchAchievements = useCallback(async () => {
    setLoadingAchievements(true);

    // Fetch all achievements
    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('id, name, description, category, xp_reward')
      .order('category', { ascending: true });

    if (allAchievements) {
      setAchievements(allAchievements as AchievementData[]);
    }

    // Fetch user's earned achievements
    if (userId) {
      const { data: earned } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', userId);

      if (earned) {
        const ids = new Set<string>();
        const dates: Record<string, string> = {};
        for (const e of earned) {
          ids.add(e.achievement_id);
          dates[e.achievement_id] = e.earned_at;
        }
        setUserAchievementIds(ids);
        setUserAchievementDates(dates);
      }
    }

    setLoadingAchievements(false);
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'my-dynasty' && userId) {
      fetchXpLog();
      fetchAchievements();
    } else if (activeTab === 'achievements') {
      fetchAchievements();
    }
  }, [activeTab, userId, fetchXpLog, fetchAchievements]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      if (activeTab === 'my-dynasty') {
        await Promise.all([fetchXpLog(), fetchAchievements()]);
      } else if (activeTab === 'achievements') {
        await fetchAchievements();
      }
    } catch (err) {
      console.warn('Dynasty: refresh failed:', err);
    }
    setRefreshing(false);
  };

  // ---------- XP calculations ----------
  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const xpForNext = level * 500;
  const xpPct = Math.min((xp / xpForNext) * 100, 100);

  // ---------- Stats ----------
  const achievementCount = userAchievementIds.size;

  const tabs: { key: DynastyTab; label: string }[] = [
    { key: 'my-dynasty', label: 'My Dynasty' },
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'achievements', label: 'Achievements' },
  ];

  // ---------- Achievement grouping ----------
  const groupedAchievements: Record<string, AchievementData[]> = {};
  for (const a of achievements) {
    const cat = a.category || 'OTHER';
    if (!groupedAchievements[cat]) {
      groupedAchievements[cat] = [];
    }
    groupedAchievements[cat].push({
      ...a,
      unlocked: userAchievementIds.has(a.id),
      earned_at: userAchievementDates[a.id] || null,
    });
  }

  // ---------- Render My Dynasty tab ----------
  const renderMyDynasty = () => {
    if (!session) {
      return <AuthGate message="Sign in to start your dynasty" />;
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={dark}
          />
        }
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <Avatar
            url={profile?.avatar_url}
            name={profile?.display_name || profile?.username}
            size={64}
            borderColor={dark}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile?.display_name || profile?.username || 'Fan'}
            </Text>
            <View style={styles.tierRow}>
              <DynastyBadge tier={profile?.dynasty_tier ?? null} />
              <Text style={styles.levelLabel}>Level {level}</Text>
            </View>
          </View>
        </View>

        {/* XP progress bar */}
        <View style={styles.xpSection}>
          <View style={styles.xpLabelRow}>
            <Text style={styles.xpLabel}>XP Progress</Text>
            <Text style={styles.xpValue}>{xp} / {xpForNext}</Text>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${xpPct}%`, backgroundColor: dark }]} />
          </View>
        </View>

        <OrnamentDivider />

        {/* Stats grid 2x2 */}
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{profile?.post_count ?? 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{profile?.touchdown_count ?? 0}</Text>
            <Text style={styles.statLabel}>Touchdowns</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{profile?.follower_count ?? 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{achievementCount}</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </View>
        </View>

        <OrnamentDivider />

        {/* Recent XP Activity */}
        <Text style={styles.subheading}>Recent XP Activity</Text>
        {loadingXp ? (
          <ActivityIndicator size="small" color={dark} style={{ paddingVertical: 16 }} />
        ) : xpLog.length === 0 ? (
          <Text style={styles.emptyText}>No XP activity yet. Start posting and engaging!</Text>
        ) : (
          <View style={styles.xpLogList}>
            {xpLog.map((entry) => (
              <View key={entry.id} style={styles.xpLogRow}>
                <View style={styles.xpLogInfo}>
                  <Text style={styles.xpLogSource}>{formatSource(entry.source)}</Text>
                  <Text style={styles.xpLogDate}>{formatDate(entry.created_at)}</Text>
                </View>
                <Text style={[styles.xpLogAmount, entry.amount > 0 && { color: colors.success }]}>
                  {entry.amount > 0 ? '+' : ''}{entry.amount} XP
                </Text>
              </View>
            ))}
          </View>
        )}

        <OrnamentDivider />

        {/* Recent achievements (first 5) */}
        <Text style={styles.subheading}>Recent Achievements</Text>
        {loadingAchievements ? (
          <ActivityIndicator size="small" color={dark} style={{ paddingVertical: 16 }} />
        ) : (() => {
          const earnedAchievements = achievements
            .filter((a) => userAchievementIds.has(a.id))
            .map((a) => ({
              ...a,
              unlocked: true,
              earned_at: userAchievementDates[a.id] || null,
            }))
            .sort((a, b) => {
              if (!a.earned_at || !b.earned_at) return 0;
              return new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime();
            })
            .slice(0, 5);

          if (earnedAchievements.length === 0) {
            return (
              <Text style={styles.emptyText}>
                No achievements unlocked yet. Keep engaging to earn your first!
              </Text>
            );
          }

          return (
            <View style={styles.achievementsList}>
              {earnedAchievements.map((a) => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
            </View>
          );
        })()}
      </ScrollView>
    );
  };

  // ---------- Render Achievements tab ----------
  const renderAchievements = () => {
    if (loadingAchievements) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={dark} />
        </View>
      );
    }

    const categories = Object.keys(groupedAchievements).sort((a, b) => {
      const orderA = ACHIEVEMENT_CATEGORIES.indexOf(a);
      const orderB = ACHIEVEMENT_CATEGORIES.indexOf(b);
      return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
    });

    if (categories.length === 0) {
      return (
        <EmptyState
          title="No achievements available"
          subtitle="Check back later for new challenges to conquer."
        />
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={dark}
          />
        }
      >
        {categories.map((cat) => (
          <View key={cat} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{formatSource(cat)}</Text>
            <View style={styles.achievementsList}>
              {groupedAchievements[cat].map((a) => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader />
      <SectionLabel text="Dynasty Mode" />

      {/* Tab selector */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, isActive && { borderBottomColor: dark }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive && { color: colors.textPrimary },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {activeTab === 'my-dynasty' && renderMyDynasty()}
      {activeTab === 'leaderboard' && <DynastyLeaderboard />}
      {activeTab === 'achievements' && renderAchievements()}
    </View>
  );
}
