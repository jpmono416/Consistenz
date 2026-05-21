import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, Switch, Modal, ScrollView } from "react-native";
import { Habit, loadHabits, saveHabits } from '@/utils/storage';
import { getCurrentUserId } from '@/utils/auth';
import { saveHistoryToFirestore } from '@/utils/firestore';
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import * as Crypto from 'expo-crypto';
import HabitForm from '@/components/HabitForm';
import BackButton from '@/components/BackButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// hide default header
export const unstable_settings = { headerShown: false };

export default function ManageHabitsScreen() {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    useEffect(() => {
        // load habits, ensure order field, then sort
        loadHabits().then(list => {
            const init = list.map((h, idx) => ({ ...h, order: h.order ?? idx } as Habit));
            init.sort((a,b) => (a.order || 0) - (b.order || 0));
            setHabits(init);
        });
    }, []);

    async function addHabit(habitData: Omit<Habit, "id" | "tapsToday" | "isActive">) {
        const nextOrder = habits.length ? Math.max(...habits.map(h => h.order || 0)) + 1 : 0;
        const newHabit: Habit = {
            id: Crypto.randomUUID(),
            ...habitData,
            isActive: true,
            tapsToday: 0,
            order: nextOrder,
        };

        const updated = [...habits, newHabit];
        await saveHabits(updated);
        setHabits(updated.sort((a,b) => (a.order||0) - (b.order||0)));
    }

    async function updateHabit(habitData: Omit<Habit, "id" | "tapsToday" | "isActive">) {
        if (!editingHabit) return;

        const updated = habits.map(h => 
            h.id === editingHabit.id 
                ? { ...h, ...habitData } 
                : h
        );

        await saveHabits(updated);
        setHabits(updated);
        setEditingHabit(null);
        setIsModalVisible(false);
    }

    async function toggleActive(id: string) {
        const updated = habits.map((h) => (h.id === id ? { ...h, isActive: !h.isActive } : h));
        await saveHabits(updated);
        setHabits(updated);
    }

    function deleteHabit(id: string) {
        const updated = habits
            .filter(h => h.id !== id)
            .map((h, idx) => ({ ...h, order: idx }));
        saveHabits(updated).then(() => setHabits(updated));
    }

    function openEditModal(habit: Habit) {
        setEditingHabit(habit);
        setIsModalVisible(true);
    }

    async function reorder(id: string, dir: number) {
        const idx = habits.findIndex(h => h.id === id);
        const target = idx + dir;
        if (target < 0 || target >= habits.length) return;
        const newHabits = [...habits];
        // swap orders
        const a = newHabits[idx], b = newHabits[target];
        const oa = a.order||0, ob = b.order||0;
        a.order = ob; b.order = oa;
        newHabits.sort((x,y) => (x.order||0) - (y.order||0));
        await saveHabits(newHabits);
        setHabits(newHabits);
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>

            <Text style={styles.title}>Add Habit</Text>
            <HabitForm 
                onSubmit={addHabit}
                submitButtonText="Add Habit"
            />

            <Text style={styles.title}>Existing Habits</Text>
            <View style={{ gap: 6, marginBottom: 12 }}>
              {habits.map((item) => (
                <View key={item.id} style={styles.row}>
                  <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                  <Text style={styles.habitName}>{item.name}</Text>
                  <Pressable onPress={() => reorder(item.id, -1)} disabled={(item.order ?? 0) === 0} style={{ padding: 3 }}>
                    <Text>⬆️</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => reorder(item.id, 1)}
                    disabled={(item.order ?? 0) === habits.length - 1}
                    style={{ padding: 3 }}
                  >
                    <Text>⬇️</Text>
                  </Pressable>
                  <Pressable onPress={() => openEditModal(item)} style={{ padding: 6 }}>
                    <Text>✏️</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteHabit(item.id)} style={{ padding: 6 }}>
                    <Text>🗑️</Text>
                  </Pressable>
                  <Switch value={item.isActive} onValueChange={() => toggleActive(item.id)} />
                </View>
              ))}
            </View>

            {/* Buttons to save/load habit data */}
            <View style={styles.buttonContainer}>
                <Pressable 
                    style={styles.saveButton} 
                    onPress={async () => {
                        try {
                            // Get habits and history
                            const habitsList = await loadHabits();
                            const historyStr = await AsyncStorage.getItem('habitHistory');
                            const history = historyStr ? JSON.parse(historyStr) : {};

                            // Create data object
                            const data = { habits: habitsList, history };

                            // Save to AsyncStorage as backup
                            await AsyncStorage.setItem('habitBackup', JSON.stringify(data));

                            // If user is logged in, also save to Firestore backup
                            const userId = getCurrentUserId();
                            if (userId) {
                                // Create a backup collection in Firestore using users/{userId}/backups pattern
                                const backupDoc = doc(db, 'users', userId, 'backups', 'habits');
                                await setDoc(backupDoc, data);
                                Alert.alert('Success', 'Habit data saved to backup (local and cloud)');
                            } else {
                                Alert.alert('Success', 'Habit data saved to local backup');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to save habit data');
                            console.error(error);
                        }
                    }}
                >
                    <Text style={styles.buttonText}>Save Data</Text>
                </Pressable>

                <Pressable 
                    style={styles.loadButton} 
                    onPress={async () => {
                        try {
                            // Check if user is logged in
                            const userId = getCurrentUserId();
                            let backup;
                            let source = 'local';

                            if (userId) {
                                // Try to load from Firestore first
                                try {
                                    const backupDoc = doc(db, 'users', userId, 'backups', 'habits');
                                    const docSnap = await getDoc(backupDoc);

                                    if (docSnap.exists()) {
                                        backup = docSnap.data();
                                        source = 'cloud';
                                    }
                                } catch (err) {
                                    console.error('Error loading from Firestore:', err);
                                }
                            }

                            // If no cloud backup or not logged in, try local backup
                            if (!backup) {
                                const backupStr = await AsyncStorage.getItem('habitBackup');
                                if (!backupStr) {
                                    Alert.alert('Error', 'No backup data found');
                                    return;
                                }
                                backup = JSON.parse(backupStr);
                            }

                            // Confirm before loading
                            Alert.alert(
                                'Load Data', 
                                `This will replace your current habits and history with data from ${source} backup. Continue?`,
                                [
                                    { text: 'Cancel' },
                                    { 
                                        text: 'Load', 
                                        onPress: async () => {
                                            // Save habits and history
                                            await saveHabits(backup.habits);

                                            // Save history to both AsyncStorage and Firestore if logged in
                                            await AsyncStorage.setItem('habitHistory', JSON.stringify(backup.history));
                                            if (userId) {
                                                await saveHistoryToFirestore(userId, backup.history);
                                            }

                                            // Update state
                                            setHabits(backup.habits);
                                            Alert.alert('Success', `Habit data loaded from ${source} backup`);
                                        }
                                    }
                                ]
                            );
                        } catch (error) {
                            Alert.alert('Error', 'Failed to load habit data');
                            console.error(error);
                        }
                    }}
                >
                    <Text style={styles.buttonText}>Load Data</Text>
                </Pressable>
            </View>

            {/* Edit Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setIsModalVisible(false);
                    setEditingHabit(null);
                }}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Habit</Text>
                        {editingHabit && (
                            <HabitForm
                                initialHabit={editingHabit}
                                onSubmit={updateHabit}
                                submitButtonText="Save Changes"
                            />
                        )}
                        <Pressable 
                            style={styles.cancelButton} 
                            onPress={() => {
                                setIsModalVisible(false);
                                setEditingHabit(null);
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
          </ScrollView>
          <BackButton style={styles.fabLeft} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1, 
        padding: 16,
        backgroundColor: "#222", // Dark background for dark theme
    },
    title: { 
        fontSize: 18, 
        fontWeight: "bold", 
        marginTop: 12,
        color: "#fff", // White text for dark theme
    },
    habitName: {
        flex: 1, 
        marginLeft: 8,
        color: "#fff", // White text for dark theme
    },
    row: { 
        flexDirection: "row", 
        alignItems: "center", 
        marginVertical: 6,
        backgroundColor: "#333", // Darker background for rows
        padding: 8,
        borderRadius: 6,
    },
    fabLeft: { 
        position: 'absolute', 
        bottom: 30, 
        left: 30, 
        borderRadius: 30, 
        overflow: 'hidden', 
        padding: 0, 
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 10,
    },
    saveButton: {
        backgroundColor: "#4caf50", // Green
        padding: 10,
        borderRadius: 6,
        flex: 1,
        marginRight: 5,
        alignItems: "center",
    },
    loadButton: {
        backgroundColor: "#2196f3", // Blue
        padding: 10,
        borderRadius: 6,
        flex: 1,
        marginLeft: 5,
        alignItems: "center",
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)", // Semi-transparent background
    },
    modalContent: {
        backgroundColor: "#333", // Dark background for modal
        borderRadius: 10,
        padding: 20,
        width: "90%",
        maxHeight: "80%",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10,
        textAlign: "center",
        color: "#fff", // White text for dark theme
    },
    cancelButton: {
        backgroundColor: "#f44336",
        padding: 10,
        borderRadius: 6,
        alignItems: "center",
        marginTop: 10,
    },
    cancelButtonText: {
        color: "white",
        fontWeight: "bold",
    },
});
