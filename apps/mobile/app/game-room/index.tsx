import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  getMoments, getOwnerIssues, getPublicIssues, getLeagues, getCommissionerRequests, getMyLeagueIds, shareIssueToFeed,
} from '@cfb-social/api';
import { MomentCard } from '@/components/game-room/MomentCard';
import { NewsstandCard } from '@/components/game-room/NewsstandCard';
import { MomentComposer } from '@/components/game-room/MomentComposer';
import { MomentEditModal } from '@/components/game-room/MomentEditModal';
import { MagazinePager } from '@/components/game-room/MagazinePager';
import { IssueManagerModal } from '@/components/game-room/IssueManagerModal';
import { LeagueCard } from '@/components/game-room/LeagueCard';
import { LeagueComposer } from '@/components/game-room/LeagueComposer';
import { RequestSlotModal } from '@/components/game-room/RequestSlotModal';
import { InboxModal } from '@/components/game-room/InboxModal';
import { InboxBadge } from '@/components/game-room/InboxBadge';
import { issueHasPages, type IssueEntry, type LeagueItem, type MomentItem, type NewsstandIssue, type RequestItem } from '@/components/game-room/types';

type Tab = 'newsstand' | 'thisweek' | 'moments' | 'leagues';
const TABS: { key: Tab; label: string }[] = [
  { key: 'newsstand', label: 'Newsstand' },
  { key: 'thisweek', label: 'My Magazine' },
  { key: 'moments', label: 'Moments' },
  { key: 'leagues', label: 'Leagues' },
];

