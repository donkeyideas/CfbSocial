import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useColors, useTheme } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { SchoolBadge } from '@/components/ui/SchoolBadge';
import { RivalryVoteBar } from './RivalryVoteBar';
import { readableSchoolColor } from '@/lib/utils/colorContrast';

/** In dark mode: prefer secondary_color, but if it's still too dark, lighten it */
function pickColor(school: { primary_color: string; secondary_color?: string } | null, isDark: boolean, fallback: string): string {
  if (!school) return fallback;
  const raw = isDark && school.secondary_color ? school.secondary_color : school.primary_color;
  if (!isDark) return raw;
  return readableSchoolColor(raw, true);
}

export interface RivalrySchool {
  id: string;
  name: string;
  abbreviation: string;
  primary_color: string;
  secondary_color?: string;
  slug: string | null;
  logo_url: string | null;
}

export interface RivalryData {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  status: string | null;
  school_1_vote_count: number | null;
  school_2_vote_count: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
  school_1: RivalrySchool | null;
  school_2: RivalrySchool | null;
}

interface FightCardProps {
  rivalry: RivalryData;
  onVote?: (rivalryId: string, schoolId: string) => void;
  expanded?: boolean;
}

export function FightCard({ rivalry, onVote, expanded }: FightCardProps) {
  const colors = useColors();
  const { isDark } = useTheme();
  const router = useRouter();
  const { session } = useAuth();

  const school1 = rivalry.school_1;
  const school2 = rivalry.school_2;
  const votes1 = rivalry.school_1_vote_count ?? 0;
  const votes2 = rivalry.school_2_vote_count ?? 0;
  const totalVotes = votes1 + votes2;
  const pct1 = totalVotes > 0 ? Math.round((votes1 / totalVotes) * 100) : 50;
  const pct2 = totalVotes > 0 ? Math.round((votes2 / totalVotes) * 100) : 50;

  const color1 = pickColor(school1, isDark, colors.crimson);
  const color2 = pickColor(school2, isDark, colors.ink);

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
    },
    colorBar: {
      flexDirection: 'row',
      height: 4,
    },
    colorHalf: {
      flex: 1,
    },
    name: {
      fontFamily: typography.serifBold,
      fontSize: 20,
      color: colors.ink,
      textAlign: 'center',
      paddingTop: 16,
      paddingHorizontal: 16,
    },
    subtitle: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 16,
      marginTop: 2,
    },
    matchup: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    schoolSide: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    schoolName: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      textAlign: 'center',
    },
    voteCount: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
    pct: {
      fontFamily: typography.serifBold,
      fontSize: 24,
    },
    vs: {
      fontFamily: typography.serifBold,
      fontSize: 16,
      color: colors.textMuted,
      paddingHorizontal: 8,
    },
    voteButtons: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    voteBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    voteBtnText: {
      fontFamily: typography.sansBold,
      fontSize: 13,
      color: '#f4efe4',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    description: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    totalVotes: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      textAlign: 'center',
      letterSpacing: 1,
      textTransform: 'uppercase',
      paddingVertical: 12,
    },
  }), [colors]);

  const handlePress = () => {
    if (!expanded) {
      router.push(`/rivalry/${rivalry.id}` as never);
    }
  };

  const handleVote = (schoolId: string) => {
    if (!session) {
      router.push('/(auth)/login' as never);
      return;
    }
    onVote?.(rivalry.id, schoolId);
  };

  const content = (
    <View style={styles.card}>
      {/* Top color accent */}
      <View style={styles.colorBar}>
        <View style={[styles.colorHalf, { backgroundColor: color1 }]} />
        <View style={[styles.colorHalf, { backgroundColor: color2 }]} />
      </View>

      {/* Title */}
      <Text style={styles.name}>{rivalry.name}</Text>
      {rivalry.subtitle && (
        <Text style={styles.subtitle}>{rivalry.subtitle}</Text>
      )}

      {/* Matchup */}
      <View style={styles.matchup}>
        <View style={styles.schoolSide}>
          {school1 && (
            <SchoolBadge
              abbreviation={school1.abbreviation}
              color={color1}
              slug={school1.slug}
            />
          )}
          <Text style={[styles.schoolName, { color: color1 }]}>
            {school1?.name ?? 'TBD'}
          </Text>
          <Text style={styles.voteCount}>{votes1} votes</Text>
          <Text style={[styles.pct, { color: color1 }]}>{pct1}%</Text>
        </View>

        <Text style={styles.vs}>VS</Text>

        <View style={styles.schoolSide}>
          {school2 && (
            <SchoolBadge
              abbreviation={school2.abbreviation}
              color={color2}
              slug={school2.slug}
            />
          )}
          <Text style={[styles.schoolName, { color: color2 }]}>
            {school2?.name ?? 'TBD'}
          </Text>
          <Text style={styles.voteCount}>{votes2} votes</Text>
          <Text style={[styles.pct, { color: color2 }]}>{pct2}%</Text>
        </View>
      </View>

      {/* Vote bar */}
      <RivalryVoteBar
        school1Color={color1}
        school2Color={color2}
        school1Pct={pct1}
        school2Pct={pct2}
      />

      {/* Vote buttons */}
      {onVote && rivalry.status === 'ACTIVE' && (
        <View style={styles.voteButtons}>
          <Pressable
            style={[styles.voteBtn, { backgroundColor: color1 }]}
            onPress={() => school1 && handleVote(school1.id)}
          >
            <Text style={styles.voteBtnText}>
              Vote {school1?.abbreviation ?? '---'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.voteBtn, { backgroundColor: color2 }]}
            onPress={() => school2 && handleVote(school2.id)}
          >
            <Text style={styles.voteBtnText}>
              Vote {school2?.abbreviation ?? '---'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Description (expanded only) */}
      {expanded && rivalry.description && (
        <Text style={styles.description}>{rivalry.description}</Text>
      )}

      {/* Total votes */}
      <Text style={styles.totalVotes}>
        {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  if (expanded) {
    return content;
  }

  return (
    <Pressable onPress={handlePress}>
      {content}
    </Pressable>
  );
}
