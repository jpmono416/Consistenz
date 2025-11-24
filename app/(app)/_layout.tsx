import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { palette } from '@/theme';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: 'transparent',
          paddingTop: 8,
          height: 72,
        },
        tabBarActiveTintColor: palette.signal,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarLabelStyle: { fontWeight: '600', fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Board',
          tabBarIcon: ({ color, size }) => <Feather name="layout" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Feather name="clock" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

