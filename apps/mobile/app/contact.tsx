import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { OrnamentDivider } from '@/components/ui/OrnamentDivider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { supabase } from '@/lib/supabase';

export default function ContactScreen() {
  const colors = useColors();
  const { profile, userId } = useAuth();
  const { dark } = useSchoolTheme();

  const [name, setName] = useState(profile?.display_name || '');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    description: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 8,
    },
    form: {
      gap: 16,
    },
    fieldGroup: {
      gap: 4,
    },
    fieldLabel: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
      color: colors.textPrimary,
      letterSpacing: 0.3,
    },
    textInput: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: typography.sans,
      fontSize: 15,
      color: colors.textPrimary,
    },
    textArea: {
      minHeight: 120,
      paddingTop: 10,
    },
    submitButton: {
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 8,
    },
    submitDisabled: {
      opacity: 0.7,
    },
    submitButtonText: {
      fontFamily: typography.sansBold,
      fontSize: 16,
      color: '#f4efe4',
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
      color: colors.success,
    },
    successSubtitle: {
      fontFamily: typography.sans,
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 20,
    },
  }), [colors]);

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    subject.trim().length > 0 &&
    message.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from('contact_submissions')
        .insert({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          user_id: userId || null,
        });

      if (insertError) {
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setName(profile?.display_name || '');
    setEmail('');
    setSubject('');
    setMessage('');
    setSubmitted(false);
  };

  return (
    <View style={styles.container}>
      <AppHeader />
      <SectionLabel text="Contact" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.description}>
            Have a question, found a bug, or want to partner with CFB Social?
            Drop us a line.
          </Text>

          <OrnamentDivider />

          {submitted ? (
            /* Success state */
            <View style={styles.successContainer}>
              <Text style={styles.successTitle}>Message Sent</Text>
              <Text style={styles.successSubtitle}>
                Your message has been submitted. We'll get back to you soon.
              </Text>
              <Pressable
                style={[styles.submitButton, { backgroundColor: dark }]}
                onPress={handleReset}
              >
                <Text style={styles.submitButtonText}>Send Another</Text>
              </Pressable>
            </View>
          ) : (
            /* Form */
            <View style={styles.form}>
              {/* Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                />
              </View>

              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Subject */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Subject</Text>
                <TextInput
                  style={styles.textInput}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="What's this about?"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Message */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Message</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Tell us what's on your mind..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Submit */}
              <Pressable
                style={[
                  styles.submitButton,
                  { backgroundColor: canSubmit ? dark : colors.textMuted },
                  submitting && styles.submitDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit || submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Sending...' : 'Submit'}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
