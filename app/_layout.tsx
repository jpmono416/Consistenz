import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '../src/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { TaskProvider } from '@/context/TaskContext';
import { palette } from '@/theme';

function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TaskProvider>{children}</TaskProvider>
    </AuthProvider>
  );
}

function RouterStack() {
  const { authReady } = useAuth();
  const colorScheme = useColorScheme();

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
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <Providers>
      <RouterStack />
    </Providers>
  );
}
