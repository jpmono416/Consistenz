import Constants from 'expo-constants';

export type FirebaseEnvConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

/** Read Firebase config baked in at build time (process.env + app.config extra). */
export function getFirebaseConfig(): FirebaseEnvConfig {
  const fromExtra = Constants.expoConfig?.extra?.firebase as Partial<FirebaseEnvConfig> | undefined;

  const config: FirebaseEnvConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? fromExtra?.apiKey ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? fromExtra?.authDomain ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? fromExtra?.projectId ?? '',
    storageBucket:
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? fromExtra?.storageBucket ?? '',
    messagingSenderId:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? fromExtra?.messagingSenderId ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? fromExtra?.appId ?? '',
  };

  const missingKey = (Object.entries(config) as [keyof FirebaseEnvConfig, string][]).find(
    ([, value]) => !value,
  );
  if (missingKey) {
    throw new Error(
      `Missing Firebase config value "${missingKey[0]}". ` +
        'Copy env.template to .env.local with your Firebase web app keys, then rebuild the APK. ' +
        'For EAS builds, run: eas env:push --environment preview --path .env.local',
    );
  }

  return config;
}
