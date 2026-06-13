import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useThemedAlert } from '@/lib/AlertProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { resolveLeagueRequest } from '@cfb-social/api';
import type { RequestItem } from './types';

interface Props { requests: RequestItem[]; onClose: () => void; onResolved: () => void }

export function InboxModal({ requests, onClose, onResolved }: Props) {
  const colors = useColors();
  const router = useRouter();
  const { showAlert } = useThemedAlert();
  const [busy, setBusy] = useState<string | null>(null);

  const resolve = async (id: string, action: 'approve' | 'decline') => {
    if (busy) return;
    setBusy(id);
    try {
      await resolveLeagueRequest(supabase, id, action);
      onResolved();
    } catch (e) {
      setBusy(null);
      showAlert('Could not update', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    card: { backgroundColor: colors.paper, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 2, borderBottomColor: colors.crimson },
    title: { fontFamily: typography.serifBold, fontSize: 18, color: colors.crimson },
    cancel: { fontFamily: typography.sans, fontSize: 15, color: colors.textSecondary },
    body: { padding: 16 },
    empty: { fontFamily: typography.sans, fontSize: 14, color: colors.textSecondary, lineHeight: 21, paddingVertical: 12 },
    row: { paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    who: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    user: { fontFamily: typography.sansSemiBold, fontSize: 15, color: colors.crimson },
    league: { fontFamily: typography.mono, fontSize: 10, color: colors.textMuted },
    meta: { fontFamily: typography.mono, fontSize: 11, color: colors.textMuted, marginTop: 3 },
    msg: { fontFamily: typography.serif, fontStyle: 'italic', fontSize: 13, color: colors.textPrimary, marginTop: 5 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
    approve: { backgroundColor: colors.success, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 6 },
    approveText: { fontFamily: typography.sansSemiBold, fontSize: 13, color: '#fff' },
    decline: { borderWidth: 1, borderColor: colors.borderStrong, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 6 },
    declineText: { fontFamily: typography.sansSemiBold, fontSize: 13, color: colors.textSecondary },
  }), [colors]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>Join Requests{requests.length > 0 ? ` (${requests.length})` : ''}</Text>
            <Pressable onPress={onClose}><Text style={styles.cancel}>Close</Text></Pressable>
          </View>
          <ScrollView style={styles.body}>
            {requests.length === 0 ? (
              <Text style={styles.empty}>No pending requests yet. When a coach asks to join one of your private leagues, it shows up here.</Text>
            ) : (
              requests.map((r) => (
                <View key={r.id} style={styles.row}>
                  <View style={styles.who}>
                    <Pressable onPress={() => { onClose(); router.push(`/profile/${r.applicant?.username ?? ''}` as never); }}>
                      <Text style={styles.user}>@{r.applicant?.username ?? 'coach'}</Text>
                    </Pressable>
                    <Text style={styles.league}>{r.league_name}</Text>
                  </View>
                  <Text style={styles.meta}>{[r.preferred_school ? `Wants ${r.preferred_school}` : null, r.platform].filter(Boolean).join(' · ')}</Text>
                  {r.message ? <Text style={styles.msg}>&ldquo;{r.message}&rdquo;</Text> : null}
                  <View style={styles.actions}>
                    <Pressable style={[styles.approve, busy === r.id && { opacity: 0.5 }]} onPress={() => resolve(r.id, 'approve')} disabled={busy === r.id}>
                      {busy === r.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.approveText}>Approve</Text>}
                    </Pressable>
                    <Pressable style={[styles.decline, busy === r.id && { opacity: 0.5 }]} onPress={() => resolve(r.id, 'decline')} disabled={busy === r.id}>
                      <Text style={styles.declineText}>Decline</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
