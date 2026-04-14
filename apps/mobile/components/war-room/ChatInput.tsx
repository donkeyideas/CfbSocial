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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Send } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

const QUICK_REACTIONS = [
  { label: 'TD', value: 'TD!' },
  { label: 'INT', value: 'INT!' },
  { label: 'SACK', value: 'SACK!' },
  { label: 'FG', value: 'FG!' },
  { label: 'FMB', value: 'FUMBLE!' },
];

interface ChatInputProps {
  threadId: string | null;
  onMessageSent?: () => void;
}

export function ChatInput({ threadId, onMessageSent }: ChatInputProps) {
  const colors = useColors();
  const { session, profile } = useAuth();
  const userId = profile?.id ?? null;
  const { dark } = useSchoolTheme();
  const router = useRouter();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.paper,
      paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    },
    reactionsRow: {
      maxHeight: 40,
    },
    reactionsContent: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 6,
      flexDirection: 'row',
    },
    reactionButton: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reactionText: {
      fontFamily: typography.sansBold,
      fontSize: 12,
      color: colors.crimson,
      letterSpacing: 0.5,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 4,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textPrimary,
    },
    sendButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.crimson,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: colors.surface,
    },
    authGate: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.paper,
      padding: 16,
      paddingBottom: Platform.OS === 'ios' ? 32 : 16,
      alignItems: 'center',
    },
    authGateButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    authGateText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.crimson,
      textDecorationLine: 'underline',
    },
  }), [colors]);

  if (!session) {
    return (
      <View style={styles.authGate}>
        <Pressable
          onPress={() => router.push('/(auth)/login' as never)}
          style={styles.authGateButton}
        >
          <Text style={[styles.authGateText, { color: dark }]}>Sign in to join the conversation</Text>
        </Pressable>
      </View>
    );
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || !userId || sending || !threadId) return;

    setSending(true);
    const { error } = await supabase
      .from('game_thread_messages')
      .insert({
        game_thread_id: threadId,
        user_id: userId,
        content: content.trim(),
      });

    if (!error) {
      setText('');
      onMessageSent?.();
    }
    setSending(false);
  };

  const handleSend = () => {
    sendMessage(text);
  };

  const handleQuickReaction = (value: string) => {
    sendMessage(value);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        {/* Quick reactions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.reactionsRow}
          contentContainerStyle={styles.reactionsContent}
        >
          {QUICK_REACTIONS.map((reaction) => (
            <Pressable
              key={reaction.label}
              onPress={() => handleQuickReaction(reaction.value)}
              style={styles.reactionButton}
              disabled={sending || !threadId}
            >
              <Text style={[styles.reactionText, { color: dark }]}>{reaction.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Text input + send */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Sound off..."
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!sending}
          />
          <Pressable
            onPress={handleSend}
            style={[
              styles.sendButton,
              { backgroundColor: dark },
              (!text.trim() || sending || !threadId) && styles.sendButtonDisabled,
            ]}
            disabled={!text.trim() || sending || !threadId}
          >
            <Send
              size={18}
              color={
                text.trim() && !sending && threadId
                  ? '#f4efe4'
                  : colors.textMuted
              }
              strokeWidth={2}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
