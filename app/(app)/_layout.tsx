import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { palette } from '@/theme';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
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
          href: null,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="habit-tracker"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="manage-habits"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="radial"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}

