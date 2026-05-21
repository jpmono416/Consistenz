import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Pressable, Text, View, Animated, Platform } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { palette, shadows } from '@/theme';
import { Task } from '@/types/task';

interface TaskCardProps {
  task: Task;
  onTogglePriority: () => void;
  onToggleCompleted: () => void;
  onDelete: () => void;
  onLongPress?: () => void;
  onDragStart?: (taskId: string, x: number, y: number) => void;
  onDragUpdate?: (x: number, y: number) => void;
  onDragEnd?: () => void;
}

export const TaskCard = memo(({
  task,
  onTogglePriority,
  onToggleCompleted,
  onDelete,
  onLongPress,
  onDragStart,
  onDragUpdate,
  onDragEnd,
}: TaskCardProps) => {
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const priorityColor = task.priority === 'signal' ? palette.signal : palette.noise;

  // Animated.* values (RN core) used for the completion animation only.
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Reanimated shared values used for the press/drag scale + opacity feedback.
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!isCompleting) return;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsCompleting(false);
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    });
  }, [isCompleting, fadeAnim, scaleAnim]);

  const handlePress = () => {
    if (!task.completed && !isCompleting && !isDraggingLocal) {
      setIsCompleting(true);
      setTimeout(() => {
        onToggleCompleted();
      }, 100);
    }
  };

  // JS-thread handlers — these are the only place where we touch React state,
  // refs and the parent callbacks. They are invoked from the gesture worklets
  // via runOnJS so that everything works on iOS, Android and Web.
  const handleDragStartJS = useCallback(
    (absoluteX: number, absoluteY: number) => {
      setIsDraggingLocal(true);
      onDragStart?.(task.id, absoluteX, absoluteY);
    },
    [task.id, onDragStart]
  );

  const handleDragUpdateJS = useCallback(
    (absoluteX: number, absoluteY: number) => {
      onDragUpdate?.(absoluteX, absoluteY);
    },
    [onDragUpdate]
  );

  const handleDragEndJS = useCallback(() => {
    setIsDraggingLocal(false);
    onDragEnd?.();
  }, [onDragEnd]);

  // Require a short long-press before the drag activates. This prevents the
  // pan gesture from intercepting normal taps on the card (which would break
  // completion / swap / delete) and also makes the drag intent explicit.
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(250)
    // Let the parent ScrollView handle vertical swipes; drag between columns is horizontal.
    .failOffsetY([-12, 12])
    .activeOffsetX([-16, 16])
    .onStart((event) => {
      'worklet';
      scale.value = withSpring(1.05);
      opacity.value = withSpring(0.4);
      runOnJS(handleDragStartJS)(event.absoluteX, event.absoluteY);
    })
    .onUpdate((event) => {
      'worklet';
      runOnJS(handleDragUpdateJS)(event.absoluteX, event.absoluteY);
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
    })
    .onFinalize(() => {
      // onFinalize fires on every termination path (end, cancel, fail), so this
      // is where we guarantee the card opacity is restored on web/native.
      'worklet';
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
      runOnJS(handleDragEndJS)();
    });

  const animatedStyle = useAnimatedStyle(() => {
    if (isDraggingLocal) {
      return { opacity: 0.3, transform: [{ scale: 1 }] };
    }
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  const backgroundColor = isCompleting ? palette.success : palette.elevated;
  const borderColor = isCompleting ? palette.success : palette.border;

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <GestureDetector gesture={panGesture}>
        <Reanimated.View style={animatedStyle}>
          <Pressable
            onPress={handlePress}
            onLongPress={onLongPress}
            // Disable native press feedback while dragging so the press doesn't
            // visually fight the drag overlay (especially on web).
            disabled={isDraggingLocal}
            style={{
              backgroundColor,
              borderRadius: 16,
              padding: 16,
              gap: 12,
              borderWidth: 1,
              borderColor,
              // Hint the browser that this element will move - improves perf
              // and avoids the "floating but unclickable" web glitch.
              ...(Platform.OS === 'web' ? { userSelect: 'none' as const } : null),
              ...shadows.soft,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text
                style={{
                  color: isCompleting ? palette.background : palette.textPrimary,
                  fontSize: 16,
                  fontWeight: '600',
                  flex: 1,
                }}
              >
                {task.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onTogglePriority();
                  }}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={20}
                    color={isCompleting ? palette.background : priorityColor}
                  />
                </Pressable>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  hitSlop={8}
                >
                  <Feather name="trash" size={18} color={isCompleting ? palette.background : palette.danger} />
                </Pressable>
              </View>
            </View>
            {task.notes ? (
              <Text
                style={{
                  color: isCompleting ? palette.background : palette.textSecondary,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {task.notes}
              </Text>
            ) : null}
          </Pressable>
        </Reanimated.View>
      </GestureDetector>
    </Animated.View>
  );
});

TaskCard.displayName = 'TaskCard';
