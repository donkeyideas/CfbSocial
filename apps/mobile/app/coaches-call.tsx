import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { OrnamentDivider } from '@/components/ui/OrnamentDivider';
import { SchoolBadge } from '@/components/ui/SchoolBadge';
import { PostCard, type PostData } from '@/components/posts/PostCard';
import { RivalryVoteBar } from '@/components/rivalry/RivalryVoteBar';
import { useColors, useTheme } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { readableSchoolColor } from '@/lib/utils/colorContrast';

function pickColor(school: { primary_color: string; secondary_color?: string } | null, isDark: boolean, fallback: string): string {
  if (!school) return fallback;
  const raw = isDark && school.secondary_color ? school.secondary_color : school.primary_color;
  if (!isDark) return raw;
  return readableSchoolColor(raw, true);
}

interface DebateSchool {
  id: string;
  name: string;
  abbreviation: string;
  primary_color: string;
  secondary_color?: string;
}

interface DebateRivalry {
  id: string;
  name: string;
  status: string | null;
  school_1_vote_count: number | null;
  school_2_vote_count: number | null;
  created_at: string | null;
  school_1: DebateSchool | null;
  school_2: DebateSchool | null;
}

const RIVALRY_SELECT = `
  id, name, status, school_1_vote_count, school_2_vote_count, created_at,
  school_1:schools!rivalries_school_1_id_fkey(id, name, abbreviation, primary_color, secondary_color),
  school_2:schools!rivalries_school_2_id_fkey(id, name, abbreviation, primary_color, secondary_color)
`;

const POST_SELECT = `
  *,
  author:profiles!posts_author_id_fkey(
    id, username, display_name, avatar_url, dynasty_tier,
    school:schools!profiles_school_id_fkey(abbreviation, primary_color, secondary_color, slug)
  )
`;

export default function CoachesCallScreen() {
  const colors = useColors();
  const { isDark } = useTheme();
  const router = useRouter();
  const { dark } = useSchoolTheme();
  const [debates, setDebates] = useState<DebateRivalry[]>([]);
  const [predictions, setPredictions] = useState<PostData[]>([]);
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
      padding: 16,
      paddingBottom: 40,
    },
    description: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 8,
    },
    sectionTitle: {
      fontFamily: typography.serifBold,
      fontSize: 20,
      color: colors.ink,
      marginBottom: 12,
    },
    emptyText: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 16,
    },
    debatesList: {
      gap: 12,
    },
    debateCard: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
    },
    debateColorBar: {
      flexDirection: 'row',
      height: 4,
    },
    colorHalf: {
      flex: 1,
    },
    debateContent: {
      padding: 14,
      gap: 10,
    },
    debateName: {
      fontFamily: typography.serifBold,
      fontSize: 16,
      color: colors.ink,
      textAlign: 'center',
    },
    matchupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    schoolSide: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    schoolName: {
      fontFamily: typography.sansSemiBold,
      fontSize: 12,
      textAlign: 'center',
    },
    voteCount: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textMuted,
    },
    vs: {
      fontFamily: typography.serifBold,
      fontSize: 14,
      color: colors.textMuted,
      paddingHorizontal: 8,
    },
    totalVotes: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      textAlign: 'center',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    predictionsList: {
      gap: 12,
    },
  }), [colors]);

  const fetchData = useCallback(async () => {
    try {
      const [rivalryRes, predictionRes] = await Promise.all([
        supabase
          .from('rivalries')
          .select(RIVALRY_SELECT)
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('posts')
          .select(POST_SELECT)
          .eq('post_type', 'PREDICTION')
          .eq('status', 'PUBLISHED')
          .order('touchdown_count', { ascending: false })
          .limit(10),
      ]);

      if (rivalryRes.data) setDebates(rivalryRes.data as unknown as DebateRivalry[]);
      if (predictionRes.data) setPredictions(predictionRes.data as unknown as PostData[]);
    } catch (err) {
      console.warn('CoachesCall: failed to fetch data:', err);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <View style={styles.container}>
      <AppHeader />
      <SectionLabel text="Coach's Call" />

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={dark} />
        </View>
      ) : (
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
          <Text style={styles.description}>
            Community polls and hot-seat debates. Cast your vote on the biggest decisions in CFB.
          </Text>

          <OrnamentDivider />

          {/* Active Debates */}
          <Text style={styles.sectionTitle}>Active Debates</Text>

          {debates.length === 0 ? (
            <Text style={styles.emptyText}>No active debates right now.</Text>
          ) : (
            <View style={styles.debatesList}>
              {debates.map((rivalry) => {
                const school1 = rivalry.school_1;
                const school2 = rivalry.school_2;
                const votes1 = rivalry.school_1_vote_count ?? 0;
                const votes2 = rivalry.school_2_vote_count ?? 0;
                const total = votes1 + votes2;
                const pct1 = total > 0 ? Math.round((votes1 / total) * 100) : 50;
                const pct2 = total > 0 ? Math.round((votes2 / total) * 100) : 50;
                const color1 = pickColor(school1, isDark, colors.crimson);
                const color2 = pickColor(school2, isDark, colors.ink);

                return (
                  <Pressable
                    key={rivalry.id}
                    style={styles.debateCard}
                    onPress={() => router.push(`/rivalry/${rivalry.id}` as never)}
                  >
                    {/* Color bar */}
                    <View style={styles.debateColorBar}>
                      <View style={[styles.colorHalf, { backgroundColor: color1 }]} />
                      <View style={[styles.colorHalf, { backgroundColor: color2 }]} />
                    </View>

                    <View style={styles.debateContent}>
                      <Text style={styles.debateName} numberOfLines={1}>
                        {rivalry.name}
                      </Text>

                      {/* School matchup */}
                      <View style={styles.matchupRow}>
                        <View style={styles.schoolSide}>
                          {school1 && (
                            <SchoolBadge
                              abbreviation={school1.abbreviation}
                              color={color1}
                            />
                          )}
                          <Text style={[styles.schoolName, { color: color1 }]}>
                            {school1?.name ?? 'TBD'}
                          </Text>
                          <Text style={styles.voteCount}>{pct1}%</Text>
                        </View>

                        <Text style={styles.vs}>VS</Text>

                        <View style={styles.schoolSide}>
                          {school2 && (
                            <SchoolBadge
                              abbreviation={school2.abbreviation}
                              color={color2}
                            />
                          )}
                          <Text style={[styles.schoolName, { color: color2 }]}>
                            {school2?.name ?? 'TBD'}
                          </Text>
                          <Text style={styles.voteCount}>{pct2}%</Text>
                        </View>
                      </View>

                      {/* Vote bar */}
                      <RivalryVoteBar
                        school1Color={color1}
                        school2Color={color2}
                        school1Pct={pct1}
                        school2Pct={pct2}
                      />

                      <Text style={styles.totalVotes}>
                        {total} vote{total !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <OrnamentDivider />

          {/* Hottest Predictions */}
          <Text style={styles.sectionTitle}>Hottest Predictions</Text>

          {predictions.length === 0 ? (
            <Text style={styles.emptyText}>No predictions on the board yet.</Text>
          ) : (
            <View style={styles.predictionsList}>
              {predictions.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
