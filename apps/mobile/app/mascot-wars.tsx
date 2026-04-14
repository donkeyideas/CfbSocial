import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { EmptyState } from '@/components/ui/EmptyState';
import { MatchupCard, type MatchupData } from '@/components/mascot-wars/MatchupCard';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

const ROUND_LABELS: Record<number, string> = {
  1: 'Round of 64',
  2: 'Round of 32',
  3: 'Sweet 16',
  4: 'Elite 8',
  5: 'Final 4',
  6: 'Championship',
};

const MATCHUP_SELECT = `
  *,
  school_1:schools!mascot_matchups_school_1_id_fkey(id, name, abbreviation, primary_color, mascot, slug),
  school_2:schools!mascot_matchups_school_2_id_fkey(id, name, abbreviation, primary_color, mascot, slug)
`;

export default function MascotWarsScreen() {
  const colors = useColors();
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const { dark } = useSchoolTheme();
  const [bracketId, setBracketId] = useState<string | null>(null);
  const [bracketName, setBracketName] = useState<string>('');
  const [matchupsByRound, setMatchupsByRound] = useState<Record<number, MatchupData[]>>({});
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [rounds, setRounds] = useState<number[]>([]);
  const [activeRound, setActiveRound] = useState<number>(1);
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
    bracketName: {
      fontFamily: typography.serifBold,
      fontSize: 18,
      color: colors.textPrimary,
      textAlign: 'center',
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    roundScrollContainer: {
      maxHeight: 44,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    roundScroll: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    roundPill: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
    },
    roundPillText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 12,
    },
    listContent: {
      padding: 16,
      gap: 12,
      paddingBottom: 40,
    },
  }), [colors]);

  const fetchData = useCallback(async () => {
    // 1. Fetch active bracket
    const { data: bracket } = await supabase
      .from('mascot_brackets')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!bracket) {
      setBracketId(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setBracketId(bracket.id);
    setBracketName(bracket.name || 'Mascot Wars');

    // 2. Fetch matchups
    const { data: matchups } = await supabase
      .from('mascot_matchups')
      .select(MATCHUP_SELECT)
      .eq('bracket_id', bracket.id)
      .order('round', { ascending: true })
      .order('position', { ascending: true });

    if (matchups) {
      const grouped: Record<number, MatchupData[]> = {};
      const roundSet = new Set<number>();

      for (const m of matchups as unknown as MatchupData[]) {
        const r = m.round;
        roundSet.add(r);
        if (!grouped[r]) grouped[r] = [];
        grouped[r].push(m);
      }

      const sortedRounds = Array.from(roundSet).sort((a, b) => a - b);
      setMatchupsByRound(grouped);
      setRounds(sortedRounds);

      // Default to the latest round with unresolved matchups, or last round
      const latestOpen = sortedRounds.find(
        (r) => grouped[r]?.some((m) => m.winner_id === null)
      );
      setActiveRound(latestOpen ?? sortedRounds[sortedRounds.length - 1] ?? 1);
    }

    // 3. Fetch user votes
    if (userId) {
      const { data: votes } = await supabase
        .from('mascot_votes')
        .select('matchup_id, school_id')
        .eq('user_id', userId);

      if (votes) {
        const voteMap: Record<string, string> = {};
        for (const v of votes) {
          voteMap[v.matchup_id] = v.school_id;
        }
        setUserVotes(voteMap);
      }
    }

    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleVoted = (matchupId: string, schoolId: string) => {
    setUserVotes((prev) => ({ ...prev, [matchupId]: schoolId }));
  };

  const renderItem = useCallback(
    ({ item }: { item: MatchupData }) => (
      <MatchupCard
        matchup={item}
        userVoteSchoolId={userVotes[item.id] || null}
        onVoted={handleVoted}
      />
    ),
    [userVotes]
  );

  const currentMatchups = matchupsByRound[activeRound] || [];

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <SectionLabel text="Mascot Wars" />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={dark} />
        </View>
      </View>
    );
  }

  if (!bracketId) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <SectionLabel text="Mascot Wars" />
        <EmptyState
          title="No active bracket"
          subtitle="Check back when the next Mascot Wars tournament begins."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />
      <SectionLabel text="Mascot Wars" />

      {/* Bracket name */}
      <Text style={styles.bracketName}>{bracketName}</Text>

      {/* Round selector - horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.roundScroll}
        style={styles.roundScrollContainer}
      >
        {rounds.map((round) => {
          const isActive = activeRound === round;
          const label = ROUND_LABELS[round] || `Round ${round}`;
          return (
            <Pressable
              key={round}
              style={[
                styles.roundPill,
                isActive
                  ? { backgroundColor: dark }
                  : { borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => setActiveRound(round)}
            >
              <Text
                style={[
                  styles.roundPillText,
                  { color: isActive ? '#f4efe4' : colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Matchups list */}
      <FlatList
        data={currentMatchups}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        removeClippedSubviews
        maxToRenderPerBatch={8}
        initialNumToRender={6}
        windowSize={5}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={dark}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No matchups this round"
            subtitle="This round has not been seeded yet."
          />
        }
      />
    </View>
  );
}
