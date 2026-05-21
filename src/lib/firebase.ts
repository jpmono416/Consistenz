import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, Auth, Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

function createAuth(): Auth {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }

  // Metro resolves firebase/auth to the React Native build at runtime.
  const { getReactNativePersistence } = require('firebase/auth') as {
    getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
  };

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
