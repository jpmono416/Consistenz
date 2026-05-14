import AsyncStorage from "@react-native-async-storage/async-storage";
import { Status } from './helpers';
import { format } from 'date-fns';
import { getCurrentUserId } from './auth';
import { 
  saveHabitsToFirestore, 
  loadHabitsFromFirestore,
  saveHistoryToFirestore,
  loadHistoryFromFirestore,
  loadTodosFromFirestore,
  saveTodosToFirestore,
  deleteTodosFromFirestore
} from './firestore';

export interface Habit {
    id: string;
    name: string;
    emoji: string;
    color: string;
    tapsNeeded: number;
    tapsToday: number; // reset daily
    isActive: boolean;
    /** Days of week abbreviation e.g. "Mon" */
    frequency?: string[];
    /** Order for manual sorting */
    order?: number;
}
export type HabitMonthRecord = Record<number, Status>;          // day → status
export type MonthData = Record<string, HabitMonthRecord>;       // habitId →
export type AllHabitData = Record<string, MonthData>;           // YYYY-MM →

// const HABIT_DATA_KEY = 'habitData'; // removed unused
const HABITS_KEY = "habits";
const HISTORY_KEY = "habitHistory"; // { '2025-06': { habitId: tapsRecorded } }

export async function loadHabits(): Promise<Habit[]> {
    const userId = getCurrentUserId();

    // If user is logged in, load from Firestore
    if (userId) {
        return await loadHabitsFromFirestore(userId);
    }

    // Otherwise, load from AsyncStorage
    const str = await AsyncStorage.getItem(HABITS_KEY);
    return str ? JSON.parse(str) : [];
}

export async function saveHabits(list: Habit[]) {
    const userId = getCurrentUserId();

    // If user is logged in, save to Firestore
    if (userId) {
        await saveHabitsToFirestore(userId, list);
    }

    // Always save to AsyncStorage as a backup
    await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(list));
}

export async function upsertHabitTap(id: string, date: Date) {
    const habits = await loadHabits();
    const todayKey = date.toISOString().slice(0, 10);
    const userId = getCurrentUserId();

    // load history and compute new tap count for this habit
    let history: Record<string, Record<string, any>>;

    if (userId) {
        // If user is logged in, load from Firestore
        history = await loadHistoryFromFirestore(userId);
    } else {
        // Otherwise, load from AsyncStorage
        const histStr = await AsyncStorage.getItem(HISTORY_KEY);
        history = histStr ? JSON.parse(histStr) : {};
    }

    const dayRecord = history[todayKey] || {};

    // Initialize habit record if it doesn't exist
    if (!dayRecord[id]) {
        dayRecord[id] = { taps: 0 };
    }

    // Get previous tap count
    const prevCount = typeof dayRecord[id] === 'number' ? dayRecord[id] : dayRecord[id].taps || 0;

    const habitMeta = habits.find(h => h.id === id);
    if (!habitMeta) return habits;

    let newCount = prevCount + 1;
    if (newCount > habitMeta.tapsNeeded) newCount = 0;

    // Update tap count in the new structure
    if (typeof dayRecord[id] === 'number') {
        // Convert old format to new format
        dayRecord[id] = { taps: newCount };
    } else {
        dayRecord[id].taps = newCount;
    }

    history[todayKey] = dayRecord;

    // Determine status based on newCount and whether today is required
    const weekday = format(date, 'EEE');
    const isRequired = !habitMeta.frequency || habitMeta.frequency.includes(weekday);
    let status: Status = null;
    if (!isRequired) {
        // any taps on non-required days count as extra
        status = newCount > 0 ? 'extra' : 'notNeeded';
    } else {
        if (newCount === 0) status = 'missed';
        else if (newCount < habitMeta.tapsNeeded) status = 'partial';
        else status = 'done';
    }

    // Store status directly in the history
    dayRecord[id].status = status;

    // Save history
    if (userId) {
        // If user is logged in, save to Firestore
        await saveHistoryToFirestore(userId, history);
    }
    // Always save to AsyncStorage as a backup
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    // sync tapsToday for all habits from history
    const updated = habits.map(h => {
        const habitRecord = dayRecord[h.id];
        const taps = habitRecord ? (typeof habitRecord === 'number' ? habitRecord : habitRecord.taps || 0) : 0;
        return {
            ...h,
            tapsToday: taps,
        };
    });
    await saveHabits(updated);
    return updated;
}

