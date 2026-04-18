import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
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
import { EmptyState } from '@/components/ui/EmptyState';
import { PredictionCard, type PredictionData } from '@/components/predictions/PredictionCard';
import { PredictionLeaderboard } from '@/components/predictions/PredictionLeaderboard';
import { CreatePredictionModal } from '@/components/predictions/CreatePredictionModal';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

type PredictionsTab = 'all' | 'leaderboard';

const PREDICTION_SELECT = `
  *,
  post:posts!predictions_post_id_fkey(
    id, content, author_id, created_at,
    author:profiles!posts_author_id_fkey(
      id, username, display_name, avatar_url, dynasty_tier,
      school:schools!profiles_school_id_fkey(abbreviation, primary_color, secondary_color, slug)
    )
  )
`;

export default function PredictionsScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const { dark } = useSchoolTheme();
  const [activeTab, setActiveTab] = useState<PredictionsTab>('all');
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);

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
      fontSize: 14,
      color: colors.textMuted,
    },
    loaderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      padding: 16,
      gap: 12,
      paddingBottom: 80,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
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

  const fetchPredictions = useCallback(async () => {
    const { data, error } = await supabase
      .from('predictions')
      .select(PREDICTION_SELECT)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setPredictions(data as unknown as PredictionData[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'all') {
      fetchPredictions();
    }
  }, [fetchPredictions, activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPredictions();
  };

  const renderItem = useCallback(
    ({ item }: { item: PredictionData }) => <PredictionCard prediction={item} />,
    []
  );

  const handleCreated = () => {
    fetchPredictions();
  };

  const tabs: { key: PredictionsTab; label: string }[] = [
    { key: 'all', label: 'All Predictions' },
    { key: 'leaderboard', label: 'Leaderboard' },
  ];

  return (
    <View style={styles.container}>
      <AppHeader />
      <SectionLabel text="Predictions" />

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
      {activeTab === 'all' ? (
        loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={dark} />
          </View>
        ) : (
          <FlatList
            data={predictions}
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
                title="No predictions filed"
                subtitle="Be the first to put your take on the record."
              />
            }
          />
        )
      ) : (
        <PredictionLeaderboard />
      )}

      {/* Floating "+" button */}
      {session && (
        <Pressable
          style={[styles.fab, { backgroundColor: dark }]}
          onPress={() => setComposerVisible(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      )}

      <CreatePredictionModal
        visible={composerVisible}
        onClose={() => setComposerVisible(false)}
        onCreated={handleCreated}
      />
    </View>
  );
}
