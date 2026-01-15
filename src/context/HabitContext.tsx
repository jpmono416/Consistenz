import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { Habit } from '@/utils/storage';
import { loadHistoryFromFirestore } from '@/utils/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'habitHistory';

interface HabitContextValue {
  habits: Habit[];
  habitHistory: Record<string, Record<string, any>>;
  loading: boolean;
  ready: boolean;
  refreshHistory: () => Promise<void>;
}

const HabitContext = createContext<HabitContextValue | undefined>(undefined);

export const HabitProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitHistory, setHabitHistory] = useState<Record<string, Record<string, any>>>({});
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Load habits from Firestore with real-time sync
  useEffect(() => {
    if (!user) {
      setHabits([]);
      setHabitHistory({});
      setReady(false);
      return;
    }

    setLoading(true);
    const habitsDocRef = doc(db, 'users', user.uid, 'habits', 'data');

    const unsub = onSnapshot(
      habitsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setHabits(data.habits || []);
        } else {
          setHabits([]);
        }
        setLoading(false);
        setReady(true);
      },
      (error) => {
        console.error('Habit listener error', error);
        setLoading(false);
        setReady(true); // Mark as ready even on error so components don't wait forever
      }
    );

    return () => unsub();
  }, [user]);

  // Load habit history with real-time sync
  useEffect(() => {
    if (!user) {
      setHabitHistory({});
      return;
    }

    const historyDocRef = doc(db, 'users', user.uid, 'habitHistory', 'data');

    const unsub = onSnapshot(
      historyDocRef,
      async (snapshot) => {
        try {
          if (snapshot.exists()) {
            // Use loadHistoryFromFirestore to properly convert monthly format to daily format
            // and convert habit names to IDs
            const history = await loadHistoryFromFirestore(user.uid);
            setHabitHistory(history);
            // Also sync to AsyncStorage as backup
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
          } else {
            setHabitHistory({});
          }
        } catch (error) {
          console.error('Error processing habit history snapshot:', error);
          // Fallback to AsyncStorage on processing error
          const histStr = await AsyncStorage.getItem(HISTORY_KEY);
          if (histStr) {
            setHabitHistory(JSON.parse(histStr));
          }
        }
      },
      async (error) => {
        console.error('Habit history listener error', error);
        // Fallback to AsyncStorage
        const histStr = await AsyncStorage.getItem(HISTORY_KEY);
        if (histStr) {
          setHabitHistory(JSON.parse(histStr));
        }
      }
    );

    return () => unsub();
  }, [user]);

  // Manual refresh function for when history is updated outside of Firestore listener
  const refreshHistory = useCallback(async () => {
    if (!user) {
      setHabitHistory({});
      return;
    }

    try {
      const history = await loadHistoryFromFirestore(user.uid);
      setHabitHistory(history);
      // Also sync to AsyncStorage as backup
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error loading habit history:', error);
      // Fallback to AsyncStorage
      const histStr = await AsyncStorage.getItem(HISTORY_KEY);
      if (histStr) {
        setHabitHistory(JSON.parse(histStr));
      }
    }
  }, [user]);

  const value = useMemo(
    () => ({
      habits,
      habitHistory,
      loading,
      ready,
      refreshHistory,
    }),
    [habits, habitHistory, loading, ready, refreshHistory]
  );

  return <HabitContext.Provider value={value}>{children}</HabitContext.Provider>;
};

export const useHabits = () => {
  const ctx = useContext(HabitContext);
  if (!ctx) {
    throw new Error('useHabits must be used within HabitProvider');
  }
  return ctx;
};

