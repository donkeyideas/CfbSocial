import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Register for push notifications and send the token to the web API.
 * iOS: uses @react-native-firebase/messaging for native APNs + FCM registration.
 * Android: uses expo-notifications for Expo push tokens.
 * Returns the token string on success, or null if registration fails.
 */
export async function registerForPushNotifications(
  apiBaseUrl: string,
  getAccessToken: () => Promise<string | null>
): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('[Push] Not a physical device, skipping registration');
    return null;
  }

  let token: string | null = null;

  if (Platform.OS === 'ios') {
    // iOS: use @react-native-firebase/messaging end-to-end so APNs is
    // properly registered before requesting an FCM token.
    try {
      console.log('[Push] iOS: using Firebase messaging for push registration...');
      const messagingModule = await import('@react-native-firebase/messaging');
      const messaging = messagingModule.default;

      // 1. Request iOS notification permission via the native FCM bridge
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messagingModule.AuthorizationStatus.AUTHORIZED ||
        authStatus === messagingModule.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('[Push] iOS permission not granted:', authStatus);
        return null;
      }

      // 2. Ensure APNs registration. Without this getToken() can return
      //    null on a fresh install before the APNs token is delivered.
      if (!messaging().isDeviceRegisteredForRemoteMessages) {
        await messaging().registerDeviceForRemoteMessages();
      }

      // 3. Now safe to fetch the FCM token
      token = await messaging().getToken();
      if (!token) {
        console.log('[Push] iOS: messaging().getToken() returned empty');
        return null;
      }

      console.log(`[Push] iOS FCM token: ${token.substring(0, 30)}...`);
    } catch (error) {
      console.error('[Push] iOS Firebase messaging error:', error);
      return null;
    }
  } else {
    // Android: use expo-notifications for push token
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Android permission not granted');
      return null;
    }

    // Set notification channel for Android
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8b1a1a',
    });

    try {
      console.log('[Push] Android: getting Expo push token...');
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '416e432c-3a96-49d1-abe6-934e182b72d5',
      });
      token = tokenData.data;

      if (!token) {
        console.log('[Push] Android: no token returned');
        return null;
      }

      console.log(`[Push] Android token: ${token.substring(0, 30)}...`);
    } catch (error) {
      console.error('[Push] Android token error:', error);
      return null;
    }
  }

  // Register token with our API
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn('[Push] No access token available — skipping registration');
      return token;
    }

    const res = await fetch(`${apiBaseUrl}/api/fcm/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.error(`[Push] Token registration failed: ${res.status} ${errorText}`);
    } else {
      const result = await res.json().catch(() => ({}));
      console.log(`[Push] Token registered successfully (type: ${result.tokenType ?? 'unknown'})`);
    }
  } catch (error) {
    console.error('[Push] API registration error:', error);
  }

  return token;
}

/**
 * Unregister a push token from the API (e.g., on sign out).
 */
export async function unregisterPushToken(
  apiBaseUrl: string,
  token: string,
  getAccessToken: () => Promise<string | null>
): Promise<void> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    await fetch(`${apiBaseUrl}/api/fcm/unregister`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch (error) {
    console.error('[Push] Unregister error:', error);
  }
}
