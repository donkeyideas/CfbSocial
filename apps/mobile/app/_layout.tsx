import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { SchoolThemeProvider, useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { ThemeProvider, useTheme } from '@/lib/theme/ThemeProvider';
import { AlertProvider } from '@/lib/AlertProvider';
import { MenuProvider } from '@/lib/MenuProvider';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import 'react-native-url-polyfill/auto';

// Prevent the splash screen from auto-hiding before fonts are loaded
SplashScreen.preventAutoHideAsync();

function AppShell() {
  const { loading } = useSchoolTheme();
  const { colorMode, colors, colorModeReady } = useTheme();
  usePushNotifications();

  // Keep splash visible until school theme + color mode are loaded
  useEffect(() => {
    if (!loading && colorModeReady) {
      SplashScreen.hideAsync();
    }
  }, [loading, colorModeReady]);

  // Safety: force-hide splash after 10s no matter what, so the app never freezes
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AlertProvider>
      <MenuProvider>
        <StatusBar style={colorMode === 'dark' ? 'light' : 'dark'} />
        <View style={[styles.root, { backgroundColor: colors.paper }]}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.paper },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="settings"
              options={{
                headerShown: false,
                presentation: 'modal',
              }}
            />
            <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="profile/[username]" options={{ headerShown: false }} />
            <Stack.Screen name="rivalry/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="rivalry/challenge/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="portal/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="school/[slug]" options={{ headerShown: false }} />
            <Stack.Screen name="war-room/index" options={{ headerShown: false }} />
            <Stack.Screen name="war-room/[gameId]" options={{ headerShown: false }} />
            <Stack.Screen name="predictions" options={{ headerShown: false }} />
            <Stack.Screen name="dynasty" options={{ headerShown: false }} />
            <Stack.Screen name="hall-of-fame" options={{ headerShown: false }} />
            <Stack.Screen name="mascot-wars" options={{ headerShown: false }} />
            <Stack.Screen name="recruiting" options={{ headerShown: false }} />
            <Stack.Screen name="coaches-call" options={{ headerShown: false }} />
            <Stack.Screen name="vault" options={{ headerShown: false }} />
            <Stack.Screen name="receipts" options={{ headerShown: false }} />
            <Stack.Screen name="contact" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="privacy" options={{ headerShown: false }} />
            <Stack.Screen name="terms" options={{ headerShown: false }} />
            <Stack.Screen name="delete-account" options={{ headerShown: false }} />
          </Stack>
        </View>
      </MenuProvider>
    </AlertProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'PlayfairDisplay-Regular': require('../assets/fonts/PlayfairDisplay-Regular.ttf'),
    'PlayfairDisplay-Bold': require('../assets/fonts/PlayfairDisplay-Bold.ttf'),
    'SourceSans3-Regular': require('../assets/fonts/SourceSans3-Regular.ttf'),
    'SourceSans3-SemiBold': require('../assets/fonts/SourceSans3-SemiBold.ttf'),
    'SourceSans3-Bold': require('../assets/fonts/SourceSans3-Bold.ttf'),
    'SpecialElite-Regular': require('../assets/fonts/SpecialElite-Regular.ttf'),
  });

  useEffect(() => {
    if (fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SchoolThemeProvider>
            <AppShell />
          </SchoolThemeProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
