import { useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useThemedAlert } from '@/lib/AlertProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { createLeague } from '@cfb-social/api';

interface Props { onClose: () => void; onCreated: () => void }

const PLATFORMS = ['PS5', 'Xbox', 'PC'];
const TAGS: { key: string; label: string }[] = [
  { key: 'POWER_4', label: 'Power 4' },
  { key: 'G5_ONLY', label: 'G5 Only' },
  { key: 'CASUAL', label: 'Casual' },
  { key: 'COMPETITIVE', label: 'Competitive' },
];

export function LeagueComposer({ onClose, onCreated }: Props) {
  const colors = useColors();
  const { dark } = useSchoolTheme();
  const { showAlert } = useThemedAlert();

  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [platform, setPlatform] = useState('PS5');
  const [maxUsers, setMaxUsers] = useState('32');
  const [crossPlay, setCrossPlay] = useState(true);
  const [style, setStyle] = useState('COMPETITIVE');
  const [simSchedule, setSimSchedule] = useState('');
  const [openSchools, setOpenSchools] = useState('');
  const [rules, setRules] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (t: string) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createLeague(supabase, {
        name: name.trim(), platform, maxUsers: parseInt(maxUsers, 10) || 32,
        simSchedule: simSchedule.trim() || null, style, rules: rules.trim() || null,
        tags, openSchools: openSchools.trim() || null, joinCode: joinCode.trim() || null,
        joinPassword: joinPassword.trim() || null, isPrivate, crossPlay,
      } as never);
      onCreated();
    } catch (e) {
      setSubmitting(false);
      showAlert('Could not list', e instanceof Error ? e.message : 'Try again.');
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
    label: { fontFamily: typography.mono, fontSize: 10, letterSpacing: 1.5, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4, marginTop: 12 },
    eyebrow: { fontFamily: typography.mono, fontSize: 10, letterSpacing: 1, color: colors.crimson, textTransform: 'uppercase', marginTop: 16 },
    input: { fontFamily: typography.sans, fontSize: 15, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: colors.surfaceRaised },
    row: { flexDirection: 'row', gap: 8 },
    half: { flex: 1 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
    chipText: { fontFamily: typography.sans, fontSize: 13, color: colors.textSecondary },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
    toggleLabel: { fontFamily: typography.sansSemiBold, fontSize: 14, color: colors.textPrimary },
    submit: { marginTop: 22, marginBottom: 8, paddingVertical: 13, borderRadius: 8, alignItems: 'center' },
    submitText: { fontFamily: typography.sansSemiBold, fontSize: 15, color: '#f4efe4' },
  }), [colors]);

  const Chip = ({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) => (
    <Pressable style={[styles.chip, active && { backgroundColor: dark, borderColor: dark }]} onPress={onPress}>
      <Text style={[styles.chipText, active && { color: '#f4efe4' }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>List Your League</Text>
            <Pressable onPress={onClose}><Text style={styles.cancel}>Cancel</Text></Pressable>
          </View>
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>League name (shown in the directory)</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. SEC After Dark" placeholderTextColor={colors.textMuted} maxLength={60} />

            <Text style={styles.eyebrow}>In-game join info (from your CFB Online Commissioner Settings)</Text>
            <Text style={styles.label}>League Name (join code)</Text>
            <TextInput style={styles.input} value={joinCode} onChangeText={setJoinCode} placeholder="e.g. JT112387" placeholderTextColor={colors.textMuted} autoCapitalize="characters" maxLength={20} />
            <Text style={styles.label}>League Password</Text>
            <TextInput style={styles.input} value={joinPassword} onChangeText={setJoinPassword} placeholder="e.g. 35SVN9WRPN2MPN15NMY" placeholderTextColor={colors.textMuted} maxLength={40} />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Private — request to join</Text>
              <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: dark }} />
            </View>

            <Text style={styles.label}>Platform</Text>
            <View style={styles.chipRow}>{PLATFORMS.map((p) => <Chip key={p} active={platform === p} label={p} onPress={() => setPlatform(p)} />)}</View>

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Max users</Text>
                <TextInput style={styles.input} value={maxUsers} onChangeText={setMaxUsers} keyboardType="number-pad" maxLength={3} placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.half}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Cross-play</Text>
                  <Switch value={crossPlay} onValueChange={setCrossPlay} trackColor={{ true: dark }} />
                </View>
              </View>
            </View>

            <Text style={styles.label}>Style</Text>
            <View style={styles.chipRow}>
              <Chip active={style === 'COMPETITIVE'} label="Competitive" onPress={() => setStyle('COMPETITIVE')} />
              <Chip active={style === 'CASUAL'} label="Casual" onPress={() => setStyle('CASUAL')} />
            </View>

            <Text style={styles.label}>Sim schedule</Text>
            <TextInput style={styles.input} value={simSchedule} onChangeText={setSimSchedule} placeholder="e.g. Tue / Fri, 9pm ET" placeholderTextColor={colors.textMuted} maxLength={60} />

            <Text style={styles.label}>Open schools</Text>
            <TextInput style={styles.input} value={openSchools} onChangeText={setOpenSchools} placeholder="e.g. Vandy, Miss St, Arkansas" placeholderTextColor={colors.textMuted} maxLength={120} />

            <Text style={styles.label}>Rules / notes</Text>
            <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} value={rules} onChangeText={setRules} placeholder="House rules, advance policy…" placeholderTextColor={colors.textMuted} multiline maxLength={500} />

            <Text style={styles.label}>Tags</Text>
            <View style={styles.chipRow}>{TAGS.map((t) => <Chip key={t.key} active={tags.includes(t.key)} label={t.label} onPress={() => toggleTag(t.key)} />)}</View>

            <Pressable style={[styles.submit, { backgroundColor: dark }, (!name.trim() || submitting) && { opacity: 0.5 }]} onPress={submit} disabled={!name.trim() || submitting}>
              {submitting ? <ActivityIndicator size="small" color="#f4efe4" /> : <Text style={styles.submitText}>List League</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
