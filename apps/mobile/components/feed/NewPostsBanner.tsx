import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { typography } from '@/lib/theme/typography';
import { useColors } from '@/lib/theme/ThemeProvider';

interface NewPostsBannerProps {
  count: number;
  onPress: () => void;
}

export function NewPostsBanner({ count, onPress }: NewPostsBannerProps) {
  const colors = useColors();
  const { dark } = useSchoolTheme();

  const styles = useMemo(() => StyleSheet.create({
    banner: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginHorizontal: 12,
      marginTop: 4,
      borderRadius: 6,
      alignItems: 'center',
    },
    text: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
      color: '#f4efe4',
    },
  }), [colors]);

  if (count <= 0) return null;

  return (
    <Pressable style={[styles.banner, { backgroundColor: dark }]} onPress={onPress}>
      <Text style={styles.text}>
        {count} new {count === 1 ? 'post' : 'posts'}
      </Text>
    </Pressable>
  );
}
