# Consistenz

Signal vs Noise inspired mobile task board built with Expo Router + Firebase. Consistenz splits work into two live columns (Signal for high-impact, Noise for low-priority) and keeps a combined completion history plus lightweight insights. It also features a customisable habit tracker.

## Features

- Email/password auth with Firebase Authentication
- Real-time tasks synced per user in Cloud Firestore
- Dual-column board with quick actions (complete, delete, swap priority)
- Completion history that merges Signal/Noise items with visual badges
- Stats view with focus score, backlog count, and a rolling 7-day completion graph

## Tech stack

- Expo 54 (React Native 0.81) + Expo Router tabs
- Firebase Authentication & Firestore
- TypeScript with module aliases (`@/* → src/*`)
- Vector icons from `@expo/vector-icons`

## Getting started

1. Install dependencies

   ```bash
   npm install
   ```

2. Configure Firebase (see next section)

3. Start the dev server

   ```bash
   npx expo start
   ```

   Use any of: Android emulator, iOS simulator (macOS), or Expo Go on device.

## Firebase configuration

Create a Firebase project with Authentication (Email/Password enabled) and Firestore (native mode). Copy your web app credentials into a `.env.local` file based on `env.template`:

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

Expo automatically inlines variables prefixed with `EXPO_PUBLIC_` into the client bundle.

## Project layout

- `app/(auth)` – login & signup flow
- `app/(app)` – authenticated tab navigator (board, history, stats)
- `src/context` – Auth + Task providers
- `src/components` – UI primitives (columns, cards, composer)
- `src/lib/firebase.ts` – Firebase bootstrap
- `src/theme` – palette shared across screens

## Helpful scripts

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `npm run start`  | Launch Expo dev server                   |
| `npm run android`| Start + open on Android emulator/device  |
| `npm run ios`    | Start + open on iOS simulator (mac only) |
| `npm run web`    | Run in Expo Web                          |
| `npm run lint`   | Check ESLint issues                      |

## Next steps

- Harden validation (min password length, better error copy)
- Add stats filters (by month, by priority)
- Add push notifications or reminders via Expo Notifications
