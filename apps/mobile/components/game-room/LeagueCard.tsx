import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useColors } from '@/lib/theme/ThemeProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { typography } from '@/lib/theme/typography';
import type { LeagueItem } from './types';

interface Props { lg: LeagueItem; onRequest: (lg: LeagueItem) => void }

export function LeagueCard({ lg, onRequest }: Props) {
  const colors = useColors();
  const { dark } = useSchoolTheme();
  const pct = Math.min(100, Math.round((lg.filled_count / Math.max(1, lg.max_users)) * 100));
  const full = lg.status === 'FULL' || lg.filled_count >= lg.max_users;
  const styleLabel = lg.style === 'CASUAL' ? 'Casual' : 'Competitive';
  const locked = lg.is_private && !lg.join_password;

  const styles = useMemo(() => StyleSheet.create({
    card: { backgroundColor: colors.surfaceRaised, borderRadius: 6, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 5, borderLeftColor: colors.success, padding: 14, marginBottom: 12 },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
    name: { fontFamily: typography.serifBold, fontSize: 17, color: colors.textPrimary, flex: 1 },
    meta: { fontFamily: typography.mono, fontSize: 10, color: colors.textMuted, marginTop: 3 },
    badge: { fontFamily: typography.mono, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, overflow: 'hidden' },
    badgeOpen: { backgroundColor: 'rgba(74,124,89,0.15)', color: colors.success },
    badgeFull: { backgroundColor: colors.surface, color: colors.textMuted },
    line: { fontFamily: typography.sans, fontSize: 13, color: colors.textPrimary, marginTop: 8 },
    lineStrong: { fontFamily: typography.sansSemiBold, color: colors.success },
    rules: { fontFamily: typography.serif, fontStyle: 'italic', fontSize: 13, color: colors.textSecondary, marginTop: 6 },
    bar: { height: 6, backgroundColor: colors.surface, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
    fill: { height: 6, backgroundColor: colors.success },
    slots: { fontFamily: typography.mono, fontSize: 10, color: colors.textMuted, marginTop: 4 },
    join: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, borderStyle: 'dashed' },
    joinRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    joinK: { fontFamily: typography.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: colors.textMuted, width: 80 },
    joinV: { fontFamily: typography.mono, fontSize: 13, fontWeight: '700', color: colors.textPrimary, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, flexShrink: 1 },
    copy: { borderWidth: 1, borderColor: colors.success, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 3 },
    copyText: { fontFamily: typography.sansSemiBold, fontSize: 10, color: colors.success, textTransform: 'uppercase' },
    locked: { fontFamily: typography.mono, fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
    note: { fontFamily: typography.sans, fontSize: 11, color: colors.textMuted, marginTop: 4 },
    reqBtn: { marginTop: 6, paddingVertical: 11, borderRadius: 6, alignItems: 'center' },
    reqText: { fontFamily: typography.sansSemiBold, fontSize: 14, color: '#f4efe4' },
  }), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{lg.name}</Text>
          <Text style={styles.meta}>{lg.platform} · {lg.max_users}-user · {lg.cross_play ? 'Cross-play' : 'No cross-play'} · {styleLabel}{lg.is_private ? ' · Private' : ''}</Text>
        </View>
        <Text style={[styles.badge, full ? styles.badgeFull : styles.badgeOpen]}>{full ? 'Full' : `${lg.max_users - lg.filled_count} open`}</Text>
      </View>

      {lg.sim_schedule ? <Text style={styles.line}>Sims: <Text style={styles.lineStrong}>{lg.sim_schedule}</Text></Text> : null}
      {lg.open_schools ? <Text style={styles.line}>Open schools: <Text style={styles.lineStrong}>{lg.open_schools}</Text></Text> : null}
      {lg.rules ? <Text style={styles.rules}>{lg.rules}</Text> : null}

      <View style={styles.bar}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
      <Text style={styles.slots}>{lg.filled_count} / {lg.max_users} filled</Text>

      <View style={styles.join}>
        <View style={styles.joinRow}>
          <Text style={styles.joinK}>League Name</Text>
          <Text style={styles.joinV} numberOfLines={1}>{lg.join_code || '—'}</Text>
          {lg.join_code ? <Pressable style={styles.copy} onPress={() => Clipboard.setStringAsync(lg.join_code!)}><Text style={styles.copyText}>Copy</Text></Pressable> : null}
        </View>
        {locked ? (
          <>
            <View style={styles.joinRow}>
              <Text style={styles.joinK}>Password</Text>
              <Text style={styles.locked}>Private — request to get it</Text>
            </View>
            <Pressable style={[styles.reqBtn, { backgroundColor: full ? colors.textMuted : dark }]} disabled={full} onPress={() => onRequest(lg)}>
              <Text style={styles.reqText}>{full ? 'Full' : 'Request to Join'}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.joinRow}>
              <Text style={styles.joinK}>Password</Text>
              <Text style={styles.joinV} numberOfLines={1}>{lg.join_password || '—'}</Text>
              {lg.join_password ? <Pressable style={styles.copy} onPress={() => Clipboard.setStringAsync(lg.join_password!)}><Text style={styles.copyText}>Copy</Text></Pressable> : null}
            </View>
            <Text style={styles.note}>In CFB 27 → Online Dynasty → Join with this League Name + Password.</Text>
          </>
        )}
      </View>
    </View>
  );
}
