import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { AppHeader } from '@/components/navigation/AppHeader';
import { RivalryTabs, type RivalryTab } from '@/components/rivalry/RivalryTabs';
import { FightCard, type RivalryData } from '@/components/rivalry/FightCard';
import { ChallengeCard, type ChallengeData } from '@/components/rivalry/ChallengeCard';
import { CreateChallengeModal } from '@/components/rivalry/CreateChallengeModal';
import { ThemedAlert } from '@/components/ui/ThemedAlert';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

const RIVALRY_SELECT = `
  *,
  school_1:schools!rivalries_school_1_id_fkey(id, name, abbreviation, primary_color, secondary_color, slug, logo_url),
  school_2:schools!rivalries_school_2_id_fkey(id, name, abbreviation, primary_color, secondary_color, slug, logo_url)
`;

const CHALLENGE_SELECT = `
  *,
  challenger:profiles!challenges_challenger_id_fkey(id, username, display_name, avatar_url, dynasty_tier),
  challenged:profiles!challenges_challenged_id_fkey(id, username, display_name, avatar_url, dynasty_tier)
`;

export default function RivalryScreen() {
  const colors = useColors();
  const { session, profile } = useAuth();
  const userId = profile?.id ?? null;
  const { dark } = useSchoolTheme();

  const [activeTab, setActiveTab] = useState<RivalryTab>('active');
  const [rivalries, setRivalries] = useState<RivalryData[]>([]);
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [pastRivalries, setPastRivalries] = useState<RivalryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challengeModalVisible, setChallengeModalVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    listContent: {
      padding: 16,
      gap: 14,
      paddingBottom: 80,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      left: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 5,
    },
    fabText: {
      fontFamily: typography.sansBold,
      fontSize: 28,
      color: '#f4efe4',
      marginTop: -2,
    },
  }), [colors]);

  // ---------------------------------------------------------------
  // Fetch active rivalries
  // ---------------------------------------------------------------
  const fetchActiveRivalries = useCallback(async () => {
    const { data } = await supabase
      .from('rivalries')
      .select(RIVALRY_SELECT)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      setRivalries(data as unknown as RivalryData[]);
    }
  }, []);

  // ---------------------------------------------------------------
  // Fetch challenges
  // ---------------------------------------------------------------
  const fetchChallenges = useCallback(async () => {
    const { data } = await supabase
      .from('challenges')
      .select(CHALLENGE_SELECT)
      .in('status', ['PENDING', 'ACTIVE', 'VOTING'])
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) {
      setChallenges(data as unknown as ChallengeData[]);
    }
  }, []);

  // ---------------------------------------------------------------
  // Fetch past rivalries
  // ---------------------------------------------------------------
  const fetchPastRivalries = useCallback(async () => {
    const { data } = await supabase
      .from('rivalries')
      .select(RIVALRY_SELECT)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) {
      setPastRivalries(data as unknown as RivalryData[]);
    }
  }, []);

  // ---------------------------------------------------------------
  // Fetch for the active tab
  // ---------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'active') {
      await fetchActiveRivalries();
    } else if (activeTab === 'challenges') {
      await fetchChallenges();
    } else {
      await fetchPastRivalries();
    }
    setLoading(false);
    setRefreshing(false);
  }, [activeTab, fetchActiveRivalries, fetchChallenges, fetchPastRivalries]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------
  // Pull to refresh
  // ---------------------------------------------------------------
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ---------------------------------------------------------------
  // Vote on rivalry
  // ---------------------------------------------------------------
  const handleRivalryVote = async (rivalryId: string, schoolId: string) => {
    if (!userId) return;

    // Check if user already voted
    const { data: existing } = await supabase
      .from('rivalry_votes')
      .select('id')
      .eq('rivalry_id', rivalryId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      setAlertConfig({
        visible: true,
        title: 'Already Voted',
        message: 'You have already cast your vote in this rivalry.',
      });
      return;
    }

    const { error } = await supabase.from('rivalry_votes').insert({
      rivalry_id: rivalryId,
      school_id: schoolId,
      user_id: userId,
    });

    if (error) {
      setAlertConfig({
        visible: true,
        title: 'Incomplete Pass',
        message: 'Could not record your vote. Try again.',
      });
      return;
    }

    // Optimistic update: increment vote count locally
    setRivalries((prev) =>
      prev.map((r) => {
        if (r.id !== rivalryId) return r;
        const isSchool1 = r.school_1?.id === schoolId;
        return {
          ...r,
          school_1_vote_count: (r.school_1_vote_count ?? 0) + (isSchool1 ? 1 : 0),
          school_2_vote_count: (r.school_2_vote_count ?? 0) + (isSchool1 ? 0 : 1),
        };
      })
    );
  };

  // ---------------------------------------------------------------
  // Challenge created callback
  // ---------------------------------------------------------------
  const handleChallengeCreated = () => {
    if (activeTab === 'challenges') {
      fetchChallenges();
    }
  };

  // ---------------------------------------------------------------
  // Render items
  // ---------------------------------------------------------------
  const renderRivalryItem = useCallback(
    ({ item }: { item: RivalryData }) => (
      <FightCard rivalry={item} onVote={handleRivalryVote} />
    ),
    []
  );

  const renderChallengeItem = useCallback(
    ({ item }: { item: ChallengeData }) => (
      <ChallengeCard challenge={item} />
    ),
    []
  );

  const renderPastItem = useCallback(
    ({ item }: { item: RivalryData }) => (
      <FightCard rivalry={item} />
    ),
    []
  );

  // ---------------------------------------------------------------
  // Empty states
  // ---------------------------------------------------------------
  const activeEmpty = (
    <EmptyState
      title="No active rivalries"
      subtitle="Check back when a new matchup drops."
    />
  );

  const challengesEmpty = (
    <EmptyState
      title="No open challenges"
      subtitle="Be the first to throw down a challenge."
    />
  );

  const pastEmpty = (
    <EmptyState
      title="No past results yet"
      subtitle="Rivalries will appear here after they conclude."
    />
  );

  return (
    <View style={styles.container}>
      <AppHeader />
      <SectionLabel text="Rivalry Ring" />
      <RivalryTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {loading ? (
        <LoadingScreen />
      ) : activeTab === 'active' ? (
        <FlatList
          data={rivalries}
          keyExtractor={(item) => item.id}
          renderItem={renderRivalryItem}
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
          ListEmptyComponent={activeEmpty}
        />
      ) : activeTab === 'challenges' ? (
        <FlatList
          data={challenges}
          keyExtractor={(item) => item.id}
          renderItem={renderChallengeItem}
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
          ListEmptyComponent={challengesEmpty}
        />
      ) : (
        <FlatList
          data={pastRivalries}
          keyExtractor={(item) => item.id}
          renderItem={renderPastItem}
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
          ListEmptyComponent={pastEmpty}
        />
      )}

      {/* FAB: Create Challenge */}
      {session && (
        <Pressable
          style={[styles.fab, { backgroundColor: dark }]}
          onPress={() => setChallengeModalVisible(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      )}

      <CreateChallengeModal
        visible={challengeModalVisible}
        onClose={() => setChallengeModalVisible(false)}
        onCreated={handleChallengeCreated}
      />

      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onDismiss={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}
