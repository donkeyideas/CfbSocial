import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Image as RNImage, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { uploadImage } from '@/lib/upload/imageUpload';
import { updateMoment, assignMomentToIssue } from '@cfb-social/api';
import type { MomentItem } from './types';

interface IssueOption { id: string; issueNumber: number; title: string }
interface Props {
  moment: MomentItem;
  issues: IssueOption[];
  assignment: { issueId: string | null; page: number; isCover: boolean };
  onClose: () => void;
  onSaved: () => void;
}

const NEW = '__new__';

export function MomentEditModal({ moment, issues, assignment, onClose, onSaved }: Props) {
  const colors = useColors();
  const { session, userId } = useAuth();
  const { dark } = useSchoolTheme();
  const { showAlert } = useThemedAlert();
  const post = moment.post;

  const [title, setTitle] = useState(moment.title ?? '');
  const [opponent, setOpponent] = useState(moment.opponent ?? '');
  const [ourScore, setOurScore] = useState(moment.our_score != null ? String(moment.our_score) : '');
  const [oppScore, setOppScore] = useState(moment.opp_score != null ? String(moment.opp_score) : '');
  const [week, setWeek] = useState(moment.week ?? '');
  const [caption, setCaption] = useState(post?.content ?? '');
  const [urls, setUrls] = useState<string[]>(post?.media_urls ?? []);
  const [adding, setAdding] = useState(false);

  const [issueChoice, setIssueChoice] = useState<string>(assignment.issueId ?? '');
  const [newTitle, setNewTitle] = useState('');
  const [page, setPage] = useState(String(assignment.page || 1));
  const [isCover, setIsCover] = useState(assignment.isCover);
  const [saving, setSaving] = useState(false);

  const addImage = useCallback(async () => {
    if (urls.length >= 4 || !session?.access_token) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 4 - urls.length, quality: 0.95 });
    if (res.canceled || !res.assets?.length) return;
    setAdding(true);
    try {
      for (const a of res.assets) {
        const publicUrl = await uploadImage(a.uri, session.access_token, a.mimeType ?? undefined, a.fileName ?? undefined);
        setUrls((prev) => (prev.length < 4 ? [...prev, publicUrl] : prev));
      }
    } catch (e) {
      showAlert('Upload failed', e instanceof Error ? e.message : 'Try again.');
    }
    setAdding(false);
  }, [urls.length, session?.access_token, showAlert]);

  const save = async () => {
    if (!post || !userId || saving) return;
    setSaving(true);
    try {
      await updateMoment(supabase, {
        postId: post.id,
        content: caption.trim(),
        mediaUrls: urls,
        title: title.trim() || null,
        opponent: opponent.trim() || null,
        ourScore: ourScore.trim() ? parseInt(ourScore, 10) : null,
        oppScore: oppScore.trim() ? parseInt(oppScore, 10) : null,
        week: week.trim() || null,
      });
      await assignMomentToIssue(supabase, userId, {
        postId: post.id,
        issueId: issueChoice === NEW || issueChoice === '' ? null : issueChoice,
        newIssueTitle: issueChoice === NEW ? (newTitle.trim() || 'Game Room Weekly') : null,
        page: parseInt(page, 10) || 1,
        isCover,
      });
      onSaved();
    } catch (e) {
      setSaving(false);
      showAlert('Could not save', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    card: { backgroundColor: colors.paper, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '92%' },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 2, borderBottomColor: colors.crimson },
    title: { fontFamily: typography.serifBold, fontSize: 18, color: colors.crimson },
    cancel: { fontFamily: typography.sans, fontSize: 15, color: colors.textSecondary },
    body: { padding: 16 },
    label: { fontFamily: typography.mono, fontSize: 10, letterSpacing: 1.5, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4, marginTop: 10 },
    input: { fontFamily: typography.sans, fontSize: 15, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: colors.surfaceRaised },
    row: { flexDirection: 'row', gap: 8 },
    half: { flex: 1 },
    thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    thumb: { width: 64, height: 64, borderRadius: 6, overflow: 'hidden', position: 'relative' },
    thumbImg: { width: 64, height: 64 },
    thumbX: { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
    thumbXText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    addThumb: { width: 64, height: 64, borderRadius: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.crimson, alignItems: 'center', justifyContent: 'center' },
    addThumbText: { color: colors.crimson, fontSize: 22 },
    section: { marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
    sectionTitle: { fontFamily: typography.serifBold, fontSize: 15, color: colors.textPrimary, marginBottom: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
    chipText: { fontFamily: typography.sans, fontSize: 13, color: colors.textSecondary },
    coverRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
    save: { marginTop: 20, marginBottom: 8, paddingVertical: 13, borderRadius: 8, alignItems: 'center' },
    saveText: { fontFamily: typography.sansSemiBold, fontSize: 15, color: '#f4efe4' },
  }), [colors]);

  const assignedSomewhere = issueChoice !== '' ;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>Edit Moment</Text>
            <Pressable onPress={onClose}><Text style={styles.cancel}>Cancel</Text></Pressable>
          </View>
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={colors.textMuted} maxLength={120} />
            <Text style={styles.label}>Opponent</Text>
            <TextInput style={styles.input} value={opponent} onChangeText={setOpponent} placeholderTextColor={colors.textMuted} maxLength={60} />
            <View style={styles.row}>
              <View style={styles.half}><Text style={styles.label}>Our score</Text><TextInput style={styles.input} value={ourScore} onChangeText={setOurScore} keyboardType="number-pad" maxLength={3} placeholderTextColor={colors.textMuted} /></View>
              <View style={styles.half}><Text style={styles.label}>Opp score</Text><TextInput style={styles.input} value={oppScore} onChangeText={setOppScore} keyboardType="number-pad" maxLength={3} placeholderTextColor={colors.textMuted} /></View>
            </View>
            <Text style={styles.label}>Week</Text>
            <TextInput style={styles.input} value={week} onChangeText={setWeek} maxLength={30} placeholderTextColor={colors.textMuted} />
            <Text style={styles.label}>Caption</Text>
            <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} value={caption} onChangeText={setCaption} multiline maxLength={2000} placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Images ({urls.length}/4)</Text>
            <View style={styles.thumbRow}>
              {urls.map((u, i) => (
                <View key={`${u}-${i}`} style={styles.thumb}>
                  <RNImage source={{ uri: u }} style={styles.thumbImg} />
                  {urls.length > 1 && <Pressable style={styles.thumbX} onPress={() => setUrls((prev) => prev.filter((_, idx) => idx !== i))}><Text style={styles.thumbXText}>X</Text></Pressable>}
                </View>
              ))}
              {urls.length < 4 && <Pressable style={styles.addThumb} onPress={addImage} disabled={adding}>{adding ? <ActivityIndicator size="small" color={colors.crimson} /> : <Text style={styles.addThumbText}>+</Text>}</Pressable>}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Magazine</Text>
              <Text style={styles.label}>Issue</Text>
              <View style={styles.chipRow}>
                <Pressable style={[styles.chip, issueChoice === '' && { backgroundColor: dark, borderColor: dark }]} onPress={() => setIssueChoice('')}>
                  <Text style={[styles.chipText, issueChoice === '' && { color: '#f4efe4' }]}>None</Text>
                </Pressable>
                {issues.map((iss) => (
                  <Pressable key={iss.id} style={[styles.chip, issueChoice === iss.id && { backgroundColor: dark, borderColor: dark }]} onPress={() => setIssueChoice(iss.id)}>
                    <Text style={[styles.chipText, issueChoice === iss.id && { color: '#f4efe4' }]}>{iss.title} · No. {iss.issueNumber}</Text>
                  </Pressable>
                ))}
                <Pressable style={[styles.chip, issueChoice === NEW && { backgroundColor: dark, borderColor: dark }]} onPress={() => setIssueChoice(NEW)}>
                  <Text style={[styles.chipText, issueChoice === NEW && { color: '#f4efe4' }]}>+ New issue</Text>
                </Pressable>
              </View>

              {issueChoice === NEW && (
                <>
                  <Text style={styles.label}>New issue title</Text>
                  <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder="e.g. The Blueprint" placeholderTextColor={colors.textMuted} maxLength={80} />
                </>
              )}

              {assignedSomewhere && (
                <>
                  <Text style={styles.label}>Page number</Text>
                  <TextInput style={styles.input} value={page} onChangeText={setPage} keyboardType="number-pad" maxLength={3} placeholderTextColor={colors.textMuted} />
                  <View style={styles.coverRow}>
                    <Text style={[styles.chipText, { color: colors.textPrimary }]}>Set as cover</Text>
                    <Switch value={isCover} onValueChange={setIsCover} trackColor={{ true: dark }} />
                  </View>
                </>
              )}
            </View>

            <Pressable style={[styles.save, { backgroundColor: dark }, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#f4efe4" /> : <Text style={styles.saveText}>Save</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
