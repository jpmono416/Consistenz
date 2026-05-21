import { useMemo, useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, Text, View, Pressable, ActivityIndicator, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { addMonths, format, subMonths, isSameMonth } from 'date-fns';
import { getMonthDetails } from '@/utils/helpers';
import * as storage from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from '@/utils/auth';
import { loadHistoryFromFirestore, saveHistoryToFirestore } from '@/utils/firestore';
import { Habit } from '@/utils/storage';
import HabitVinyl from '@/components/HabitVinyl';

import { useTasks } from '@/context/TaskContext';
import { useHabits } from '@/context/HabitContext';
import { Task } from '@/types/task';
import { palette } from '@/theme';

const daysBack = 7;
const MAX_HISTORY_HEIGHT = 200; // Maximum height for history lists

type ViewMode = 'side-by-side' | 'stacked';
type ExpandedSection = 'signal' | 'noise' | 'total' | null;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: 'numeric',
});

export default function StatsScreen() {
  const { completedTasks, signalTasks, noiseTasks } = useTasks();
  const { habitHistory } = useHabits();
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);
  
  // Radial view state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [radialHabits, setRadialHabits] = useState<Habit[]>([]);
  const [allData, setAllData] = useState<Record<string, any>>({});
  const [radialLoading, setRadialLoading] = useState(true);
  const [useHabitColorForDone, setUseHabitColorForDone] = useState(false);

  const { monthKey, daysInMonth } = getMonthDetails(currentDate);

  // Load radial data
  useEffect(() => {
    (async () => {
      setRadialLoading(true);
      const storedHabits = await storage.loadHabits();
      const allDataMap = await storage.loadAllHabitData();
      const details = getMonthDetails(currentDate);
      const monthHist = allDataMap[details.monthKey] || {};
      let modified = false;
      for (const habitId of Object.keys(monthHist)) {
        const habitMeta = storedHabits.find(h => h.id === habitId);
        if (!habitMeta) continue;
        const freq = habitMeta.frequency;
        for (const [dayStr, status] of Object.entries(monthHist[habitId])) {
          if (status !== null) continue;
          const dayNum = parseInt(dayStr, 10);
          const dayName = details.getDayName(dayNum);
          const isRequired = !freq || freq.includes(dayName);
          monthHist[habitId][dayNum] = isRequired ? 'missed' : 'notNeeded';
          modified = true;
        }
      }
      if (modified) {
        allDataMap[details.monthKey] = monthHist;
        const HISTORY_KEY = 'habitHistory';
        const userId = getCurrentUserId();
        let history: Record<string, Record<string, any>> = {};
        if (userId) {
          history = await loadHistoryFromFirestore(userId);
        } else {
          const histStr = await AsyncStorage.getItem(HISTORY_KEY);
          history = histStr ? JSON.parse(histStr) : {};
        }
        for (const habitId of Object.keys(monthHist)) {
          for (const [dayStr, status] of Object.entries(monthHist[habitId])) {
            const dayPadded = dayStr.toString().padStart(2, '0');
            const dateKey = `${details.monthKey}-${dayPadded}`;
            if (!history[dateKey]) history[dateKey] = {};
            const existing = history[dateKey][habitId];
            const taps = existing?.taps ?? 0;
            history[dateKey][habitId] = { taps, status };
          }
        }
        if (userId) {
          await saveHistoryToFirestore(userId, history);
        }
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      }

      setAllData(allDataMap);
      const monthHistory = allDataMap[monthKey] || {};
      const historyIds = Object.keys(monthHistory);
      const map = Object.fromEntries(storedHabits.map(h => [h.id, h]));
      const combined: Habit[] = historyIds.map(id => map[id] || { id, name: id, color: '#888' });
      setRadialHabits(combined);
      setRadialLoading(false);
    })();
  }, [monthKey, currentDate]);

  const { byDay, signalCompleted, noiseCompleted } = useMemo(() => {
    const end = new Date();
    const days: { label: string; taskCount: number; habitCount: number }[] = [];
    
    const tasksNormalised = completedTasks.reduce<Record<string, number>>((acc, task) => {
      if (!task.completedAt) return acc;
      const key = task.completedAt.toISOString().slice(0, 10);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const habitsNormalised: Record<string, number> = {};
    for (const dateKey of Object.keys(habitHistory)) {
      const dayRecord = habitHistory[dateKey];
      let doneCount = 0;
      for (const habitId of Object.keys(dayRecord)) {
        const habitRecord = dayRecord[habitId];
        const status = typeof habitRecord === 'object' ? habitRecord.status : null;
        if (status === 'done') {
          doneCount++;
        }
      }
      if (doneCount > 0) {
        habitsNormalised[dateKey] = doneCount;
      }
    }

    for (let index = daysBack - 1; index >= 0; index -= 1) {
      const day = new Date(end);
      day.setDate(end.getDate() - index);
      const key = day.toISOString().slice(0, 10);
      days.push({
        label: day.toLocaleDateString(undefined, { weekday: 'short' }),
        taskCount: tasksNormalised[key] ?? 0,
        habitCount: habitsNormalised[key] ?? 0,
      });
    }

    const signalDone = completedTasks.filter((task) => task.priority === 'signal').length;
    const noiseDone = completedTasks.filter((task) => task.priority === 'noise').length;

    return { 
      byDay: days, 
      signalCompleted: signalDone, 
      noiseCompleted: noiseDone,
    };
  }, [completedTasks, habitHistory]);

  const totalCompleted = completedTasks.length;
  const focusScore =
    totalCompleted === 0 ? 0 : Math.round((signalCompleted / totalCompleted) * 100);

  // Filter tasks for history sections
  const signalTasksHistory = completedTasks.filter((task) => task.priority === 'signal');
  const noiseTasksHistory = completedTasks.filter((task) => task.priority === 'noise');

  const changeMonth = (offset: number) =>
    setCurrentDate(d => (offset > 0 ? addMonths(d, offset) : subMonths(d, -offset)));

  const atCurrentMonth = isSameMonth(currentDate, new Date());

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
            <ExpandableBreakdownPill
              label="Signal"
              value={signalCompleted}
              color={palette.signal}
              isExpanded={expandedSection !== null}
              onPress={() => setExpandedSection(expandedSection === null ? 'signal' : null)}
              tasks={expandedSection !== null ? signalTasksHistory : undefined}
              maxHeight={MAX_HISTORY_HEIGHT}
            />
            <ExpandableBreakdownPill
              label="Noise"
              value={noiseCompleted}
              color={palette.noise}
              isExpanded={expandedSection !== null}
              onPress={() => setExpandedSection(expandedSection === null ? 'noise' : null)}
              tasks={expandedSection !== null ? noiseTasksHistory : undefined}
              maxHeight={MAX_HISTORY_HEIGHT}
            />
            <ExpandableBreakdownPill
              label="Total"
              value={totalCompleted}
              color={palette.accent}
              isExpanded={expandedSection !== null}
              onPress={() => setExpandedSection(expandedSection === null ? 'total' : null)}
              tasks={expandedSection !== null ? completedTasks : undefined}
              maxHeight={MAX_HISTORY_HEIGHT}
            />
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: palette.textPrimary, fontWeight: '700' }}>Last 7 days</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => setViewMode('side-by-side')}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: viewMode === 'side-by-side' ? palette.signal : palette.elevated,
                  borderWidth: 1,
                  borderColor: palette.border,
                }}
              >
                <Text style={{ color: viewMode === 'side-by-side' ? palette.background : palette.textSecondary, fontSize: 12, fontWeight: '600' }}>
                  Side
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode('stacked')}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: viewMode === 'stacked' ? palette.signal : palette.elevated,
                  borderWidth: 1,
                  borderColor: palette.border,
                }}
              >
                <Text style={{ color: viewMode === 'stacked' ? palette.background : palette.textSecondary, fontSize: 12, fontWeight: '600' }}>
                  Stacked
                </Text>
              </Pressable>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
            {byDay.map((day) => {
              const totalCount = day.taskCount + day.habitCount;
              const baseHeight = 12;
              const taskHeight = day.taskCount === 0 ? 0 : baseHeight + day.taskCount * 12;
              const habitHeight = day.habitCount === 0 ? 0 : baseHeight + day.habitCount * 12;
              const totalHeight = totalCount === 0 ? baseHeight : baseHeight + totalCount * 12;

              if (viewMode === 'side-by-side') {
                return (
                  <View key={day.label} style={{ alignItems: 'center', flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 2, width: '100%', alignItems: 'flex-end', justifyContent: 'center' }}>
                      {/* Task bar */}
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <View
                          style={{
                            width: '100%',
                            height: taskHeight || baseHeight,
                            borderRadius: 8,
                            backgroundColor: day.taskCount > 0 ? palette.signal : palette.elevated,
                            borderWidth: 1,
                            borderColor: palette.border,
                            minHeight: baseHeight,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          {day.taskCount > 0 && (
                            <Text style={{ color: palette.background, fontWeight: '700', fontSize: 11 }}>
                              {day.taskCount}
                            </Text>
                          )}
                        </View>
                      </View>
                      {/* Habit bar */}
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <View
                          style={{
                            width: '100%',
                            height: habitHeight || baseHeight,
                            borderRadius: 8,
                            backgroundColor: day.habitCount > 0 ? palette.accent : palette.elevated,
                            borderWidth: 1,
                            borderColor: palette.border,
                            minHeight: baseHeight,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          {day.habitCount > 0 && (
                            <Text style={{ color: palette.background, fontWeight: '700', fontSize: 11 }}>
                              {day.habitCount}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                    <Text style={{ color: palette.textSecondary, marginTop: 8, fontSize: 11 }}>{day.label}</Text>
                  </View>
                );
              } else {
                // Stacked view
                return (
                  <View key={day.label} style={{ alignItems: 'center', flex: 1 }}>
                    <View style={{ width: '100%', height: totalHeight, position: 'relative', justifyContent: 'flex-end' }}>
                      {/* Habit bar (bottom) */}
                      {day.habitCount > 0 && (
                        <View
                          style={{
                            width: '100%',
                            height: habitHeight,
                            borderRadius: 12,
                            backgroundColor: palette.accent,
                            borderWidth: 1,
                            borderColor: palette.border,
                            position: 'absolute',
                            bottom: 0,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: palette.background, fontWeight: '700', fontSize: 11 }}>
                            {day.habitCount}
                          </Text>
                        </View>
                      )}
                      {/* Task bar (top) */}
                      {day.taskCount > 0 && (
                        <View
                          style={{
                            width: '100%',
                            height: taskHeight,
                            borderRadius: 12,
                            backgroundColor: palette.signal,
                            borderWidth: 1,
                            borderColor: palette.border,
                            position: 'absolute',
                            bottom: day.habitCount > 0 ? habitHeight : 0,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: palette.background, fontWeight: '700', fontSize: 11 }}>
                            {day.taskCount}
                          </Text>
                        </View>
                      )}
                      {/* Empty state */}
                      {totalCount === 0 && (
                        <View
                          style={{
                            width: '100%',
                            height: baseHeight,
                            borderRadius: 12,
                            backgroundColor: palette.elevated,
                            borderWidth: 1,
                            borderColor: palette.border,
                          }}
                        />
                      )}
                    </View>
                    <Text style={{ color: palette.textSecondary, marginTop: 8 }}>{day.label}</Text>
                    <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>{totalCount}</Text>
                  </View>
                );
              }
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: palette.signal }} />
              <Text style={{ color: palette.textSecondary, fontSize: 12 }}>Tasks</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: palette.accent }} />
              <Text style={{ color: palette.textSecondary, fontSize: 12 }}>Habits</Text>
            </View>
          </View>
        </View>

        {/* Radial View */}
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: palette.textPrimary, fontWeight: '700' }}>Habit Calendar</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Pressable
                onPress={() => changeMonth(-1)}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: palette.textPrimary }}>‹ Prev</Text>
              </Pressable>
              <Text style={{ color: palette.textPrimary, fontWeight: '600', minWidth: 100, textAlign: 'center' }}>
                {format(currentDate, 'MMMM yyyy')}
              </Text>
              <Pressable
                onPress={() => changeMonth(1)}
                disabled={atCurrentMonth}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  opacity: atCurrentMonth ? 0.5 : 1,
                }}
              >
                <Text style={{ color: palette.textPrimary }}>Next ›</Text>
              </Pressable>
            </View>
          </View>
          {radialLoading ? (
            <ActivityIndicator size="large" color={palette.signal} />
          ) : radialHabits.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: palette.textSecondary }}>No habit tracking data for this month.</Text>
            </View>
          ) : (
            <>
              <HabitVinyl
                habits={radialHabits}
                monthData={allData[monthKey] ?? {}}
                daysInMonth={daysInMonth}
                date={currentDate}
                showHabitColorOnDone={useHabitColorForDone}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Text style={{ color: palette.textSecondary }}>Use habit color for done</Text>
                <Switch
                  value={useHabitColorForDone}
                  onValueChange={setUseHabitColorForDone}
                  trackColor={{ false: palette.elevated, true: palette.accent }}
                  thumbColor={palette.textPrimary}
                />
              </View>
            </>
          )}
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

