import React from 'react';
import {Pressable, StyleSheet, ViewStyle, StyleProp, Text} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface BackButtonProps {
  style?: StyleProp<ViewStyle>;
  size?: number;
}

export default function BackButton({ style, size = 36 }: BackButtonProps) {
  const router = useRouter();
  return (
    <Pressable style={[styles.container, style]} onPress={() => router.back()}>
      <LinearGradient start={[0,0]} end={[1,1]} colors={["#E73879","#FCC737"]} style={styles.gradient}>
        <Text style={{ fontSize: 27, color: '#fff' }}>◀️</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 30,
    overflow: 'hidden',
    padding: 0,
  },
  gradient: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
});
