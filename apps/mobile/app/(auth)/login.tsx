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
  Alert,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { OrnamentDivider } from '@/components/ui/OrnamentDivider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { withAlpha } from '@/lib/theme/utils';

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { dark } = useSchoolTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    form: {
      gap: 16,
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
      paddingVertical: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontFamily: typography.sansBold,
      fontSize: 16,
      color: colors.textInverse,
    },
    oauthDividerContainer: {
      marginVertical: 20,
    },
    oauthContainer: {
      gap: 12,
    },
    oauthButton: {
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    oauthButtonText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 15,
      color: colors.ink,
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
  }), [colors]);

  async function handleLogin() {
    if (!email || !password) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      const friendlyMessages: Record<string, string> = {
        'Invalid login credentials': 'Incorrect email or password. Please try again.',
        'Email not confirmed': 'Please verify your email before signing in.',
      };
      setError(friendlyMessages[signInError.message] || 'Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    router.replace('/(tabs)/feed');
  }

  async function handleGoogleSignIn() {
    setOauthLoading(true);
    setError(null);

    try {
      const redirectTo = makeRedirectUri({ scheme: 'cfbsocial' });

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setOauthLoading(false);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        if (result.type === 'success' && result.url) {
          // Extract tokens from the redirect URL fragment
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.replace('#', '?'));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }

          router.replace('/(tabs)/feed');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(message);
    } finally {
      setOauthLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setOauthLoading(true);
    setError(null);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        setError('No identity token received from Apple');
        setOauthLoading(false);
        return;
      }

      const { error: tokenError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (tokenError) {
        setError(tokenError.message);
        setOauthLoading(false);
        return;
      }

      router.replace('/(tabs)/feed');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Apple sign-in failed';
      if (message.includes('ERR_REQUEST_CANCELED')) {
        // User cancelled -- not an error
      } else {
        setError(message);
      }
    } finally {
      setOauthLoading(false);
    }
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
        {/* Header */}
        <Text style={styles.title}>CFB Social</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>Sign In</Text>

        {/* Error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
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

          <View>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Pressable
            style={[styles.button, { backgroundColor: dark }, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || oauthLoading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        {/* OAuth divider */}
        <View style={styles.oauthDividerContainer}>
          <OrnamentDivider />
        </View>

        {/* OAuth buttons */}
        <View style={styles.oauthContainer}>
          <Pressable
            style={[styles.oauthButton, oauthLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading || oauthLoading}
          >
            {oauthLoading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Text style={styles.oauthButtonText}>Continue with Google</Text>
            )}
          </Pressable>

          {Platform.OS === 'ios' && (
            <Pressable
              style={[styles.oauthButton, oauthLoading && styles.buttonDisabled]}
              onPress={handleAppleSignIn}
              disabled={loading || oauthLoading}
            >
              <Text style={styles.oauthButtonText}>Continue with Apple</Text>
            </Pressable>
          )}
        </View>

        {/* Register link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to CFB Social?</Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Create an account</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
