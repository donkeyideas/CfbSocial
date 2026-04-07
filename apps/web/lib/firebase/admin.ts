import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

let app: App | null = null;
let messaging: Messaging | null = null;

export function getFirebaseAdmin(): App | null {
  if (app) return app;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    console.warn('[Firebase] FIREBASE_SERVICE_ACCOUNT not configured — push notifications disabled');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);

    if (getApps().length === 0) {
      app = initializeApp({ credential: cert(serviceAccount) });
    } else {
      app = getApps()[0];
    }

    return app;
  } catch (error) {
    console.error('[Firebase] Failed to initialize:', error);
    return null;
  }
}

export function getMessagingInstance(): Messaging | null {
  if (messaging) return messaging;

  const firebaseApp = getFirebaseAdmin();
  if (!firebaseApp) return null;

  messaging = getMessaging(firebaseApp);
  return messaging;
}
