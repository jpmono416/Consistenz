import { useState } from 'react';
import { ScrollView, Text, View, SafeAreaView, Pressable, useWindowDimensions } from 'react-native';

import { TaskColumn } from '@/components/TaskColumn';
import { TaskComposer } from '@/components/TaskComposer';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/context/TaskContext';
import { palette } from '@/theme';

export default function HomeScreen() {
  const { user, signOutUser } = useAuth();
  const { signalTasks, noiseTasks, addTask, toggleCompleted, togglePriority, deleteTask } = useTasks();
  const [signingOut, setSigningOut] = useState(false);
  const { width } = useWindowDimensions();
  const stackColumns = width < 720;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutUser();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: palette.textSecondary, fontSize: 14 }}>Welcome back</Text>
            <Text style={{ color: palette.textPrimary, fontSize: 26, fontWeight: '800' }}>
              {user?.email?.split('@')[0] ?? 'Signalist'}
            </Text>
          </View>
          <Pressable
            onPress={handleSignOut}
            disabled={signingOut}
            style={{
              borderRadius: 999,
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: palette.border,
              backgroundColor: palette.surface,
            }}
          >
            <Text style={{ color: palette.textSecondary, fontWeight: '600' }}>{signingOut ? '...' : 'Logout'}</Text>
          </Pressable>
        </View>

        <TaskComposer onSubmit={addTask} />

        <View style={{ flexDirection: stackColumns ? 'column' : 'row', gap: 16 }}>
          <TaskColumn
            title="Signal"
            accentColor={palette.signal}
            tasks={signalTasks}
            emptyCopy="No signal tasks yet. Capture the most impactful thing you can do next."
            onTogglePriority={togglePriority}
            onToggleCompleted={toggleCompleted}
            onDelete={deleteTask}
          />
          <TaskColumn
            title="Noise"
            accentColor={palette.noise}
            tasks={noiseTasks}
            emptyCopy="Noise tasks live here. Keep them around but stay focused on signal."
            onTogglePriority={togglePriority}
            onToggleCompleted={toggleCompleted}
            onDelete={deleteTask}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

