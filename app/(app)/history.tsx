import { FlatList, SafeAreaView, Text, View } from 'react-native';

import { useTasks } from '@/context/TaskContext';
import { palette } from '@/theme';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: 'numeric',
});

export default function HistoryScreen() {
  const { completedTasks } = useTasks();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={{ flex: 1, padding: 20, gap: 16 }}>
        <View>
          <Text style={{ color: palette.textSecondary, fontSize: 14 }}>History</Text>
          <Text style={{ color: palette.textPrimary, fontSize: 26, fontWeight: '800' }}>Completed work</Text>
        </View>

        {completedTasks.length === 0 ? (
          <View
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: palette.border,
              borderStyle: 'dashed',
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
            }}
          >
            <Text style={{ color: palette.textSecondary, textAlign: 'center' }}>
              Tasks you mark as done will land here, regardless of Signal or Noise.
            </Text>
          </View>
        ) : (
          <FlatList
            data={completedTasks}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item }) => (
              <View
                style={{
                  padding: 16,
                  borderRadius: 18,
                  backgroundColor: palette.surface,
                  borderWidth: 1,
                  borderColor: palette.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: item.priority === 'signal' ? palette.signal : palette.noise,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: palette.background, fontWeight: '700', fontSize: 16 }}>
                    {item.priority === 'signal' ? 'S' : 'N'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.textPrimary, fontWeight: '600', fontSize: 16 }}>{item.title}</Text>
                  <Text style={{ color: palette.textSecondary, marginTop: 4 }}>
                    {item.completedAt
                      ? `${dateFormatter.format(item.completedAt)} at ${timeFormatter.format(item.completedAt)}`
                      : 'Completion time unknown'}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

