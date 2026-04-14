import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typography } from '@/lib/theme/typography';
import { useColors } from '@/lib/theme/ThemeProvider';

type PredictionStatus = 'PENDING' | 'RECEIPT' | 'BUST' | 'PUSH' | 'EXPIRED';

interface PredictionBadgeProps {
  status: string;
}

export function PredictionBadge({ status }: PredictionBadgeProps) {
  const colors = useColors();

  const STATUS_CONFIG: Record<PredictionStatus, { label: string; borderColor: string; textColor: string; filled: boolean }> = useMemo(() => ({
    PENDING: { label: 'PENDING', borderColor: colors.textMuted, textColor: colors.textMuted, filled: false },
    RECEIPT: { label: 'RECEIPT', borderColor: colors.success, textColor: colors.success, filled: true },
    BUST: { label: 'BUST', borderColor: colors.crimson, textColor: colors.crimson, filled: false },
    PUSH: { label: 'PUSH', borderColor: colors.warning, textColor: colors.warning, filled: false },
    EXPIRED: { label: 'EXPIRED', borderColor: colors.textMuted, textColor: colors.textMuted, filled: false },
  }), [colors]);

  const config = STATUS_CONFIG[status as PredictionStatus] || STATUS_CONFIG.PENDING;

  const styles = useMemo(() => StyleSheet.create({
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      borderWidth: 1,
      alignSelf: 'flex-start',
    },
    text: {
      fontFamily: typography.mono,
      fontSize: 10,
      letterSpacing: 1,
    },
  }), [colors]);

  return (
    <View
      style={[
        styles.badge,
        { borderColor: config.borderColor },
        config.filled && { backgroundColor: config.borderColor },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: config.filled ? '#f4efe4' : config.textColor },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}
