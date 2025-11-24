import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { palette, shadows } from '@/theme';
import { Task } from '@/types/task';

interface TaskCardProps {
  task: Task;
  onTogglePriority: () => void;
  onToggleCompleted: () => void;
  onDelete: () => void;
}

export const TaskCard = memo(({ task, onTogglePriority, onToggleCompleted, onDelete }: TaskCardProps) => {
  const priorityColor = task.priority === 'signal' ? palette.signal : palette.noise;

  return (
    <View
      style={{
        backgroundColor: palette.elevated,
        borderRadius: 16,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: palette.border,
        ...shadows.soft,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          style={{
            color: palette.textPrimary,
            fontSize: 16,
            fontWeight: '600',
            flex: 1,
          }}
        >
          {task.title}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Pressable onPress={onTogglePriority} hitSlop={8}>
            <MaterialCommunityIcons
              name="swap-horizontal"
              size={20}
              color={priorityColor}
            />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Feather name="trash" size={18} color={palette.danger} />
          </Pressable>
        </View>
      </View>
      {task.notes ? (
        <Text style={{ color: palette.textSecondary, fontSize: 13, lineHeight: 18 }}>{task.notes}</Text>
      ) : null}
      <Pressable
        onPress={onToggleCompleted}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 10,
          borderRadius: 12,
          backgroundColor: task.completed ? palette.success : palette.surface,
          borderWidth: 1,
          borderColor: task.completed ? palette.success : palette.border,
        }}
      >
        <Feather
          name={task.completed ? 'check-circle' : 'circle'}
          size={18}
          color={task.completed ? palette.surface : palette.textPrimary}
        />
        <Text
          style={{
            color: task.completed ? palette.surface : palette.textPrimary,
            fontWeight: '600',
            fontSize: 14,
          }}
        >
          {task.completed ? 'Completed' : 'Mark as done'}
        </Text>
      </Pressable>
    </View>
  );
});

TaskCard.displayName = 'TaskCard';

