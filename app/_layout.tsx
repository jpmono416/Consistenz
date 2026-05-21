import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '../src/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { TaskProvider } from '@/context/TaskContext';
import { HabitProvider } from '@/context/HabitContext';
import { palette } from '@/theme';
import { initializeNotifications, cancelAllNotifications, setupNotificationHandlers } from '@/utils/notifications';

function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TaskProvider>
        <HabitProvider>{children}</HabitProvider>
      </TaskProvider>
    </AuthProvider>
  );
}

function RouterStack() {
  const { authReady, user } = useAuth();
  const colorScheme = useColorScheme();
  const notificationCleanupRef = useRef<(() => void) | null>(null);

  // Initialize notifications when user logs in
  useEffect(() => {
    if (user) {
      initializeNotifications(user.uid).catch((error) => {
        console.error('Error initializing notifications:', error);
      });
      
      // Setup notification handlers
      const cleanup = setupNotificationHandlers(user.uid);
      notificationCleanupRef.current = cleanup;
    } else {
      // Cancel notifications when user logs out
      cancelAllNotifications().catch((error) => {
        console.error('Error canceling notifications:', error);
      });
      
      // Cleanup notification handlers
      if (notificationCleanupRef.current) {
        notificationCleanupRef.current();
        notificationCleanupRef.current = null;
      }
    }

    return () => {
      // Cleanup on unmount
      if (notificationCleanupRef.current) {
        notificationCleanupRef.current();
        notificationCleanupRef.current = null;
      }
    };
  }, [user]);

  if (!authReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.signal} size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="(app)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Providers>
          <RouterStack />
        </Providers>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
