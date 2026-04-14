import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { typography } from '@/lib/theme/typography';
import { useColors } from '@/lib/theme/ThemeProvider';

interface ConferenceFilterProps {
  active: string;
  onSelect: (conference: string) => void;
}

const CONFERENCES = [
  'ALL',
  'SEC',
  'Big Ten',
  'Big 12',
  'ACC',
  'Pac-12',
  'AAC',
  'Mountain West',
  'Sun Belt',
  'MAC',
  'Conference USA',
  'Independent',
];

export function ConferenceFilter({ active, onSelect }: ConferenceFilterProps) {
  const colors = useColors();
  const { dark } = useSchoolTheme();

  const styles = useMemo(() => StyleSheet.create({
    wrapper: {
      height: 48,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    container: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      alignItems: 'center',
    },
    pill: {
      paddingHorizontal: 14,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pillText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 12,
      includeFontPadding: false,
    },
  }), [colors]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {CONFERENCES.map((conf) => {
          const isActive = active === conf;
          return (
            <Pressable
              key={conf}
              style={[
                styles.pill,
                isActive
                  ? { backgroundColor: dark }
                  : { borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => onSelect(conf)}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: isActive ? '#f4efe4' : colors.textSecondary },
                ]}
              >
                {conf}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
