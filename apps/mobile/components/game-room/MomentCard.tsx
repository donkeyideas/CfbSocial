import { useMemo } from 'react';
import { Image as RNImage, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, useTheme } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { readableSchoolColor } from '@/lib/utils/colorContrast';
import type { MomentItem } from './types';

interface Props {
  m: MomentItem;
  width: number;
  currentUsername: string | null;
  assignment: { label: string; page: number; isCover: boolean } | null;
  onEdit: (m: MomentItem) => void;
}

export function MomentCard({ m, width, currentUsername, assignment, onEdit }: Props) {
  const colors = useColors();
  const { isDark } = useTheme();
  const router = useRouter();
  const post = m.post;

  const accent = readableSchoolColor(post?.school?.primary_color || colors.crimson, isDark);
  const tag = post?.school?.abbreviation ?? (m.is_team_builder ? 'TB' : 'Moment');
  const score = m.our_score != null && m.opp_score != null ? `${tag} ${m.our_score}–${m.opp_score}` : m.result ?? '';
  const owned = !!currentUsername && post?.author?.username === currentUsername;
  const img = post?.media_urls?.[0];

  const styles = useMemo(() => StyleSheet.create({
    card: { width, marginBottom: 12, backgroundColor: colors.surfaceRaised, borderRadius: 6, borderLeftWidth: 4, borderLeftColor: accent, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
    frame: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.dark, position: 'relative' },
    img: { width: '100%', height: '100%' },
    tag: { position: 'absolute', top: 6, left: 6, backgroundColor: accent, color: '#fff', fontFamily: typography.mono, fontSize: 9, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, overflow: 'hidden' },
    count: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontFamily: typography.mono, fontSize: 9, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, overflow: 'hidden' },
    score: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', fontFamily: typography.mono, fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, overflow: 'hidden' },
    body: { padding: 8 },
    cap: { fontFamily: typography.serifBold, fontSize: 13, color: colors.textPrimary, lineHeight: 17 },
    issueRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, flexWrap: 'wrap' },
    issueTag: { fontFamily: typography.mono, fontSize: 8, fontWeight: '800', textTransform: 'uppercase', color: colors.crimson, borderWidth: 1, borderColor: colors.crimson, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, overflow: 'hidden' },
    issueLabel: { fontFamily: typography.mono, fontSize: 9, color: colors.textMuted, flexShrink: 1 },
    issueNone: { fontFamily: typography.mono, fontSize: 9, color: colors.textMuted, fontStyle: 'italic', marginTop: 6 },
    foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    footUser: { fontFamily: typography.mono, fontSize: 9, color: colors.textMuted },
    editBtn: { fontFamily: typography.sansSemiBold, fontSize: 10, color: colors.crimson },
    td: { fontFamily: typography.mono, fontSize: 9, color: colors.textMuted },
  }), [colors, accent, width]);

  if (!post) return null;

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/post/${post.id}` as never)}>
      <View style={styles.frame}>
        {img ? <RNImage source={{ uri: img }} style={styles.img} resizeMode="cover" /> : null}
        <Text style={styles.tag}>{tag}</Text>
        {post.media_urls && post.media_urls.length > 1 ? <Text style={styles.count}>1/{post.media_urls.length}</Text> : null}
        {score ? <Text style={styles.score}>{score}{m.week ? ` · ${m.week}` : ''}</Text> : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.cap} numberOfLines={2}>{m.title || post.content || 'Untitled moment'}</Text>
        {assignment ? (
          <View style={styles.issueRow}>
            <Text style={styles.issueTag}>{assignment.isCover ? 'Cover' : `Pg ${assignment.page}`}</Text>
            <Text style={styles.issueLabel} numberOfLines={1}>{assignment.label}</Text>
          </View>
        ) : (
          <Text style={styles.issueNone}>Not in an issue</Text>
        )}
        <View style={styles.foot}>
          <Text style={styles.footUser}>@{post.author?.username ?? 'unknown'}</Text>
          {owned ? (
            <Pressable onPress={() => onEdit(m)} hitSlop={8}><Text style={styles.editBtn}>Edit</Text></Pressable>
          ) : (
            <Text style={styles.td}>{post.touchdown_count} TD</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
