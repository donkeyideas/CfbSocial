import { Pressable, StyleSheet, Text, View, Animated, Dimensions, ScrollView } from 'react-native';
import { useRef, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { useAuth } from '@/lib/auth/AuthProvider';
import { withAlpha } from '@/lib/theme/utils';

interface MenuOverlayProps {
  visible: boolean;
  onClose: () => void;
}

const MENU_ITEMS: { label: string; route: string; authRequired?: boolean }[] = [
  { label: 'The Feed', route: '/(tabs)/feed' },
  { label: 'War Room', route: '/war-room' },
  { label: 'Rivalry Ring', route: '/(tabs)/rivalry' },
  { label: 'Mascot Wars', route: '/mascot-wars' },
  { label: 'Dynasty Mode', route: '/dynasty' },
  { label: "Coach's Call", route: '/coaches-call' },
  { label: 'Hall of Fame', route: '/hall-of-fame' },
  { label: 'Portal Wire', route: '/(tabs)/portal' },
  { label: 'Predictions', route: '/predictions' },
  { label: 'Recruiting Desk', route: '/recruiting' },
  { label: 'The Vault', route: '/vault', authRequired: true },
  { label: 'My Receipts', route: '/receipts', authRequired: true },
  { label: 'Notifications', route: '/notifications', authRequired: true },
  { label: 'Settings', route: '/settings', authRequired: true },
  { label: 'Contact', route: '/contact' },
  { label: 'Privacy Policy', route: '/privacy' },
  { label: 'Terms of Service', route: '/terms' },
  { label: 'Delete Account', route: '/delete-account', authRequired: true },
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function MenuOverlay({ visible, onClose }: MenuOverlayProps) {
  const colors = useColors();
  const router = useRouter();
  const { dark } = useSchoolTheme();
  const { userId, profile } = useAuth();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 200,
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 40,
      zIndex: 201,
      maxHeight: SCREEN_HEIGHT * 0.85,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: 'rgba(244,239,228,0.4)',
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    title: {
      fontFamily: typography.serifBold,
      fontSize: 20,
      color: '#f4efe4',
      textAlign: 'center',
      letterSpacing: 2,
      marginBottom: 8,
    },
    divider: {
      height: 1,
      backgroundColor: 'rgba(244,239,228,0.2)',
      marginBottom: 8,
    },
    menuItem: {
      paddingVertical: 13,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(244,239,228,0.1)',
    },
    menuText: {
      fontFamily: typography.sans,
      fontSize: 16,
      color: '#f4efe4',
      letterSpacing: 0.5,
    },
  }), [colors]);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  if (!rendered) return null;

  function handleNavigate(route: string) {
    onClose();
    router.push(route as never);
  }

  const filteredItems = MENU_ITEMS.filter(
    (item) => !item.authRequired || userId
  );

  // Build dynamic items (profile link needs username)
  const dynamicItems: { label: string; route: string }[] = [];
  if (userId && profile?.username) {
    dynamicItems.push({ label: 'My Profile', route: `/profile/${profile.username}` });
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: dark, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>CFB SOCIAL</Text>
        <View style={styles.divider} />
        <ScrollView showsVerticalScrollIndicator={false}>
          {dynamicItems.map((item) => (
            <Pressable
              key={item.route}
              onPress={() => handleNavigate(item.route)}
              style={styles.menuItem}
            >
              <Text style={[styles.menuText, { fontFamily: typography.sansSemiBold }]}>{item.label}</Text>
            </Pressable>
          ))}
          {filteredItems.map((item) => (
            <Pressable
              key={item.route}
              onPress={() => handleNavigate(item.route)}
              style={styles.menuItem}
            >
              <Text style={styles.menuText}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
