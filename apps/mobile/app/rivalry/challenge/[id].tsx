import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useColors } from '@/lib/theme/ThemeProvider';
import type { ColorPalette } from '@/lib/theme/palettes';
import { typography } from '@/lib/theme/typography';

interface ChallengeProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  dynasty_tier: string | null;
}

interface ChallengeDetail {
  id: string;
  topic: string;
  status: string | null;
  challenger_argument: string | null;
  challenged_argument: string | null;
  challenger_votes: number | null;
  challenged_votes: number | null;
  voting_ends_at: string | null;
  winner_id: string | null;
  created_at: string | null;
  challenger: ChallengeProfile | null;
  challenged: ChallengeProfile | null;
}

function getStatusStyle(status: string | null, c: ColorPalette) {
  switch (status) {
    case 'ACTIVE':
    case 'VOTING':
      return { bg: `${c.success}20`, text: c.success, label: 'ACTIVE' };
    case 'COMPLETED':
      return { bg: `${c.secondary}20`, text: c.secondary, label: 'COMPLETED' };
    case 'PENDING':
      return { bg: `${c.warning}20`, text: c.warning, label: 'PENDING' };
    default:
      return { bg: `${c.textMuted}20`, text: c.textMuted, label: status ?? 'UNKNOWN' };
  }
}

