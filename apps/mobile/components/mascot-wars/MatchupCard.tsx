import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { VoteBar } from './VoteBar';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

interface SchoolInfo {
  id: string;
  name: string;
  abbreviation: string;
  primary_color: string;
  mascot: string | null;
  slug: string;
}

export interface MatchupData {
  id: string;
  bracket_id: string;
  round: number;
  position: number;
  school_1_id: string;
  school_2_id: string;
  school_1_votes: number;
  school_2_votes: number;
  winner_id: string | null;
  school_1: SchoolInfo;
  school_2: SchoolInfo;
}

interface MatchupCardProps {
  matchup: MatchupData;
  userVoteSchoolId: string | null;
  onVoted: (matchupId: string, schoolId: string) => void;
}

export function MatchupCard({ matchup, userVoteSchoolId, onVoted }: MatchupCardProps) {
  const colors = useColors();
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const { dark } = useSchoolTheme();
  const { showAlert } = useThemedAlert();
  const [voting, setVoting] = useState(false);
  const [localVote, setLocalVote] = useState<string | null>(userVoteSchoolId);
  const [localS1Votes, setLocalS1Votes] = useState(matchup.school_1_votes);
  const [localS2Votes, setLocalS2Votes] = useState(matchup.school_2_votes);

  // Sync when props change (e.g. pull-to-refresh)
  useEffect(() => {
    setLocalVote(userVoteSchoolId);
    setLocalS1Votes(matchup.school_1_votes);
    setLocalS2Votes(matchup.school_2_votes);
  }, [userVoteSchoolId, matchup.school_1_votes, matchup.school_2_votes]);

  const s1 = matchup.school_1;
  const s2 = matchup.school_2;
  const isResolved = matchup.winner_id !== null;
  const hasVoted = localVote !== null;

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      gap: 8,
    },
    winnerBadge: {
      alignSelf: 'center',
      paddingHorizontal: 12,
      paddingVertical: 3,
      borderRadius: 10,
      marginBottom: 2,
    },
    winnerBadgeText: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: '#f4efe4',
      letterSpacing: 1,
    },
    schoolRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: colors.surface,
    },
    schoolRowSelected: {
      borderWidth: 2,
      backgroundColor: colors.paper,
    },
    colorDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    schoolInfo: {
      flex: 1,
      gap: 1,
    },
    schoolName: {
      fontFamily: typography.serifBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    mascotName: {
      fontFamily: typography.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
    voteLabel: {
      fontFamily: typography.mono,
      fontSize: 10,
      letterSpacing: 1,
    },
    vsText: {
      fontFamily: typography.serif,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
    },
  }), [colors]);

  const handleVote = async (schoolId: string) => {
    if (!userId) {
      showAlert('Bench Warmer', 'You must be signed in to vote.');
      return;
    }
    if (hasVoted || isResolved || voting) return;

    setVoting(true);

    // Optimistic update
    setLocalVote(schoolId);
    if (schoolId === s1.id) {
      setLocalS1Votes((v) => v + 1);
    } else {
      setLocalS2Votes((v) => v + 1);
    }
    onVoted(matchup.id, schoolId);

    const { error } = await supabase
      .from('mascot_votes')
      .insert({ matchup_id: matchup.id, school_id: schoolId, user_id: userId });

    if (error) {
      // Revert optimistic update
      setLocalVote(null);
      if (schoolId === s1.id) {
        setLocalS1Votes((v) => v - 1);
      } else {
        setLocalS2Votes((v) => v - 1);
      }

      if (error.code === '23505') {
        showAlert('Offsides', 'You have already voted on this matchup.');
      } else {
        showAlert('Incomplete Pass', 'Failed to cast vote. Please try again.');
      }
    }

    setVoting(false);
  };

  const getWinnerLabel = () => {
    if (!isResolved) return null;
    if (matchup.winner_id === s1.id) return s1.abbreviation;
    if (matchup.winner_id === s2.id) return s2.abbreviation;
    return null;
  };

  const winnerLabel = getWinnerLabel();

  return (
    <View style={styles.card}>
      {/* Winner badge */}
      {isResolved && winnerLabel && (
        <View style={[styles.winnerBadge, { backgroundColor: dark }]}>
          <Text style={styles.winnerBadgeText}>WINNER: {winnerLabel}</Text>
        </View>
      )}

      {/* School 1 */}
      <Pressable
        style={[
          styles.schoolRow,
          localVote === s1.id && styles.schoolRowSelected,
          localVote === s1.id && { borderColor: s1.primary_color },
        ]}
        onPress={() => handleVote(s1.id)}
        disabled={hasVoted || isResolved || voting}
      >
        <View style={[styles.colorDot, { backgroundColor: s1.primary_color }]} />
        <View style={styles.schoolInfo}>
          <Text style={styles.schoolName} numberOfLines={1}>{s1.name}</Text>
          {s1.mascot && (
            <Text style={styles.mascotName} numberOfLines={1}>{s1.mascot}</Text>
          )}
        </View>
        {!hasVoted && !isResolved && (
          <Text style={[styles.voteLabel, { color: s1.primary_color }]}>VOTE</Text>
        )}
      </Pressable>

      {/* VS divider */}
      <Text style={styles.vsText}>vs</Text>

      {/* School 2 */}
      <Pressable
        style={[
          styles.schoolRow,
          localVote === s2.id && styles.schoolRowSelected,
          localVote === s2.id && { borderColor: s2.primary_color },
        ]}
        onPress={() => handleVote(s2.id)}
        disabled={hasVoted || isResolved || voting}
      >
        <View style={[styles.colorDot, { backgroundColor: s2.primary_color }]} />
        <View style={styles.schoolInfo}>
          <Text style={styles.schoolName} numberOfLines={1}>{s2.name}</Text>
          {s2.mascot && (
            <Text style={styles.mascotName} numberOfLines={1}>{s2.mascot}</Text>
          )}
        </View>
        {!hasVoted && !isResolved && (
          <Text style={[styles.voteLabel, { color: s2.primary_color }]}>VOTE</Text>
        )}
      </Pressable>

      {/* Vote bar */}
      <VoteBar
        school1Color={s1.primary_color}
        school2Color={s2.primary_color}
        school1Votes={localS1Votes}
        school2Votes={localS2Votes}
      />
    </View>
  );
}
