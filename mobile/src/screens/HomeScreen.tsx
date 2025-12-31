import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { HomeStackParamList } from '../navigation';
import api from '../services/api';
import type { ParkWithDogCount } from '../types';

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'HomeList'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const POLL_INTERVAL = 30000; // 30 seconds

export default function HomeScreen({ navigation }: Props) {
  const [parks, setParks] = useState<ParkWithDogCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Load parks on mount and set up polling
  useEffect(() => {
    loadParks();

    // Set up polling
    const interval = setInterval(() => {
      loadParks(true); // Silent refresh
    }, POLL_INTERVAL);

    setPollInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Pause polling when screen is not focused
  useFocusEffect(
    useCallback(() => {
      // Resume polling when focused
      if (!pollInterval) {
        const interval = setInterval(() => {
          loadParks(true);
        }, POLL_INTERVAL);
        setPollInterval(interval);
      }

      return () => {
        // Pause polling when unfocused
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
      };
    }, [])
  );

  async function loadParks(silent = false) {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await api.getParks('New York'); // Default to NYC
      setParks(response.data);
    } catch (err: any) {
      console.error('Failed to load parks:', err);
      if (!silent) {
        setError('Failed to load parks. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadParks();
  }

  function renderParkItem({ item }: { item: ParkWithDogCount }) {
    return (
      <TouchableOpacity
        style={styles.parkCard}
        onPress={() =>
          navigation.navigate('ParkDetail', {
            parkId: item.id,
            parkName: item.name,
          })
        }
      >
        <View style={styles.parkHeader}>
          <Text style={styles.parkName}>{item.name}</Text>
          <View style={styles.dogCountBadge}>
            <Text style={styles.dogCountText}>
              {item.dog_count} {item.dog_count === 1 ? 'dog' : 'dogs'}
            </Text>
          </View>
        </View>

        <Text style={styles.parkNeighborhood}>{item.neighborhood}</Text>

        {item.amenities && item.amenities.length > 0 && (
          <View style={styles.amenities}>
            {item.amenities.slice(0, 3).map((amenity, index) => (
              <Text key={index} style={styles.amenityTag}>
                {amenity.replace(/-/g, ' ')}
              </Text>
            ))}
          </View>
        )}

        {item.dog_count > 0 && (
          <Text style={styles.liveIndicator}>Live now</Text>
        )}
      </TouchableOpacity>
    );
  }

  if (isLoading && parks.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading parks...</Text>
      </View>
    );
  }

  if (error && parks.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadParks()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={parks}
        renderItem={renderParkItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Dog Parks</Text>
            <Text style={styles.headerSubtitle}>
              Updated {new Date().toLocaleTimeString()}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  parkCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  parkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  parkName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  dogCountBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dogCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  parkNeighborhood: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  amenityTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  liveIndicator: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
