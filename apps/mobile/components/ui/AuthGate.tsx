import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { typography } from '@/lib/theme/typography';
import { useColors } from '@/lib/theme/ThemeProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';

interface AuthGateProps {
  message?: string;
}

export function AuthGate({ message = 'Sign in to access this feature' }: AuthGateProps) {
  const colors = useColors();
  const router = useRouter();
  const { dark } = useSchoolTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      padding: 40,
      alignItems: 'center',
      gap: 16,
    },
    title: {
      fontFamily: typography.serifBold,
      fontSize: 18,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    button: {
      paddingHorizontal: 32,
      paddingVertical: 12,
      borderRadius: 8,
    },
    buttonText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 16,
      color: '#f4efe4',
    },
    link: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.crimson,
      textDecorationLine: 'underline',
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{message}</Text>
      <Pressable
        onPress={() => router.push('/(auth)/login' as never)}
        style={[styles.button, { backgroundColor: dark }]}
      >
        <Text style={styles.buttonText}>Sign In</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/(auth)/register' as never)}>
        <Text style={[styles.link, { color: dark }]}>Don't have an account? Sign up</Text>
      </Pressable>
    </View>
  );
}
