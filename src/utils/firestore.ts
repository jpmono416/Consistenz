import { db } from '@/lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc
} from "firebase/firestore";
import { Habit } from "./storage";
import { Status } from "./helpers";

// Collection names - using users/{userId}/habits pattern to match tasks
const HISTORY_COLLECTION = "habitHistory";
const TODOS_COLLECTION = "todos";

/**
 * Save habits to Firestore for a specific user
 * @param userId User ID
 * @param habits List of habits
 */
export const saveHabitsToFirestore = async (userId: string, habits: Habit[]): Promise<void> => {
  try {
    const userHabitsDoc = doc(db, 'users', userId, 'habits', 'data');
    await setDoc(userHabitsDoc, { habits });
  } catch (error) {
    console.error("Error saving habits to Firestore:", error);
    throw error;
  }
};

/**
 * Load habits from Firestore for a specific user
 * @param userId User ID
 * @returns List of habits
 */
export const loadHabitsFromFirestore = async (userId: string): Promise<Habit[]> => {
  try {
    const userHabitsDoc = doc(db, 'users', userId, 'habits', 'data');
    const docSnap = await getDoc(userHabitsDoc);

    if (docSnap.exists()) {
      return docSnap.data().habits || [];
    }

    return [];
  } catch (error) {
    console.error("Error loading habits from Firestore:", error);
    return [];
  }
};

/**
 * Update habit status in Firestore for a specific user
 * @param userId User ID
 * @param monthKey Month key (YYYY-MM)
 * @param habitId Habit ID
 * @param day Day of month
 * @param status Status
 */
export const updateHabitStatusInFirestore = async (
  userId: string,
  monthKey: string,
  habitId: string,
  day: number,
  status: Status
): Promise<Record<string, Record<string, any>> | null> => {
  try {
    // Load the current history
    const history = await loadHistoryFromFirestore(userId);

    // Find the habit name for this ID
    const habits = await loadHabitsFromFirestore(userId);
    const habit = habits.find(h => h.id === habitId);

    if (!habit) {
      console.error(`Habit with ID ${habitId} not found`);
      return null;
    }

    // Format the date key (YYYY-MM-DD)
    const dayStr = day.toString().padStart(2, '0');
    const dateKey = `${monthKey}-${dayStr}`;

    // Initialize the date record if it doesn't exist
    if (!history[dateKey]) {
      history[dateKey] = {};
    }

    // Initialize the habit record if it doesn't exist
    if (!history[dateKey][habitId]) {
      history[dateKey][habitId] = { taps: 0 };
    }

    // Update the status
    history[dateKey][habitId].status = status;

    // Save the updated history
    await saveHistoryToFirestore(userId, history);

    return history;
  } catch (error) {
    console.error("Error updating habit status in Firestore:", error);
    return null;
  }
};

/**
 * Save habit history to Firestore for a specific user
 * @param userId User ID
 * @param history Habit history
 */
export const saveHistoryToFirestore = async (
  userId: string, 
  history: Record<string, Record<string, any>>
): Promise<void> => {
  try {
    // First, load habits to get the mapping between IDs and names
    const habits = await loadHabitsFromFirestore(userId);

    // Convert the history data to use habit names instead of IDs
    const nameBasedHistory: Record<string, Record<string, any>> = {};

    for (const dateKey of Object.keys(history)) {
      nameBasedHistory[dateKey] = {};

      for (const habitId of Object.keys(history[dateKey])) {
        // Find the habit name for this ID
        const habit = habits.find(h => h.id === habitId);
        if (habit) {
          // Use the habit name as the key
          nameBasedHistory[dateKey][habit.name] = history[dateKey][habitId];
        } else {
          // If we can't find the habit, keep using the ID
          nameBasedHistory[dateKey][habitId] = history[dateKey][habitId];
        }
      }
    }

    // Group by month for easier querying
    const monthlyHistory: Record<string, Record<string, Record<string, any>>> = {};

    for (const dateKey of Object.keys(nameBasedHistory)) {
      const monthKey = dateKey.substring(0, 7); // YYYY-MM
      const dayKey = dateKey.substring(8, 10); // DD

      if (!monthlyHistory[monthKey]) {
        monthlyHistory[monthKey] = {};
      }

      monthlyHistory[monthKey][dayKey] = nameBasedHistory[dateKey];
    }

    const userHistoryDoc = doc(db, 'users', userId, 'habitHistory', 'data');
    await setDoc(userHistoryDoc, { history: monthlyHistory });
  } catch (error) {
    console.error("Error saving history to Firestore:", error);
    throw error;
  }
};

