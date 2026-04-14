import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';

interface HamburgerFABProps {
  onPress: () => void;
}

export function HamburgerFAB({ onPress }: HamburgerFABProps) {
  const colors = useColors();
  const { dark } = useSchoolTheme();

  const styles = useMemo(() => StyleSheet.create({
    fab: {
      position: 'absolute',
      top: 50,
      left: 12,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      zIndex: 100,
    },
    bars: {
      gap: 4,
    },
    bar: {
      width: 16,
      height: 2,
      backgroundColor: '#f4efe4',
      borderRadius: 1,
    },
  }), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.fab, { backgroundColor: dark }]}
    >
      <View style={styles.bars}>
        <View style={styles.bar} />
        <View style={styles.bar} />
        <View style={styles.bar} />
      </View>
    </Pressable>
  );
}
