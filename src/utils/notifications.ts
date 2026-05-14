import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Habit } from './storage';
import { loadHabitsFromFirestore, loadHistoryFromFirestore } from './firestore';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const TASKS_NOTIFICATION_ID = 'daily-tasks-3pm';
const HABITS_NOTIFICATION_ID = 'daily-habits-7pm';

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Scheduling/permissioning of local notifications is not supported on web
  // and can throw at runtime. Bail out gracefully so logging in on web works.
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Configure Android channel for notifications
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Check for uncompleted Signal tasks
 */
async function checkUncompletedSignalTasks(userId: string): Promise<number> {
  try {
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const q = query(
      tasksRef,
      where('completed', '==', false),
      where('priority', '==', 'signal')
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error checking signal tasks:', error);
    return 0;
  }
}

/**
 * Check for incomplete habits today
 */
async function checkIncompleteHabitsToday(userId: string): Promise<number> {
  try {
    const habits = await loadHabitsFromFirestore(userId);
    const history = await loadHistoryFromFirestore(userId);
    const today = new Date();
    const todayKey = format(today, 'yyyy-MM-dd');
    const weekday = format(today, 'EEE');

    const activeHabits = habits.filter((habit: Habit) => habit.isActive);
    let incompleteCount = 0;

    for (const habit of activeHabits) {
      // Check if habit is required today
      const isRequired = !habit.frequency || habit.frequency.includes(weekday);
      if (!isRequired) continue;

      // Check if habit is completed today
      const dayRecord = history[todayKey] || {};
      const habitRecord = dayRecord[habit.id];
      
      if (!habitRecord) {
        // No record means not completed
        incompleteCount++;
      } else {
        const taps = typeof habitRecord === 'number' 
          ? habitRecord 
          : habitRecord.taps || 0;
        if (taps < habit.tapsNeeded) {
          incompleteCount++;
        }
      }
    }

    return incompleteCount;
  } catch (error) {
    console.error('Error checking incomplete habits:', error);
    return 0;
  }
}

/**
 * Schedule daily notification for Signal tasks at 3pm
 */
export async function scheduleTasksNotification(userId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(TASKS_NOTIFICATION_ID);

    await Notifications.scheduleNotificationAsync({
      identifier: TASKS_NOTIFICATION_ID,
      content: {
        title: 'Signal Tasks Reminder',
        body: 'You have uncompleted Signal tasks',
        data: { type: 'tasks', userId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 15,
        minute: 0,
      },
    });
  } catch (error) {
    console.error('Error scheduling tasks notification:', error);
  }
}

/**
 * Schedule daily notification for habits at 7pm
 */
export async function scheduleHabitsNotification(userId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(HABITS_NOTIFICATION_ID);

    await Notifications.scheduleNotificationAsync({
      identifier: HABITS_NOTIFICATION_ID,
      content: {
        title: 'Habits Reminder',
        body: 'You have habits to complete today',
        data: { type: 'habits', userId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 19,
        minute: 0,
      },
    });
  } catch (error) {
    console.error('Error scheduling habits notification:', error);
  }
}

/**
 * Setup notification handlers that check data and update notifications
 */
export function setupNotificationHandlers(userId: string): () => void {
  if (Platform.OS === 'web') {
    return () => {};
  }

  const receivedSubscription = Notifications.addNotificationReceivedListener(
    async (notification) => {
      const { type } = notification.request.content.data as { type: string; userId: string };
      
      if (type === 'tasks') {
        const count = await checkUncompletedSignalTasks(userId);
        if (count === 0) {
          // Dismiss the notification if no tasks
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        } else {
          // Show a new notification with the actual count
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Signal Tasks Reminder',
              body: `You have ${count} uncompleted Signal task${count > 1 ? 's' : ''}`,
              data: { type: 'tasks', userId },
            },
            trigger: null, // Show immediately
          });
          // Dismiss the generic one
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        }
      } else if (type === 'habits') {
        const count = await checkIncompleteHabitsToday(userId);
        if (count === 0) {
          // Dismiss the notification if no incomplete habits
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        } else {
          // Show a new notification with the actual count
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Habits Reminder',
              body: `You have ${count} habit${count > 1 ? 's' : ''} to complete today`,
              data: { type: 'habits', userId },
            },
            trigger: null, // Show immediately
          });
          // Dismiss the generic one
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        }
      }
    }
  );

  // Return cleanup function
  return () => {
    receivedSubscription.remove();
  };
}

/**
 * Initialize all notifications for a user
 * Note: setupNotificationHandlers should be called separately to properly manage cleanup
 */
export async function initializeNotifications(userId: string): Promise<void> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.warn('Cannot initialize notifications: permissions not granted');
    return;
  }

  await scheduleTasksNotification(userId);
  await scheduleHabitsNotification(userId);
  // Note: setupNotificationHandlers is called separately in the component to manage cleanup properly
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(TASKS_NOTIFICATION_ID);
  } catch {
    // notification may not exist — safe to ignore
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(HABITS_NOTIFICATION_ID);
  } catch {
    // notification may not exist — safe to ignore
  }
}

