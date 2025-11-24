import { useMemo } from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

import { useTasks } from '@/context/TaskContext';
import { palette } from '@/theme';

const daysBack = 7;

export default function StatsScreen() {
  const { completedTasks, signalTasks, noiseTasks } = useTasks();

  const { byDay, signalCompleted, noiseCompleted } = useMemo(() => {
    const end = new Date();
    const days: { label: string; count: number }[] = [];
    const normalised = completedTasks.reduce<Record<string, number>>((acc, task) => {
      if (!task.completedAt) return acc;
      const key = task.completedAt.toISOString().slice(0, 10);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    for (let index = daysBack - 1; index >= 0; index -= 1) {
      const day = new Date(end);
      day.setDate(end.getDate() - index);
      const key = day.toISOString().slice(0, 10);
      days.push({
        label: day.toLocaleDateString(undefined, { weekday: 'short' }),
        count: normalised[key] ?? 0,
      });
    }

    const signalDone = completedTasks.filter((task) => task.priority === 'signal').length;
    const noiseDone = completedTasks.filter((task) => task.priority === 'noise').length;

    return { byDay: days, signalCompleted: signalDone, noiseCompleted: noiseDone };
  }, [completedTasks]);

  const totalCompleted = completedTasks.length;
  const focusScore =
    totalCompleted === 0 ? 0 : Math.round((signalCompleted / totalCompleted) * 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View>
          <Text style={{ color: palette.textSecondary, fontSize: 14 }}>Insights</Text>
          <Text style={{ color: palette.textPrimary, fontSize: 26, fontWeight: '800' }}>Signal vs Noise</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <StatCard label="Focus score" value={`${focusScore}%`} hint="Share of completed tasks that were Signal." />
          <StatCard
            label="Active stack"
            value={`${signalTasks.length + noiseTasks.length}`}
            hint="Signal vs Noise currently on your board."
          />
        </View>

        <View
          style={{
            backgroundColor: palette.surface,
            padding: 20,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: palette.border,
            gap: 16,
          }}
        >
          <Text style={{ color: palette.textPrimary, fontWeight: '700' }}>Completed breakdown</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <BreakdownPill label="Signal" value={signalCompleted} color={palette.signal} />
            <BreakdownPill label="Noise" value={noiseCompleted} color={palette.noise} />
            <BreakdownPill label="Total" value={totalCompleted} color={palette.accent} />
          </View>
        </View>

        <View
          style={{
            backgroundColor: palette.surface,
            padding: 20,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: palette.border,
            gap: 16,
          }}
        >
          <Text style={{ color: palette.textPrimary, fontWeight: '700' }}>Last 7 days</Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
            {byDay.map((day) => {
              const height = day.count === 0 ? 12 : 24 + day.count * 12;
              return (
                <View key={day.label} style={{ alignItems: 'center', flex: 1 }}>
                  <View
                    style={{
                      width: '100%',
                      height,
                      borderRadius: 12,
                      backgroundColor: day.count > 0 ? palette.signal : palette.elevated,
                      borderWidth: 1,
                      borderColor: palette.border,
                    }}
                  />
                  <Text style={{ color: palette.textSecondary, marginTop: 8 }}>{day.label}</Text>
                  <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>{day.count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.surface,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 8,
      }}
    >
      <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: palette.textPrimary, fontSize: 32, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: palette.textSecondary, fontSize: 13 }}>{hint}</Text>
    </View>
  );
}

function BreakdownPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 10,
        backgroundColor: palette.elevated,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 2,
          borderRadius: 999,
          backgroundColor: color,
          marginBottom: 8,
        }}
      >
        <Text style={{ color: palette.background, fontWeight: '700' }}>{label[0]}</Text>
      </View>
      <Text style={{ color: palette.textPrimary, fontWeight: '700', fontSize: 20 }}>{value}</Text>
      <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

