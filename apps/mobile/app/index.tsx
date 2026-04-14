import { useEffect, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { OrnamentDivider } from '@/components/ui/OrnamentDivider';
import { typography } from '@/lib/theme/typography';

export default function SplashScreen() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const { dark } = useSchoolTheme();
  const colors = useColors();

  const styles = useMemo(() => StyleSheet.create({
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.paper,
    },
    loadingIcon: {
      width: 200,
      height: 200,
    },
    spinner: {
      marginTop: 24,
    },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.paper,
      paddingHorizontal: 32,
    },
    title: {
      fontFamily: typography.serifBold,
      fontSize: 42,
      color: colors.ink,
      textAlign: 'center',
      marginBottom: 4,
    },
    ornament: {
      fontFamily: typography.mono,
      fontSize: 10,
      letterSpacing: 3,
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginTop: 32,
    },
    subtitle: {
      fontFamily: typography.mono,
      fontSize: 12,
      letterSpacing: 4,
      color: colors.textSecondary,
      marginTop: 2,
      textTransform: 'uppercase',
    },
    tagline: {
      fontFamily: typography.sans,
      fontSize: 16,
      lineHeight: 24,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    buttonContainer: {
      marginTop: 32,
      width: '100%',
      gap: 12,
    },
    primaryButton: {
      paddingVertical: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    primaryButtonText: {
      fontFamily: typography.sansBold,
      fontSize: 16,
      color: '#f4efe4',
    },
    secondaryButton: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    secondaryButtonText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 16,
      color: colors.ink,
      textDecorationLine: 'underline',
    },
    disclaimer: {
      fontFamily: typography.sans,
      fontSize: 10,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 24,
      paddingHorizontal: 16,
      lineHeight: 14,
    },
  }), [colors]);

  useEffect(() => {
    if (!loading && session) {
      router.replace('/(tabs)/feed');
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('../assets/icon.png')}
          style={styles.loadingIcon}
          resizeMode="contain"
        />
        <ActivityIndicator color={dark} size="large" style={styles.spinner} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>CFB Social</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>COLLEGE FOOTBALL SOCIAL</Text>

      {/* Divider */}
      <OrnamentDivider />

      {/* Tagline */}
      <Text style={styles.tagline}>
        Stake your claims. Call your shots.{'\n'}Build your dynasty.
      </Text>

      {/* CTA buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: dark }]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.primaryButtonText}>Enter CFB Social</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </Pressable>
      </View>

      {/* Bottom ornament */}
      <Text style={styles.ornament}>WHERE RECEIPTS ARE KEPT</Text>

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        An independent fan community. Not affiliated with, endorsed by, or sponsored by the NCAA, any conference, or any university.
      </Text>
    </View>
  );
}
