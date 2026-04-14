import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { typography } from '@/lib/theme/typography';
import { useColors } from '@/lib/theme/ThemeProvider';

export function DynastyWidget() {
  const colors = useColors();
  const { session, profile } = useAuth();
  const { dark, accent } = useSchoolTheme();
  const router = useRouter();

  const styles = useMemo(() => StyleSheet.create({
    card: {
      marginHorizontal: 12,
      marginVertical: 8,
      borderRadius: 6,
      borderWidth: 2,
      overflow: 'hidden',
      backgroundColor: colors.surfaceRaised,
    },
    header: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
    },
    headerText: {
      fontFamily: typography.mono,
      fontSize: 13,
      color: '#f4efe4',
      letterSpacing: 3,
    },
    body: {
      padding: 16,
      alignItems: 'center',
      gap: 10,
    },
    levelText: {
      fontFamily: typography.serifBold,
      fontSize: 20,
      color: colors.ink,
      letterSpacing: 0.5,
    },
    progressTrack: {
      width: '100%',
      height: 12,
      backgroundColor: colors.surface,
      borderRadius: 6,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 6,
      overflow: 'hidden',
    },
    progressGradient: {
      flex: 1,
    },
    xpSubtitle: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textMuted,
    },
    ctaText: {
      fontFamily: typography.serif,
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
    },
    ctaButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 6,
      alignSelf: 'center',
    },
    ctaButtonText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: '#f4efe4',
    },
  }), [colors]);

  if (!session || !profile) {
    return (
      <View style={[styles.card, { borderColor: colors.border }]}>
        <View style={[styles.header, { backgroundColor: dark }]}>
          <Text style={styles.headerText}>DYNASTY STATUS</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.ctaText}>Sign up to start your dynasty</Text>
          <Pressable
            style={[styles.ctaButton, { backgroundColor: dark }]}
            onPress={() => router.push('/(auth)/register' as never)}
          >
            <Text style={styles.ctaButtonText}>Create Account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const xpForNext = profile.level * 500;
  const xpProgress = Math.min(profile.xp / xpForNext, 1);

  return (
    <Pressable
      style={[styles.card, { borderColor: dark }]}
      onPress={() => router.push('/dynasty' as never)}
    >
      <View style={[styles.header, { backgroundColor: dark }]}>
        <Text style={[styles.headerText, { color: accent }]}>DYNASTY STATUS</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.levelText}>
          Level {profile.level} -- {profile.xp.toLocaleString()} XP
        </Text>

        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${xpProgress * 100}%` }]}
          >
            <View style={[styles.progressGradient, { backgroundColor: dark }]}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: accent, opacity: 0.5 }]} />
            </View>
          </View>
        </View>

        <Text style={styles.xpSubtitle}>
          {profile.xp.toLocaleString()} / {xpForNext.toLocaleString()} XP to next level
        </Text>
      </View>
    </Pressable>
  );
}
