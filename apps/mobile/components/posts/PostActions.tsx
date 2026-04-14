import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { supabase } from '@/lib/supabase';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { MAX_POST_CHARS } from '@/lib/constants';
import { FactCheckPanel } from './FactCheckPanel';

const REVISIT_OPTIONS = [7, 14, 30, 60, 90];
const HIT_SLOP = { top: 8, bottom: 8, left: 4, right: 4 };
const MAX_CHALLENGE_CHARS = 200;

interface PostActionsProps {
  postId: string;
  postAuthorId: string;
  postContent?: string;
  onReport?: () => void;
  onChallenge?: () => void;
  onDeleted?: () => void;
  onEdited?: (newContent: string) => void;
  /** Pre-fetched status to avoid per-post queries. undefined = not pre-fetched (will query). */
  prefetchedReposted?: boolean;
  prefetchedSaved?: boolean;
  repostCount?: number;
  replyCount?: number;
}

export function PostActions({
  postId,
  postAuthorId,
  postContent,
  onReport,
  onChallenge,
  onDeleted,
  onEdited,
  prefetchedReposted,
  prefetchedSaved,
  repostCount: initialRepostCount,
  replyCount = 0,
}: PostActionsProps) {
  const colors = useColors();
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const { dark } = useSchoolTheme();
  const router = useRouter();
  const { showAlert } = useThemedAlert();
  const [reposted, setReposted] = useState(prefetchedReposted ?? false);
  const [saved, setSaved] = useState(prefetchedSaved ?? false);
  const [rpCount, setRpCount] = useState(initialRepostCount ?? 0);
  const [busy, setBusy] = useState(false);
  const mountedRef = useRef(true);

  // REVISIT state
  const [revisitExpanded, setRevisitExpanded] = useState(false);
  const [revisitDays, setRevisitDays] = useState(30);
  const [revisitFiled, setRevisitFiled] = useState(false);
  const [revisitBusy, setRevisitBusy] = useState(false);
  const [revisitDate, setRevisitDate] = useState<string | null>(null);

  // CHALLENGE state
  const [challengeExpanded, setChallengeExpanded] = useState(false);
  const [challengeTopic, setChallengeTopic] = useState('');
  const [challengeBusy, setChallengeBusy] = useState(false);

  // FACT CHECK state
  const [factCheckOpen, setFactCheckOpen] = useState(false);

  // EDIT state
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  const isOwner = userId === postAuthorId;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: 2,
    },
    action: {
      paddingVertical: 6,
      paddingHorizontal: 6,
    },
    actionText: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    activeText: {
      color: dark,
    },
    successText: {
      color: colors.success,
    },
    crimsonText: {
      color: colors.crimson,
    },
    separator: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.border,
      marginHorizontal: 1,
    },
    // REVISIT / CHALLENGE expanded row
    expandedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      width: '100%',
    },
    revisitDayButton: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
    },
    revisitDayButtonActive: {
      borderColor: colors.crimson,
      backgroundColor: colors.crimson,
    },
    revisitDayText: {
      fontFamily: typography.mono,
      fontSize: 9,
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    revisitDayTextActive: {
      color: '#f4efe4',
    },
    actionButton: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: colors.crimson,
      borderRadius: 4,
    },
    actionButtonText: {
      fontFamily: typography.mono,
      fontSize: 9,
      color: '#f4efe4',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    closeButton: {
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    closeText: {
      fontFamily: typography.mono,
      fontSize: 12,
      color: colors.textMuted,
    },
    receiptFiled: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.crimson,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    // CHALLENGE expanded
    challengeContainer: {
      marginTop: 6,
      width: '100%',
    },
    challengeInput: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.ink,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      padding: 8,
      minHeight: 50,
      textAlignVertical: 'top',
    },
    challengeActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    challengeCharCount: {
      fontFamily: typography.mono,
      fontSize: 9,
      color: colors.textMuted,
      flex: 1,
    },
    // EDIT
    editContainer: {
      marginTop: 8,
      width: '100%',
    },
    editInput: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.ink,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      padding: 10,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    editActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 8,
    },
    editCharCount: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 4,
    },
  }), [colors, dark]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Check existing repost/save/revisit status on mount
  useEffect(() => {
    if (!userId) return;

    if (prefetchedReposted === undefined) {
      supabase
        .from('reposts')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data }) => {
          if (mountedRef.current && data) setReposted(true);
        });
    }

    if (prefetchedSaved === undefined) {
      supabase
        .from('bookmarks')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data }) => {
          if (mountedRef.current && data) setSaved(true);
        });
    }

    // Check if user already filed a revisit
    supabase
      .from('aging_takes')
      .select('id, revisit_date')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (mountedRef.current && data) {
          setRevisitFiled(true);
          const d = new Date(data.revisit_date);
          setRevisitDate(d.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          }));
        }
      });
  }, [userId, postId, prefetchedReposted, prefetchedSaved]);

  const requireAuth = useCallback(
    (action: string): boolean => {
      if (!userId) {
        showAlert('Bench Warmer', `You must be signed in to ${action}.`);
        return false;
      }
      return true;
    },
    [userId, showAlert]
  );

  // FACT CHECK — toggle inline panel
  const handleFactCheck = useCallback(() => {
    setFactCheckOpen((prev) => !prev);
  }, []);

  // CHALLENGE — toggle inline form
  const handleChallenge = useCallback(() => {
    if (!requireAuth('challenge')) return;
    if (userId === postAuthorId) {
      showAlert('Offsides', 'You cannot challenge your own post.');
      return;
    }
    setChallengeExpanded((prev) => !prev);
  }, [requireAuth, userId, postAuthorId, showAlert]);

  // CHALLENGE — submit
  const handleChallengeSubmit = useCallback(async () => {
    if (!challengeTopic.trim() || challengeBusy || !userId) return;
    setChallengeBusy(true);

    try {
      const { data, error } = await supabase
        .from('challenges')
        .insert({
          challenger_id: userId,
          challenged_id: postAuthorId,
          post_id: postId,
          topic: challengeTopic.trim(),
          status: 'PENDING',
        })
        .select()
        .single();

      if (error) {
        showAlert('Incomplete Pass', 'Could not issue challenge.');
        return;
      }

      if (mountedRef.current) {
        setChallengeExpanded(false);
        setChallengeTopic('');
        if (data?.id) {
          router.push(`/rivalry/challenge/${data.id}` as never);
        }
      }
    } catch {
      showAlert('Incomplete Pass', 'Could not issue challenge.');
    } finally {
      if (mountedRef.current) setChallengeBusy(false);
    }
  }, [challengeTopic, challengeBusy, userId, postAuthorId, postId, router, showAlert]);

  // REVISIT — toggle expanded, or file
  const handleRevisitToggle = useCallback(() => {
    if (!requireAuth('revisit')) return;
    if (revisitFiled) {
      router.push('/receipts' as never);
      return;
    }
    setRevisitExpanded((prev) => !prev);
  }, [requireAuth, revisitFiled, router]);

  const handleRevisitSet = useCallback(async () => {
    if (revisitBusy || revisitFiled) return;
    setRevisitBusy(true);

    try {
      const date = new Date();
      date.setDate(date.getDate() + revisitDays);

      const { error } = await supabase.from('aging_takes').insert({
        post_id: postId,
        user_id: userId!,
        revisit_date: date.toISOString(),
      });

      if (error) {
        if (error.code === '23505') {
          showAlert('Already Filed', 'You already marked this take for revisit.');
        } else {
          showAlert('Incomplete Pass', 'Could not mark for revisit.');
        }
        return;
      }

      if (mountedRef.current) {
        setRevisitFiled(true);
        setRevisitExpanded(false);
        setRevisitDate(date.toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        }));
      }
    } catch {
      showAlert('Incomplete Pass', 'Could not mark for revisit.');
    } finally {
      if (mountedRef.current) setRevisitBusy(false);
    }
  }, [revisitBusy, revisitFiled, revisitDays, postId, userId, showAlert]);

  const handleReply = useCallback(() => {
    router.push(`/post/${postId}` as never);
  }, [postId, router]);

  const handleRepost = useCallback(async () => {
    if (!requireAuth('repost') || busy) return;
    setBusy(true);

    const previousReposted = reposted;
    const previousRpCount = rpCount;

    try {
      if (reposted) {
        setReposted(false);
        setRpCount((c) => c - 1);
        const { error } = await supabase
          .from('reposts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId!);
        if (error) {
          showAlert('Incomplete Pass', 'Could not undo repost.');
          throw error;
        }
      } else {
        setReposted(true);
        setRpCount((c) => c + 1);
        const { error } = await supabase.from('reposts').insert({
          post_id: postId,
          user_id: userId!,
        });
        if (error) {
          showAlert('Incomplete Pass', 'Could not repost.');
          throw error;
        }
      }
    } catch {
      if (mountedRef.current) {
        setReposted(previousReposted);
        setRpCount(previousRpCount);
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }, [reposted, rpCount, postId, userId, busy, requireAuth, showAlert]);

  const handleSave = useCallback(async () => {
    if (!requireAuth('save') || busy) return;
    setBusy(true);

    const previousSaved = saved;

    try {
      if (saved) {
        setSaved(false);
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId!);
        if (error) throw error;
      } else {
        setSaved(true);
        const { error } = await supabase.from('bookmarks').insert({
          post_id: postId,
          user_id: userId!,
        });
        if (error) throw error;
      }
    } catch {
      if (mountedRef.current) {
        setSaved(previousSaved);
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }, [saved, postId, userId, busy, requireAuth]);

  const handleFlag = useCallback(() => {
    if (!requireAuth('flag')) return;
    if (onReport) {
      onReport();
    } else {
      showAlert('Flag', 'Report functionality coming soon.');
    }
  }, [requireAuth, onReport, showAlert]);

  // EDIT
  const handleEdit = useCallback(() => {
    if (!isOwner) return;
    setEditContent(postContent || '');
    setEditing(true);
  }, [isOwner, postContent]);

  const handleEditSave = useCallback(async () => {
    if (!editContent.trim() || editBusy) return;
    setEditBusy(true);

    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent.trim() })
        .eq('id', postId);

      if (error) {
        showAlert('Incomplete Pass', 'Could not update post.');
        return;
      }

      setEditing(false);
      if (onEdited) onEdited(editContent.trim());
    } catch {
      showAlert('Incomplete Pass', 'Could not update post.');
    } finally {
      if (mountedRef.current) setEditBusy(false);
    }
  }, [editContent, editBusy, postId, onEdited, showAlert]);

  const handleEditCancel = useCallback(() => {
    setEditing(false);
    setEditContent('');
  }, []);

  // DELETE
  const handleDelete = useCallback(() => {
    if (!isOwner) return;

    Alert.alert(
      'Delete Post',
      'Delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);

              if (error) {
                showAlert('Incomplete Pass', 'Could not delete post.');
                return;
              }

              if (onDeleted) onDeleted();
            } catch {
              showAlert('Incomplete Pass', 'Could not delete post.');
            }
          },
        },
      ]
    );
  }, [isOwner, postId, onDeleted, showAlert]);

  // Helper: format count for display
  const fmtCount = (count: number) => count > 0 ? ` (${count})` : '';

  const Sep = () => <Text style={styles.separator}>|</Text>;

  return (
    <View>
      <View style={styles.container}>
        {/* FACT CHECK */}
        <Pressable onPress={handleFactCheck} style={styles.action} hitSlop={HIT_SLOP}>
          <Text style={[styles.actionText, factCheckOpen && styles.activeText]}>FACT CHECK</Text>
        </Pressable>

        <Sep />

        {/* CHALLENGE */}
        <Pressable onPress={handleChallenge} style={styles.action} hitSlop={HIT_SLOP}>
          <Text style={[styles.actionText, challengeExpanded && styles.crimsonText]}>CHALLENGE</Text>
        </Pressable>

        <Sep />

        {/* REVISIT */}
        <Pressable
          onPress={handleRevisitToggle}
          style={styles.action}
          hitSlop={HIT_SLOP}
        >
          {revisitFiled ? (
            <Text style={styles.receiptFiled}>RECEIPT FILED</Text>
          ) : (
            <Text style={styles.actionText}>REVISIT</Text>
          )}
        </Pressable>

        <Sep />

        {/* REPOST */}
        <Pressable onPress={handleRepost} style={styles.action} hitSlop={HIT_SLOP}>
          <Text style={[styles.actionText, reposted && styles.crimsonText]}>
            {reposted ? `REPOSTED${fmtCount(rpCount)}` : `REPOST${fmtCount(rpCount)}`}
          </Text>
        </Pressable>

        <Sep />

        {/* SAVE */}
        <Pressable onPress={handleSave} style={styles.action} hitSlop={HIT_SLOP}>
          <Text style={[styles.actionText, saved && styles.activeText]}>
            {saved ? 'SAVED' : 'SAVE'}
          </Text>
        </Pressable>

        <Sep />

        {/* REPLY */}
        <Pressable onPress={handleReply} style={styles.action} hitSlop={HIT_SLOP}>
          <Text style={styles.actionText}>REPLY{fmtCount(replyCount)}</Text>
        </Pressable>

        <Sep />

        {/* FLAG */}
        <Pressable onPress={handleFlag} style={styles.action} hitSlop={HIT_SLOP}>
          <Text style={styles.actionText}>FLAG</Text>
        </Pressable>

        {/* Owner-only actions */}
        {isOwner && (
          <>
            <Sep />
            <Pressable onPress={handleEdit} style={styles.action} hitSlop={HIT_SLOP}>
              <Text style={[styles.actionText, editing && styles.activeText]}>EDIT</Text>
            </Pressable>

            <Sep />
            <Pressable onPress={handleDelete} style={styles.action} hitSlop={HIT_SLOP}>
              <Text style={[styles.actionText, { color: colors.error }]}>DELETE</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* CHALLENGE expanded: topic form */}
      {challengeExpanded && (
        <View style={styles.challengeContainer}>
          <TextInput
            style={styles.challengeInput}
            value={challengeTopic}
            onChangeText={setChallengeTopic}
            placeholder="What are you challenging? e.g. 'Your take on the QB depth chart is wrong...'"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={MAX_CHALLENGE_CHARS}
            autoFocus
          />
          <View style={styles.challengeActions}>
            <Text style={styles.challengeCharCount}>
              {challengeTopic.length}/{MAX_CHALLENGE_CHARS}
            </Text>
            <Pressable
              onPress={handleChallengeSubmit}
              style={styles.actionButton}
              disabled={challengeBusy || !challengeTopic.trim()}
            >
              <Text style={styles.actionButtonText}>
                {challengeBusy ? '...' : 'ISSUE'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setChallengeExpanded(false); setChallengeTopic(''); }}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>x</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* REVISIT expanded: day picker + SET */}
      {revisitExpanded && !revisitFiled && (
        <View style={styles.expandedRow}>
          {REVISIT_OPTIONS.map((d) => (
            <Pressable
              key={d}
              onPress={() => setRevisitDays(d)}
              style={[
                styles.revisitDayButton,
                d === revisitDays && styles.revisitDayButtonActive,
              ]}
            >
              <Text style={[
                styles.revisitDayText,
                d === revisitDays && styles.revisitDayTextActive,
              ]}>
                {d}d
              </Text>
            </Pressable>
          ))}

          <Pressable
            onPress={handleRevisitSet}
            style={styles.actionButton}
            disabled={revisitBusy}
          >
            <Text style={styles.actionButtonText}>
              {revisitBusy ? '...' : 'SET'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setRevisitExpanded(false)}
            style={styles.closeButton}
          >
            <Text style={styles.closeText}>x</Text>
          </Pressable>
        </View>
      )}

      {/* Receipt filed date */}
      {revisitFiled && revisitDate && (
        <View style={{ marginTop: 4 }}>
          <Text style={[styles.revisitDayText, { color: colors.crimson }]}>
            RECEIPT FILED — Review {revisitDate}
          </Text>
        </View>
      )}

      {/* FACT CHECK panel */}
      {factCheckOpen && (
        <FactCheckPanel
          postId={postId}
          postContent={postContent}
          onClose={() => setFactCheckOpen(false)}
        />
      )}

      {/* Inline edit UI */}
      {editing && (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={editContent}
            onChangeText={setEditContent}
            multiline
            maxLength={MAX_POST_CHARS}
            autoFocus
          />
          <Text style={styles.editCharCount}>
            {editContent.length}/{MAX_POST_CHARS}
          </Text>
          <View style={styles.editActions}>
            <Pressable onPress={handleEditCancel} style={styles.action}>
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>CANCEL</Text>
            </Pressable>
            <Pressable onPress={handleEditSave} style={styles.action} disabled={editBusy}>
              <Text style={[styles.actionText, styles.activeText]}>
                {editBusy ? 'SAVING...' : 'SAVE'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
