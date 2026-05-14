import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Habit } from '@/utils/storage';
import { COLORS } from '@/utils/helpers';

// Weekday names from helpers.ts
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKENDS = ['Sat', 'Sun'];

interface HabitFormProps {
  initialHabit?: Habit;
  onSubmit: (habit: Omit<Habit, "id" | "tapsToday" | "isActive">) => void;
  submitButtonText: string;
}

export default function HabitForm({ initialHabit, onSubmit, submitButtonText }: HabitFormProps) {
  const [name, setName] = useState(initialHabit?.name || "");
  const [emoji, setEmoji] = useState(initialHabit?.emoji || "😊");
  const [color, setColor] = useState(initialHabit?.color || "#2196f3");
  const [taps, setTaps] = useState(initialHabit?.tapsNeeded?.toString() || "1");
  const [frequency, setFrequency] = useState<string[]>(initialHabit?.frequency || DAY_NAMES);

  const handleSubmit = () => {
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      emoji,
      color,
      tapsNeeded: parseInt(taps) || 1,
      frequency,
    });

    // Only reset form if it's a new habit (not editing)
    if (!initialHabit) {
      setName("");
      setEmoji("😊");
      setColor("#2196f3");
      setTaps("1");
      setFrequency(DAY_NAMES);
    }
  };

  const toggleDay = (day: string) => {
    if (frequency.includes(day)) {
      setFrequency(frequency.filter(d => d !== day));
    } else {
      setFrequency([...frequency, day]);
    }
  };

  const selectWeekdays = () => {
    setFrequency(WEEKDAYS);
  };

  const selectWeekends = () => {
    setFrequency(WEEKENDS);
  };

  const selectAllDays = () => {
    setFrequency(DAY_NAMES);
  };


  const colorOptions = Object.entries(COLORS) as [keyof typeof COLORS, string][];
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name:</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter habit name"
        value={name}
        onChangeText={setName}
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Emoji:</Text>
      <TextInput
        style={styles.input}
        placeholder="Choose an emoji"
        value={emoji}
        onChangeText={setEmoji}
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Color:</Text>
      <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorContainer}
      >
        {colorOptions.map(([colorName, value]) => (
            <Pressable
                key={colorName}
                accessibilityLabel={String(colorName)}
                style={[
                  styles.colorCircle,
                  color === value && styles.selectedColor,
                  { backgroundColor: value },
                ]}
                onPress={() => setColor(value)}
            />
        ))}
      </ScrollView>

      <Text style={styles.label}>Taps per day:</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Number of taps needed" 
        keyboardType="number-pad" 
        value={taps} 
        onChangeText={setTaps} 
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Frequency:</Text>
      <View style={styles.frequencyOptions}>
        <Pressable style={styles.quickOption} onPress={selectWeekdays}>
          <Text>Weekdays</Text>
        </Pressable>
        <Pressable style={styles.quickOption} onPress={selectWeekends}>
          <Text>Weekends</Text>
        </Pressable>
        <Pressable style={styles.quickOption} onPress={selectAllDays}>
          <Text>All Days</Text>
        </Pressable>
      </View>

      <View style={styles.daysContainer}>
        {DAY_NAMES.map((day) => (
          <Pressable
            key={day}
            style={[
              styles.dayButton,
              frequency.includes(day) && styles.selectedDay,
            ]}
            onPress={() => toggleDay(day)}
          >
            <Text style={frequency.includes(day) ? styles.selectedDayText : styles.dayText}>
              {day}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>{submitButtonText}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#222", // Dark background for dark theme
  },
  input: {
    borderWidth: 1,
    borderColor: "#444", // Darker border for dark theme
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 10,
    backgroundColor: "#333", // Dark input background
    color: "#fff", // White text for dark theme
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 6,
    marginBottom: 6,
    color: "#fff", // White text for dark theme
  },
  colorContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: "#fff", // White border for dark theme
  },
  frequencyOptions: {
    flexDirection: "row",
    marginBottom: 10,
  },
  quickOption: {
    backgroundColor: "#444", // Darker background for dark theme
    padding: 8,
    borderRadius: 6,
    marginRight: 10,
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  dayButton: {
    backgroundColor: "#444", // Darker background for dark theme
    padding: 8,
    borderRadius: 6,
    margin: 4,
    minWidth: 45,
    alignItems: "center",
  },
  selectedDay: {
    backgroundColor: "#2196f3",
  },
  dayText: {
    color: "#fff", // White text for dark theme
  },
  selectedDayText: {
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#3c6",
    alignItems: "center",
    padding: 10,
    marginVertical: 10,
    borderRadius: 6,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
