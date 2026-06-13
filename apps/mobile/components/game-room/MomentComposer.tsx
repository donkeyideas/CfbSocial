import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Image as RNImage, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { uploadImage } from '@/lib/upload/imageUpload';
import { createMoment } from '@cfb-social/api';

interface PendingImage { id: string; uri: string; mimeType?: string; fileName?: string; publicUrl?: string; uploading: boolean; error?: string }
interface Props { visible: boolean; onClose: () => void; onPosted: () => void }

export function MomentComposer({ visible, onClose, onPosted }: Props) {
  const colors = useColors();
  const { session, userId, profile } = useAuth();
  const { dark } = useSchoolTheme();
  const { showAlert } = useThemedAlert();

  const [images, setImages] = useState<PendingImage[]>([]);
  const [title, setTitle] = useState('');
  const [opponent, setOpponent] = useState('');
  const [ourScore, setOurScore] = useState('');
  const [oppScore, setOppScore] = useState('');
  const [week, setWeek] = useState('');
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const uploading = images.some((i) => i.uploading);

  const reset = () => { setImages([]); setTitle(''); setOpponent(''); setOurScore(''); setOppScore(''); setWeek(''); setCaption(''); setSubmitting(false); };
  const close = () => { reset(); onClose(); };

  const pick = useCallback(async () => {
    const remaining = 4 - images.length;
    if (remaining <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.95 });
    if (res.canceled || !res.assets?.length) return;
    if (!session?.access_token) { showAlert('Not signed in', 'Log in to upload moments.'); return; }
    const next = res.assets.map((a) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, uri: a.uri, mimeType: a.mimeType ?? undefined, fileName: a.fileName ?? undefined, uploading: true as const }));
    setImages((prev) => [...prev, ...next]);
    for (const img of next) {
      try {
        const publicUrl = await uploadImage(img.uri, session.access_token, img.mimeType, img.fileName);
        setImages((prev) => prev.map((p) => (p.id === img.id ? { ...p, publicUrl, uploading: false } : p)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setImages((prev) => prev.map((p) => (p.id === img.id ? { ...p, uploading: false, error: msg } : p)));
      }
    }
  }, [images.length, session?.access_token, showAlert]);

  const removeImage = (id: string) => setImages((prev) => prev.filter((p) => p.id !== id));

  const submit = async () => {
    const urls = images.filter((i) => i.publicUrl && !i.error).map((i) => i.publicUrl!);
    if (urls.length === 0 || !userId || submitting || uploading) return;
    setSubmitting(true);
    try {
      await createMoment(supabase, {
        authorId: userId,
        schoolId: profile?.school_id ?? null,
        imageUrls: urls,
        title: title.trim() || null,
        content: caption.trim() || '',
        opponent: opponent.trim() || null,
        ourScore: ourScore.trim() ? parseInt(ourScore, 10) : null,
        oppScore: oppScore.trim() ? parseInt(oppScore, 10) : null,
        week: week.trim() || null,
      } as never);
      close();
      onPosted();
    } catch (e) {
      setSubmitting(false);
      showAlert('Could not post', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    card: { backgroundColor: colors.paper, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90%' },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 2, borderBottomColor: colors.crimson },
    title: { fontFamily: typography.serifBold, fontSize: 18, color: colors.crimson },
    cancel: { fontFamily: typography.sans, fontSize: 15, color: colors.textSecondary },
    body: { padding: 16 },
    addBtn: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.crimson, borderRadius: 8, paddingVertical: 22, alignItems: 'center', marginBottom: 14 },
    addText: { fontFamily: typography.sansSemiBold, fontSize: 14, color: colors.crimson },
    thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    thumb: { width: 72, height: 72, borderRadius: 6, overflow: 'hidden', position: 'relative' },
    thumbImg: { width: 72, height: 72 },
    thumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    thumbX: { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
    thumbXText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    label: { fontFamily: typography.mono, fontSize: 10, letterSpacing: 1.5, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4, marginTop: 8 },
    input: { fontFamily: typography.sans, fontSize: 15, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: colors.surfaceRaised },
    row: { flexDirection: 'row', gap: 8 },
    half: { flex: 1 },
    submit: { marginTop: 18, marginBottom: 8, paddingVertical: 13, borderRadius: 8, alignItems: 'center' },
    submitText: { fontFamily: typography.sansSemiBold, fontSize: 15, color: '#f4efe4' },
  }), [colors]);

  const canSubmit = images.filter((i) => i.publicUrl && !i.error).length > 0 && !submitting && !uploading;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>New Moment</Text>
            <Pressable onPress={close}><Text style={styles.cancel}>Cancel</Text></Pressable>
          </View>
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {images.length > 0 && (
              <View style={styles.thumbRow}>
                {images.map((img) => (
                  <View key={img.id} style={styles.thumb}>
                    <RNImage source={{ uri: img.uri }} style={styles.thumbImg} />
                    {img.uploading && <View style={styles.thumbOverlay}><ActivityIndicator size="small" color="#fff" /></View>}
                    {img.error && <View style={styles.thumbOverlay}><Text style={{ color: '#ff6b6b', fontWeight: '700' }}>!</Text></View>}
                    <Pressable style={styles.thumbX} onPress={() => removeImage(img.id)}><Text style={styles.thumbXText}>X</Text></Pressable>
                  </View>
                ))}
              </View>
            )}
            {images.length < 4 && (
              <Pressable style={styles.addBtn} onPress={pick}>
                <Text style={styles.addText}>{images.length === 0 ? 'Add screenshot (up to 4)' : `Add more (${4 - images.length} left)`}</Text>
              </Pressable>
            )}

            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. The Crown is Claimed" placeholderTextColor={colors.textMuted} maxLength={120} />

            <Text style={styles.label}>Opponent</Text>
            <TextInput style={styles.input} value={opponent} onChangeText={setOpponent} placeholder="e.g. Alabama" placeholderTextColor={colors.textMuted} maxLength={60} />

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Our score</Text>
                <TextInput style={styles.input} value={ourScore} onChangeText={setOurScore} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textMuted} maxLength={3} />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Opp score</Text>
                <TextInput style={styles.input} value={oppScore} onChangeText={setOppScore} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textMuted} maxLength={3} />
              </View>
            </View>

            <Text style={styles.label}>Week</Text>
            <TextInput style={styles.input} value={week} onChangeText={setWeek} placeholder="e.g. Week 7" placeholderTextColor={colors.textMuted} maxLength={30} />

            <Text style={styles.label}>Caption</Text>
            <TextInput style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} value={caption} onChangeText={setCaption} placeholder="What happened?" placeholderTextColor={colors.textMuted} multiline maxLength={2000} />

            <Pressable style={[styles.submit, { backgroundColor: dark }, !canSubmit && { opacity: 0.5 }]} onPress={submit} disabled={!canSubmit}>
              {submitting ? <ActivityIndicator size="small" color="#f4efe4" /> : <Text style={styles.submitText}>{uploading ? 'Uploading…' : 'Post Moment'}</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
