import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

function ensureConfig(): Required<typeof firebaseConfig> {
  const missingKey = Object.entries(firebaseConfig).find(([, value]) => !value);
  if (missingKey) {
    throw new Error(
      `Missing Firebase config value "${missingKey[0]}". Did you populate env.template -> .env.local?`
    );
  }

  return firebaseConfig as Required<typeof firebaseConfig>;
}

const app: FirebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(ensureConfig());

export const auth = getAuth(app);
export const db = getFirestore(app);

