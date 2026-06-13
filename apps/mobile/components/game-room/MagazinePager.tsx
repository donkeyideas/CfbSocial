import { useMemo, useRef, useState } from 'react';
import {
  FlatList, Image as RNImage, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { momentOf, type IssueEntry, type IssueItem } from './types';

type Page =
  | { kind: 'cover'; item: IssueItem }
  | { kind: 'moment'; item: IssueItem; index: number }
  | { kind: 'back' };

export function MagazinePager({ entry }: { entry: IssueEntry }) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  // Pager sits inside an 8px-padded wrapper, so the viewport is width - 16.
  // The page item must match that exactly for pagingEnabled to snap cleanly.
  const pageW = width - 16;
  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList<Page>>(null);

  const masthead = (entry.issue.title ?? '').trim() || 'Game Room Weekly';
  const valid = entry.items.filter((it) => it.post && (it.post.media_urls?.length ?? 0) > 0);

  const pages: Page[] = useMemo(() => {
    if (valid.length === 0) return [];
    const cover = valid.find((it) => it.post?.id === entry.issue.cover_post_id) ?? valid[0]!;
    const list: Page[] = [{ kind: 'cover', item: cover }];
    valid.forEach((it, index) => list.push({ kind: 'moment', item: it, index }));
    list.push({ kind: 'back' });
    return list;
  }, [valid, entry.issue.cover_post_id]);

  const styles = useMemo(() => StyleSheet.create({
    wrap: { flex: 1 },
    page: { width: pageW, paddingHorizontal: 4 },
    sheet: { flex: 1, backgroundColor: colors.surfaceRaised, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    // cover
    coverImg: { width: '100%', height: '100%' },
    coverFrame: { flex: 1, backgroundColor: colors.dark, position: 'relative' },
    veil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.32)' },
    coverTop: { position: 'absolute', top: 18, left: 16, right: 16, alignItems: 'center' },
    coverLogo: { fontFamily: typography.serifBold, fontSize: 22, color: '#fff', letterSpacing: 2, textAlign: 'center' },
    coverIssue: { fontFamily: typography.mono, fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: 3, marginTop: 4 },
    coverBottom: { position: 'absolute', left: 18, right: 18, bottom: 24 },
    kicker: { fontFamily: typography.mono, fontSize: 10, color: '#c9a84c', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
    headline: { fontFamily: typography.serifBold, fontSize: 26, color: '#fff', lineHeight: 30 },
    dek: { fontFamily: typography.serif, fontSize: 14, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', marginTop: 8, lineHeight: 20 },
    byline: { fontFamily: typography.mono, fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 10 },
    // moment page
    photoWrap: { width: '100%', aspectRatio: 1.2, backgroundColor: colors.dark, position: 'relative' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', height: '100%' },
    bug: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    bugText: { fontFamily: typography.mono, fontSize: 11, color: '#fff', fontWeight: '700' },
    text: { padding: 16 },
    pageKicker: { fontFamily: typography.mono, fontSize: 10, color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
    pageHead: { fontFamily: typography.serifBold, fontSize: 22, color: colors.textPrimary, lineHeight: 26, marginBottom: 8 },
    pageBody: { fontFamily: typography.sans, fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
    pageBy: { fontFamily: typography.mono, fontSize: 11, color: colors.textMuted, marginTop: 12 },
    back: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
    backLogo: { fontFamily: typography.serifBold, fontSize: 24, color: colors.textPrimary, letterSpacing: 2, marginBottom: 12 },
    backText: { fontFamily: typography.serif, fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
    dotActive: { backgroundColor: colors.crimson, width: 18 },
  }), [colors, pageW]);

  if (pages.length === 0) return null;

  const renderPage = ({ item }: { item: Page }) => {
    if (item.kind === 'cover') {
      const m = momentOf(item.item.post);
      const cover = item.item.post!;
      return (
        <View style={styles.page}>
          <View style={styles.sheet}>
            <View style={styles.coverFrame}>
              <RNImage source={{ uri: cover.media_urls[0]! }} style={styles.coverImg} resizeMode="cover" />
              <View style={styles.veil} />
              <View style={styles.coverTop}>
                <Text style={styles.coverLogo}>{masthead.toUpperCase()}</Text>
                <Text style={styles.coverIssue}>ISSUE NO. {entry.issue.issue_number}</Text>
              </View>
              <View style={styles.coverBottom}>
                <Text style={styles.kicker}>Cover Story · Moment of the Week</Text>
                <Text style={styles.headline}>{(entry.issue.cover_headline ?? '').trim() || (m?.title as string) || cover.content || 'A moment worth framing'}</Text>
                {(entry.issue.cover_subtitle ?? '').trim() ? <Text style={styles.dek}>{entry.issue.cover_subtitle}</Text> : null}
                <Text style={styles.byline}>@{cover.author?.username ?? 'coach'}{m?.our_score != null ? ` · ${m.our_score}–${m.opp_score}` : ''}</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }
    if (item.kind === 'moment') {
      const post = item.item.post!;
      const m = momentOf(post);
      const imgs = (post.media_urls ?? []).slice(0, 4);
      const tag = post.school?.abbreviation ?? ((m?.is_team_builder as boolean) ? 'Team Builder' : 'Moment');
      const cellW = imgs.length === 1 ? '100%' : '50%';
      const cellH = imgs.length <= 2 ? '100%' : '50%';
      return (
        <View style={styles.page}>
          <View style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.photoWrap}>
                <View style={styles.grid}>
                  {imgs.map((u, k) => (
                    <RNImage key={k} source={{ uri: u }} style={{ width: cellW as never, height: cellH as never }} resizeMode="cover" />
                  ))}
                </View>
                {(m?.opponent || m?.our_score != null || m?.result) ? (
                  <View style={styles.bug}>
                    <Text style={styles.bugText}>{tag} {(m?.our_score as number) ?? ''}</Text>
                    <Text style={styles.bugText}>{(m?.game_state as string) ?? (m?.our_score != null ? 'FINAL' : 'vs')}</Text>
                    <Text style={styles.bugText}>{(m?.opponent as string) ?? ''} {(m?.opp_score as number) ?? ''}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.text}>
                <Text style={styles.pageKicker}>{[item.item.page_label ?? `Page ${item.index + 2}`, m?.opponent ? `vs ${m.opponent}` : '', m?.week].filter(Boolean).join(' · ')}</Text>
                <Text style={styles.pageHead}>{(m?.title as string) || 'Untitled moment'}</Text>
                {post.content ? <Text style={styles.pageBody}>{post.content}</Text> : null}
                <Text style={styles.pageBy}>Uploaded by @{post.author?.username ?? 'coach'} · {post.touchdown_count ?? 0} TD</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.page}>
        <View style={styles.sheet}>
          <View style={styles.back}>
            <Text style={styles.backLogo}>GAME ROOM</Text>
            <Text style={styles.backText}>Your save deserves a cover. Upload your moments and make next week&apos;s issue.</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => `pg-${i}`}
        renderItem={renderPage}
        getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / pageW))}
      />
      <View style={styles.dots}>
        {pages.map((_, i) => <View key={i} style={[styles.dot, i === page && styles.dotActive]} />)}
      </View>
    </View>
  );
}
