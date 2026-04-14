import { useState, useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { supabase } from '@/lib/supabase';
import { typography } from '@/lib/theme/typography';
import { useColors } from '@/lib/theme/ThemeProvider';

interface CreatePredictionModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const MAX_CHARS = 500;

export function CreatePredictionModal({ visible, onClose, onCreated }: CreatePredictionModalProps) {
  const colors = useColors();
  const { userId, profile } = useAuth();
  const { dark } = useSchoolTheme();
  const { showAlert } = useThemedAlert();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    card: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      minHeight: 320,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cancelText: {
      fontFamily: typography.sans,
      fontSize: 15,
      color: colors.textSecondary,
    },
    headerTitle: {
      fontFamily: typography.serifBold,
      fontSize: 16,
      color: colors.textPrimary,
    },
    body: {
      padding: 16,
    },
    hint: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 12,
      lineHeight: 18,
    },
    input: {
      fontFamily: typography.sans,
      fontSize: 16,
      lineHeight: 24,
      color: colors.textPrimary,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    charCount: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'right',
      marginTop: 4,
    },
    submitButton: {
      marginTop: 20,
      paddingVertical: 12,
      borderRadius: 6,
      alignItems: 'center',
    },
    submitDisabled: {
      opacity: 0.5,
    },
    submitText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 15,
      color: '#f4efe4',
    },
  }), [colors]);

  const handleSubmit = async () => {
    if (!content.trim() || !userId) return;

    setSubmitting(true);

    // 1. Create the post
    const activeId = profile?.id;
    if (!activeId) return;

    const { data: postData, error: postError } = await supabase
      .from('posts')
      .insert({
        content: content.trim(),
        post_type: 'PREDICTION',
        author_id: activeId,
        school_id: profile?.school_id ?? null,
        status: 'PUBLISHED',
      })
      .select('id')
      .single();

    if (postError || !postData) {
      setSubmitting(false);
      showAlert('Incomplete Pass', 'Failed to create prediction. Please try again.');
      return;
    }

    // 2. Create the predictions row
    const { error: predError } = await supabase
      .from('predictions')
      .insert({
        post_id: postData.id,
        user_id: activeId,
        status: 'PENDING',
      });

    setSubmitting(false);

    if (predError) {
      showAlert('Incomplete Pass', 'Post created but prediction record failed. Please try again.');
      return;
    }

    setContent('');
    onCreated();
    onClose();
  };

  const handleClose = () => {
    setContent('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle}>New Prediction</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.hint}>
              Put your take on the record. It will be graded when the outcome is decided.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="What's your prediction?"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={MAX_CHARS}
              value={content}
              onChangeText={setContent}
              autoFocus
            />
            <Text style={styles.charCount}>
              {content.length}/{MAX_CHARS}
            </Text>

            <Pressable
              style={[
                styles.submitButton,
                { backgroundColor: dark },
                (!content.trim() || submitting) && styles.submitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!content.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#f4efe4" />
              ) : (
                <Text style={styles.submitText}>File Prediction</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
