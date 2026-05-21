import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, View, FlatList, Pressable, Text, Dimensions } from "react-native";
import { Link, useRouter, useFocusEffect } from "expo-router";
import { Habit, loadHabits, upsertHabitTap } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isToday } from "date-fns";
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const numColumns = 2;
const HISTORY_KEY = 'habitHistory';

// Weekday names from helpers.ts
const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HomeScreen() {
    const router = useRouter();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const { width } = Dimensions.get("window");
    const size = width / numColumns - 24;

    // load habits taps for the selectedDate
    const loadForDate = useCallback(async () => {
      const habitsList = await loadHabits();
      const histStr = await AsyncStorage.getItem(HISTORY_KEY);
      const history = histStr ? JSON.parse(histStr) : {};
      const dateKey = selectedDate.toISOString().slice(0,10);
      const dayRecord: Record<string, any> = history[dateKey] || {};
      if (isToday(selectedDate)) {
        // today: show active scheduled habits
        setHabits(habitsList
          .filter(h => h.isActive)
          .map(h => {
            const rec = dayRecord[h.id];
            const taps = typeof rec === 'number' ? rec : rec?.taps ?? 0;
            return { ...h, tapsToday: taps };
          }));
      } else {
        // past: only show from history
        const ids = Object.keys(dayRecord);
        setHabits(ids
          .map(id => {
            const h = habitsList.find(x => x.id === id);
            if (!h) return null;
            const rec = dayRecord[id];
            const taps = typeof rec === 'number' ? rec : rec?.taps ?? 0;
            return { ...h, tapsToday: taps };
          })
          .filter(Boolean) as Habit[]
        );
      }
    }, [selectedDate]);

    // initial load on date change
    useEffect(() => { loadForDate(); }, [loadForDate]);
    // refresh when focusing, only for today
    useFocusEffect(
      useCallback(() => {
        if (isToday(selectedDate)) loadForDate();
      }, [loadForDate, selectedDate])
    );

    // Weekday for filtering
    const todayName = WEEKDAY_NAMES[selectedDate.getDay()]

    // Date navigation
    function handlePrevDay() {
        setSelectedDate(d => {
            const next = new Date(d)
            next.setDate(d.getDate() - 1)
            return next
        })
    }

    function handleNextDay() {
        setSelectedDate(d => {
            const next = new Date(d)
            next.setDate(d.getDate() + 1)
            return next
        })
    }

    async function handleTap(habitId: string) {
        const updated = await upsertHabitTap(habitId, selectedDate);
        const tappedHabit = updated.find(h => h.id === habitId);
        console.log('Habit tapped:', tappedHabit?.name, 'Progress:', tappedHabit?.tapsToday, '/', tappedHabit?.tapsNeeded);
        setHabits(updated);
    }

    // Check if a habit is scheduled for today based on frequency
    const isScheduledForToday = (h: Habit) =>
        !h.frequency?.length || h.frequency.includes(todayName)

    // Special items
    const addHabitItem = { id: 'add-habit', isAddButton: true, order: 10 };
    const todosItem = { id: 'todos-item', isTodosButton: true, order: 11 };

    type HabitListItem = Habit | typeof addHabitItem | typeof todosItem;

    // Render function for items in the FlatList
    const renderItem = ({ item }: { item: HabitListItem }) => {
        // Special rendering for the "Add Habit" button
        const isAdd = 'isAddButton' in item;
        if (item.id === 'add-habit' && isToday(selectedDate)) {
            return (
                <Pressable style={[styles.box, { width: size, height: size }]} onPress={() => router.push('/manage-habits')}>
                    <Svg width={size} height={size} style={styles.addButtonSvg}>
                        <Defs>
                            <SvgGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
                                <Stop offset="0" stopColor="#E73879" />
                                <Stop offset="1" stopColor="#FCC737" />
                            </SvgGradient>
                        </Defs>
                        {/* Border rectangle */}
                        <Rect
                            x="2"
                            y="2"
                            width={size - 4}
                            height={size - 4}
                            rx="10"
                            ry="10"
                            stroke="url(#gradient)"
                            strokeWidth="2"
                            fill="transparent"
                        />
                        {/* Plus sign as a single path */}
                        <Path
                            d={`
                                M ${size * 0.3},${size * 0.47} 
                                h ${size * 0.4} 
                                a 3,3 0 0 1 0,${size * 0.06} 
                                h -${size * 0.17}
                                v ${size * 0.17}
                                a 3,3 0 0 1 -${size * 0.06},0 
                                v -${size * 0.17}
                                h -${size * 0.17}
                                a 3,3 0 0 1 0,-${size * 0.06} 
                                h ${size * 0.17}
                                v -${size * 0.17}
                                a 3,3 0 0 1 ${size * 0.06},0 
                                v ${size * 0.17}
                            `}
                            fill="url(#gradient)"
                        />
                    </Svg>
                </Pressable>
            );
        } else if (item.id === 'todos-item' && isToday(selectedDate)) {
            return (
                <Pressable style={[styles.box, { width: size, height: size }]} onPress={() => router.push('/home')}>
                    <Svg width={size} height={size} style={styles.addButtonSvg}>
                        <Defs>
                            <SvgGradient id="gradientTodo" x1="0" y1="0" x2="1" y2="1">
                                <Stop offset="0" stopColor="#4CAF50" />
                                <Stop offset="1" stopColor="#81C784" />
                            </SvgGradient>
                        </Defs>
                        {/* Border rectangle */}
                        <Rect
                            x="2"
                            y="2"
                            width={size - 4}
                            height={size - 4}
                            rx="10"
                            ry="10"
                            stroke="url(#gradientTodo)"
                            strokeWidth="2"
                            fill="transparent"
                        />
                    </Svg>
                    <Text style={[styles.emoji, { position: 'absolute', color: '#4CAF50' }]}>✅</Text>
                </Pressable>
            );
        } else if (isAdd || 'isTodosButton' in item) {
            // Special items (add/todos buttons) only render when atToday is
            // true — guard above. Anything else here is a no-op so we never
            // attempt to read habit fields off the special items.
            return null;
        }

        // Normal habit rendering
        const habit = item as Habit;
        const ratio = habit.tapsToday / habit.tapsNeeded;
        const filledHeight = size * ratio;
        return (
            <Pressable
                style={[styles.box, { width: size, height: size, borderColor: habit.color, borderWidth: 2 }]}
                onPress={() => handleTap(habit.id)}
            >
                <View style={[styles.fill, { height: filledHeight, backgroundColor: habit.color }]} />
                <Text style={styles.emoji}>{habit.emoji}</Text>
                <Text style={styles.label}>{habit.name}</Text>
            </Pressable>
        );

    };

    const atToday = isToday(selectedDate);
    /* ---------- render ---------- */
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* DATE NAVIGATION */}
            <View style={styles.dateNavContainer}>
                <Pressable onPress={handlePrevDay}>
                    <Text style={{ fontSize: 20, color: '#fff' }}>◀️</Text>
                </Pressable>
                <Text style={styles.todayHeader}>
                    {format(selectedDate, "EEE, MMM d")}
                </Text>
                {atToday ? (
                  <Text style={{ fontSize: 20, color: '#666' }}>▶️</Text>
                ) : (
                  <Pressable onPress={handleNextDay}>
                    <Text style={{ fontSize: 20, color: '#fff' }}>▶️</Text>
                  </Pressable>
                )}
                {!atToday && (
                  <Pressable onPress={() => setSelectedDate(new Date())} style={{ marginLeft: 8 }}>
                    <Text style={{ fontSize: 20, color: '#fff' }}>⏩</Text>
                  </Pressable>
                )}
            </View>
            { !isToday(selectedDate) && habits.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>There is no habit tracking data for this date.</Text>
                </View>
            ) : (
            <FlatList<HabitListItem>
                data={
                  isToday(selectedDate)
                    ? [...habits.filter(h => isScheduledForToday(h)), addHabitItem, todosItem]
                    : habits
                }
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                nestedScrollEnabled
                contentContainerStyle={{ paddingHorizontal: 12 }}
                renderItem={renderItem}
                getItemLayout={(_, index) => ({ length: size + 16, offset: (size + 16) * index, index })}
            />
            )}

             {/* APP NAVIGATION SHORTCUTS */}
             <Link style={styles.fabLeft} href="/manage-habits">
                <LinearGradient start={[0,0]} end={[1,1]} colors={["#E73879","#FCC737"]} style={styles.fabGradient}>
                    <Text style={{ fontSize: 27, color: '#fff' }}>✏️</Text>
                </LinearGradient>
            </Link>
            <Link style={styles.fabRight} href="/radial">
                <LinearGradient start={[0,0]} end={[1,1]} colors={["#E73879","#FCC737"]} style={styles.fabGradient}>
                    <Text style={{ fontSize: 27, color: '#fff' }}>📊</Text>
                </LinearGradient>
            </Link>
            <Link style={styles.fabTop} href="/(auth)">
                <LinearGradient start={[0,0]} end={[1,1]} colors={["#E73879","#FCC737"]} style={styles.fabGradient}>
                    <Text style={{ fontSize: 27, color: '#fff' }}>👤</Text>
                </LinearGradient>
            </Link>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        paddingTop: 12,
        backgroundColor: "#222" // Dark background for dark theme
    },
    dateNavContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    todayHeader: {
        fontSize: 18, 
        fontWeight: "bold", 
        textAlign: "center", 
        marginBottom: 10,
        color: "#fff" // White text for dark theme
    },
    box: {
        // width/height set dynamically per item
        margin: 8,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    fill: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
    },
    emoji: { fontSize: 36, marginBottom: 6 },
    label: { fontWeight: "600", color: "#fff", fontSize: 14 },
    addButtonSvg: {
        position: "absolute",
        top: 0,
        left: 0,
    },
    fabLeft: {
        position: "absolute",
        bottom: 30,
        left: 30,
        borderRadius: 30,
        overflow: 'hidden',
        padding: 0,
    },
    fabRight: {
        position: "absolute",
        bottom: 30,
        right: 30,
        borderRadius: 30,
        overflow: 'hidden',
        padding: 0,
    },
    fabTop: {
        position: "absolute",
        bottom: 100,
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
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 50,
    },
    emptyText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
 });
