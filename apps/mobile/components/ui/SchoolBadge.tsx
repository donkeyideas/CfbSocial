import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { readableSchoolColor } from '@/lib/utils/colorContrast';

interface SchoolBadgeProps {
  abbreviation: string;
  color: string;
  slug?: string | null;
  small?: boolean;
}

export function SchoolBadge({ abbreviation, color, slug, small }: SchoolBadgeProps) {
  const router = useRouter();
  const { isDark } = useTheme();
  const adjustedColor = readableSchoolColor(color, isDark);

  const badge = (
    <View style={[styles.badge, { backgroundColor: adjustedColor }, small && styles.small]}>
      <Text style={[styles.text, small && styles.smallText]}>{abbreviation}</Text>
    </View>
  );

  if (slug) {
    return (
      <Pressable onPress={() => router.push(`/school/${slug}` as never)}>
        {badge}
      </Pressable>
    );
  }

  return badge;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  small: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  text: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: '#fff',
    letterSpacing: 1,
    fontWeight: '700',
  },
  smallText: {
    fontSize: 8,
  },
});
