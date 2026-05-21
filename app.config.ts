import { ConfigContext, ExpoConfig } from 'expo/config';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import type { FirebaseEnvConfig } from './src/config/firebaseEnv';

const root = __dirname;

function readFirebaseEnvFromProcess(): FirebaseEnvConfig | null {
  const config: FirebaseEnvConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  };

  const missingKey = (Object.entries(config) as [keyof FirebaseEnvConfig, string][]).find(
    ([, value]) => !value,
  );
  return missingKey ? null : config;
}

for (const file of ['.env.local', '.env']) {
  const envPath = path.join(root, file);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const appJson = require('./app.json') as { expo: ExpoConfig };

export default ({ config }: ConfigContext): ExpoConfig => {
  const firebase = readFirebaseEnvFromProcess();

  if (!firebase && (process.env.EAS_BUILD === 'true' || process.env.NODE_ENV === 'production')) {
    throw new Error(
      'Firebase env vars are missing for this build. ' +
        'Create .env.local from env.template (local APK) or run: eas env:push --environment preview --path .env.local',
    );
  }

  return {
    ...appJson.expo,
    ...config,
    extra: {
      ...appJson.expo.extra,
      ...config.extra,
      ...(firebase ? { firebase } : {}),
    },
  };
};
