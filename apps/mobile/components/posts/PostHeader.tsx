import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { SchoolBadge } from '@/components/ui/SchoolBadge';
import { DynastyBadge } from '@/components/ui/DynastyBadge';
import { useColors, useTheme } from '@/lib/theme/ThemeProvider';
import { withAlpha } from '@/lib/theme/utils';
import { typography } from '@/lib/theme/typography';
import { timeAgo } from '@/lib/utils/timeAgo';
import { readableSchoolColor } from '@/lib/utils/colorContrast';

interface PostHeaderProps {
  author: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    dynasty_tier: string | null;
    school?: {
      abbreviation: string;
      primary_color: string;
      slug: string | null;
    } | null;
  } | null;
  createdAt: string;
  invertColors?: boolean;
}

export const PostHeader = memo(function PostHeader({ author, createdAt, invertColors }: PostHeaderProps) {
  const colors = useColors();
  const { isDark } = useTheme();
  const router = useRouter();
  const displayName = author?.display_name || author?.username || 'Anonymous';
  const rawSchoolColor = author?.school?.primary_color || colors.crimson;
  const schoolColor = readableSchoolColor(rawSchoolColor, isDark);
  const textColor = invertColors ? '#f4efe4' : colors.textPrimary;
  const mutedColor = invertColors ? 'rgba(244,239,228,0.6)' : colors.textMuted;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    info: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    username: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
    },
    timestamp: {
      fontFamily: typography.mono,
      fontSize: 10,
      alignSelf: 'flex-start',
      marginTop: 2,
    },
  }), [colors]);

  const handleAuthorPress = () => {
    if (author?.username) {
      router.push(`/profile/${author.username}` as never);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handleAuthorPress}>
        <Avatar
          url={author?.avatar_url}
          name={displayName}
          size={40}
          borderColor={schoolColor}
        />
      </Pressable>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Pressable onPress={handleAuthorPress}>
            <Text style={[styles.username, { color: textColor }]} numberOfLines={1}>
              {displayName}
            </Text>
          </Pressable>

          {author?.school && (
            <SchoolBadge
              abbreviation={author.school.abbreviation}
              color={readableSchoolColor(author.school.primary_color, isDark)}
              slug={author.school.slug}
              small
            />
          )}

          {author?.dynasty_tier && (
            <DynastyBadge tier={author.dynasty_tier} />
          )}
        </View>
      </View>

      <Text style={[styles.timestamp, { color: mutedColor }]}>
        {timeAgo(createdAt)}
      </Text>
    </View>
  );
});
