import { Text, View } from 'react-native';

import { palette } from '@/theme';
import { Task } from '@/types/task';
import { TaskCard } from './TaskCard';

interface TaskColumnProps {
  title: string;
  accentColor: string;
  tasks: Task[];
  emptyCopy: string;
  onTogglePriority: (taskId: string) => void;
  onToggleCompleted: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export function TaskColumn({
  title,
  accentColor,
  tasks,
  emptyCopy,
  onTogglePriority,
  onToggleCompleted,
  onDelete,
}: TaskColumnProps) {
  return (
    <View style={{ flex: 1, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: accentColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: palette.background, fontWeight: '700' }}>{title[0]}</Text>
        </View>
        <Text style={{ color: palette.textPrimary, fontSize: 16, fontWeight: '700' }}>{title}</Text>
        <View
          style={{
            marginLeft: 'auto',
            backgroundColor: palette.surface,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: palette.textSecondary, fontWeight: '600' }}>{tasks.length}</Text>
        </View>
      </View>

      {tasks.length === 0 ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: palette.border,
            borderStyle: 'dashed',
            padding: 16,
            borderRadius: 16,
            minHeight: 120,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: palette.surface,
          }}
        >
          <Text style={{ color: palette.textSecondary, textAlign: 'center' }}>{emptyCopy}</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {tasks.map((item) => (
            <TaskCard
              key={item.id}
              task={item}
              onTogglePriority={() => onTogglePriority(item.id)}
              onToggleCompleted={() => onToggleCompleted(item.id)}
              onDelete={() => onDelete(item.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

