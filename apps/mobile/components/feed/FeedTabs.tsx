import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

export type FeedTab = 'latest' | 'top' | 'receipts' | 'following' | 'mySchool';

interface FeedTabsProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'latest', label: 'Latest' },
  { key: 'top', label: 'Top Takes' },
  { key: 'receipts', label: 'Receipts' },
  { key: 'following', label: 'Following' },
  { key: 'mySchool', label: 'My School' },
];

export function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
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
