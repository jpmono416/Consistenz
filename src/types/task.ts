export type Priority = 'signal' | 'noise';

export interface Task {
  id: string;
  title: string;
  notes?: string;
  priority: Priority;
  completed: boolean;
  createdAt?: Date | null;
  completedAt?: Date | null;
}

export interface TaskInput {
  title: string;
  notes?: string;
  priority: Priority;
}

