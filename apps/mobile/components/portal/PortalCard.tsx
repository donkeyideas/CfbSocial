import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { withAlpha } from '@/lib/theme/utils';
import { typography } from '@/lib/theme/typography';
import { SchoolBadge } from '@/components/ui/SchoolBadge';
import type { ColorPalette } from '@/lib/theme/palettes';

export interface PortalSchool {
  id: string;
  name: string;
  abbreviation: string;
  primary_color: string;
  slug: string | null;
}

export interface PortalPlayerData {
  id: string;
  name: string;
  position: string;
  height: string | null;
  weight: string | null;
  star_rating: number | null;
  status: string | null;
  class_year: string | null;
  entered_portal_at: string | null;
  previous_school_name: string | null;
  total_claims: number | null;
  previous_school: PortalSchool | null;
  committed_school: PortalSchool | null;
}

interface PortalCardProps {
  player: PortalPlayerData;
  onClaim?: (player: PortalPlayerData) => void;
}

function renderStars(rating: number | null): string {
  if (!rating || rating < 1) return '';
  return Array(Math.min(rating, 5)).fill('*').join('');
}

function getStatusStyle(status: string | null, colors: ColorPalette) {
  switch (status) {
    case 'COMMITTED':
      return { bg: withAlpha(colors.success, 0.13), text: colors.success };
    case 'WITHDRAWN':
      return { bg: withAlpha(colors.textMuted, 0.13), text: colors.textMuted };
    default:
      return { bg: withAlpha(colors.warning, 0.13), text: colors.warning };
  }
}

function getStatusLabel(status: string | null): string {
  switch (status) {
    case 'IN_PORTAL': return 'IN PORTAL';
    case 'COMMITTED': return 'COMMITTED';
    case 'WITHDRAWN': return 'WITHDRAWN';
    default: return status?.replace(/_/g, ' ') ?? 'UNKNOWN';
  }
}

export function PortalCard({ player, onClaim }: PortalCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { accent } = useSchoolTheme();
  const { session } = useAuth();

  const statusStyle = getStatusStyle(player.status, colors);
  const accentColor = player.previous_school?.primary_color ?? accent;

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
    },
    accentBar: {
      height: 4,
    },
    body: {
      padding: 14,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    nameSection: {
      flex: 1,
      marginRight: 8,
    },
    playerName: {
      fontFamily: typography.serifBold,
      fontSize: 18,
      color: colors.ink,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
    },
    position: {
      fontFamily: typography.mono,
      fontSize: 12,
      color: colors.textMuted,
      letterSpacing: 1,
    },
    stars: {
      fontFamily: typography.sansBold,
      fontSize: 14,
      color: colors.secondary,
      letterSpacing: 2,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
    },
    statusText: {
      fontFamily: typography.mono,
      fontSize: 9,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    physicals: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 6,
    },
    schoolsRow: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 10,
    },
    schoolInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    schoolLabel: {
      fontFamily: typography.mono,
      fontSize: 9,
      color: colors.textMuted,
      letterSpacing: 1,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    claimsCount: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    claimBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 6,
    },
    claimBtnText: {
      fontFamily: typography.sansBold,
      fontSize: 12,
      color: '#f4efe4',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  }), [colors]);

  const handlePress = () => {
    router.push(`/portal/${player.id}` as never);
  };

  const handleClaim = () => {
    if (!session) {
      router.push('/(auth)/login' as never);
      return;
    }
    onClaim?.(player);
  };

  // Build physical info string
  const physicals: string[] = [];
  if (player.height) physicals.push(player.height);
  if (player.weight) physicals.push(`${player.weight} lbs`);
  if (player.class_year) physicals.push(player.class_year);

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      {/* Top accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.body}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.nameSection}>
            <Text style={styles.playerName}>{player.name}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.position}>{player.position}</Text>
              {player.star_rating && player.star_rating > 0 && (
                <Text style={styles.stars}>{renderStars(player.star_rating)}</Text>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {getStatusLabel(player.status)}
            </Text>
          </View>
        </View>

        {/* Physicals */}
        {physicals.length > 0 && (
          <Text style={styles.physicals}>{physicals.join(' / ')}</Text>
        )}

        {/* Schools */}
        <View style={styles.schoolsRow}>
          {player.previous_school && (
            <View style={styles.schoolInfo}>
              <Text style={styles.schoolLabel}>FROM</Text>
              <SchoolBadge
                abbreviation={player.previous_school.abbreviation}
                color={player.previous_school.primary_color}
                slug={player.previous_school.slug}
              />
            </View>
          )}
          {player.committed_school && (
            <View style={styles.schoolInfo}>
              <Text style={styles.schoolLabel}>TO</Text>
              <SchoolBadge
                abbreviation={player.committed_school.abbreviation}
                color={player.committed_school.primary_color}
                slug={player.committed_school.slug}
              />
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.claimsCount}>
            {player.total_claims ?? 0} claim{(player.total_claims ?? 0) !== 1 ? 's' : ''}
          </Text>
          {player.status === 'IN_PORTAL' && onClaim && (
            <Pressable
              style={[styles.claimBtn, { backgroundColor: accentColor }]}
              onPress={handleClaim}
            >
              <Text style={styles.claimBtnText}>Claim</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}
