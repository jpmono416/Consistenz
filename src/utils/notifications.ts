import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Habit } from './storage';
import { loadHabitsFromFirestore, loadHistoryFromFirestore } from './firestore';

/** Local notifications are unavailable in Expo Go (SDK 53+) and on web. */
export const notificationsSupported = Platform.OS !== 'web' && !isRunningInExpoGo();

const TASKS_NOTIFICATION_ID = 'daily-tasks-3pm';
const HABITS_NOTIFICATION_ID = 'daily-habits-7pm';

type NotificationsModule = typeof import('expo-notifications');

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (!notificationsSupported) return null;
  return import('expo-notifications');
}

async function configureNotificationHandler(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!notificationsSupported) {
    return false;
  }

  try {
    const Notifications = await loadNotifications();
    if (!Notifications) return false;

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
      const isRequired = !habit.frequency || habit.frequency.includes(weekday);
      if (!isRequired) continue;

      const dayRecord = history[todayKey] || {};
      const habitRecord = dayRecord[habit.id];

      if (!habitRecord) {
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
  const Notifications = await loadNotifications();
  if (!Notifications) return;

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
  const Notifications = await loadNotifications();
  if (!Notifications) return;

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
  if (!notificationsSupported) {
    return () => {};
  }

  let subscription: { remove: () => void } | null = null;

  void loadNotifications().then((Notifications) => {
    if (!Notifications) return;

    subscription = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const { type } = notification.request.content.data as { type: string; userId: string };

        if (type === 'tasks') {
          const count = await checkUncompletedSignalTasks(userId);
          if (count === 0) {
            await Notifications.dismissNotificationAsync(notification.request.identifier);
          } else {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Signal Tasks Reminder',
                body: `You have ${count} uncompleted Signal task${count > 1 ? 's' : ''}`,
                data: { type: 'tasks', userId },
              },
              trigger: null,
            });
            await Notifications.dismissNotificationAsync(notification.request.identifier);
          }
        } else if (type === 'habits') {
          const count = await checkIncompleteHabitsToday(userId);
          if (count === 0) {
            await Notifications.dismissNotificationAsync(notification.request.identifier);
          } else {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Habits Reminder',
                body: `You have ${count} habit${count > 1 ? 's' : ''} to complete today`,
                data: { type: 'habits', userId },
              },
              trigger: null,
            });
            await Notifications.dismissNotificationAsync(notification.request.identifier);
          }
        }
      }
    );
  });

  return () => {
    subscription?.remove();
  };
}

/**
 * Initialize all notifications for a user
 */
export async function initializeNotifications(userId: string): Promise<void> {
  if (!notificationsSupported) {
    return;
  }

  await configureNotificationHandler();

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.warn('Cannot initialize notifications: permissions not granted');
    return;
  }

  await scheduleTasksNotification(userId);
  await scheduleHabitsNotification(userId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

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
