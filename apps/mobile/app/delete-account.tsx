import { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { OrnamentDivider } from '@/components/ui/OrnamentDivider';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { supabase } from '@/lib/supabase';

export default function DeleteAccountScreen() {
  const colors = useColors();
  const router = useRouter();
  const { profile, session } = useAuth();
  const userId = profile?.id ?? null;
  const { dark } = useSchoolTheme();

  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const canDelete = confirmation === 'DELETE';

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    warningBox: {
      backgroundColor: '#fef2f2',
      borderWidth: 1,
      borderColor: '#fecaca',
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
    },
    warningTitle: {
      fontFamily: typography.serifBold,
      fontSize: 18,
      color: '#991b1b',
      marginBottom: 8,
    },
    warningBody: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: '#991b1b',
      lineHeight: 22,
    },
    warningBullet: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: '#991b1b',
      lineHeight: 22,
      paddingLeft: 12,
      marginBottom: 2,
    },
    label: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
      color: colors.textPrimary,
      letterSpacing: 0.3,
      marginBottom: 6,
    },
    confirmInput: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: typography.mono,
      fontSize: 16,
      color: colors.textPrimary,
      letterSpacing: 4,
      textAlign: 'center',
      marginBottom: 20,
    },
    deleteButton: {
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    deleteButtonDisabled: {
      opacity: 0.5,
    },
    deleteButtonText: {
      fontFamily: typography.sansBold,
      fontSize: 16,
      color: '#fff',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    successContainer: {
      alignItems: 'center',
      gap: 16,
      paddingVertical: 40,
    },
    successTitle: {
      fontFamily: typography.serifBold,
      fontSize: 24,
      color: colors.textPrimary,
    },
    successBody: {
      fontFamily: typography.sans,
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 20,
    },
    loginPrompt: {
      alignItems: 'center',
      gap: 16,
      paddingVertical: 40,
    },
    loginText: {
      fontFamily: typography.sans,
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    loginButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
    },
    loginButtonText: {
      fontFamily: typography.sansBold,
      fontSize: 14,
      color: '#f4efe4',
    },
    contact: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 24,
      lineHeight: 20,
    },
    contactEmail: {
      fontFamily: typography.mono,
      color: colors.ink,
    },
  }), [colors]);

  const handleDelete = async () => {
    if (!canDelete || deleting || !userId) return;
    setDeleting(true);

    try {
      // Clear all profile data
      await supabase
        .from('profiles')
        .update({
          display_name: '[deleted]',
          avatar_url: null,
          bio: null,
          school_id: null,
        })
        .eq('id', userId);

      // Remove user's follows
      await supabase.from('follows').delete().eq('follower_id', userId);
      await supabase.from('follows').delete().eq('following_id', userId);

      // Remove user's reactions
      await supabase.from('reactions').delete().eq('user_id', userId);

      // Remove user's saves
      await supabase.from('saves').delete().eq('user_id', userId);

      // Sign out
      await supabase.auth.signOut();
      setDeleted(true);
    } catch {
      setDeleting(false);
    }
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <SectionLabel text="Delete Account" />
        <View style={styles.loginPrompt}>
          <Text style={styles.loginText}>You must be logged in to delete your account.</Text>
          <Pressable
            style={[styles.loginButton, { backgroundColor: dark }]}
            onPress={() => router.push('/(auth)/login' as never)}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (deleted) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <SectionLabel text="Delete Account" />
        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>Account Deleted</Text>
          <Text style={styles.successBody}>
            Your account data has been removed and you have been signed out.
            Full account deletion will be completed within 30 days. If you need
            further assistance, contact us at info@donkeyideas.com.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />
      <SectionLabel text="Delete Account" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>This action is permanent</Text>
          <Text style={styles.warningBody}>Deleting your account will:</Text>
          <Text style={styles.warningBullet}>- Remove your profile information</Text>
          <Text style={styles.warningBullet}>- Clear your display name and avatar</Text>
          <Text style={styles.warningBullet}>- Sign you out of all devices</Text>
          <Text style={styles.warningBody}>
            Some anonymized content (posts, votes) may remain for community integrity.
          </Text>
        </View>

        <OrnamentDivider />

        <Text style={styles.label}>Type DELETE to confirm</Text>
        <TextInput
          style={styles.confirmInput}
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="DELETE"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Pressable
          style={[
            styles.deleteButton,
            { backgroundColor: '#991b1b' },
            (!canDelete || deleting) && styles.deleteButtonDisabled,
          ]}
          onPress={handleDelete}
          disabled={!canDelete || deleting}
        >
          <Text style={styles.deleteButtonText}>
            {deleting ? 'Deleting...' : 'Delete My Account'}
          </Text>
        </Pressable>

        <Text style={styles.contact}>
          Need help? Contact us at{' '}
          <Text style={styles.contactEmail}>info@donkeyideas.com</Text>
        </Text>
      </ScrollView>
    </View>
  );
}
