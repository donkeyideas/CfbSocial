import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { Avatar } from '@/components/ui/Avatar';
import { useColors } from '@/lib/theme/ThemeProvider';
import { withAlpha } from '@/lib/theme/utils';
import { typography } from '@/lib/theme/typography';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface SchoolOption {
  id: string;
  name: string;
  abbreviation: string;
  primary_color: string;
}

export function ProfileEditModal({ visible, onClose, onSaved }: ProfileEditModalProps) {
  const colors = useColors();
  const { userId, profile, refreshProfile } = useAuth();
  const { dark } = useSchoolTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [selectedSchoolName, setSelectedSchoolName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 56,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cancelText: {
      fontFamily: typography.sans,
      fontSize: 16,
      color: colors.textSecondary,
    },
    headerTitle: {
      fontFamily: typography.serifBold,
      fontSize: 18,
      color: colors.ink,
    },
    saveBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      minWidth: 60,
      alignItems: 'center',
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: '#f4efe4',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      gap: 20,
      paddingBottom: 40,
    },
    errorBanner: {
      backgroundColor: withAlpha(colors.crimson, 0.08),
      borderWidth: 1,
      borderColor: colors.crimson,
      borderRadius: 8,
      padding: 12,
    },
    errorText: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.crimson,
    },
    avatarSection: {
      alignItems: 'center',
      gap: 10,
    },
    changeAvatarBtn: {
      paddingVertical: 6,
    },
    changeAvatarText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.crimson,
    },
    field: {
      gap: 6,
    },
    label: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.textSecondary,
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
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    charCount: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'right',
    },
    hint: {
      fontFamily: typography.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
    schoolSelector: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    schoolSelectorText: {
      fontFamily: typography.sans,
      fontSize: 16,
      color: colors.ink,
    },
    schoolPickerContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.surfaceRaised,
      maxHeight: 250,
      overflow: 'hidden',
    },
    schoolSearchInput: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.ink,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    schoolList: {
      maxHeight: 200,
    },
    schoolItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: withAlpha(colors.border, 0.5),
    },
    schoolDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    schoolItemText: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textPrimary,
      flex: 1,
    },
    noResults: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      padding: 16,
    },
  }), [colors]);

  // Load current profile data when modal opens
  useEffect(() => {
    if (visible && profile) {
      setAvatarUrl(profile.avatar_url);
      setUsername(profile.username || '');
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setSchoolId(profile.school_id);
      setError(null);

      // Fetch the school name if they have one
      if (profile.school_id) {
        supabase
          .from('schools')
          .select('name')
          .eq('id', profile.school_id)
          .single()
          .then(({ data }) => {
            if (data) setSelectedSchoolName(data.name as string);
          });
      } else {
        setSelectedSchoolName('');
      }
    }
  }, [visible, profile]);

  // Search schools
  const searchSchools = useCallback(async (query: string) => {
    setSchoolSearch(query);
    if (query.length < 2) {
      setSchools([]);
      return;
    }

    const { data } = await supabase
      .from('schools')
      .select('id, name, abbreviation, primary_color')
      .ilike('name', `%${query}%`)
      .limit(20);

    if (data) {
      setSchools(data as SchoolOption[]);
    }
  }, []);

  // Pick avatar
  async function handlePickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    setError(null);

    try {
      const asset = result.assets[0];
      const fileExt = asset.uri.split('.').pop() || 'jpg';
      const fileName = `${userId}_${Date.now()}.${fileExt}`;

      // Read the file as blob
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      // Convert blob to ArrayBuffer
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: asset.mimeType || `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        setUploadingAvatar(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(urlData.publicUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Upload failed: ${message}`);
    }

    setUploadingAvatar(false);
  }

  // Validate username
  function isValidUsername(val: string): boolean {
    return /^[a-zA-Z0-9_]{3,24}$/.test(val);
  }

  // Save
  async function handleSave() {
    if (!userId) return;

    if (!isValidUsername(username)) {
      setError('Username must be 3-24 characters (letters, numbers, underscores)');
      return;
    }

    setSaving(true);
    setError(null);

    const updates: Record<string, unknown> = {
      username,
      display_name: displayName || null,
      bio: bio || null,
      school_id: schoolId,
    };

    if (avatarUrl !== profile?.avatar_url) {
      updates.avatar_url = avatarUrl;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      if (updateError.message.includes('unique') || updateError.message.includes('duplicate')) {
        setError('That username is already taken');
      } else {
        setError(updateError.message);
      }
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSaving(false);
    onSaved();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: dark }, saving && styles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#f4efe4" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Avatar url={avatarUrl} name={displayName || username} size={80} />
            <Pressable
              style={styles.changeAvatarBtn}
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={dark} />
              ) : (
                <Text style={[styles.changeAvatarText, { color: dark }]}>Change Photo</Text>
              )}
            </Pressable>
          </View>

          {/* Username */}
          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              maxLength={24}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={colors.textMuted}
              placeholder="your_username"
            />
            <Text style={styles.hint}>3-24 characters, letters, numbers, underscores</Text>
          </View>

          {/* Display Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={50}
              placeholderTextColor={colors.textMuted}
              placeholder="Your display name"
            />
          </View>

          {/* Bio */}
          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              maxLength={280}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.textMuted}
              placeholder="Tell us about yourself..."
            />
            <Text style={styles.charCount}>{bio.length}/280</Text>
          </View>

          {/* School Picker */}
          <View style={styles.field}>
            <Text style={styles.label}>School</Text>
            <Pressable
              style={styles.schoolSelector}
              onPress={() => setShowSchoolPicker(!showSchoolPicker)}
            >
              <Text
                style={[
                  styles.schoolSelectorText,
                  !selectedSchoolName && { color: colors.textMuted },
                ]}
              >
                {selectedSchoolName || 'Select a school'}
              </Text>
            </Pressable>

            {showSchoolPicker && (
              <View style={styles.schoolPickerContainer}>
                <TextInput
                  style={styles.schoolSearchInput}
                  value={schoolSearch}
                  onChangeText={searchSchools}
                  placeholder="Search schools..."
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <FlatList
                  data={schools}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  style={styles.schoolList}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.schoolItem}
                      onPress={() => {
                        setSchoolId(item.id);
                        setSelectedSchoolName(item.name);
                        setShowSchoolPicker(false);
                        setSchoolSearch('');
                        setSchools([]);
                      }}
                    >
                      <View
                        style={[
                          styles.schoolDot,
                          { backgroundColor: item.primary_color },
                        ]}
                      />
                      <Text style={styles.schoolItemText}>
                        {item.name} ({item.abbreviation})
                      </Text>
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    schoolSearch.length >= 2 ? (
                      <Text style={styles.noResults}>No schools found</Text>
                    ) : (
                      <Text style={styles.noResults}>Type at least 2 characters to search</Text>
                    )
                  }
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
