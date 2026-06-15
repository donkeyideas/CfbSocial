import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme/ThemeProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { typography } from '@/lib/theme/typography';
import { AppHeader } from '@/components/navigation/AppHeader';
import { getPublicIssueById } from '@cfb-social/api';
import { MagazinePager } from '@/components/game-room/MagazinePager';
import type { IssueEntry } from '@/components/game-room/types';

export default function PublicMagazineScreen() {
  const colors = useColors();
  const { dark } = useSchoolTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<(IssueEntry & { issue: { owner?: { username: string } | null } }) | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    try {
      const data = await getPublicIssueById(supabase, id).catch(() => null);
      setEntry(data as never);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.paper },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    back: { fontFamily: typography.mono, fontSize: 11, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
    masthead: { fontFamily: typography.serifBold, fontSize: 24, color: colors.textPrimary, textAlign: 'center' },
    byline: { fontFamily: typography.mono, fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
    bylineLink: { color: colors.crimson },
    pagerWrap: { flex: 1, paddingHorizontal: 8, paddingBottom: 8 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
    emptyText: { fontFamily: typography.serif, fontSize: 16, color: colors.textSecondary, textAlign: 'center' },
    footLink: { fontFamily: typography.sansSemiBold, fontSize: 14, color: colors.crimson, marginTop: 16 },
  }), [colors]);

  const owner = (entry?.issue as { owner?: { username: string } | null })?.owner ?? null;

  return (
    <View style={styles.container}>
      <AppHeader />
      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={dark} /></View>
      ) : !entry || entry.items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>This magazine isn&apos;t available.</Text>
          <Pressable onPress={() => router.push('/game-room' as never)}><Text style={styles.footLink}>Go to the Newsstand →</Text></Pressable>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Pressable onPress={() => router.push('/game-room' as never)}><Text style={styles.back}>← Newsstand</Text></Pressable>
            <Text style={styles.masthead}>{entry.issue.title || 'Game Room Weekly'}</Text>
            <Text style={styles.byline}>
              Issue No. {entry.issue.issue_number}
              {owner?.username ? <Text> · by <Text style={styles.bylineLink} onPress={() => router.push(`/profile/${owner.username}` as never)}>@{owner.username}</Text></Text> : null}
            </Text>
          </View>
          <View style={styles.pagerWrap}><MagazinePager entry={entry} /></View>
        </>
      )}
    </View>
  );
}
