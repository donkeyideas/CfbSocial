import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text } from 'react-native';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

/** Pulsing count badge for the Leagues inbox button. */
export function InboxBadge({ count }: { count: number }) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (count <= 0 || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [count, reduceMotion, scale]);

  if (count <= 0) return null;

  const styles = StyleSheet.create({
    badge: {
      position: 'absolute', top: -8, right: -8, minWidth: 18, height: 18, paddingHorizontal: 4,
      borderRadius: 9, backgroundColor: colors.crimson, borderWidth: 1.5, borderColor: colors.paper,
      alignItems: 'center', justifyContent: 'center',
    },
    text: { fontFamily: typography.mono, fontSize: 9, fontWeight: '700', color: '#fff' },
  });

  return (
    <Animated.View style={[styles.badge, { transform: [{ scale }] }]} pointerEvents="none">
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </Animated.View>
  );
}
