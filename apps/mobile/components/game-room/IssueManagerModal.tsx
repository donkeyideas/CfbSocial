import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Image as RNImage, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { saveIssueSettings, deleteIssue } from '@cfb-social/api';
import type { IssueEntry } from './types';

interface Props {
  /** The issue to edit, or null to create a new one. */
  entry: IssueEntry | null;
  /** All the user's issues (for the delete list). */
  allEntries: IssueEntry[];
  onClose: () => void;
  onSaved: () => void;
}

export function IssueManagerModal({ entry, allEntries, onClose, onSaved }: Props) {
  const colors = useColors();
  const { userId } = useAuth();
  const { dark } = useSchoolTheme();
  const { showAlert } = useThemedAlert();

  const [title, setTitle] = useState(entry?.issue.title ?? '');
  const [headline, setHeadline] = useState(entry?.issue.cover_headline ?? '');
  const [subtitle, setSubtitle] = useState(entry?.issue.cover_subtitle ?? '');
  const [coverPostId, setCoverPostId] = useState<string | null>(entry?.issue.cover_post_id ?? null);
  const [saving, setSaving] = useState(false);
  const [busyDelete, setBusyDelete] = useState<string | null>(null);

  const covers = (entry?.items ?? []).filter((it) => it.post && (it.post.media_urls?.length ?? 0) > 0);

  const save = async () => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      await saveIssueSettings(supabase, userId, {
        issueId: entry?.issue.id ?? null,
        title: title.trim() || null,
        coverHeadline: headline.trim() || null,
        coverSubtitle: subtitle.trim() || null,
        coverPostId: entry ? coverPostId : undefined,
      });
      onSaved();
    } catch (e) {
      setSaving(false);
      showAlert('Could not save', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const doDelete = async (id: string) => {
    if (!userId) return;
    setBusyDelete(id);
    try {
      await deleteIssue(supabase, userId, id);
      onSaved();
    } catch (e) {
      setBusyDelete(null);
      showAlert('Could not delete', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const confirmDelete = (id: string, label: string) => {
    showAlert('Delete issue?', `Delete "${label}"? Its pages are removed (your moments are kept).`, {
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: () => doDelete(id),
    });
  };

  const styles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    card: { backgroundColor: colors.paper, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '92%' },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 2, borderBottomColor: colors.crimson },
    title: { fontFamily: typography.serifBold, fontSize: 18, color: colors.crimson },
    cancel: { fontFamily: typography.sans, fontSize: 15, color: colors.textSecondary },
    body: { padding: 16 },
    intro: { fontFamily: typography.sans, fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 6 },
    label: { fontFamily: typography.mono, fontSize: 10, letterSpacing: 1.5, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4, marginTop: 12 },
    input: { fontFamily: typography.sans, fontSize: 15, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: colors.surfaceRaised },
    coverRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    coverThumb: { width: 70, height: 70, borderRadius: 6, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
    coverActive: { borderColor: colors.crimson },
    coverImg: { width: '100%', height: '100%' },
    section: { marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
    sectionTitle: { fontFamily: typography.mono, fontSize: 10, letterSpacing: 1.5, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 },
    issueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    issueName: { fontFamily: typography.serif, fontSize: 14, color: colors.textPrimary, flex: 1 },
    delBtn: { borderWidth: 1, borderColor: colors.crimson, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 5 },
    delText: { fontFamily: typography.sansSemiBold, fontSize: 12, color: colors.crimson },
    save: { marginTop: 20, marginBottom: 8, paddingVertical: 13, borderRadius: 8, alignItems: 'center' },
    saveText: { fontFamily: typography.sansSemiBold, fontSize: 15, color: '#f4efe4' },
  }), [colors]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>{entry ? 'Issue Settings' : 'New Issue'}</Text>
            <Pressable onPress={onClose}><Text style={styles.cancel}>Cancel</Text></Pressable>
          </View>
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.intro}>Name your magazine and write the cover story. Add pages by assigning moments to this issue from the Moments tab (Edit → Issue).</Text>

            <Text style={styles.label}>Magazine title (masthead)</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Game Room Weekly" placeholderTextColor={colors.textMuted} maxLength={80} />

            <Text style={styles.label}>Cover headline</Text>
            <TextInput style={styles.input} value={headline} onChangeText={setHeadline} placeholder="The big story" placeholderTextColor={colors.textMuted} maxLength={120} />

            <Text style={styles.label}>Cover subtitle (optional)</Text>
            <TextInput style={styles.input} value={subtitle} onChangeText={setSubtitle} placeholder="A line of context" placeholderTextColor={colors.textMuted} maxLength={200} />

            {entry && covers.length > 0 && (
              <>
                <Text style={styles.label}>Cover image</Text>
                <View style={styles.coverRow}>
                  {covers.map((it) => (
                    <Pressable key={it.id} style={[styles.coverThumb, coverPostId === it.post!.id && styles.coverActive]} onPress={() => setCoverPostId(it.post!.id)}>
                      <RNImage source={{ uri: it.post!.media_urls[0]! }} style={styles.coverImg} />
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {allEntries.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your issues — delete junk/test issues here</Text>
                {allEntries.map((e) => (
                  <View key={e.issue.id} style={styles.issueRow}>
                    <Text style={styles.issueName} numberOfLines={1}>{e.issue.title || 'Game Room Weekly'} · No. {e.issue.issue_number}</Text>
                    <Pressable style={styles.delBtn} onPress={() => confirmDelete(e.issue.id, e.issue.title || 'Game Room Weekly')} disabled={busyDelete === e.issue.id}>
                      {busyDelete === e.issue.id ? <ActivityIndicator size="small" color={colors.crimson} /> : <Text style={styles.delText}>Delete</Text>}
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <Pressable style={[styles.save, { backgroundColor: dark }, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#f4efe4" /> : <Text style={styles.saveText}>Save Settings</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
