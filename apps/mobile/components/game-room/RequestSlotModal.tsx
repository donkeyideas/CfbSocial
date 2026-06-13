import { useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useThemedAlert } from '@/lib/AlertProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { requestSlot } from '@cfb-social/api';
import type { LeagueItem } from './types';

interface Props { league: LeagueItem; onClose: () => void; onSent: () => void }

export function RequestSlotModal({ league, onClose, onSent }: Props) {
  const colors = useColors();
  const { dark } = useSchoolTheme();
  const { showAlert } = useThemedAlert();
  const [preferredSchool, setPreferredSchool] = useState('');
  const [platform, setPlatform] = useState(league.platform ?? '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (sending) return;
    setSending(true);
    try {
      await requestSlot(supabase, {
        leagueId: league.id,
        preferredSchool: preferredSchool.trim() || null,
        platform: platform.trim() || null,
        message: message.trim() || null,
      } as never);
      onSent();
    } catch (e) {
      setSending(false);
      showAlert('Could not send', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    card: { backgroundColor: colors.paper, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 2, borderBottomColor: colors.crimson },
    title: { fontFamily: typography.serifBold, fontSize: 18, color: colors.crimson },
    cancel: { fontFamily: typography.sans, fontSize: 15, color: colors.textSecondary },
    body: { padding: 16 },
    sub: { fontFamily: typography.sans, fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
    label: { fontFamily: typography.mono, fontSize: 10, letterSpacing: 1.5, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4, marginTop: 12 },
    input: { fontFamily: typography.sans, fontSize: 15, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: colors.surfaceRaised },
    submit: { marginTop: 20, marginBottom: 8, paddingVertical: 13, borderRadius: 8, alignItems: 'center' },
    submitText: { fontFamily: typography.sansSemiBold, fontSize: 15, color: '#f4efe4' },
  }), [colors]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>Request to Join</Text>
            <Pressable onPress={onClose}><Text style={styles.cancel}>Cancel</Text></Pressable>
          </View>
          <View style={styles.body}>
            <Text style={styles.sub}>Ask the commissioner of <Text style={{ fontFamily: typography.sansSemiBold }}>{league.name}</Text> for a slot. They&apos;ll share the password on approval.</Text>
            <Text style={styles.label}>Preferred school</Text>
            <TextInput style={styles.input} value={preferredSchool} onChangeText={setPreferredSchool} placeholder="e.g. Vanderbilt" placeholderTextColor={colors.textMuted} maxLength={60} />
            <Text style={styles.label}>Platform</Text>
            <TextInput style={styles.input} value={platform} onChangeText={setPlatform} placeholder="PS5 / Xbox / PC" placeholderTextColor={colors.textMuted} maxLength={20} />
            <Text style={styles.label}>Message (optional)</Text>
            <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} value={message} onChangeText={setMessage} placeholder="Tell them why you'd be a good fit" placeholderTextColor={colors.textMuted} multiline maxLength={300} />
            <Pressable style={[styles.submit, { backgroundColor: dark }, sending && { opacity: 0.5 }]} onPress={send} disabled={sending}>
              {sending ? <ActivityIndicator size="small" color="#f4efe4" /> : <Text style={styles.submitText}>Send Request</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
