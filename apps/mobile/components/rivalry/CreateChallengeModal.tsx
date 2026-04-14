import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { Avatar } from '@/components/ui/Avatar';

interface SearchResult {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface CreateChallengeModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateChallengeModal({
  visible,
  onClose,
  onCreated,
}: CreateChallengeModalProps) {
  const colors = useColors();
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const { dark } = useSchoolTheme();
  const { showAlert } = useThemedAlert();
  const [topic, setTopic] = useState('');
  const [argument, setArgument] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontFamily: typography.serifBold,
      fontSize: 20,
      color: colors.ink,
    },
    closeBtn: {
      fontFamily: typography.sansBold,
      fontSize: 18,
      color: colors.textMuted,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    label: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: 6,
      marginTop: 12,
    },
    input: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.ink,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    selectedOpponent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
    },
    selectedName: {
      flex: 1,
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.ink,
    },
    removeBtn: {
      fontFamily: typography.sansBold,
      fontSize: 14,
      color: colors.crimson,
      paddingHorizontal: 8,
    },
    searchLoader: {
      marginTop: 8,
    },
    searchResults: {
      maxHeight: 160,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      marginTop: -1,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchName: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.ink,
    },
    searchUsername: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
    submitBtn: {
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 20,
    },
    submitBtnDisabled: {
      opacity: 0.5,
    },
    submitText: {
      fontFamily: typography.sansBold,
      fontSize: 15,
      color: '#f4efe4',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  }), [colors]);

  const searchProfiles = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .neq('id', userId ?? '')
        .ilike('username', `%${query}%`)
        .limit(10);
      if (data) {
        setSearchResults(data as SearchResult[]);
      }
      setSearching(false);
    },
    [userId]
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    searchProfiles(text);
  };

  const handleSelectOpponent = (profile: SearchResult) => {
    setSelectedOpponent(profile);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (!userId || !selectedOpponent || !topic.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('challenges').insert({
      challenger_id: userId,
      challenged_id: selectedOpponent.id,
      topic: topic.trim(),
      challenger_argument: argument.trim() || null,
      status: 'PENDING',
    });

    setSubmitting(false);
    if (error) {
      showAlert('Incomplete Pass', 'Could not create challenge. Try again.');
      return;
    }

    // Reset form
    setTopic('');
    setArgument('');
    setSelectedOpponent(null);
    onCreated();
    onClose();
  };

  const canSubmit = topic.trim().length > 0 && selectedOpponent !== null && !submitting;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Throw Down a Challenge</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeBtn}>X</Text>
            </Pressable>
          </View>

          {/* Topic */}
          <Text style={styles.label}>TOPIC</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ohio State has the better O-line"
            placeholderTextColor={colors.textMuted}
            value={topic}
            onChangeText={setTopic}
            maxLength={200}
          />

          {/* Argument */}
          <Text style={styles.label}>YOUR ARGUMENT</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="State your case..."
            placeholderTextColor={colors.textMuted}
            value={argument}
            onChangeText={setArgument}
            multiline
            maxLength={500}
          />

          {/* Opponent */}
          <Text style={styles.label}>OPPONENT</Text>
          {selectedOpponent ? (
            <View style={styles.selectedOpponent}>
              <Avatar
                url={selectedOpponent.avatar_url}
                name={selectedOpponent.display_name ?? selectedOpponent.username}
                size={32}
              />
              <Text style={styles.selectedName}>
                {selectedOpponent.display_name ?? selectedOpponent.username}
              </Text>
              <Pressable onPress={() => setSelectedOpponent(null)}>
                <Text style={[styles.removeBtn, { color: dark }]}>X</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Search by username..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={handleSearchChange}
              />
              {searching && (
                <ActivityIndicator
                  size="small"
                  color={dark}
                  style={styles.searchLoader}
                />
              )}
              {searchResults.length > 0 && (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  style={styles.searchResults}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.searchRow}
                      onPress={() => handleSelectOpponent(item)}
                    >
                      <Avatar
                        url={item.avatar_url}
                        name={item.display_name ?? item.username}
                        size={28}
                      />
                      <Text style={styles.searchName}>
                        {item.display_name ?? item.username}
                      </Text>
                      <Text style={styles.searchUsername}>
                        @{item.username}
                      </Text>
                    </Pressable>
                  )}
                />
              )}
            </>
          )}

          {/* Submit */}
          <Pressable
            style={[styles.submitBtn, { backgroundColor: dark }, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#f4efe4" />
            ) : (
              <Text style={styles.submitText}>Issue Challenge</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