export const loadAllHabitData = async (): Promise<AllHabitData> => {
    // Note for future, defaultHabitData is set as {} for rtn
    try {
        const userId = getCurrentUserId();
        let history: Record<string, Record<string, any>> = {};

        // Load history data
        if (userId) {
            // If user is logged in, load from Firestore
            history = await loadHistoryFromFirestore(userId);
        } else {
            // Otherwise, load from AsyncStorage
            const histStr = await AsyncStorage.getItem(HISTORY_KEY);
            history = histStr ? JSON.parse(histStr) : {};
        }

        // Convert history data to habitData format
        const habitData: AllHabitData = {};

        for (const dateKey of Object.keys(history)) {
            const monthKey = dateKey.substring(0, 7); // YYYY-MM
            const dayNum = parseInt(dateKey.substring(8, 10)); // DD

            if (!habitData[monthKey]) {
                habitData[monthKey] = {};
            }

            for (const habitId of Object.keys(history[dateKey])) {
                if (!habitData[monthKey][habitId]) {
                    habitData[monthKey][habitId] = {};
                }

                const habitRecord = history[dateKey][habitId];
                const status = typeof habitRecord === 'object' ? habitRecord.status : null;

                habitData[monthKey][habitId][dayNum] = status;
            }
        }

        return habitData;
    } catch (err) {
        console.error('Failed to load habit data:', err);
        return {};
    }
};

/** Update (or create) a single day's status and persist the change */
export const updateHabitStatus = async (
    monthKey: string,      // "YYYY‑MM"
    habitId: string,
    day: number,           // 1‑based
    status: Status,
): Promise<AllHabitData | null> => {
    try {
        const userId = getCurrentUserId();
        const dayStr = day.toString().padStart(2, '0');
        const dateKey = `${monthKey}-${dayStr}`;

        // Load history data
        let history: Record<string, Record<string, any>> = {};

        if (userId) {
            // If user is logged in, load from Firestore
            history = await loadHistoryFromFirestore(userId);
        } else {
            // Otherwise, load from AsyncStorage
            const histStr = await AsyncStorage.getItem(HISTORY_KEY);
            history = histStr ? JSON.parse(histStr) : {};
        }

        // Initialize date record if it doesn't exist
        if (!history[dateKey]) {
            history[dateKey] = {};
        }

        // Initialize habit record if it doesn't exist
        if (!history[dateKey][habitId]) {
            history[dateKey][habitId] = { taps: 0 };
        } else if (typeof history[dateKey][habitId] === 'number') {
            // Convert old format to new format
            history[dateKey][habitId] = { taps: history[dateKey][habitId] };
        }

        // Update status
        history[dateKey][habitId].status = status;

        // Save history
        if (userId) {
            // If user is logged in, save to Firestore
            await saveHistoryToFirestore(userId, history);
        }
        // Always save to AsyncStorage as a backup
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));

        // Convert history data to habitData format for backward compatibility
        return await loadAllHabitData();
    } catch (err) {
        console.error('Failed to update habit status:', err);
        return null;
    }
};

// ToDo related types and storage
const TODOS_KEY = "todos";

export interface Todo {
    id: string;
    name: string;
    deadline?: string;        // ISO date string
    completedDate?: string;   // ISO date string when completed
}

export interface TodoLists {
    pending: Todo[];
    completed: Todo[];
}

/** Load todos from storage (Firestore if logged-in, otherwise AsyncStorage) */
export async function loadTodos(): Promise<TodoLists> {
    const userId = getCurrentUserId();
    let dataStr: string | null;
    if (userId) {
        const todos = await loadTodosFromFirestore(userId);
        return todos;
    } else {
        dataStr = await AsyncStorage.getItem(TODOS_KEY);
        return dataStr ? JSON.parse(dataStr) : { pending: [], completed: [] };
    }
}

/** Save todos to storage (Firestore if logged-in, otherwise AsyncStorage) */
export async function saveTodos(lists: TodoLists): Promise<void> {
    const userId = getCurrentUserId();
    if (userId) {
        await saveTodosToFirestore(userId, lists);
    }
    await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(lists));
}

/** Clear all todos */
export async function clearTodos(): Promise<void> {
    const userId = getCurrentUserId();
    if (userId) {
        await deleteTodosFromFirestore(userId);
    }
    await AsyncStorage.removeItem(TODOS_KEY);
}

/** Add a new todo to pending list */
export async function addTodo(item: Todo): Promise<TodoLists> {
    const lists = await loadTodos();
    lists.pending.push(item);
    await saveTodos(lists);
    return lists;
}

/** Mark a pending todo as completed */
export async function completeTodo(id: string): Promise<TodoLists> {
    const lists = await loadTodos();
    const index = lists.pending.findIndex(t => t.id === id);
    if (index !== -1) {
        const [todo] = lists.pending.splice(index, 1);
        todo.completedDate = new Date().toISOString();
        lists.completed.unshift(todo);
        await saveTodos(lists);
    }
    return lists;
}

