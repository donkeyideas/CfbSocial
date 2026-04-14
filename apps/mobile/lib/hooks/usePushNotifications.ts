import { useEffect, useRef } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthProvider';
import { WEB_API_URL } from '@/lib/constants';

// Push notifications are not supported in Expo Go (SDK 53+)
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Only configure notification handler in dev builds / standalone
if (!isExpoGo) {
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Registers for push notifications on mount (when user is authenticated),
 * and sets up listeners for notification taps.
 * Skips entirely in Expo Go where push is unsupported.
 */
export function usePushNotifications() {
  const { session } = useAuth();
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (isExpoGo || !session?.access_token) return;

    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    const { registerForPushNotifications } = require('@/lib/notifications/pushRegistration');

    // Register for push notifications
    registerForPushNotifications(
      WEB_API_URL,
      async () => session.access_token
    ).catch((err: any) => console.error('[Push] Registration failed:', err));

    // Listen for notification taps (user interacts with a notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'SYSTEM') {
          router.push('/(tabs)/notifications');
        } else if (data?.postId) {
          router.push('/(tabs)/notifications');
        } else {
          router.push('/(tabs)/notifications');
        }
      }
    );

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [session?.access_token]);
}
