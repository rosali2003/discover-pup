import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../navigation';
import * as Location from 'expo-location';
import api from '../services/api';
import type { ParkDetails, Dog } from '../types';

type ParkDetailScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'ParkDetail'>;
type ParkDetailScreenRouteProp = RouteProp<HomeStackParamList, 'ParkDetail'>;

interface Props {
  navigation: ParkDetailScreenNavigationProp;
  route: ParkDetailScreenRouteProp;
}

const POLL_INTERVAL = 15000; // 15 seconds for park detail (more frequent)

export default function ParkDetailScreen({ route }: Props) {
  const { parkId } = route.params;
  const [park, setPark] = useState<ParkDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [myDogs, setMyDogs] = useState<Dog[]>([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  useEffect(() => {
    loadParkDetails();
    loadMyDogs();

    // Set up polling
    const interval = setInterval(() => {
      loadParkDetails(true);
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [parkId]);

  async function loadParkDetails(silent = false) {
    if (!silent) setIsLoading(true);

    try {
      const details = await api.getParkDetails(parkId);
      setPark(details);
    } catch (error) {
      console.error('Failed to load park details:', error);
      if (!silent) {
        Alert.alert('Error', 'Failed to load park details');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMyDogs() {
    try {
      const dogs = await api.getMyDogs();
      setMyDogs(dogs.filter((d) => d.is_active));
    } catch (error) {
      console.error('Failed to load dogs:', error);
    }
  }

  async function handleCheckIn() {
    if (myDogs.length === 0) {
      Alert.alert(
        'No Dogs',
        'You need to add a dog to your profile before checking in.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Get current location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Required',
        'We need your location to verify you\'re at the park.'
      );
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});

      // If user has multiple dogs, let them choose
      if (myDogs.length > 1) {
        Alert.alert(
          'Check In',
          'Which dog is with you?',
          myDogs.map((dog) => ({
            text: dog.name,
            onPress: () => performCheckIn(dog.id, location.coords),
          }))
        );
      } else {
        await performCheckIn(myDogs[0].id, location.coords);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get location. Please try again.');
    }
  }

  async function performCheckIn(
    dogId: string,
    coords: { latitude: number; longitude: number }
  ) {
    setIsCheckingIn(true);

    try {
      await api.checkIn(dogId, parkId, {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      Alert.alert('Success', 'You\'re checked in!', [
        {
          text: 'OK',
          onPress: () => loadParkDetails(),
        },
      ]);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.details ||
        'Failed to check in';

      Alert.alert('Check-in Failed', errorMessage);
    } finally {
      setIsCheckingIn(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!park) {
    return (
      <View style={styles.centerContainer}>
        <Text>Park not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.parkName}>{park.name}</Text>
        <Text style={styles.neighborhood}>{park.neighborhood}</Text>
        {park.address && <Text style={styles.address}>{park.address}</Text>}
      </View>

      {park.description && (
        <View style={styles.section}>
          <Text style={styles.description}>{park.description}</Text>
        </View>
      )}

      {park.amenities && park.amenities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenities}>
            {park.amenities.map((amenity, index) => (
              <View key={index} style={styles.amenityTag}>
                <Text style={styles.amenityText}>
                  {amenity.replace(/-/g, ' ')}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.dogsHeader}>
          <Text style={styles.sectionTitle}>
            Currently Here ({park.dog_count})
          </Text>
          <Text style={styles.liveIndicator}>
            Live · Updated {new Date().toLocaleTimeString()}
          </Text>
        </View>

        {park.current_dogs.length === 0 ? (
          <Text style={styles.emptyText}>
            No dogs here right now. Be the first to check in!
          </Text>
        ) : (
          park.current_dogs.map((dog) => (
            <View key={dog.id} style={styles.dogCard}>
              <View style={styles.dogInfo}>
                <Text style={styles.dogName}>{dog.name}</Text>
                <Text style={styles.dogDetails}>
                  {dog.breed && `${dog.breed} · `}
                  {dog.size && `${dog.size} · `}
                  {dog.age_years && `${dog.age_years} yrs`}
                </Text>
                {dog.temperament && dog.temperament.length > 0 && (
                  <View style={styles.temperamentTags}>
                    {dog.temperament.map((trait, idx) => (
                      <Text key={idx} style={styles.temperamentTag}>
                        {trait}
                      </Text>
                    ))}
                  </View>
                )}
                <Text style={styles.lastSeen}>
                  Last seen{' '}
                  {Math.floor(
                    (Date.now() - new Date(dog.last_seen).getTime()) / 60000
                  )}{' '}
                  min ago
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity
        style={[styles.checkInButton, isCheckingIn && styles.buttonDisabled]}
        onPress={handleCheckIn}
        disabled={isCheckingIn}
      >
        <Text style={styles.checkInButtonText}>
          {isCheckingIn ? 'Checking In...' : 'Check In My Dog'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  parkName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  neighborhood: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  amenityText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  dogsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveIndicator: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  dogCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  temperamentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  temperamentTag: {
    backgroundColor: '#E5F1FF',
    color: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
    fontSize: 12,
  },
  lastSeen: {
    fontSize: 12,
    color: '#999',
  },
  checkInButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  checkInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