/**
 * Load habit history from Firestore for a specific user
 * @param userId User ID
 * @returns Habit history
 */
export const loadHistoryFromFirestore = async (
  userId: string
): Promise<Record<string, Record<string, any>>> => {
  try {
    const userHistoryDoc = doc(db, 'users', userId, 'habitHistory', 'data');
    const docSnap = await getDoc(userHistoryDoc);

    if (docSnap.exists()) {
      const monthlyHistory = docSnap.data().history || {};

      // Convert monthly history back to daily history
      const nameBasedHistory: Record<string, Record<string, any>> = {};

      for (const monthKey of Object.keys(monthlyHistory)) {
        for (const dayKey of Object.keys(monthlyHistory[monthKey])) {
          const dateKey = `${monthKey}-${dayKey}`;
          nameBasedHistory[dateKey] = monthlyHistory[monthKey][dayKey];
        }
      }

      // Load habits to get the mapping between names and IDs
      const habits = await loadHabitsFromFirestore(userId);

      // Convert the history data to use habit IDs instead of names
      const idBasedHistory: Record<string, Record<string, any>> = {};

      for (const dateKey of Object.keys(nameBasedHistory)) {
        idBasedHistory[dateKey] = {};

        for (const habitName of Object.keys(nameBasedHistory[dateKey])) {
          // Find the habit ID for this name
          const habit = habits.find(h => h.name === habitName);
          if (habit) {
            // Use the habit ID as the key
            idBasedHistory[dateKey][habit.id] = nameBasedHistory[dateKey][habitName];
          } else {
            // If we can't find the habit, keep using the name
            idBasedHistory[dateKey][habitName] = nameBasedHistory[dateKey][habitName];
          }
        }
      }

      return idBasedHistory;
    }

    return {};
  } catch (error) {
    console.error("Error loading history from Firestore:", error);
    return {};
  }
};

/** Save todos to Firestore for a specific user */
export const saveTodosToFirestore = async (userId: string, lists: import("./storage").TodoLists): Promise<void> => {
  try {
    const userTodosDoc = doc(db, 'users', userId, 'todos', 'data');
    await setDoc(userTodosDoc, { todos: lists });
  } catch (error) {
    console.error("Error saving todos to Firestore:", error);
    throw error;
  }
};

/** Load todos from Firestore for a specific user */
export const loadTodosFromFirestore = async (userId: string): Promise<import("./storage").TodoLists> => {
  try {
    const userTodosDoc = doc(db, 'users', userId, 'todos', 'data');
    const docSnap = await getDoc(userTodosDoc);
    if (docSnap.exists()) {
      return docSnap.data().todos || { pending: [], completed: [] };
    }
    return { pending: [], completed: [] };
  } catch (error) {
    console.error("Error loading todos from Firestore:", error);
    return { pending: [], completed: [] };
  }
};

/** Delete todos from Firestore for a specific user */
export const deleteTodosFromFirestore = async (userId: string): Promise<void> => {
  try {
    const userTodosDoc = doc(db, 'users', userId, 'todos', 'data');
    await deleteDoc(userTodosDoc);
  } catch (error) {
    console.error("Error deleting todos from Firestore:", error);
    throw error;
  }
};

