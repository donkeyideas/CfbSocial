import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { typography } from '@/lib/theme/typography';
import { useColors } from '@/lib/theme/ThemeProvider';

export type RivalryTab = 'active' | 'challenges' | 'past';

interface RivalryTabsProps {
  activeTab: RivalryTab;
  onTabChange: (tab: RivalryTab) => void;
}

const TABS: { key: RivalryTab; label: string }[] = [
  { key: 'active', label: 'Active Rivalries' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'past', label: 'Past Results' },
];

export function RivalryTabs({ activeTab, onTabChange }: RivalryTabsProps) {
  const colors = useColors();
  const { dark } = useSchoolTheme();

  const styles = useMemo(() => StyleSheet.create({
    wrapper: {
      height: 48,
    },
    container: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      alignItems: 'center',
    },
    pill: {
      paddingHorizontal: 16,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pillText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
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
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.pill,
                isActive
                  ? { backgroundColor: dark }
                  : { borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => onTabChange(tab.key)}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: isActive ? '#f4efe4' : colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
