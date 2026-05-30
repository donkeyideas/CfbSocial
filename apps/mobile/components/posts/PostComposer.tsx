import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Image as RNImage,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { useReviewPrompt } from '@/lib/reviews/ReviewPromptProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { supabase } from '@/lib/supabase';
import { typography } from '@/lib/theme/typography';
import { useColors } from '@/lib/theme/ThemeProvider';
import { DEFAULT_POST_CHARS } from '@/lib/constants';
import { LinkPreview, extractFirstUrl } from './LinkPreview';
import { GifPicker } from './GifPicker';
import { Avatar } from '@/components/ui/Avatar';
import { uploadImage } from '@/lib/upload/imageUpload';

// Dynamically load expo-speech-recognition (requires dev build, not Expo Go)
let speechModule: any = null;
let useSpeechRecognitionEvent: any = null;
try {
  speechModule = require('expo-speech-recognition');
  useSpeechRecognitionEvent = speechModule.useSpeechRecognitionEvent;
} catch {
  // Not available — graceful fallback
}

interface PendingImage {
  id: string;
  uri: string;
  publicUrl?: string;
  uploading: boolean;
  error?: string;
}

type PostType = 'STANDARD' | 'RECEIPT' | 'PREDICTION' | 'SIDELINE' | 'AGING_TAKE';

interface PostComposerProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

const POST_TYPES: { key: PostType; label: string }[] = [
  { key: 'RECEIPT', label: 'Receipt' },
  { key: 'PREDICTION', label: 'Poll' },
  { key: 'SIDELINE', label: 'Sideline' },
  { key: 'AGING_TAKE', label: 'Challenge' },
];

interface MentionProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Extracts the @mention query at the given cursor position.
 * Returns the partial text after @ (e.g. "joh" from "hey @joh") or null if not in a mention.
 */
function getMentionQuery(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([a-zA-Z0-9_]{0,30})$/);
  if (!match) return null;
  const atIndex = before.length - match[0].length;
  if (atIndex > 0 && !/\s/.test(before[atIndex - 1]!)) return null;
  return match[1]!;
}