export default function ChallengeDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, userId } = useAuth();
  const { dark } = useSchoolTheme();
  const { showAlert } = useThemedAlert();

  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    backButton: {
      paddingTop: 50,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    backText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 15,
      color: colors.textSecondary,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      marginLeft: 16,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 8,
    },
    statusText: {
      fontFamily: typography.mono,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    topic: {
      fontFamily: typography.serifBold,
      fontSize: 24,
      color: colors.ink,
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    matchup: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    side: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    participantName: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.ink,
      textAlign: 'center',
    },
    roleLabel: {
      fontFamily: typography.mono,
      fontSize: 9,
      color: colors.textMuted,
      letterSpacing: 1,
    },
    votePct: {
      fontFamily: typography.serifBold,
      fontSize: 22,
      color: colors.ink,
    },
    vs: {
      fontFamily: typography.serifBold,
      fontSize: 16,
      color: colors.textMuted,
      paddingHorizontal: 8,
    },
    winnerBadge: {
      backgroundColor: colors.secondary,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
    },
    winnerText: {
      fontFamily: typography.mono,
      fontSize: 9,
      color: '#f4efe4',
      letterSpacing: 1,
    },
    totalVotes: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      textAlign: 'center',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 16,
    },
    argumentCard: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    argumentLabel: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    argumentText: {
      fontFamily: typography.sans,
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    voteSection: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    votePrompt: {
      fontFamily: typography.serifBold,
      fontSize: 16,
      color: colors.ink,
      textAlign: 'center',
      marginBottom: 12,
    },
    voteButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    voteBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    voteBtnText: {
      fontFamily: typography.sansBold,
      fontSize: 14,
      color: '#f4efe4',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    votedNotice: {
      marginHorizontal: 16,
      marginTop: 16,
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    votedText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
  }), [colors]);

  const fetchChallenge = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('challenges')
      .select(`
        *,
        challenger:profiles!challenges_challenger_id_fkey(id, username, display_name, avatar_url, dynasty_tier),
        challenged:profiles!challenges_challenged_id_fkey(id, username, display_name, avatar_url, dynasty_tier)
      `)
      .eq('id', id)
      .single();
    if (data) {
      setChallenge(data as unknown as ChallengeDetail);
    }
  }, [id]);

  const fetchUserVote = useCallback(async () => {
    if (!id || !userId) return;
    const { data } = await supabase
      .from('challenge_votes')
      .select('voted_for')
      .eq('challenge_id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      setUserVote(data.voted_for as string);
    }
  }, [id, userId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchChallenge(), fetchUserVote()]);
    } catch (err) {
      console.warn('Challenge: failed to load:', err);
    }
    setLoading(false);
    setRefreshing(false);
  }, [fetchChallenge, fetchUserVote]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const handleVote = async (votedFor: string) => {
    if (!session) {
      router.push('/(auth)/login' as never);
      return;
    }
    if (!id || !userId) return;
    if (userVote) {
      showAlert('Offsides', 'You have already voted on this challenge.');
      return;
    }

    setVoting(true);
    const { error } = await supabase.from('challenge_votes').insert({
      challenge_id: id,
      user_id: userId,
      voted_for: votedFor,
    });
    setVoting(false);

    if (error) {
      showAlert('Incomplete Pass', 'Could not record your vote. Try again.');
      return;
    }

    setUserVote(votedFor);
    // Refresh to get updated counts
    fetchChallenge();
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!challenge) {
    return (
      <View style={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <EmptyState title="Challenge not found" />
      </View>
    );
  }

  const statusStyle = getStatusStyle(challenge.status, colors);
  const challengerVotes = challenge.challenger_votes ?? 0;
  const challengedVotes = challenge.challenged_votes ?? 0;
  const totalVotes = challengerVotes + challengedVotes;
  const challengerPct = totalVotes > 0 ? Math.round((challengerVotes / totalVotes) * 100) : 0;
  const challengedPct = totalVotes > 0 ? Math.round((challengedVotes / totalVotes) * 100) : 0;

  const isActive = challenge.status === 'ACTIVE' || challenge.status === 'VOTING';
  const isCompleted = challenge.status === 'COMPLETED';
  const canVote = isActive && !userVote && session;

  const winnerId = challenge.winner_id;
  const winnerIsChallenger = winnerId === challenge.challenger?.id;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={dark}
        />
      }
    >
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      {/* Status */}
      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
        <Text style={[styles.statusText, { color: statusStyle.text }]}>
          {statusStyle.label}
        </Text>
      </View>

      {/* Topic */}
      <Text style={styles.topic}>{challenge.topic}</Text>

      {/* Participants with scores */}
      <View style={styles.matchup}>
        {/* Challenger side */}
        <View style={styles.side}>
          <Avatar
            url={challenge.challenger?.avatar_url}
            name={challenge.challenger?.display_name ?? challenge.challenger?.username}
            size={56}
            borderColor={isCompleted && winnerIsChallenger ? colors.secondary : undefined}
          />
          <Text style={styles.participantName}>
            {challenge.challenger?.display_name ?? challenge.challenger?.username ?? 'Unknown'}
          </Text>
          <Text style={styles.roleLabel}>CHALLENGER</Text>
          {totalVotes > 0 && (
            <Text style={styles.votePct}>{challengerPct}%</Text>
          )}
          {isCompleted && winnerIsChallenger && (
            <View style={styles.winnerBadge}>
              <Text style={styles.winnerText}>WINNER</Text>
            </View>
          )}
        </View>

        <Text style={styles.vs}>VS</Text>

        {/* Challenged side */}
        <View style={styles.side}>
          <Avatar
            url={challenge.challenged?.avatar_url}
            name={challenge.challenged?.display_name ?? challenge.challenged?.username}
            size={56}
            borderColor={isCompleted && !winnerIsChallenger && winnerId ? colors.secondary : undefined}
          />
          <Text style={styles.participantName}>
            {challenge.challenged?.display_name ?? challenge.challenged?.username ?? 'Unknown'}
          </Text>
          <Text style={styles.roleLabel}>CHALLENGED</Text>
          {totalVotes > 0 && (
            <Text style={styles.votePct}>{challengedPct}%</Text>
          )}
          {isCompleted && !winnerIsChallenger && winnerId && (
            <View style={styles.winnerBadge}>
              <Text style={styles.winnerText}>WINNER</Text>
            </View>
          )}
        </View>
      </View>

      {/* Vote total */}
      {totalVotes > 0 && (
        <Text style={styles.totalVotes}>
          {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
        </Text>
      )}

      {/* Arguments */}
      {challenge.challenger_argument && (
        <View style={styles.argumentCard}>
          <Text style={styles.argumentLabel}>
            {challenge.challenger?.display_name ?? challenge.challenger?.username ?? 'Challenger'}'s Argument
          </Text>
          <Text style={styles.argumentText}>{challenge.challenger_argument}</Text>
        </View>
      )}

      {challenge.challenged_argument && (
        <View style={styles.argumentCard}>
          <Text style={styles.argumentLabel}>
            {challenge.challenged?.display_name ?? challenge.challenged?.username ?? 'Challenged'}'s Argument
          </Text>
          <Text style={styles.argumentText}>{challenge.challenged_argument}</Text>
        </View>
      )}

      {/* Vote buttons */}
      {canVote && (
        <View style={styles.voteSection}>
          <Text style={styles.votePrompt}>Cast your vote</Text>
          <View style={styles.voteButtons}>
            <Pressable
              style={[styles.voteBtn, { backgroundColor: dark }]}
              onPress={() => challenge.challenger && handleVote(challenge.challenger.id)}
              disabled={voting}
            >
              <Text style={styles.voteBtnText}>
                {challenge.challenger?.username ?? 'Challenger'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.voteBtn, { backgroundColor: colors.ink }]}
              onPress={() => challenge.challenged && handleVote(challenge.challenged.id)}
              disabled={voting}
            >
              <Text style={styles.voteBtnText}>
                {challenge.challenged?.username ?? 'Challenged'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* User already voted */}
      {userVote && (
        <View style={styles.votedNotice}>
          <Text style={styles.votedText}>
            You voted for{' '}
            {userVote === challenge.challenger?.id
              ? (challenge.challenger?.display_name ?? challenge.challenger?.username)
              : (challenge.challenged?.display_name ?? challenge.challenged?.username)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
