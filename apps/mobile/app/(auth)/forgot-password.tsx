import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { withAlpha } from '@/lib/theme/utils';

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 48,
    },
    title: {
      fontFamily: typography.serifBold,
      fontSize: 36,
      color: colors.ink,
      textAlign: 'center',
    },
    divider: {
      width: 60,
      height: 1,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginVertical: 12,
    },
    subtitle: {
      fontFamily: typography.serif,
      fontSize: 22,
      color: colors.ink,
      textAlign: 'center',
      marginBottom: 8,
    },
    description: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    errorContainer: {
      backgroundColor: withAlpha(colors.crimson, 0.08),
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    errorText: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.crimson,
    },
    label: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    input: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: typography.sans,
      fontSize: 16,
      color: colors.ink,
    },
    button: {
      backgroundColor: colors.crimson,
      paddingVertical: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 16,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontFamily: typography.sansBold,
      fontSize: 16,
      color: '#f4efe4',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 24,
    },
    footerText: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textMuted,
    },
    footerLink: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.crimson,
    },
    successCard: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 28,
      alignItems: 'center',
      marginTop: 8,
    },
    successIcon: {
      fontFamily: typography.serifBold,
      fontSize: 40,
      color: colors.crimson,
      marginBottom: 12,
    },
    successHeading: {
      fontFamily: typography.serifBold,
      fontSize: 22,
      color: colors.ink,
      marginBottom: 16,
    },
    successBody: {
      fontFamily: typography.sans,
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 12,
    },
  }), [colors]);

  async function handleSubmit() {
    if (!email) return;
    setLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>CFB Social</Text>
          <View style={styles.divider} />
          <Text style={styles.subtitle}>Check Your Email</Text>

          <View style={styles.successCard}>
            <Text style={styles.successIcon}>@</Text>
            <Text style={styles.successHeading}>Reset Link Sent</Text>
            <Text style={styles.successBody}>
              We sent a password reset link to{'\n'}
              <Text style={{ fontFamily: typography.sansBold }}>{email}</Text>
            </Text>
            <Text style={styles.successBody}>
              Tap the link in the email to set a new password.
            </Text>
          </View>

          <Link href="/(auth)/login" asChild>
            <Pressable style={[styles.button, { marginTop: 24 }]}>
              <Text style={styles.buttonText}>Back to Sign In</Text>
            </Pressable>
          </Link>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>CFB Social</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>Reset Password</Text>
        <Text style={styles.description}>
          Enter your email and we will send you a link to reset your password.
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#f4efe4" />
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
