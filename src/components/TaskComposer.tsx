import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { palette } from '@/theme';
import { Priority } from '@/types/task';

interface TaskComposerProps {
  onSubmit: (data: { title: string; notes?: string; priority: Priority }) => Promise<void>;
}

const priorityOptions: { label: string; value: Priority }[] = [
  { label: 'Signal', value: 'signal' },
  { label: 'Noise', value: 'noise' },
];

export function TaskComposer({ onSubmit }: TaskComposerProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('signal');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({ title: title.trim(), notes: notes.trim() || undefined, priority });
      setTitle('');
      setNotes('');
      setPriority('signal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={{
        backgroundColor: palette.surface,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 12,
      }}
    >
      <TextInput
        placeholder="Task title"
        placeholderTextColor={palette.textSecondary}
        value={title}
        onChangeText={setTitle}
        style={{
          backgroundColor: palette.elevated,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: palette.textPrimary,
          fontSize: 16,
        }}
      />

      <TextInput
        placeholder="Notes (optional)"
        placeholderTextColor={palette.textSecondary}
        value={notes}
        onChangeText={setNotes}
        multiline
        style={{
          backgroundColor: palette.elevated,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: palette.textPrimary,
          minHeight: 74,
          textAlignVertical: 'top',
        }}
      />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {priorityOptions.map((option) => {
          const active = option.value === priority;
          return (
            <Pressable
              key={option.value}
              onPress={() => setPriority(option.value)}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: active ? palette.accent : palette.border,
                backgroundColor: active ? palette.accent : palette.elevated,
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: active ? palette.background : palette.textPrimary,
                  fontWeight: '600',
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={submitting}
        style={{
          backgroundColor: submitting ? palette.muted : palette.signal,
          paddingVertical: 14,
          borderRadius: 16,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {submitting && <ActivityIndicator color={palette.background} />}
        <Text style={{ color: palette.background, fontWeight: '700', fontSize: 16 }}>
          {submitting ? 'Saving...' : 'Add task'}
        </Text>
      </Pressable>
    </View>
  );
}

