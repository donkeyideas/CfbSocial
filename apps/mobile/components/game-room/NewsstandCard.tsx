import { memo, useMemo } from 'react';
import { Image as RNImage, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import type { NewsstandIssue } from './types';

export const NewsstandCard = memo(function NewsstandCard({ m, width }: { m: NewsstandIssue; width: number }) {
  const colors = useColors();
  const router = useRouter();
  const accent = m.coverAccent || colors.crimson;

  const styles = useMemo(() => StyleSheet.create({
    card: { width },
    cover: { width: '100%', aspectRatio: 3 / 4, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.dark, position: 'relative', borderWidth: 1, borderColor: colors.border },
    img: { width: '100%', height: '100%' },
    veil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.34)' },
    tag: { position: 'absolute', top: 8, left: 8, backgroundColor: accent, color: '#fff', fontFamily: typography.sansSemiBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3, overflow: 'hidden' },
    plate: { position: 'absolute', left: 10, right: 10, bottom: 10 },
    masthead: { fontFamily: typography.serifBold, fontSize: 15, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 18 },
    issue: { fontFamily: typography.mono, fontSize: 9, color: '#c9a84c', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 },
    meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    by: { fontFamily: typography.mono, fontSize: 11, color: colors.crimson, fontWeight: '700' },
    pages: { fontFamily: typography.mono, fontSize: 11, color: colors.textMuted },
  }), [colors, width, accent]);

  const open = () => router.push(`/game-room/m/${m.id}` as never);

  return (
    <Pressable style={styles.card} onPress={open}>
      <View style={styles.cover}>
        {m.coverUrl ? <RNImage source={{ uri: m.coverUrl }} style={styles.img} resizeMode="cover" /> : null}
        <View style={styles.veil} />
        {m.school ? <Text style={styles.tag}>{m.school}</Text> : null}
        <View style={styles.plate}>
          <Text style={styles.masthead} numberOfLines={3}>{m.title}</Text>
          <Text style={styles.issue}>Issue No. {m.issueNumber}</Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.by} numberOfLines={1}>@{m.ownerUsername ?? 'coach'}</Text>
        <Text style={styles.pages}>{m.pageCount} {m.pageCount === 1 ? 'page' : 'pages'}</Text>
      </View>
    </Pressable>
  );
});
