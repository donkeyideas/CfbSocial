import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { supabase } from '@/lib/supabase';
import { typography } from '@/lib/theme/typography';
import { useColors } from '@/lib/theme/ThemeProvider';
import { Avatar } from '@/components/ui/Avatar';

interface MentionProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

function getMentionQuery(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([a-zA-Z0-9_]{0,30})$/);
  if (!match) return null;
  const atIndex = before.length - match[0].length;
  if (atIndex > 0 && !/\s/.test(before[atIndex - 1]!)) return null;
  return match[1]!;
}

interface ReplyComposerProps {
  postId: string;
  onReplySent: () => void;
}

export function ReplyComposer({ postId, onReplySent }: ReplyComposerProps) {
  const colors = useColors();
  const { session, userId, profile } = useAuth();
  const { dark } = useSchoolTheme();
  const router = useRouter();
  const { showAlert } = useThemedAlert();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<MentionProfile[]>([]);
  const [mentionActive, setMentionActive] = useState(false);
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search profiles when mentionQuery changes
  useEffect(() => {
    if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);

    if (mentionQuery === null || mentionQuery.length === 0) {
      setMentionResults([]);
      setMentionActive(false);
      return;
    }

    mentionDebounceRef.current = setTimeout(async () => {
      const q = mentionQuery.toLowerCase();
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(6);

      if (data && data.length > 0) {
        setMentionResults(data as MentionProfile[]);
        setMentionActive(true);
      } else {
        setMentionResults([]);
        setMentionActive(false);
      }
    }, 250);

    return () => {
      if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);
    };
  }, [mentionQuery]);

  const handleContentChange = useCallback((text: string) => {
    setContent(text);
    const query = getMentionQuery(text, text.length);
    setMentionQuery(query);
  }, []);

  const handleMentionSelect = useCallback((username: string) => {
    const cursor = content.length;
    const before = content.slice(0, cursor);
    const match = before.match(/@([a-zA-Z0-9_]{0,30})$/);
    if (!match) return;

    const atStart = before.length - match[0].length;
    const newContent = content.slice(0, atStart) + `@${username} ` + content.slice(cursor);
    setContent(newContent);
    setMentionQuery(null);
    setMentionResults([]);
    setMentionActive(false);
  }, [content]);

  const styles = useMemo(() => StyleSheet.create({
    outerContainer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    mentionList: {
      maxHeight: 180,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    mentionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    mentionItemLast: {
      borderBottomWidth: 0,
    },
    mentionInfo: {
      flex: 1,
    },
    mentionUsername: {
      fontFamily: typography.mono,
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    mentionDisplayName: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    input: {
      flex: 1,
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      maxHeight: 100,
    },
    sendButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendDisabled: {
      opacity: 0.5,
    },
    sendText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: '#f4efe4',
    },
    loginPrompt: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.crimson,
      textAlign: 'center',
      paddingVertical: 4,
    },
  }), [colors]);

  if (!session) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.container}>
          <Pressable onPress={() => router.push('/(auth)/login' as never)}>
            <Text style={[styles.loginPrompt, { color: dark }]}>Log in to reply</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const handleSend = async () => {
    const activeId = profile?.id;
    if (!content.trim() || !activeId) return;

    setSubmitting(true);
    const { data: newReply, error } = await supabase.from('posts').insert({
      content: content.trim(),
      post_type: 'STANDARD',
      author_id: activeId,
      school_id: profile?.school_id ?? null,
      parent_id: postId,
      status: 'PUBLISHED',
    }).select('id').single();

    setSubmitting(false);

    if (error) {
      showAlert('Incomplete Pass', 'Failed to send reply. Please try again.');
      return;
    }

    // Award XP for creating a reply (fire-and-forget)
    if (newReply?.id) {
      supabase.rpc('award_xp', {
        p_user_id: activeId,
        p_amount: 10,
        p_source: 'POST_CREATED',
        p_reference_id: newReply.id,
        p_description: 'Created a post',
      }).then(null, () => {});
    }

    // Update reply_count on the parent post
    const { count } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', postId)
      .eq('status', 'PUBLISHED');
    if (count !== null) {
      await supabase.from('posts').update({ reply_count: count }).eq('id', postId);
    }

    setContent('');
    setMentionQuery(null);
    setMentionResults([]);
    setMentionActive(false);
    onReplySent();
  };

  return (
    <View style={styles.outerContainer}>
      {/* Mention autocomplete suggestions */}
      {mentionActive && mentionResults.length > 0 && (
        <View style={styles.mentionList}>
          {mentionResults.map((item, idx) => (
            <Pressable
              key={item.id}
              style={[
                styles.mentionItem,
                idx === mentionResults.length - 1 && styles.mentionItemLast,
              ]}
              onPress={() => handleMentionSelect(item.username)}
            >
              <Avatar
                url={item.avatar_url}
                name={item.display_name || item.username}
                size={28}
              />
              <View style={styles.mentionInfo}>
                <Text style={styles.mentionUsername}>@{item.username}</Text>
                {item.display_name && (
                  <Text style={styles.mentionDisplayName} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Write a reply..."
          placeholderTextColor={colors.textMuted}
          value={content}
          onChangeText={handleContentChange}
          maxLength={500}
          multiline
        />
        <Pressable
          style={[
            styles.sendButton,
            { backgroundColor: dark },
            (!content.trim() || submitting) && styles.sendDisabled,
          ]}
          onPress={handleSend}
          disabled={!content.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#f4efe4" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
