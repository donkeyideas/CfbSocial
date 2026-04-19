/**
 * Send push notifications via Expo's push service.
 * Handles both iOS (APNs) and Android (FCM) routing automatically.
 * Used for Expo push tokens (format: ExponentPushToken[...]).
 */

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface ExpoTokenResult {
  token: string;
  success: boolean;
  error?: string;
}

export interface ExpoPushResult {
  sent: number;
  failed: number;
  invalidTokens: string[];
  perToken: ExpoTokenResult[];
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notifications to one or more Expo push tokens.
 * Returns per-token results so each token can be individually logged.
 */
export async function sendExpoPush(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<ExpoPushResult> {
  if (tokens.length === 0) return { sent: 0, failed: 0, invalidTokens: [], perToken: [] };

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: 'default',
    priority: 'high',
    channelId: 'default',
  }));

  const result: ExpoPushResult = { sent: 0, failed: 0, invalidTokens: [], perToken: [] };

  // Expo recommends batches of max 100
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        console.error('[Expo Push] HTTP error:', res.status, await res.text());
        result.failed += batch.length;
        // Mark all tokens in this batch as failed
        for (const msg of batch) {
          result.perToken.push({ token: msg.to, success: false, error: `HTTP ${res.status}` });
        }
        continue;
      }

      const { data: tickets } = (await res.json()) as { data: ExpoPushTicket[] };

      for (let j = 0; j < tickets.length; j++) {
        const ticket = tickets[j];
        const token = batch[j].to;

        if (ticket.status === 'ok') {
          result.sent++;
          result.perToken.push({ token, success: true });
        } else {
          result.failed++;
          const errorMsg = ticket.details?.error || ticket.message || 'Unknown Expo error';

          // Detect invalid tokens from multiple error patterns
          const isInvalid =
            ticket.details?.error === 'DeviceNotRegistered' ||
            (ticket.message || '').toLowerCase().includes('invalid') ||
            (ticket.message || '').toLowerCase().includes('not registered');

          if (isInvalid) {
            result.invalidTokens.push(token);
          }

          result.perToken.push({ token, success: false, error: errorMsg });
          console.warn('[Expo Push] Failed for token:', token, errorMsg);
        }
      }
    } catch (err) {
      console.error('[Expo Push] Send error:', err);
      result.failed += batch.length;
      for (const msg of batch) {
        result.perToken.push({ token: msg.to, success: false, error: 'Network error' });
      }
    }
  }

  return result;
}
