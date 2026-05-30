import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

interface ReviewPromptModalProps {
  visible: boolean;
  onRate: () => void;
  onNotNow: () => void;
  onNeverAsk: () => void;
}

export function ReviewPromptModal({ visible, onRate, onNotNow, onNeverAsk }: ReviewPromptModalProps) {
  const colors = useColors();
  const { dark, accent } = useSchoolTheme();

  const styles = useMemo(() => StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(26,24,20,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.paper,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    header: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    headerText: {
      fontFamily: typography.mono,
      fontSize: 12,
      letterSpacing: 3,
    },
    body: {
      padding: 20,
    },
    headline: {
      fontFamily: typography.serif,
      fontSize: 22,
      lineHeight: 28,
      color: colors.ink,
      textAlign: 'center',
      marginBottom: 10,
    },
    message: {
      fontFamily: typography.serif,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 18,
    },
    rateButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 4,
      alignItems: 'center',
    },
    rateText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    notNowButton: {
      paddingVertical: 10,
      alignItems: 'center',
      marginTop: 10,
    },
    notNowText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
      color: colors.textSecondary,
      letterSpacing: 1,
    },
    neverAskButton: {
      paddingVertical: 8,
      alignItems: 'center',
      marginTop: 2,
    },
    neverAskText: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: colors.textMuted ?? colors.textSecondary,
      letterSpacing: 0.5,
      textDecorationLine: 'underline',
    },
  }), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onNotNow}
    >
      <Pressable style={styles.backdrop} onPress={onNotNow}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={[styles.header, { backgroundColor: dark }]}>
            <Text style={[styles.headerText, { color: accent }]}>
              CFB SOCIAL
            </Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.headline}>Enjoying the app?</Text>
            <Text style={styles.message}>
              You just shipped a take. If CFB Social has been good to you, a quick rating helps other college football fans find us.
            </Text>

            <View style={styles.divider} />

            <Pressable
              style={[styles.rateButton, { backgroundColor: dark }]}
              onPress={onRate}
            >
              <Text style={[styles.rateText, { color: accent }]}>Rate CFB Social</Text>
            </Pressable>

            <Pressable style={styles.notNowButton} onPress={onNotNow}>
              <Text style={styles.notNowText}>Not Now</Text>
            </Pressable>

            <Pressable style={styles.neverAskButton} onPress={onNeverAsk}>
              <Text style={styles.neverAskText}>Don&apos;t ask again</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
