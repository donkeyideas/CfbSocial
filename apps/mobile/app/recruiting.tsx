import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Text,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConferenceFilter } from '@/components/recruiting/ConferenceFilter';
import { SchoolCard, type RecruitingSchool } from '@/components/recruiting/SchoolCard';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

type SortMode = 'activity' | 'claims' | 'name';

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'activity', label: 'Activity' },
  { key: 'claims', label: 'Claims' },
  { key: 'name', label: 'Name' },
];

export default function RecruitingScreen() {
  const colors = useColors();
  const { dark } = useSchoolTheme();
  const [schools, setSchools] = useState<RecruitingSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conference, setConference] = useState('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('activity');

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
    sortRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sortLabel: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    sortPill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    sortPillText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 11,
    },
    listContent: {
      padding: 8,
      paddingBottom: 40,
    },
    columnWrapper: {
      justifyContent: 'space-between',
    },
  }), [colors]);

  const fetchSchools = useCallback(async () => {
    const { data, error } = await supabase
      .from('schools')
      .select(
        'id, name, abbreviation, primary_color, slug, conference, portal_players:portal_players!portal_players_previous_school_id_fkey(id), roster_claims:roster_claims(id)'
      )
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      const mapped: RecruitingSchool[] = (data as any[]).map((s) => ({
        id: s.id,
        name: s.name,
        abbreviation: s.abbreviation,
        primary_color: s.primary_color || colors.ink,
        slug: s.slug,
        conference: s.conference,
        portalCount: Array.isArray(s.portal_players) ? s.portal_players.length : 0,
        claimsCount: Array.isArray(s.roster_claims) ? s.roster_claims.length : 0,
      }));
      setSchools(mapped);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSchools();
  };

  const renderItem = useCallback(
    ({ item }: { item: RecruitingSchool }) => <SchoolCard school={item} />,
    []
  );

  // Filter by conference
  const filtered = useMemo(() => {
    if (conference === 'ALL') return schools;
    return schools.filter((s) => s.conference === conference);
  }, [schools, conference]);

  // Sort
  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortMode) {
      case 'activity':
        list.sort(
          (a, b) =>
            b.portalCount + b.claimsCount - (a.portalCount + a.claimsCount)
        );
        break;
      case 'claims':
        list.sort((a, b) => b.claimsCount - a.claimsCount);
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return list;
  }, [filtered, sortMode]);

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <SectionLabel text="Recruiting Desk" />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={dark} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />
      <SectionLabel text="Recruiting Desk" />

      {/* Conference filter */}
      <ConferenceFilter active={conference} onSelect={setConference} />

      {/* Sort options */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort:</Text>
        {SORT_OPTIONS.map((opt) => {
          const isActive = sortMode === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={[
                styles.sortPill,
                isActive
                  ? { backgroundColor: dark }
                  : { borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => setSortMode(opt.key)}
            >
              <Text
                style={[
                  styles.sortPillText,
                  { color: isActive ? '#f4efe4' : colors.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* School grid */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderItem}
        removeClippedSubviews
        maxToRenderPerBatch={8}
        initialNumToRender={6}
        windowSize={5}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={dark}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No schools found"
            subtitle="Try a different conference filter."
          />
        }
      />
    </View>
  );
}
