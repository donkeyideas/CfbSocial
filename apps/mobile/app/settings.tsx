import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useTheme, useColors } from '@/lib/theme/ThemeProvider';
import type { ColorPalette } from '@/lib/theme/palettes';
import { AppHeader } from '@/components/navigation/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { OrnamentDivider } from '@/components/ui/OrnamentDivider';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { AuthGate } from '@/components/ui/AuthGate';
import { typography } from '@/lib/theme/typography';
import Constants from 'expo-constants';

interface SchoolOption {
  id: string;
  name: string;
  abbreviation: string;
  primary_color: string;
}

interface NotificationPrefs {
  follow_notifications: boolean;
  reaction_notifications: boolean;
  reply_notifications: boolean;
  challenge_notifications: boolean;
  rivalry_notifications: boolean;
  moderation_notifications: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  follow_notifications: true,
  reaction_notifications: true,
  reply_notifications: true,
  challenge_notifications: true,
  rivalry_notifications: true,
  moderation_notifications: true,
};

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function SettingsScreen() {
  const router = useRouter();
  const { session, profile, profiles, switchProfile, refreshProfile } = useAuth();
  const editId = profile?.id ?? null;
  const ownerId = profile?.owner_id ?? null;
  const { showAlert } = useThemedAlert();
  const { dark } = useSchoolTheme();
  const { colorMode, toggleColorMode } = useTheme();
  const colors = useColors();
  const styles = useStyles(colors);

  // Profile fields
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [selectedSchoolName, setSelectedSchoolName] = useState('');

  // School picker
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  // Notification preferences
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load profile and notification preferences
  useEffect(() => {
    async function loadData() {
      if (!session?.user || !editId) {
        setLoading(false);
        return;
      }

      if (profile) {
        setAvatarUrl(profile.avatar_url);
        setDisplayName(profile.display_name || '');
        setBio(profile.bio || '');
        setSchoolId(profile.school_id);

        if (profile.school_id) {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('name')
            .eq('id', profile.school_id)
            .single();
          if (schoolData) {
            setSelectedSchoolName(schoolData.name as string);
          }
        }
      }

      const { data: prefsData } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', editId)
        .maybeSingle();

      if (prefsData) {
        setPrefs({
          follow_notifications: prefsData.follow_notifications ?? true,
          reaction_notifications: prefsData.reaction_notifications ?? true,
          reply_notifications: prefsData.reply_notifications ?? true,
          challenge_notifications: prefsData.challenge_notifications ?? true,
          rivalry_notifications: prefsData.rivalry_notifications ?? true,
          moderation_notifications: prefsData.moderation_notifications ?? true,
        });
      }

      setLoading(false);
    }

    loadData();
  }, [session, editId, profile]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchSchools = useCallback(async (query: string) => {
    setSchoolSearch(query);
    if (query.length < 2) {
      setSchools([]);
      return;
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('schools')
        .select('id, name, abbreviation, primary_color')
        .ilike('name', `%${query}%`)
        .limit(20);

      if (data) {
        setSchools(data as SchoolOption[]);
      }
    }, 300);
  }, []);

  async function handlePickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);

    try {
      const asset = result.assets[0];
      const storageBase = editId === ownerId ? ownerId : `${ownerId}/${editId}`;
      const fileName = `${storageBase}/avatar`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: asset.mimeType || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        showAlert('Incomplete Pass', `Upload failed: ${uploadError.message}`);
        setUploadingAvatar(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(`${urlData.publicUrl}?v=${Date.now()}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showAlert('Incomplete Pass', `Upload failed: ${message}`);
    }

    setUploadingAvatar(false);
  }

  async function handleSave() {
    if (!editId) return;
    setSaving(true);

    const profileUpdates: Record<string, unknown> = {
      display_name: displayName || null,
      bio: bio || null,
      school_id: schoolId,
    };

    if (avatarUrl !== profile?.avatar_url) {
      profileUpdates.avatar_url = avatarUrl;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', editId);

    if (profileError) {
      showAlert('Incomplete Pass', profileError.message);
      setSaving(false);
      return;
    }

    const { error: prefsError } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: editId,
        ...prefs,
      });

    if (prefsError) {
      showAlert('Incomplete Pass', `Notification preferences: ${prefsError.message}`);
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSaving(false);
    showAlert('Touchdown', 'Settings saved.');
    router.back();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  function togglePref(key: keyof NotificationPrefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return (
      <>
        <AppHeader />
        <View style={{ flex: 1, backgroundColor: colors.paper }}>
          <AuthGate message="Sign in to manage your settings" />
        </View>
      </>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <AppHeader />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: dark }]}>Back</Text>
        </Pressable>

        {/* ===================== PROFILE SECTION ===================== */}
        <Text style={styles.sectionTitle}>Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Avatar url={avatarUrl} name={displayName || profile?.username} size={72} />
          <Pressable
            style={styles.changeAvatarBtn}
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={dark} />
            ) : (
              <Text style={[styles.changeAvatarText, { color: dark }]}>Change</Text>
            )}
          </Pressable>
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
              <ScrollView style={styles.schoolList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {schools.length === 0 ? (
                  <Text style={styles.noResults}>
                    {schoolSearch.length >= 2 ? 'No schools found' : 'Type at least 2 characters to search'}
                  </Text>
                ) : (
                  schools.map((item) => (
                    <Pressable
                      key={item.id}
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
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </View>

        <OrnamentDivider />

        {/* ===================== APPEARANCE ===================== */}
        <Text style={styles.sectionTitle}>Appearance</Text>

        <View style={styles.toggleSection}>
          <ToggleRow
            label="Dark Mode"
            value={colorMode === 'dark'}
            onToggle={toggleColorMode}
            color={dark}
          />
        </View>

        <OrnamentDivider />

        {/* ===================== NOTIFICATION PREFS ===================== */}
        <Text style={styles.sectionTitle}>Notification Preferences</Text>

        <View style={styles.toggleSection}>
          <ToggleRow
            label="Follow notifications"
            value={prefs.follow_notifications}
            onToggle={() => togglePref('follow_notifications')}
            color={dark}
          />
          <ToggleRow
            label="Reaction notifications"
            value={prefs.reaction_notifications}
            onToggle={() => togglePref('reaction_notifications')}
            color={dark}
          />
          <ToggleRow
            label="Reply notifications"
            value={prefs.reply_notifications}
            onToggle={() => togglePref('reply_notifications')}
            color={dark}
          />
          <ToggleRow
            label="Challenge notifications"
            value={prefs.challenge_notifications}
            onToggle={() => togglePref('challenge_notifications')}
            color={dark}
          />
          <ToggleRow
            label="Rivalry notifications"
            value={prefs.rivalry_notifications}
            onToggle={() => togglePref('rivalry_notifications')}
            color={dark}
          />
          <ToggleRow
            label="Moderation notifications"
            value={prefs.moderation_notifications}
            onToggle={() => togglePref('moderation_notifications')}
            color={dark}
          />
        </View>

        {/* Save Button */}
        <Pressable
          style={[styles.saveButton, { backgroundColor: dark }, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#f4efe4" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </Pressable>

        <OrnamentDivider />

        {/* ===================== ACCOUNT ===================== */}
        <Text style={styles.sectionTitle}>Account</Text>

        {/* Profile switcher */}
        {profiles.length > 1 && (
          <View style={{ gap: 6, marginBottom: 8 }}>
            <Text style={styles.label}>Active Profile</Text>
            {profiles.map((p) => {
              const isActive = p.id === profile?.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    if (!isActive) {
                      switchProfile(p.id);
                      showAlert('Switched', `Now using @${p.username ?? 'profile'}`);
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    borderWidth: isActive ? 2 : 1,
                    borderColor: isActive ? dark : colors.border,
                    borderRadius: 8,
                    backgroundColor: isActive ? `${dark}10` : colors.surfaceRaised,
                  }}
                >
                  <Avatar url={p.avatar_url} name={p.display_name || p.username} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: typography.sansSemiBold, fontSize: 15, color: colors.ink }}>
                      {p.display_name || p.username || 'Unnamed'}
                    </Text>
                    <Text style={{ fontFamily: typography.mono, fontSize: 11, color: colors.textMuted }}>
                      @{p.username ?? 'unknown'}
                    </Text>
                  </View>
                  {isActive && (
                    <Text style={{ fontFamily: typography.mono, fontSize: 10, color: dark, letterSpacing: 1 }}>ACTIVE</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable style={[styles.signOutButton, { borderColor: dark }]} onPress={handleSignOut}>
          <Text style={[styles.signOutText, { color: dark }]}>Sign Out</Text>
        </Pressable>

        <Pressable
          style={[styles.signOutButton, { borderColor: colors.crimson }]}
          onPress={() => router.push('/delete-account' as never)}
        >
          <Text style={[styles.signOutText, { color: colors.crimson }]}>Delete Account</Text>
        </Pressable>

        <OrnamentDivider />

        {/* ===================== LEGAL ===================== */}
        <Text style={styles.sectionTitle}>Legal</Text>

        <View style={{ gap: 8 }}>
          <Pressable onPress={() => router.push('/privacy' as never)}>
            <Text style={{ fontFamily: typography.sans, fontSize: 15, color: colors.textSecondary, textDecorationLine: 'underline' }}>Privacy Policy</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/terms' as never)}>
            <Text style={{ fontFamily: typography.sans, fontSize: 15, color: colors.textSecondary, textDecorationLine: 'underline' }}>Terms of Service</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/contact' as never)}>
            <Text style={{ fontFamily: typography.sans, fontSize: 15, color: colors.textSecondary, textDecorationLine: 'underline' }}>Contact Us</Text>
          </Pressable>
        </View>

        <Text style={styles.versionText}>CFB Social v{APP_VERSION}</Text>
        <Text style={styles.disclaimerText}>An independent fan community. Not affiliated with, endorsed by, or sponsored by the NCAA, any conference, or any university.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------- Toggle Row Sub-component ----------
function ToggleRow({
  label,
  value,
  onToggle,
  color,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: `${colors.border}60` }}>
      <Text style={{ fontFamily: typography.sans, fontSize: 15, color: colors.textPrimary, flex: 1 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.surface, true: `${color}80` }}
        thumbColor={value ? color : colors.border}
      />
    </View>
  );
}

function useStyles(c: ColorPalette) {
  return useMemo(() => StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: c.paper,
    },
    container: {
      flex: 1,
      backgroundColor: c.paper,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
      gap: 16,
    },
    backButton: {
      marginBottom: 4,
    },
    backText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 15,
    },
    sectionTitle: {
      fontFamily: typography.serifBold,
      fontSize: 20,
      color: c.ink,
    },
    avatarSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    changeAvatarBtn: {
      paddingVertical: 6,
    },
    changeAvatarText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
    },
    field: {
      gap: 4,
    },
    label: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: c.textSecondary,
    },
    input: {
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: typography.sans,
      fontSize: 16,
      color: c.ink,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    charCount: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: c.textMuted,
      textAlign: 'right',
    },
    schoolSelector: {
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    schoolSelectorText: {
      fontFamily: typography.sans,
      fontSize: 16,
      color: c.ink,
    },
    schoolPickerContainer: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      backgroundColor: c.surfaceRaised,
      maxHeight: 250,
      overflow: 'hidden',
    },
    schoolSearchInput: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontFamily: typography.sans,
      fontSize: 14,
      color: c.ink,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
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
      borderBottomColor: `${c.border}80`,
    },
    schoolDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    schoolItemText: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: c.textPrimary,
      flex: 1,
    },
    noResults: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: c.textMuted,
      textAlign: 'center',
      padding: 16,
    },
    toggleSection: {
      gap: 0,
    },
    saveButton: {
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      fontFamily: typography.sansBold,
      fontSize: 16,
      color: c.textInverse,
    },
    signOutButton: {
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
    },
    signOutText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 16,
    },
    versionText: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: c.textMuted,
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    disclaimerText: {
      fontFamily: typography.sans,
      fontSize: 10,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 16,
      lineHeight: 14,
    },
  }), [c]);
}
