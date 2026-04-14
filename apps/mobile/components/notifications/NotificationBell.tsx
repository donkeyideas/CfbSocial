import { useEffect, useState, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useRealtimeNotifications } from '@/lib/hooks/useRealtimeNotifications';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

export function NotificationBell() {
  const colors = useColors();
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const { dark } = useSchoolTheme();
  const router = useRouter();
  const { unreadCount: realtimeCount, resetCount } = useRealtimeNotifications(userId);
  const [initialCount, setInitialCount] = useState(0);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      padding: 6,
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: 0,
      right: 0,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
      borderWidth: 1.5,
      borderColor: colors.dark,
    },
    badgeText: {
      fontFamily: typography.sansBold,
      fontSize: 10,
      color: '#f4efe4',
      lineHeight: 14,
    },
  }), [colors]);

  useEffect(() => {
    if (!userId) return;

    async function fetchUnread() {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId!)
        .eq('is_read', false);

      setInitialCount(count ?? 0);
    }

    fetchUnread();
  }, [userId]);

  const totalUnread = initialCount + realtimeCount;

  const handlePress = () => {
    resetCount();
    setInitialCount(0);
    router.push('/notifications' as never);
  };

  if (!userId) return null;

  // Bell always sits on the school's dark header, so icon must always be white
  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Bell size={22} color="#ffffff" strokeWidth={1.8} />
      {totalUnread > 0 && (
        <View style={[styles.badge, { backgroundColor: dark }]}>
          <Text style={styles.badgeText}>
            {totalUnread > 99 ? '99+' : totalUnread}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
