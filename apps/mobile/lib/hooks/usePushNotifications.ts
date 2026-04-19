import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
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
 * iOS uses Firebase messaging for tap handling; Android uses Expo notifications.
 * Skips entirely in Expo Go where push is unsupported.
 */
export function usePushNotifications() {
  const { session } = useAuth();
  const responseListener = useRef<any>(null);
  const coldStartHandled = useRef(false);

  useEffect(() => {
    if (isExpoGo || !session?.access_token) return;

    const { registerForPushNotifications } = require('@/lib/notifications/pushRegistration');

    // Register for push notifications
    registerForPushNotifications(
      WEB_API_URL,
      async () => session.access_token
    ).catch((err: any) => console.error('[Push] Registration failed:', err));

    if (Platform.OS === 'ios') {
      // iOS: use Firebase messaging for notification tap handling
      import('@react-native-firebase/messaging').then((messagingModule) => {
        const messaging = messagingModule.default;

        // Handle cold-start: app opened from notification while closed
        if (!coldStartHandled.current) {
          coldStartHandled.current = true;
          messaging().getInitialNotification().then((remoteMessage) => {
            if (remoteMessage) {
              setTimeout(() => {
                router.push('/notifications');
              }, 500);
            }
          });
        }

        // Handle notification tap while app is in background
        responseListener.current = messaging().onNotificationOpenedApp(() => {
          router.push('/notifications');
        });
      }).catch((err) => {
        console.error('[Push] Firebase messaging import failed:', err);
      });
    } else {
      // Android: use Expo notifications for tap handling
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');

      // Handle cold-start
      if (!coldStartHandled.current) {
        coldStartHandled.current = true;
        Notifications.getLastNotificationResponseAsync().then((response) => {
          if (response) {
            setTimeout(() => {
              router.push('/notifications');
            }, 500);
          }
        });
      }

      // Listen for notification taps while app is running
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        () => {
          router.push('/notifications');
        }
      );
    }

    return () => {
      if (responseListener.current) {
        if (typeof responseListener.current === 'function') {
          // Firebase returns an unsubscribe function
          responseListener.current();
        } else if (responseListener.current.remove) {
          // Expo returns a subscription object
          responseListener.current.remove();
        }
      }
    };
  }, [session?.access_token]);
}