function ExpandableBreakdownPill({
  label,
  value,
  color,
  isExpanded,
  onPress,
  tasks,
  maxHeight,
}: {
  label: string;
  value: number;
  color: string;
  isExpanded: boolean;
  onPress: () => void;
  tasks?: Task[];
  maxHeight?: number;
}) {
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Pressable
        onPress={onPress}
        style={{
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{label}</Text>
          <Feather
            name={isExpanded ? 'chevron-down' : 'chevron-right'}
            size={14}
            color={palette.textSecondary}
          />
        </View>
        {isExpanded && tasks !== undefined && (
          <View style={{ width: '100%', marginTop: 12, height: maxHeight || 200 }}>
            <TaskHistoryList tasks={tasks} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

function TaskHistoryList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <View style={{ padding: 12, alignItems: 'center' }}>
        <Text style={{ color: palette.textSecondary, fontSize: 11 }}>No completed tasks yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} nestedScrollEnabled showsVerticalScrollIndicator>
      <View style={{ gap: 6 }}>
        {tasks.map((item) => (
          <View
            key={item.id}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                backgroundColor: item.priority === 'signal' ? palette.signal : palette.noise,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: palette.background, fontWeight: '700', fontSize: 11 }}>
                {item.priority === 'signal' ? 'S' : 'N'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.textPrimary, fontWeight: '600', fontSize: 12 }} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={{ color: palette.textSecondary, marginTop: 2, fontSize: 10 }}>
                {item.completedAt
                  ? `${dateFormatter.format(item.completedAt)} at ${timeFormatter.format(item.completedAt)}`
                  : 'Completion time unknown'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