export default function GameRoomScreen() {
  const colors = useColors();
  const { dark } = useSchoolTheme();
  const { userId, profile, session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { width } = useWindowDimensions();
  const isLoggedIn = !!userId;

  const [tab, setTab] = useState<Tab>((params.tab as Tab) || 'newsstand');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [moments, setMoments] = useState<MomentItem[]>([]);
  const [publicIssues, setPublicIssues] = useState<NewsstandIssue[]>([]);
  const [issues, setIssues] = useState<IssueEntry[]>([]);
  const [leagues, setLeagues] = useState<LeagueItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editMoment, setEditMoment] = useState<MomentItem | null>(null);
  const [managerEntry, setManagerEntry] = useState<IssueEntry | null | 'new'>(null);
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [requestLeague, setRequestLeague] = useState<LeagueItem | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, lg, iss, pub, req, mine] = await Promise.all([
        getMoments(supabase, { limit: 24 }).catch(() => []),
        getLeagues(supabase, { limit: 50 }).catch(() => []),
        userId ? getOwnerIssues(supabase, userId).catch(() => []) : Promise.resolve([]),
        getPublicIssues(supabase, { limit: 60 }).catch(() => []),
        userId ? getCommissionerRequests(supabase, userId).catch(() => []) : Promise.resolve([]),
        userId ? getMyLeagueIds(supabase, userId).catch(() => []) : Promise.resolve([]),
      ]);
      const memberOf = new Set(mine as string[]);
      const safeLeagues = (lg as Record<string, unknown>[]).map((l) =>
        l.is_private && !memberOf.has(l.id as string) ? { ...l, join_password: null } : l
      );
      setMoments(m as MomentItem[]);
      setLeagues(safeLeagues as unknown as LeagueItem[]);
      setIssues(iss as IssueEntry[]);
      setPublicIssues(pub as NewsstandIssue[]);
      setRequests(req as RequestItem[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  // Derived: issue options, assignment map, selected issue
  const issueOptions = issues.map((e) => ({ id: e.issue.id, issueNumber: e.issue.issue_number, title: e.issue.title || 'Game Room Weekly' }));
  const assignmentByPost: Record<string, { issueId: string | null; page: number; isCover: boolean }> = {};
  issues.forEach((e) => e.items.forEach((it) => {
    assignmentByPost[it.post_id] = { issueId: e.issue.id, page: it.position ?? 1, isCover: e.issue.cover_post_id === it.post_id };
  }));
  const defaultIssueId = (issues.find(issueHasPages) ?? issues[0])?.issue.id ?? null;
  const selected = issues.find((e) => e.issue.id === selectedIssueId) ?? issues.find((e) => e.issue.id === defaultIssueId) ?? issues[0] ?? null;
  const ownedCount = moments.filter((m) => m.post && m.post.author?.username === profile?.username).length;

  const shareToFeed = async () => {
    if (!selected || sharing) return;
    setSharing(true);
    try { await shareIssueToFeed(supabase, selected.issue.id); await load(); } finally { setSharing(false); }
  };

  const cardW = width - 24;
  const newsCardW = (width - 24 - 12) / 2;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.paper },
    newsIntro: { fontFamily: typography.serif, fontStyle: 'italic', fontSize: 14, color: colors.textMuted, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 2 },
    newsGrid: { paddingTop: 10, paddingBottom: 90, gap: 14 },
    newsRow: { gap: 12, paddingHorizontal: 12 },
    tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabText: { fontFamily: typography.sansSemiBold, fontSize: 14, color: colors.textMuted },
    content: { flex: 1 },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    // upload CTA
    upload: { flexDirection: 'row', alignItems: 'center', gap: 12, margin: 12, padding: 12, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.crimson },
    uploadTx: { flex: 1 },
    uploadTitle: { fontFamily: typography.serifBold, fontSize: 15, color: colors.textPrimary },
    uploadSub: { fontFamily: typography.sans, fontSize: 12, color: colors.textMuted, marginTop: 2 },
    uploadBtn: { backgroundColor: colors.crimson, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 6 },
    uploadBtnText: { fontFamily: typography.sansSemiBold, fontSize: 13, color: '#fff' },
    grid: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 90 },
    gridRow: { justifyContent: 'space-between' },
    // magazine
    magBar: { paddingHorizontal: 12, paddingTop: 10 },
    switchRow: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
    issueChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
    issueChipText: { fontFamily: typography.sans, fontSize: 12, color: colors.textSecondary },
    actionRow: { flexDirection: 'row', gap: 16, paddingBottom: 8, alignItems: 'center' },
    linkBtn: { fontFamily: typography.sansSemiBold, fontSize: 13, color: colors.crimson },
    shared: { fontFamily: typography.sansSemiBold, fontSize: 13, color: colors.success },
    pagerWrap: { flex: 1, paddingHorizontal: 8, paddingBottom: 8 },
    placeholder: { margin: 16, padding: 20, borderRadius: 8, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
    placeholderText: { fontFamily: typography.sans, fontSize: 14, color: colors.textSecondary, lineHeight: 21, textAlign: 'center' },
    createBtn: { marginTop: 14, backgroundColor: colors.crimson, paddingVertical: 11, borderRadius: 6, alignItems: 'center' },
    createBtnText: { fontFamily: typography.sansSemiBold, fontSize: 14, color: '#fff' },
    seeLeagues: { alignSelf: 'center', paddingVertical: 8 },
    // leagues header
    lgHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
    lgTitle: { fontFamily: typography.serifBold, fontSize: 18, color: colors.textPrimary },
    lgActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    inboxBtn: { position: 'relative', borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
    inboxBtnText: { fontFamily: typography.sansSemiBold, fontSize: 12, color: colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 },
    leaguesList: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 90 },
    loginRow: { padding: 16, alignItems: 'center' },
    loginLink: { fontFamily: typography.sansSemiBold, fontSize: 14, color: colors.crimson },
  }), [colors]);

  // ---- Tab content ----
  const renderNewsstand = () => (
    <FlatList
      key="newsstand-grid"
      data={publicIssues}
      keyExtractor={(m) => m.id}
      numColumns={2}
      columnWrapperStyle={styles.newsRow}
      contentContainerStyle={styles.newsGrid}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={dark} />}
      ListHeaderComponent={publicIssues.length > 0 ? <Text style={styles.newsIntro}>Flip through dynasty magazines from coaches across CFB Social.</Text> : null}
      renderItem={({ item }) => <NewsstandCard m={item} width={newsCardW} />}
      ListEmptyComponent={<EmptyState title="No magazines yet" subtitle="Be the first — publish an issue from My Magazine." />}
    />
  );

  const renderMagazine = () => {
    if (!selected) {
      return (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No issue yet. Create an issue, then add pages by assigning your moments (Moments → Edit → Issue).</Text>
          {isLoggedIn && (
            <Pressable style={[styles.createBtn, ownedCount === 0 && { opacity: 0.5 }]} disabled={ownedCount === 0} onPress={() => setManagerEntry('new')}>
              <Text style={styles.createBtnText}>{ownedCount === 0 ? 'Upload a moment first' : 'Create your first issue'}</Text>
            </Pressable>
          )}
        </View>
      );
    }
    const hasPages = issueHasPages(selected);
    return (
      <View style={styles.content}>
        <View style={styles.magBar}>
          {issues.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switchRow}>
              {issues.map((e) => {
                const active = e.issue.id === selected.issue.id;
                return (
                  <Pressable key={e.issue.id} style={[styles.issueChip, active && { backgroundColor: dark, borderColor: dark }]} onPress={() => setSelectedIssueId(e.issue.id)}>
                    <Text style={[styles.issueChipText, active && { color: '#f4efe4' }]}>{(e.issue.title || 'Game Room Weekly')} · No. {e.issue.issue_number}{issueHasPages(e) ? '' : ' (empty)'}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          {isLoggedIn && (
            <View style={styles.actionRow}>
              {hasPages && (
                selected.issue.feed_post_id ? (
                  <Pressable onPress={() => router.push(`/game-room/issue/${selected.issue.feed_post_id}` as never)}><Text style={styles.shared}>On the Feed ✓</Text></Pressable>
                ) : (
                  <Pressable onPress={shareToFeed} disabled={sharing}><Text style={styles.linkBtn}>{sharing ? 'Sharing…' : 'Share to Feed'}</Text></Pressable>
                )
              )}
              <Pressable onPress={() => setManagerEntry(selected)}><Text style={styles.linkBtn}>Edit issue</Text></Pressable>
              <Pressable onPress={() => setManagerEntry('new')}><Text style={styles.linkBtn}>New Issue</Text></Pressable>
            </View>
          )}
        </View>
        {hasPages ? (
          <View style={styles.pagerWrap}><MagazinePager entry={selected} /></View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{selected.issue.title || 'Game Room Weekly'} · Issue No. {selected.issue.issue_number} has no pages yet. Go to Moments → Edit and assign moments to this issue (choose a page and a cover).</Text>
          </View>
        )}
        {leagues.length > 0 && (
          <Pressable style={styles.seeLeagues} onPress={() => setTab('leagues')}><Text style={styles.linkBtn}>See open leagues →</Text></Pressable>
        )}
      </View>
    );
  };

  const renderMoments = () => (
    <View style={styles.content}>
      <View style={styles.upload}>
        <View style={styles.uploadTx}>
          <Text style={styles.uploadTitle}>Upload a Moment</Text>
          <Text style={styles.uploadSub}>Screenshot in. It posts to Game Room and your Feed.</Text>
        </View>
        {isLoggedIn ? (
          <Pressable style={styles.uploadBtn} onPress={() => setComposerOpen(true)}><Text style={styles.uploadBtnText}>Upload</Text></Pressable>
        ) : (
          <Pressable style={styles.uploadBtn} onPress={() => router.push('/(auth)/login' as never)}><Text style={styles.uploadBtnText}>Log in</Text></Pressable>
        )}
      </View>
      <FlatList
        key="moments-list"
        data={moments}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={dark} />}
        renderItem={({ item }) => {
          const a = item.post ? assignmentByPost[item.post.id] : undefined;
          const e = a?.issueId ? issues.find((x) => x.issue.id === a.issueId) : null;
          const assignment = e ? { label: `${e.issue.title || 'Game Room Weekly'} · No. ${e.issue.issue_number}`, page: a!.page, isCover: a!.isCover } : null;
          return <MomentCard m={item} width={cardW} currentUsername={profile?.username ?? null} assignment={assignment} onEdit={setEditMoment} />;
        }}
        ListEmptyComponent={<EmptyState title="No moments yet" subtitle="Upload a screenshot from your College Football save." />}
      />
    </View>
  );

  const renderLeagues = () => (
    <View style={styles.content}>
      <View style={styles.lgHead}>
        <Text style={styles.lgTitle}>Open Dynasties</Text>
        {isLoggedIn && (
          <View style={styles.lgActions}>
            <Pressable style={styles.inboxBtn} onPress={() => setInboxOpen(true)}>
              <Text style={styles.inboxBtnText}>Inbox</Text>
              <InboxBadge count={requests.length} />
            </Pressable>
            <Pressable onPress={() => setLeagueOpen(true)}><Text style={styles.linkBtn}>List league</Text></Pressable>
          </View>
        )}
      </View>
      <FlatList
        key="leagues-list"
        data={leagues}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.leaguesList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={dark} />}
        renderItem={({ item }) => (
          <LeagueCard lg={item} onRequest={(lg) => (isLoggedIn ? setRequestLeague(lg) : router.push('/(auth)/login' as never))} />
        )}
        ListEmptyComponent={<EmptyState title="No leagues listed yet" subtitle={isLoggedIn ? 'List a CFB 27 league for coaches to join.' : 'Check back soon.'} />}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader />
      <SectionLabel text="Game Room" />
      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} style={[styles.tab, active && { borderBottomColor: dark }]} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, active && { color: colors.textPrimary }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={dark} /></View>
      ) : tab === 'newsstand' ? renderNewsstand() : tab === 'thisweek' ? renderMagazine() : tab === 'moments' ? renderMoments() : renderLeagues()}

      {composerOpen && <MomentComposer visible={composerOpen} onClose={() => setComposerOpen(false)} onPosted={() => { setComposerOpen(false); load(); }} />}
      {editMoment && (
        <MomentEditModal
          moment={editMoment}
          issues={issueOptions}
          assignment={editMoment.post ? assignmentByPost[editMoment.post.id] ?? { issueId: null, page: 1, isCover: false } : { issueId: null, page: 1, isCover: false }}
          onClose={() => setEditMoment(null)}
          onSaved={() => { setEditMoment(null); load(); }}
        />
      )}
      {managerEntry !== null && (
        <IssueManagerModal
          entry={managerEntry === 'new' ? null : managerEntry}
          allEntries={issues}
          onClose={() => setManagerEntry(null)}
          onSaved={() => { setManagerEntry(null); load(); }}
        />
      )}
      {leagueOpen && <LeagueComposer onClose={() => setLeagueOpen(false)} onCreated={() => { setLeagueOpen(false); load(); }} />}
      {requestLeague && <RequestSlotModal league={requestLeague} onClose={() => setRequestLeague(null)} onSent={() => { setRequestLeague(null); load(); }} />}
      {inboxOpen && <InboxModal requests={requests} onClose={() => setInboxOpen(false)} onResolved={() => { load(); }} />}
    </View>
  );
}
