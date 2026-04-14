import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Register for push notifications and send the FCM token to the web API.
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

  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission not granted');
    return null;
  }

  // Set notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8b1a1a',
    });
  }

  try {
    // Get the native device push token (FCM on Android, APNs on iOS)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData.data;

    if (!token) {
      console.log('[Push] No token returned');
      return null;
    }

    // Register token with our API
    const accessToken = await getAccessToken();
    if (accessToken) {
      const res = await fetch(`${apiBaseUrl}/api/fcm/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS, // 'android' or 'ios'
        }),
      });

      if (!res.ok) {
        console.error('[Push] Token registration failed:', res.status);
      } else {
        console.log('[Push] Token registered successfully');
      }
    }

    return token;
  } catch (error) {
    console.error('[Push] Registration error:', error);
    return null;
  }
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
