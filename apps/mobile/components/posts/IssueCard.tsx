import { memo, useMemo } from 'react';
import { Image as RNImage, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { PostHeader } from './PostHeader';
import type { PostData } from './PostCard';

export const IssueCard = memo(function IssueCard({ post }: { post: PostData }) {
  const colors = useColors();
  const router = useRouter();
  const cover = post.media_urls?.[0];

  const styles = useMemo(() => StyleSheet.create({
    card: { backgroundColor: colors.surfaceRaised, borderRadius: 6, marginHorizontal: 12, marginVertical: 4, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
    cover: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.dark, position: 'relative' },
    coverImg: { width: '100%', height: '100%' },
    wm: { position: 'absolute', bottom: 6, right: 8, fontFamily: typography.serifBold, fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: 1 },
    body: { padding: 12 },
    eyebrow: { fontFamily: typography.mono, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, color: colors.crimson },
    title: { fontFamily: typography.serifBold, fontSize: 18, color: colors.textPrimary, lineHeight: 23, marginTop: 4, marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    cta: { fontFamily: typography.sansSemiBold, fontSize: 13, color: colors.crimson },
  }), [colors]);

  const open = () => router.push(`/game-room/issue/${post.id}` as never);

  return (
    <View style={styles.card}>
      {cover ? (
        <Pressable style={styles.cover} onPress={open}>
          <RNImage source={{ uri: cover }} style={styles.coverImg} resizeMode="cover" />
          <Text style={styles.wm}>CFB SOCIAL</Text>
        </Pressable>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.eyebrow}>New in the Game Room</Text>
        <Pressable onPress={open}><Text style={styles.title}>{post.content}</Text></Pressable>
        <View style={styles.row}>
          <PostHeader author={post.author ?? null} createdAt={post.created_at} />
          <Pressable onPress={open}><Text style={styles.cta}>Read the issue →</Text></Pressable>
        </View>
      </View>
    </View>
  );
});
