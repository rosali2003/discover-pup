import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import api from '../services/api';
import type { Dog, CreateDogDto, DogSize } from '../types';

const DOG_SIZES: DogSize[] = ['tiny', 'small', 'medium', 'large', 'giant'];

export default function MyDogsScreen() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [size, setSize] = useState<DogSize>('medium');
  const [ageYears, setAgeYears] = useState('');

  useEffect(() => {
    loadDogs();
  }, []);

  async function loadDogs() {
    setIsLoading(true);
    try {
      const dogsData = await api.getMyDogs();
      setDogs(dogsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load dogs');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddDog() {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for your dog');
      return;
    }

    try {
      const newDog: CreateDogDto = {
        name: name.trim(),
        breed: breed.trim() || undefined,
        size,
        age_years: ageYears ? parseFloat(ageYears) : undefined,
      };

      await api.createDog(newDog);

      // Reset form
      setName('');
      setBreed('');
      setSize('medium');
      setAgeYears('');
      setShowAddModal(false);

      // Reload dogs
      await loadDogs();

      Alert.alert('Success', 'Dog added successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add dog');
    }
  }

  async function handleDeleteDog(dogId: string, dogName: string) {
    Alert.alert(
      'Delete Dog',
      `Are you sure you want to remove ${dogName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteDog(dogId);
              await loadDogs();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete dog');
            }
          },
        },
      ]
    );
  }

  function renderDogItem({ item }: { item: Dog }) {
    return (
      <View style={styles.dogCard}>
        <View style={styles.dogInfo}>
          <Text style={styles.dogName}>{item.name}</Text>
          <Text style={styles.dogDetails}>
            {item.breed && `${item.breed} · `}
            {item.size && `${item.size} · `}
            {item.age_years && `${item.age_years} years old`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteDog(item.id, item.name)}
        >
          <Text style={styles.deleteButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={dogs}
        renderItem={renderDogItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No dogs yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first dog to start checking in at parks!
              </Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.addButtonText}>+ Add Dog</Text>
      </TouchableOpacity>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add a Dog</Text>

            <TextInput
              style={styles.input}
              placeholder="Name *"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="Breed (optional)"
              value={breed}
              onChangeText={setBreed}
            />

            <Text style={styles.label}>Size</Text>
            <View style={styles.sizeButtons}>
              {DOG_SIZES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.sizeButton,
                    size === s && styles.sizeButtonActive,
                  ]}
                  onPress={() => setSize(s)}
                >
                  <Text
                    style={[
                      styles.sizeButtonText,
                      size === s && styles.sizeButtonTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Age in years (optional)"
              value={ageYears}
              onChangeText={setAgeYears}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddDog}
              >
                <Text style={styles.saveButtonText}>Add Dog</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  dogCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dogInfo: {
    flex: 1,
  },
  dogName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  dogDetails: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sizeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sizeButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  sizeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sizeButtonText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  sizeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
