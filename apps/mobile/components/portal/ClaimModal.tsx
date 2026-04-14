import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { SchoolBadge } from '@/components/ui/SchoolBadge';

interface SchoolOption {
  id: string;
  name: string;
  abbreviation: string;
  primary_color: string;
  slug: string | null;
}

interface ClaimModalProps {
  visible: boolean;
  playerId: string | null;
  playerName: string;
  onClose: () => void;
  onCreated: () => void;
}

export function ClaimModal({
  visible,
  playerId,
  playerName,
  onClose,
  onCreated,
}: ClaimModalProps) {
  const colors = useColors();
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const { dark } = useSchoolTheme();
  const { showAlert } = useThemedAlert();

  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSchools, setFilteredSchools] = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [confidence, setConfidence] = useState(5);
  const [reasoning, setReasoning] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

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
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    headerLeft: {
      flex: 1,
    },
    title: {
      fontFamily: typography.serifBold,
      fontSize: 20,
      color: colors.ink,
    },
    playerLabel: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
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
      minHeight: 70,
      textAlignVertical: 'top',
    },
    selectedSchool: {
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
    dropdown: {
      maxHeight: 150,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      marginTop: -1,
    },
    dropdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownName: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.ink,
    },
    confidenceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 4,
    },
    confidenceBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 6,
      alignItems: 'center',
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confidenceBtnActive: {},
    confidenceBtnText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 12,
      color: colors.textSecondary,
    },
    confidenceBtnTextActive: {
      color: '#f4efe4',
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: -4,
    },
    sliderLabel: {
      fontFamily: typography.mono,
      fontSize: 9,
      color: colors.textMuted,
      letterSpacing: 0.5,
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

  // Fetch schools on mount
  useEffect(() => {
    async function loadSchools() {
      const { data } = await supabase
        .from('schools')
        .select('id, name, abbreviation, primary_color, slug')
        .order('name', { ascending: true })
        .limit(700);
      if (data) {
        setSchools(data as SchoolOption[]);
      }
    }
    if (visible) {
      loadSchools();
    }
  }, [visible]);

  // Filter schools as user types
  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (text.length < 1) {
        setFilteredSchools([]);
        setShowDropdown(false);
        return;
      }
      const lower = text.toLowerCase();
      const matches = schools.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          s.abbreviation.toLowerCase().includes(lower)
      );
      setFilteredSchools(matches.slice(0, 10));
      setShowDropdown(true);
    },
    [schools]
  );

  const handleSelectSchool = (school: SchoolOption) => {
    setSelectedSchool(school);
    setSearchQuery('');
    setShowDropdown(false);
    setFilteredSchools([]);
  };

  const handleSubmit = async () => {
    if (!userId || !playerId || !selectedSchool) return;

    setSubmitting(true);
    const { error } = await supabase.from('roster_claims').insert({
      player_id: playerId,
      user_id: userId,
      school_id: selectedSchool.id,
      confidence,
      reasoning: reasoning.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      showAlert('Incomplete Pass', 'Could not submit your claim. Try again.');
      return;
    }

    // Reset
    setSelectedSchool(null);
    setConfidence(5);
    setReasoning('');
    onCreated();
    onClose();
  };

  const handleClose = () => {
    setSelectedSchool(null);
    setSearchQuery('');
    setConfidence(5);
    setReasoning('');
    setShowDropdown(false);
    onClose();
  };

  const canSubmit = selectedSchool !== null && !submitting;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Claim Source</Text>
              <Text style={styles.playerLabel}>{playerName}</Text>
            </View>
            <Pressable onPress={handleClose}>
              <Text style={styles.closeBtn}>X</Text>
            </Pressable>
          </View>

          {/* School picker */}
          <Text style={styles.label}>DESTINATION SCHOOL</Text>
          {selectedSchool ? (
            <View style={styles.selectedSchool}>
              <SchoolBadge
                abbreviation={selectedSchool.abbreviation}
                color={selectedSchool.primary_color}
              />
              <Text style={styles.selectedName}>{selectedSchool.name}</Text>
              <Pressable onPress={() => setSelectedSchool(null)}>
                <Text style={styles.removeBtn}>X</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Search schools..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={handleSearchChange}
              />
              {showDropdown && filteredSchools.length > 0 && (
                <FlatList
                  data={filteredSchools}
                  keyExtractor={(item) => item.id}
                  style={styles.dropdown}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.dropdownRow}
                      onPress={() => handleSelectSchool(item)}
                    >
                      <SchoolBadge
                        abbreviation={item.abbreviation}
                        color={item.primary_color}
                        small
                      />
                      <Text style={styles.dropdownName}>{item.name}</Text>
                    </Pressable>
                  )}
                />
              )}
            </>
          )}

          {/* Confidence selector */}
          <Text style={styles.label}>CONFIDENCE: {confidence}/10</Text>
          <View style={styles.confidenceRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <Pressable
                key={n}
                style={[
                  styles.confidenceBtn,
                  confidence === n && { backgroundColor: dark, borderColor: dark },
                ]}
                onPress={() => setConfidence(n)}
              >
                <Text
                  style={[
                    styles.confidenceBtnText,
                    confidence === n && styles.confidenceBtnTextActive,
                  ]}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>Gut feeling</Text>
            <Text style={styles.sliderLabel}>Lock it in</Text>
          </View>

          {/* Reasoning */}
          <Text style={styles.label}>REASONING (OPTIONAL)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's your source? Why this school?"
            placeholderTextColor={colors.textMuted}
            value={reasoning}
            onChangeText={setReasoning}
            multiline
            maxLength={500}
          />

          {/* Submit */}
          <Pressable
            style={[styles.submitBtn, { backgroundColor: dark }, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#f4efe4" />
            ) : (
              <Text style={styles.submitText}>Submit Claim</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
