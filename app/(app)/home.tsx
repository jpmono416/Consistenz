import { useState, useCallback, useMemo, useRef } from 'react';
import { Text, View, SafeAreaView, Pressable, useWindowDimensions, FlatList, StyleSheet, Modal } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { format, isToday } from 'date-fns';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { TaskColumn } from '@/components/TaskColumn';
import { TaskComposer } from '@/components/TaskComposer';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/context/TaskContext';
import { useHabits } from '@/context/HabitContext';
import { upsertHabitTap } from '@/utils/storage';
import { Priority } from '@/types/task';
import { palette, shadows } from '@/theme';

const numColumns = 2;

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const { signalTasks, noiseTasks, addTask, toggleCompleted, togglePriority, deleteTask } = useTasks();
  const { habits, habitHistory, refreshHistory } = useHabits();
  const [signingOut, setSigningOut] = useState(false);
  const [showTaskComposer, setShowTaskComposer] = useState(false);
  const [taskComposerPriority, setTaskComposerPriority] = useState<Priority>('signal');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<Priority | null>(null);
  const signalColumnRef = useRef<View>(null);
  const noiseColumnRef = useRef<View>(null);
  const rootRef = useRef<View>(null);
  const rootOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const { width } = useWindowDimensions();
  const stackColumns = width < 720;
  const habitSize = width / numColumns - 24;

  // Get habits for selected date with tap counts
  const habitsForDate = useMemo(() => {
    const dateKey = selectedDate.toISOString().slice(0, 10);
    const dayRecord = habitHistory[dateKey] || {};

    return habits
      .filter(h => h.isActive) // Show all active habits, not filtered by schedule
      .map(h => {
        const rec = dayRecord[h.id];
        const taps = typeof rec === 'number' ? rec : rec?.taps ?? 0;
        return { ...h, tapsToday: taps };
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [habits, habitHistory, selectedDate]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutUser();
    } finally {
      setSigningOut(false);
    }
  };

  const handleHabitTap = useCallback(async (habitId: string) => {
    await upsertHabitTap(habitId, selectedDate);
    // Refresh history to get updated data
    await refreshHistory();
  }, [selectedDate, refreshHistory]);

  // Date navigation
  const handlePrevDay = () => {
    setSelectedDate(d => {
      const next = new Date(d);
      next.setDate(d.getDate() - 1);
      return next;
    });
  };

  const handleNextDay = () => {
    setSelectedDate(d => {
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      return next;
    });
  };

  const atToday = isToday(selectedDate);

  // Drag-and-drop handlers. All coordinates passed in are window-absolute
  // coordinates coming from the Pan gesture's absoluteX/absoluteY, so the
  // overlay can be positioned correctly regardless of safe-area insets, tabs
  // or scroll position.
  const measureRootOffset = useCallback(() => {
    rootRef.current?.measureInWindow((x, y) => {
      rootOffsetRef.current = { x, y };
    });
  }, []);

  const handleDragStart = useCallback(
    (taskId: string, x: number, y: number) => {
      measureRootOffset();
      const { x: ox, y: oy } = rootOffsetRef.current;
      setDraggedTaskId(taskId);
      setDragPosition({ x: x - ox, y: y - oy });
    },
    [measureRootOffset]
  );

  const handleDragUpdate = useCallback((x: number, y: number) => {
    const { x: ox, y: oy } = rootOffsetRef.current;
    setDragPosition({ x: x - ox, y: y - oy });

    // Hit-test against the columns. measureInWindow is JS-side so this is safe.
    signalColumnRef.current?.measureInWindow((sx, sy, sw, sh) => {
      if (x >= sx && x <= sx + sw && y >= sy && y <= sy + sh) {
        setHoveredColumn('signal');
        return;
      }
      noiseColumnRef.current?.measureInWindow((nx, ny, nw, nh) => {
        if (x >= nx && x <= nx + nw && y >= ny && y <= ny + nh) {
          setHoveredColumn('noise');
        } else {
          setHoveredColumn(null);
        }
      });
    });
  }, []);

  const handleDragEnd = useCallback(async () => {
    // Snapshot then immediately reset visual state so the card cannot get
    // stuck "floating" on web if any of the awaits below fail.
    const taskId = draggedTaskId;
    const target = hoveredColumn;
    setDraggedTaskId(null);
    setDragPosition(null);
    setHoveredColumn(null);

    if (!taskId || !target) return;

    const draggedTask = [...signalTasks, ...noiseTasks].find((t) => t.id === taskId);
    if (draggedTask && draggedTask.priority !== target) {
      try {
        await togglePriority(taskId);
      } catch (err) {
        console.error('Failed to swap task priority:', err);
      }
    }
  }, [draggedTaskId, hoveredColumn, signalTasks, noiseTasks, togglePriority]);

  const openTaskComposer = useCallback((priority: Priority = 'signal') => {
    setTaskComposerPriority(priority);
    setShowTaskComposer(true);
  }, []);

  // Special items for habit grid
  const addHabitItem = { id: 'add-habit', isAddButton: true };
  const tasksItem = { id: 'tasks-item', isTasksButton: true };

  const renderHabitItem = ({ item }: { item: typeof habitsForDate[0] | typeof addHabitItem | typeof tasksItem }) => {
    const isAdd = 'isAddButton' in item;
    const isTasks = 'isTasksButton' in item;

    if (isAdd && atToday) {
      return (
        <Pressable style={[styles.habitBox, { width: habitSize, height: habitSize }]} onPress={() => router.push('/manage-habits')}>
          <Svg width={habitSize} height={habitSize} style={styles.addButtonSvg}>
            <Defs>
              <SvgGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={palette.gradientStart} />
                <Stop offset="1" stopColor={palette.gradientEnd} />
              </SvgGradient>
            </Defs>
            <Rect
              x="2"
              y="2"
              width={habitSize - 4}
              height={habitSize - 4}
              rx="10"
              ry="10"
              stroke="url(#gradient)"
              strokeWidth="2"
              fill="transparent"
            />
            <Path
              d={`
                M ${habitSize * 0.3},${habitSize * 0.47} 
                h ${habitSize * 0.4} 
                a 3,3 0 0 1 0,${habitSize * 0.06} 
                h -${habitSize * 0.17}
                v ${habitSize * 0.17}
                a 3,3 0 0 1 -${habitSize * 0.06},0 
                v -${habitSize * 0.17}
                h -${habitSize * 0.17}
                a 3,3 0 0 1 0,-${habitSize * 0.06} 
                h ${habitSize * 0.17}
                v -${habitSize * 0.17}
                a 3,3 0 0 1 ${habitSize * 0.06},0 
                v ${habitSize * 0.17}
              `}
              fill="url(#gradient)"
            />
          </Svg>
        </Pressable>
      );
    }

    if (isTasks && atToday) {
      return (
        <Pressable 
          style={[styles.habitBox, { width: habitSize, height: habitSize }]} 
          onPress={() => openTaskComposer()}
        >
          <Svg width={habitSize} height={habitSize} style={styles.addButtonSvg}>
            <Defs>
              <SvgGradient id="gradientTasks" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#4CAF50" />
                <Stop offset="1" stopColor="#81C784" />
              </SvgGradient>
            </Defs>
            <Rect
              x="2"
              y="2"
              width={habitSize - 4}
              height={habitSize - 4}
              rx="10"
              ry="10"
              stroke="url(#gradientTasks)"
              strokeWidth="2"
              fill="transparent"
            />
          </Svg>
          <Text style={[styles.emoji, { position: 'absolute', color: palette.success }]}>✅</Text>
        </Pressable>
      );
    }

    if (isAdd || isTasks) return null;

    // Normal habit rendering
    const ratio = item.tapsToday / item.tapsNeeded;
    const filledHeight = habitSize * ratio;
    return (
      <Pressable
        style={[styles.habitBox, { width: habitSize, height: habitSize, borderColor: item.color, borderWidth: 2 }]}
        onPress={() => handleHabitTap(item.id)}
      >
        <View style={[styles.fill, { height: filledHeight, backgroundColor: item.color }]} />
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={styles.label}>{item.name}</Text>
      </Pressable>
    );
  };

  const habitData = atToday 
    ? [...habitsForDate, addHabitItem, tasksItem]
    : habitsForDate;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <View ref={rootRef} style={{ flex: 1 }} onLayout={measureRootOffset}>
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 }}>
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

        {/* Date Navigation */}
        <View style={styles.dateNavContainer}>
          <Pressable onPress={handlePrevDay}>
            <Text style={{ fontSize: 20, color: palette.textPrimary }}>◀️</Text>
          </Pressable>
          <Text style={styles.dateHeader}>
            {format(selectedDate, "EEE, MMM d")}
          </Text>
          {atToday ? (
            <Text style={{ fontSize: 20, color: palette.muted }}>▶️</Text>
          ) : (
            <Pressable onPress={handleNextDay}>
              <Text style={{ fontSize: 20, color: palette.textPrimary }}>▶️</Text>
            </Pressable>
          )}
          {!atToday && (
            <Pressable onPress={() => setSelectedDate(new Date())} style={{ marginLeft: 8 }}>
              <Text style={{ fontSize: 20, color: palette.textPrimary }}>⏩</Text>
            </Pressable>
          )}
        </View>

        {/* Habits Section */}
        <View style={{ paddingHorizontal: 12, marginBottom: 24 }}>
          {habitsForDate.length === 0 && !atToday ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No habit tracking data for this date.</Text>
            </View>
          ) : (
            <FlatList
              data={habitData}
              keyExtractor={(item) => 'id' in item ? item.id : 'special'}
              numColumns={numColumns}
              scrollEnabled={false}
              renderItem={renderHabitItem}
            />
          )}
        </View>

        {/* Tasks Section */}
        <View style={{ paddingHorizontal: 20, gap: 16 }}>
          <View style={{ flexDirection: stackColumns ? 'column' : 'row', gap: 16 }}>
            <View
              ref={signalColumnRef}
              style={{ 
                flex: 1,
                opacity: hoveredColumn === 'signal' ? 0.8 : 1, 
                borderWidth: hoveredColumn === 'signal' ? 3 : 0, 
                borderColor: palette.signal, 
                borderRadius: 16, 
                padding: hoveredColumn === 'signal' ? 4 : 0,
                backgroundColor: hoveredColumn === 'signal' ? `${palette.signal}20` : 'transparent',
              }}
            >
              <TaskColumn
                title="Signal"
                accentColor={palette.signal}
                tasks={signalTasks.filter(t => t.id !== draggedTaskId)}
                emptyCopy="No signal tasks yet. Capture the most impactful thing you can do next."
                onTogglePriority={togglePriority}
                onToggleCompleted={toggleCompleted}
                onDelete={deleteTask}
                onDragStart={handleDragStart}
                onDragUpdate={handleDragUpdate}
                onDragEnd={handleDragEnd}
                onEmptyPress={() => {
                  if (!draggedTaskId) {
                    openTaskComposer('signal');
                  }
                }}
              />
            </View>
            <View
              ref={noiseColumnRef}
              style={{ 
                flex: 1,
                opacity: hoveredColumn === 'noise' ? 0.8 : 1, 
                borderWidth: hoveredColumn === 'noise' ? 3 : 0, 
                borderColor: palette.noise, 
                borderRadius: 16, 
                padding: hoveredColumn === 'noise' ? 4 : 0,
                backgroundColor: hoveredColumn === 'noise' ? `${palette.noise}20` : 'transparent',
              }}
            >
              <TaskColumn
                title="Noise"
                accentColor={palette.noise}
                tasks={noiseTasks.filter(t => t.id !== draggedTaskId)}
                emptyCopy="Noise tasks live here. Keep them around but stay focused on signal."
                onTogglePriority={togglePriority}
                onToggleCompleted={toggleCompleted}
                onDelete={deleteTask}
                onDragStart={handleDragStart}
                onDragUpdate={handleDragUpdate}
                onDragEnd={handleDragEnd}
                onEmptyPress={() => {
                  if (!draggedTaskId) {
                    openTaskComposer('noise');
                  }
                }}
              />
            </View>
          </View>
          
        </View>
      </ScrollView>

      {/* Dragged task overlay - outside ScrollView for proper positioning */}
      {draggedTaskId && dragPosition && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: dragPosition.x - 150,
            top: dragPosition.y - 50,
            zIndex: 1000,
            width: 300,
            elevation: 10,
          }}
        >
          {(() => {
            const draggedTask = [...signalTasks, ...noiseTasks].find(t => t.id === draggedTaskId);
            if (!draggedTask) return null;
            return (
              <View
                style={{
                  backgroundColor: palette.elevated,
                  borderRadius: 16,
                  padding: 16,
                  gap: 12,
                  borderWidth: 2,
                  borderColor: draggedTask.priority === 'signal' ? palette.signal : palette.noise,
                  ...shadows.soft,
                }}
              >
                <Text style={{ color: palette.textPrimary, fontSize: 16, fontWeight: '600' }}>
                  {draggedTask.title}
                </Text>
                {draggedTask.notes ? (
                  <Text style={{ color: palette.textSecondary, fontSize: 13, lineHeight: 18 }}>
                    {draggedTask.notes}
                  </Text>
                ) : null}
              </View>
            );
          })()}
        </View>
      )}

      {/* Modal Task Composer */}
      <Modal
        visible={showTaskComposer}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTaskComposer(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTaskComposer(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: palette.textPrimary, fontSize: 20, fontWeight: '700' }}>New Task</Text>
              <Pressable onPress={() => setShowTaskComposer(false)}>
                <Text style={{ color: palette.textSecondary, fontSize: 24 }}>×</Text>
              </Pressable>
            </View>
            <TaskComposer
              initialPriority={taskComposerPriority}
              onSubmit={async (data) => {
                await addTask(data);
                setShowTaskComposer(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Navigation FABs */}
      <Pressable style={styles.fabLeft} onPress={() => router.push('/manage-habits')}>
        <LinearGradient start={[0,0]} end={[1,1]} colors={[palette.gradientStart, palette.gradientEnd]} style={styles.fabGradient}>
          <Text style={{ fontSize: 27, color: '#fff' }}>✏️</Text>
        </LinearGradient>
      </Pressable>
      <Pressable style={styles.fabRight} onPress={() => router.push('/stats')}>
        <LinearGradient start={[0,0]} end={[1,1]} colors={[palette.gradientStart, palette.gradientEnd]} style={styles.fabGradient}>
          <Text style={{ fontSize: 27, color: '#fff' }}>📊</Text>
        </LinearGradient>
      </Pressable>
    </SafeAreaView>
    </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  dateNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 16,
    color: palette.textPrimary,
  },
  habitBox: {
    margin: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  emoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  label: {
    fontWeight: '600',
    color: palette.textPrimary,
    fontSize: 14,
  },
  addButtonSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: palette.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  fabLeft: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    borderRadius: 30,
    overflow: 'hidden',
    padding: 0,
  },
  fabRight: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    borderRadius: 30,
    overflow: 'hidden',
    padding: 0,
  },
  fabGradient: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
});
