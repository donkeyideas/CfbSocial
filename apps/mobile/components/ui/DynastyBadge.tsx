import { StyleSheet, Text, View } from 'react-native';
import { typography } from '@/lib/theme/typography';

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  WALK_ON: { label: 'Walk-On', color: '#808080' },
  STARTER: { label: 'Starter', color: '#4a7c59' },
  ALL_CONFERENCE: { label: 'All-Conf', color: '#4a6c8c' },
  ALL_AMERICAN: { label: 'All-Amer', color: '#8b1a1a' },
  HEISMAN: { label: 'Heisman', color: '#c9a84c' },
  HALL_OF_FAME: { label: 'HoF', color: '#b8860b' },
};

interface DynastyBadgeProps {
  tier: string | null;
  accentColor?: string;
}

export function DynastyBadge({ tier, accentColor }: DynastyBadgeProps) {
  if (!tier) return null;
  const config = TIER_CONFIG[tier] || TIER_CONFIG.WALK_ON;
  const badgeColor = accentColor || config.color;

  return (
    <View style={[styles.badge, { borderColor: badgeColor }]}>
      <Text style={[styles.text, { color: badgeColor }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
  },
  text: {
    fontFamily: typography.mono,
    fontSize: 8,
    letterSpacing: 0.5,
  },
});
