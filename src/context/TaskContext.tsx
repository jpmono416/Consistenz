import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { db } from '@/lib/firebase';
import { Priority, Task, TaskInput } from '@/types/task';
import { useAuth } from './AuthContext';

interface TaskContextValue {
  tasks: Task[];
  signalTasks: Task[];
  noiseTasks: Task[];
  completedTasks: Task[];
  loading: boolean;
  ready: boolean;
  addTask: (input: TaskInput) => Promise<void>;
  togglePriority: (taskId: string) => Promise<void>;
  toggleCompleted: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

const mapSnapshotToTask = (snapshot: QueryDocumentSnapshot<DocumentData>): Task => {
  const data = snapshot.data();
  const toDate = (value?: Timestamp | null) => (value instanceof Timestamp ? value.toDate() : null);

  return {
    id: snapshot.id,
    title: data.title,
    notes: data.notes,
    priority: data.priority as Priority,
    completed: data.completed,
    createdAt: toDate(data.createdAt),
    completedAt: toDate(data.completedAt),
  };
};

export const TaskProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setReady(false);
      return;
    }

    setLoading(true);
    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setTasks(snapshot.docs.map(mapSnapshotToTask));
        setLoading(false);
        setReady(true);
      },
      (error) => {
        console.error('Task listener error', error);
        setLoading(false);
        setReady(true); // Mark as ready even on error so components don't wait forever
      }
    );

    return () => unsub();
  }, [user]);

  const ensureUser = useCallback(() => {
    if (!user) {
      throw new Error('You need to be signed in to manage tasks.');
    }
    return user.uid;
  }, [user]);

  const collectionRef = useCallback(
    () => collection(db, 'users', ensureUser(), 'tasks'),
    [ensureUser]
  );

  const docRef = useCallback(
    (taskId: string) => doc(db, 'users', ensureUser(), 'tasks', taskId),
    [ensureUser]
  );

  const addTask = useCallback(async (input: TaskInput) => {
    const payload: Record<string, unknown> = {
      title: input.title,
      priority: input.priority,
      completed: false,
      createdAt: serverTimestamp(),
      completedAt: null,
    };

    if (input.notes?.trim()) {
      payload.notes = input.notes.trim();
    }

    await addDoc(collectionRef(), payload);
  }, [collectionRef]);

  const togglePriority = useCallback(async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    const nextPriority: Priority = task.priority === 'signal' ? 'noise' : 'signal';
    await updateDoc(docRef(taskId), { priority: nextPriority });
  }, [tasks, docRef]);

  const toggleCompleted = useCallback(async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    await updateDoc(docRef(taskId), {
      completed: !task.completed,
      completedAt: !task.completed ? serverTimestamp() : null,
    });
  }, [tasks, docRef]);

  const deleteTask = useCallback(async (taskId: string) => {
    await deleteDoc(docRef(taskId));
  }, [docRef]);

  const signalTasks = tasks.filter((task) => !task.completed && task.priority === 'signal');
  const noiseTasks = tasks.filter((task) => !task.completed && task.priority === 'noise');
  const completedTasks = tasks.filter((task) => task.completed);

  const value = useMemo(() => {
    const sortedCompleted = [...completedTasks].sort((a, b) => {
      const aTime = a.completedAt?.getTime() ?? 0;
      const bTime = b.completedAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    return {
      tasks,
      signalTasks,
      noiseTasks,
      completedTasks: sortedCompleted,
      loading,
      ready,
      addTask,
      togglePriority,
      toggleCompleted,
      deleteTask,
    };
  }, [tasks, signalTasks, noiseTasks, completedTasks, loading, ready, addTask, togglePriority, toggleCompleted, deleteTask]);

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export const useTasks = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) {
    throw new Error('useTasks must be used within TaskProvider');
  }
  return ctx;
};

