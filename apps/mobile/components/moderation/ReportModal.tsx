import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '@/lib/theme/ThemeProvider';
import { withAlpha } from '@/lib/theme/utils';
import { typography } from '@/lib/theme/typography';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

const REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'HATE_SPEECH', label: 'Hate Speech' },
  { value: 'OFF_TOPIC', label: 'Off Topic' },
  { value: 'POLITICS', label: 'Politics' },
  { value: 'MISINFORMATION', label: 'Misinformation' },
  { value: 'OTHER', label: 'Other' },
];

interface ReportModalProps {
  visible: boolean;
  postId: string;
  postAuthorId: string;
  onClose: () => void;
}

export function ReportModal({ visible, postId, postAuthorId, onClose }: ReportModalProps) {
  const colors = useColors();
  const { dark } = useSchoolTheme();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    card: {
      backgroundColor: colors.paper,
      borderRadius: 12,
      padding: 20,
      maxHeight: '80%',
    },
    closeButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 1,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      fontFamily: typography.mono,
      fontSize: 16,
      color: colors.textMuted,
      lineHeight: 18,
    },
    flagLabel: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.crimson,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    title: {
      fontFamily: typography.serifBold,
      fontSize: 20,
      color: colors.ink,
      marginBottom: 16,
    },
    errorBox: {
      backgroundColor: withAlpha(colors.crimson, 0.08),
      padding: 10,
      borderRadius: 6,
      marginBottom: 12,
    },
    errorText: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.crimson,
    },
    radioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 10,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    radioLabel: {
      fontFamily: typography.sans,
      fontSize: 15,
      color: colors.textPrimary,
    },
    descLabel: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 12,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.ink,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    actions: {
      marginTop: 16,
      gap: 12,
      alignItems: 'center',
    },
    button: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      width: '100%',
    },
    buttonText: {
      fontFamily: typography.sansBold,
      fontSize: 15,
      color: '#fff',
    },
    cancelText: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textMuted,
      textDecorationLine: 'underline',
    },
    successContainer: {
      alignItems: 'center',
      padding: 20,
      gap: 12,
    },
    successTitle: {
      fontFamily: typography.serifBold,
      fontSize: 20,
      color: colors.ink,
    },
    successText: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  }), [colors]);

  const { profile } = useAuth();
  const userId = profile?.id ?? null;

  async function handleSubmit() {
    if (!reason || !userId) return;
    setLoading(true);
    setError(null);

    try {
      // Check for existing report
      const { data: existing } = await supabase
        .from('reports')
        .select('id')
        .eq('post_id', postId)
        .eq('reporter_id', userId)
        .maybeSingle();

      if (existing) {
        setError('You have already reported this post.');
        return;
      }

      const { error: insertError } = await supabase.from('reports').insert({
        post_id: postId,
        reporter_id: userId,
        reason,
        description: description || null,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      // Flag the post
      await supabase
        .from('posts')
        .update({ status: 'FLAGGED', flagged_at: new Date().toISOString() })
        .eq('id', postId);

      // Create notification for the post author
      if (postAuthorId && postAuthorId !== userId) {
        await supabase.from('notifications').insert({
          recipient_id: postAuthorId,
          type: 'POST_FLAGGED',
          post_id: postId,
        });
      }

      // Log moderation event
      const combinedReason = `${reason}${description ? ': ' + description : ''}`;
      await supabase.from('moderation_events').insert({
        post_id: postId,
        user_id: postAuthorId,
        moderator_id: userId,
        event_type: 'USER_REPORT',
        action_taken: 'FLAG',
        reason: combinedReason,
      });

      setSubmitted(true);
    } catch {
      setError('Failed to submit report');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setReason('');
    setDescription('');
    setError(null);
    setSubmitted(false);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* X close button */}
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>X</Text>
          </Pressable>

          {submitted ? (
            <View style={styles.successContainer}>
              <Text style={styles.successTitle}>Report Filed</Text>
              <Text style={styles.successText}>
                Thank you for helping keep CFB Social clean.
              </Text>
              <Pressable style={[styles.button, { backgroundColor: dark }]} onPress={handleClose}>
                <Text style={styles.buttonText}>Close</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView>
              <Text style={styles.flagLabel}>Flag on the Play</Text>
              <Text style={styles.title}>Report This Post</Text>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {REASONS.map((r) => (
                <Pressable
                  key={r.value}
                  style={styles.radioRow}
                  onPress={() => setReason(r.value)}
                >
                  <View style={[styles.radio, reason === r.value && { borderColor: dark }]}>
                    {reason === r.value && <View style={[styles.radioDot, { backgroundColor: dark }]} />}
                  </View>
                  <Text style={styles.radioLabel}>{r.label}</Text>
                </Pressable>
              ))}

              <Text style={styles.descLabel}>Additional details (optional)</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={500}
                placeholder="Describe the issue..."
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.actions}>
                <Pressable
                  style={[styles.button, { backgroundColor: dark }, loading && { opacity: 0.5 }]}
                  onPress={handleSubmit}
                  disabled={loading || !reason}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Submit Report</Text>
                  )}
                </Pressable>
                <Pressable onPress={handleClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
