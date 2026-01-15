import {StyleSheet, ActivityIndicator, ScrollView, Text, View, SafeAreaView, Button, Switch, Pressable} from 'react-native';
import {useRouter} from "expo-router";
import {useEffect, useState} from "react";
import {addMonths, format, subMonths, isSameMonth} from "date-fns";
import { getMonthDetails } from '@/utils/helpers';
import * as storage from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from '@/utils/auth';
import { loadHistoryFromFirestore, saveHistoryToFirestore } from '@/utils/firestore';
import { Habit } from '@/utils/storage';
import HabitVinyl from '@/components/HabitVinyl';
import BackButton from '@/components/BackButton';

// hide header on this screen
export const unstable_settings = { headerShown: false };

export default function Radial() {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [habits, setHabits] = useState<Habit[]>([]);
    const [allData, setAllData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [useHabitColorForDone, setUseHabitColorForDone] = useState(false);
    const [todoCount, setTodoCount] = useState(0);

    const { monthKey, daysInMonth } = getMonthDetails(currentDate);

    /* ------------  load data and combine history when month changes  ------------ */
    useEffect(() => {
        (async () => {
            setLoading(true);
            const storedHabits = await storage.loadHabits();
            const allDataMap = await storage.loadAllHabitData();
            // consolidate past null statuses for this month
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
                // persist updated history to new date-keyed structure
                const HISTORY_KEY = 'habitHistory';
                const userId = getCurrentUserId();
                // load existing history
                let history: Record<string, Record<string, any>> = {};
                if (userId) {
                    history = await loadHistoryFromFirestore(userId);
                } else {
                    const histStr = await AsyncStorage.getItem(HISTORY_KEY);
                    history = histStr ? JSON.parse(histStr) : {};
                }
                // apply modifications for this month
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
                // save updated history
                if (userId) {
                    await saveHistoryToFirestore(userId, history);
                }
                await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
            }

            setAllData(allDataMap);
            // grab history for this month
            const monthHistory = allDataMap[monthKey] || {};
            // combine habit metadata: include all stored and any in history
            const historyIds = Object.keys(monthHistory);
            const map = Object.fromEntries(storedHabits.map(h => [h.id, h]));
            const combined: Habit[] = historyIds.map(id => map[id] || { id, name: id, color: '#888' });
            setHabits(combined);
            setLoading(false);
        })();
    }, [monthKey, currentDate]);

    /* ------------  count completed todos for the month  ------------ */
    useEffect(() => {
        (async () => {
            const lists = await storage.loadTodos();
            const count = lists.completed.filter(item => item.completedDate?.startsWith(monthKey)).length;
            setTodoCount(count);
        })();
    }, [monthKey]);

    /* ------------  month navigation  ------------ */
    const changeMonth = (offset: number) =>
        setCurrentDate(d => (offset > 0 ? addMonths(d, offset) : subMonths(d, -offset)));

    const atCurrentMonth = isSameMonth(currentDate, new Date());

    /* ------------  render  ------------ */
    if (loading) {
        return <ActivityIndicator size="large" style={styles.centered} />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.container}>
                <View style={styles.monthBar}>
                    <Button title="‹ Prev" onPress={() => changeMonth(-1)} />
                    <Text style={styles.monthLabel}>{format(currentDate, 'MMMM-yyyy')}</Text>
                    <Button title="Next ›" onPress={() => changeMonth(1)} disabled={atCurrentMonth} />
                    <Pressable onPress={() => router.push('/home')} style={{ marginLeft: 16 }}>
                        <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>✅ {todoCount}</Text>
                    </Pressable>
                </View>

                {habits.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            There is no habit tracking data for this month.
                        </Text>
                    </View>
                ) : (
                    <>
                        <HabitVinyl
                            habits={habits}
                            monthData={allData[monthKey] ?? {}}
                            daysInMonth={daysInMonth}
                            date={currentDate}
                            showHabitColorOnDone={useHabitColorForDone}
                        />
                        <View style={styles.switchContainer}>
                            <Text style={styles.switchText}>Use habit color for done</Text>
                            <Switch
                                value={useHabitColorForDone}
                                onValueChange={setUseHabitColorForDone}
                            />
                        </View>
                    </>
                )}

            </ScrollView>
            <BackButton style={styles.fabLeft} />
        </SafeAreaView>
    );
};

/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    monthBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#555',
    },
    monthLabel: { fontSize: 18, fontWeight: 'bold', color: 'white' },

    fabLeft: {
        position: 'absolute', bottom: 30, left: 30, borderRadius: 30, overflow: 'hidden', padding: 0,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    switchText: {
        color: 'white',
        marginRight: 8,
    },
});
