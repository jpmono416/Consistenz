import { memo, useState, useEffect, useRef } from 'react';
import { Pressable, Text, View, Animated } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

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
  isDragging?: boolean;
  dragPosition?: { x: number; y: number };
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
              isDragging = false,
              dragPosition,
}: TaskCardProps) => {
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const priorityColor = task.priority === 'signal' ? palette.signal : palette.noise;
  const [isCompleting, setIsCompleting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Reanimated values for drag
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isCompleting) {
      // Animate to green and fade out
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
    }
  }, [isCompleting, fadeAnim, scaleAnim]);

  const handlePress = () => {
    if (!task.completed && !isCompleting && !isDragging) {
      setIsCompleting(true);
      // Wait a bit before calling the completion handler to show the animation
      setTimeout(() => {
        onToggleCompleted();
      }, 100);
    }
  };

  const cardRef = useRef<View>(null);
  const initialPositionRef = useRef<{ x: number; y: number } | null>(null);
  
  // Pan gesture for dragging
  const panGesture = Gesture.Pan()
    .onStart(() => {
      setIsDraggingLocal(true);
      if (cardRef.current && onDragStart) {
        cardRef.current.measureInWindow((x, y, width, height) => {
          // Store initial position (center of card)
          const centerX = x + width / 2;
          const centerY = y + height / 2;
          initialPositionRef.current = { x: centerX, y: centerY };
          onDragStart(task.id, centerX, centerY);
        });
      }
      scale.value = withSpring(1.05);
      opacity.value = 0.8;
    })
    .onUpdate((e) => {
      // Calculate absolute position from initial position + translation
      if (initialPositionRef.current && onDragUpdate) {
        const absoluteX = initialPositionRef.current.x + e.translationX;
        const absoluteY = initialPositionRef.current.y + e.translationY;
        runOnJS(onDragUpdate)(absoluteX, absoluteY);
      }
    })
    .onEnd(() => {
      setIsDraggingLocal(false);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
      initialPositionRef.current = null;
      if (onDragEnd) {
        onDragEnd();
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    // Don't transform the card during drag - keep it in place visually
    // The overlay will follow the finger instead
    if (isDragging || isDraggingLocal) {
      return {
        opacity: 0.3,
      };
    }
    return {
      transform: [
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  const backgroundColor = isCompleting ? palette.success : palette.elevated;
  const borderColor = isCompleting ? palette.success : palette.border;

  // If being dragged externally (from parent), show at drag position
  if (isDragging && dragPosition) {
    return (
      <Reanimated.View
        style={[
          {
            position: 'absolute',
            left: dragPosition.x,
            top: dragPosition.y,
            zIndex: 1000,
            width: '100%',
          },
          animatedStyle,
        ]}
        pointerEvents="none"
      >
        <View
          style={{
            backgroundColor,
            borderRadius: 16,
            padding: 16,
            gap: 12,
            borderWidth: 1,
            borderColor,
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
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <MaterialCommunityIcons
                name="swap-horizontal"
                size={20}
                color={isCompleting ? palette.background : priorityColor}
              />
              <Feather name="trash" size={18} color={isCompleting ? palette.background : palette.danger} />
            </View>
          </View>
          {task.notes ? (
            <Text style={{ color: isCompleting ? palette.background : palette.textSecondary, fontSize: 13, lineHeight: 18 }}>
              {task.notes}
            </Text>
          ) : null}
        </View>
      </Reanimated.View>
    );
  }

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <GestureDetector gesture={panGesture}>
        <Reanimated.View 
          ref={cardRef}
          style={animatedStyle}
        >
          <Pressable
            onPress={handlePress}
            onLongPress={onLongPress}
            style={{
              backgroundColor,
              borderRadius: 16,
              padding: 16,
              gap: 12,
              borderWidth: 1,
              borderColor,
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
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
          <Text style={{ color: isCompleting ? palette.background : palette.textSecondary, fontSize: 13, lineHeight: 18 }}>
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
