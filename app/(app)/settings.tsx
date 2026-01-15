import {useEffect, useState} from "react";
import { Habit } from '@/utils/storage';
import * as storage from '@/utils/storage';
import {Button, FlatList, StyleSheet, Text, View} from "react-native";
const Settings: React.FC = () => {
    const [habits, setHabits] = useState<Habit[]>([]);

    useEffect(() => {
        (async () => setHabits(await storage.loadHabits()))();
    }, []);

    const placeholderAdd = () =>
        alert('Add‑habit UI not implemented yet.');

    const Item = ({ item }: { item: Habit }) => (
        <View style={styles.item}>
            <View
                style={[
                    styles.swatch,
                    { backgroundColor: item.color ?? 'grey' },
                ]}
            />
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.freq}>
                ({(item as any).frequency?.join(', ') ?? ''})
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Your Habits</Text>
            <FlatList
                data={habits}
                renderItem={Item}
                keyExtractor={h => h.id}
                ListEmptyComponent={<Text>No habits configured yet.</Text>}
            />
            <Button title="Add New Habit (placeholder)" onPress={placeholderAdd} />
        </View>
    );
};

/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: 'white' },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#555',
    },
    swatch: { width: 14, height: 14, borderRadius: 7, marginRight: 10 },
    name: { fontSize: 16, flex: 1, color: 'white' },
    freq: { fontSize: 12, color: 'grey' },
});

export default Settings;