export function PostComposer({ visible, onClose, onPostCreated }: PostComposerProps) {
  const colors = useColors();
  const { session, userId, profile } = useAuth();
  const { dark, accent } = useSchoolTheme();
  const router = useRouter();
  const { showAlert } = useThemedAlert();
  const { triggerReviewPrompt } = useReviewPrompt();
  const charLimit = profile?.char_limit ?? DEFAULT_POST_CHARS;
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('STANDARD');
  const [submitting, setSubmitting] = useState(false);
  const [sidelineGame, setSidelineGame] = useState('');
  const [sidelineQuarter, setSidelineQuarter] = useState('');
  const [sidelineTime, setSidelineTime] = useState('');
  const [gifPickerVisible, setGifPickerVisible] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const imagesUploading = pendingImages.some((img) => img.uploading);

  // Speech recognition state
  const [isListening, setIsListening] = useState(false);
  const preVoiceTextRef = useRef('');

  // Wire up speech events (hooks must be called unconditionally)
  if (useSpeechRecognitionEvent) {
    useSpeechRecognitionEvent('result', (event: any) => {
      if (event.results?.[0]?.transcript) {
        const transcript = event.results[0].transcript;
        if (event.isFinal) {
          const base = preVoiceTextRef.current;
          setContent(base ? `${base} ${transcript}` : transcript);
        }
      }
    });
    useSpeechRecognitionEvent('end', () => {
      setIsListening(false);
    });
    useSpeechRecognitionEvent('error', (event: any) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
    });
  }

  const startVoice = useCallback(async () => {
    if (!speechModule) return;
    try {
      const perm = await speechModule.requestPermissionsAsync();
      if (!perm.granted) {
        showAlert('Permission Needed', 'Microphone access is required for voice input.');
        return;
      }
      preVoiceTextRef.current = content;
      setIsListening(true);
      await speechModule.start({ lang: 'en-US', interimResults: true, continuous: false });
    } catch (e: any) {
      console.error('Speech start error:', e);
      setIsListening(false);
    }
  }, [content, showAlert]);

  const stopVoice = useCallback(async () => {
    if (!speechModule) return;
    try {
      await speechModule.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  }, []);

  const handlePickImages = useCallback(async () => {
    const remaining = 20 - pendingImages.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;
    if (!session?.access_token) return;

    const newImages = result.assets.map((asset) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      uploading: true as const,
    }));

    setPendingImages((prev) => [...prev, ...newImages]);

    for (const img of newImages) {
      try {
        const publicUrl = await uploadImage(img.uri, session.access_token, img.mimeType ?? undefined, img.fileName);
        setPendingImages((prev) =>
          prev.map((p) => (p.id === img.id ? { ...p, publicUrl, uploading: false } : p))
        );
      } catch (e: any) {
        const msg = e?.message || 'Unknown error';
        console.error('Image upload failed:', msg);
        showAlert('Upload Failed', msg);
        setPendingImages((prev) =>
          prev.map((p) => (p.id === img.id ? { ...p, uploading: false, error: msg } : p))
        );
      }
    }
  }, [pendingImages.length, session?.access_token]);

  const removeImage = useCallback((id: string) => {
    setPendingImages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<MentionProfile[]>([]);
  const [mentionActive, setMentionActive] = useState(false);
  const cursorRef = useRef(0);
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce URL extraction to prevent LinkPreview flickering on paste/type
  const [debouncedUrl, setDebouncedUrl] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUrl(extractFirstUrl(content));
    }, 500);
    return () => clearTimeout(timer);
  }, [content]);

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

  const handleSelectionChange = useCallback((e: { nativeEvent: { selection: { start: number; end: number } } }) => {
    cursorRef.current = e.nativeEvent.selection.start;
  }, []);

  const handleContentChange = useCallback((text: string) => {
    setContent(text);
    // Use end-of-text as effective cursor for typing detection
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
      minHeight: 360,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    cancelText: {
      fontFamily: typography.sans,
      fontSize: 15,
      color: colors.textSecondary,
    },

    // Logged-out CTA
    ctaContainer: {
      padding: 32,
      alignItems: 'center',
      gap: 16,
    },
    ctaTitle: {
      fontFamily: typography.serif,
      fontSize: 18,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 26,
    },
    ctaActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    ctaButton: {
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 6,
    },
    ctaButtonText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: '#f4efe4',
    },
    ctaLinkText: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.crimson,
      textDecorationLine: 'underline',
    },

    // Composer body
    composerBody: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },

    // Press box frame
    pressBox: {
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderStyle: 'dashed',
      padding: 14,
      marginBottom: 14,
    },
    pressBoxLabel: {
      fontFamily: typography.mono,
      fontSize: 10,
      letterSpacing: 2,
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    pressBoxRule: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: 10,
    },
    input: {
      fontFamily: typography.sans,
      fontSize: 16,
      lineHeight: 24,
      color: colors.textPrimary,
      minHeight: 120,
      textAlignVertical: 'top',
    },

    // Mention autocomplete
    mentionList: {
      maxHeight: 200,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      backgroundColor: colors.surfaceRaised,
      marginBottom: 10,
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

    // Sideline fields
    sidelineFields: {
      marginBottom: 14,
      gap: 8,
    },
    sidelineLabel: {
      fontFamily: typography.mono,
      fontSize: 10,
      letterSpacing: 2,
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    sidelineInput: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    sidelineRow: {
      flexDirection: 'row',
      gap: 8,
    },
    sidelineShort: {
      flex: 1,
    },

    // Footer
    footer: {
      gap: 12,
      paddingBottom: 20,
    },
    toolRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tool: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toolText: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    charCount: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'right',
      letterSpacing: 0.5,
    },
    charCountWarning: {
      color: colors.crimson,
    },
    submitButton: {
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
    imagePreviews: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    imageThumb: {
      width: 72,
      height: 72,
      borderRadius: 6,
      overflow: 'hidden',
      position: 'relative',
    },
    imageThumbImg: {
      width: 72,
      height: 72,
    },
    imageOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageRemove: {
      position: 'absolute',
      top: 2,
      right: 2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageRemoveText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    imageErrorText: {
      color: '#ff4444',
      fontSize: 10,
      fontWeight: '700',
    },
    toolDisabled: {
      opacity: 0.4,
    },
  }), [colors]);

  const handleSubmit = async () => {
    const activeId = profile?.id;
    const uploadedUrls = pendingImages
      .filter((img) => img.publicUrl && !img.error)
      .map((img) => img.publicUrl!);
    const hasContent = content.trim().length > 0;
    const hasImages = uploadedUrls.length > 0;
    if ((!hasContent && !hasImages) || !activeId || imagesUploading) return;

    setSubmitting(true);

    const insertData: Record<string, unknown> = {
      content: content.trim(),
      post_type: postType,
      author_id: activeId,
      school_id: profile?.school_id ?? null,
      status: 'PUBLISHED',
      ...(uploadedUrls.length > 0 && { media_urls: uploadedUrls }),
    };

    if (postType === 'SIDELINE') {
      if (sidelineGame.trim()) insertData.sideline_game = sidelineGame.trim();
      if (sidelineQuarter.trim()) insertData.sideline_quarter = sidelineQuarter.trim();
      if (sidelineTime.trim()) insertData.sideline_time = sidelineTime.trim();
    }

    const { data: newPost, error } = await supabase.from('posts').insert(insertData).select('id').single();

    setSubmitting(false);

    if (error) {
      showAlert('Incomplete Pass', 'Failed to create post. Please try again.');
      return;
    }

    // Award XP for creating a post (fire-and-forget)
    if (newPost?.id) {
      supabase.rpc('award_xp', {
        p_user_id: activeId,
        p_amount: 2,
        p_source: 'POST_CREATED',
        p_reference_id: newPost.id,
        p_description: 'Created a post',
      }).then(null, () => {});
    }

    setContent('');
    setPostType('STANDARD');
    setSidelineGame('');
    setSidelineQuarter('');
    setSidelineTime('');
    setMentionQuery(null);
    setMentionResults([]);
    setMentionActive(false);
    setPendingImages([]);
    onPostCreated();
    onClose();

    // Ask for a rating after the success — no-ops unless the user is past the
    // 7-day / 5-session / 90-day-cooldown gates in lib/reviews/state.ts.
    triggerReviewPrompt();
  };

  const handleClose = () => {
    setContent('');
    setPostType('STANDARD');
    setSidelineGame('');
    setSidelineQuarter('');
    setSidelineTime('');
    setMentionQuery(null);
    setMentionResults([]);
    setMentionActive(false);
    setPendingImages([]);
    onClose();
  };

  const charWarning = content.length > charLimit * 0.9;

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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.card}>
          {/* Header with cancel */}
          <View style={styles.header}>
            <Pressable onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <View style={{ width: 50 }} />
          </View>

          {!session ? (
            /* Logged-out CTA */
            <View style={styles.ctaContainer}>
              <Text style={styles.ctaTitle}>Want to file a report from the press box?</Text>
              <View style={styles.ctaActions}>
                <Pressable
                  style={[styles.ctaButton, { backgroundColor: dark }]}
                  onPress={() => {
                    handleClose();
                    router.push('/(auth)/login' as never);
                  }}
                >
                  <Text style={styles.ctaButtonText}>Log In</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    handleClose();
                    router.push('/(auth)/register' as never);
                  }}
                >
                  <Text style={[styles.ctaLinkText, { color: dark }]}>Sign up</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            /* Press box composer */
            <ScrollView style={styles.composerBody} keyboardShouldPersistTaps="always">
              {/* Dashed border press box frame */}
              <View style={styles.pressBox}>
                <Text style={styles.pressBoxLabel}>FILE YOUR REPORT</Text>
                <View style={styles.pressBoxRule} />
                <TextInput
                  style={[styles.input, isListening && { borderColor: colors.crimson, borderWidth: 1 }]}
                  placeholder={isListening ? 'Listening...' : 'File your report from the press box...'}
                  placeholderTextColor={isListening ? colors.crimson : colors.textMuted}
                  multiline
                  maxLength={charLimit}
                  value={content}
                  onChangeText={handleContentChange}
                  onSelectionChange={handleSelectionChange}
                  autoFocus
                />
              </View>

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
                        size={32}
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

              {/* Link preview while composing */}
              {debouncedUrl && <LinkPreview content={content} />}

              {/* Image previews */}
              {pendingImages.length > 0 && (
                <View style={styles.imagePreviews}>
                  {pendingImages.map((img) => (
                    <View key={img.id} style={styles.imageThumb}>
                      <RNImage source={{ uri: img.uri }} style={styles.imageThumbImg} />
                      {img.uploading && (
                        <View style={styles.imageOverlay}>
                          <ActivityIndicator size="small" color="#fff" />
                        </View>
                      )}
                      {img.error && (
                        <View style={styles.imageOverlay}>
                          <Text style={styles.imageErrorText}>!</Text>
                        </View>
                      )}
                      <Pressable style={styles.imageRemove} onPress={() => removeImage(img.id)}>
                        <Text style={styles.imageRemoveText}>X</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Sideline report fields (Photo type) */}
              {postType === 'SIDELINE' && (
                <View style={styles.sidelineFields}>
                  <Text style={styles.sidelineLabel}>SIDELINE REPORT DETAILS</Text>
                  <TextInput
                    style={styles.sidelineInput}
                    placeholder="e.g. Auburn vs LSU"
                    placeholderTextColor={colors.textMuted}
                    maxLength={200}
                    value={sidelineGame}
                    onChangeText={setSidelineGame}
                  />
                  <View style={styles.sidelineRow}>
                    <TextInput
                      style={[styles.sidelineInput, styles.sidelineShort]}
                      placeholder="e.g. Q1"
                      placeholderTextColor={colors.textMuted}
                      maxLength={10}
                      value={sidelineQuarter}
                      onChangeText={setSidelineQuarter}
                    />
                    <TextInput
                      style={[styles.sidelineInput, styles.sidelineShort]}
                      placeholder="e.g. 4:32"
                      placeholderTextColor={colors.textMuted}
                      maxLength={20}
                      value={sidelineTime}
                      onChangeText={setSidelineTime}
                    />
                  </View>
                </View>
              )}

              {/* Footer: type picker + char count + submit */}
              <View style={styles.footer}>
                {/* Post type tools */}
                <View style={styles.toolRow}>
                  {POST_TYPES.map((pt) => {
                    const isActive = postType === pt.key;
                    return (
                      <Pressable
                        key={pt.key}
                        style={[
                          styles.tool,
                          isActive && { backgroundColor: dark },
                        ]}
                        onPress={() => setPostType(isActive ? 'STANDARD' : pt.key)}
                      >
                        <Text
                          style={[
                            styles.toolText,
                            isActive && { color: '#f4efe4' },
                          ]}
                        >
                          {pt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    style={styles.tool}
                    onPress={() => setGifPickerVisible(true)}
                  >
                    <Text style={styles.toolText}>GIF</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.tool, pendingImages.length >= 20 && styles.toolDisabled]}
                    onPress={handlePickImages}
                    disabled={pendingImages.length >= 20}
                  >
                    <Text style={styles.toolText}>Image</Text>
                  </Pressable>
                  {speechModule && (
                    <Pressable
                      style={[styles.tool, isListening && { borderColor: colors.crimson }]}
                      onPress={isListening ? stopVoice : startVoice}
                    >
                      <Text style={[styles.toolText, isListening && { color: colors.crimson }]}>
                        {isListening ? 'Stop' : 'Mic'}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Char count */}
                <Text style={[styles.charCount, charWarning && [styles.charCountWarning, { color: dark }]]}>
                  {content.length.toLocaleString()}/{charLimit.toLocaleString()}
                </Text>

                {/* Submit */}
                <Pressable
                  style={[
                    styles.submitButton,
                    { backgroundColor: dark },
                    ((!content.trim() && pendingImages.filter((img) => img.publicUrl && !img.error).length === 0) || submitting || imagesUploading) && styles.submitDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={(!content.trim() && pendingImages.filter((img) => img.publicUrl && !img.error).length === 0) || submitting || imagesUploading}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#f4efe4" />
                  ) : (
                    <Text style={styles.submitText}>Publish</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
      <GifPicker
        visible={gifPickerVisible}
        onClose={() => setGifPickerVisible(false)}
        onSelect={(url) =>
          setContent((prev) => (prev.trim() ? `${prev.trim()}\n${url}` : url))
        }
      />
    </Modal>
  );
}
