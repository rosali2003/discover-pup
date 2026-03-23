import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MapStackParamList } from '../navigation';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import Mapbox, { Camera, LocationPuck, MapView, ShapeSource, SymbolLayer, CircleLayer, FillLayer, LineLayer } from '@rnmapbox/maps';
import api from '../services/api';
import type { ParkWithDogCount, ParkDetails, DogWithOwner } from '../types';

// Initialize Mapbox with access token
const mapboxToken = Constants.expoConfig?.extra?.mapboxAccessToken;
Mapbox.setAccessToken(mapboxToken || '');

type MapScreenNavigationProp = StackNavigationProp<MapStackParamList, 'MapView'>;

interface Props {
  navigation: MapScreenNavigationProp;
}

const POLL_INTERVAL = 30000; // 30 seconds

export default function MapScreen({ navigation }: Props) {
  const [parks, setParks] = useState<ParkWithDogCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedPark, setSelectedPark] = useState<ParkWithDogCount | null>(null);
  const [parkDetails, setParkDetails] = useState<ParkDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const cameraRef = useRef<Camera>(null);

  // Request location permission and get user position
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    })();
  }, []);

  // Load parks on mount and set up polling
  useEffect(() => {
    loadParks();

    const interval = setInterval(() => {
      loadParks(true);
    }, POLL_INTERVAL);

    setPollInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Pause polling when screen is not focused
  useFocusEffect(
    useCallback(() => {
      if (!pollInterval) {
        const interval = setInterval(() => {
          loadParks(true);
        }, POLL_INTERVAL);
        setPollInterval(interval);
      }

      return () => {
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

    try {
      const response = await api.getParks('New York');
      setParks(response.data);
    } catch (err) {
      console.error('Failed to load parks:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadParkDetails(parkId: string) {
    setIsLoadingDetails(true);
    try {
      const details = await api.getParkDetails(parkId);
      setParkDetails(details);
    } catch (err) {
      console.error('Failed to load park details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }

  function handleMarkerPress(park: ParkWithDogCount) {
    setSelectedPark(park);
    setParkDetails(null);
    setModalVisible(true);
    loadParkDetails(park.id);
  }

  function handleViewFullDetails() {
    if (selectedPark) {
      setModalVisible(false);
      navigation.navigate('ParkDetail', {
        parkId: selectedPark.id,
        parkName: selectedPark.name,
      });
    }
  }

  function handleCenterOnUser() {
    if (userLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: 14,
        animationDuration: 500,
      });
    }
  }

  // Polygon boundaries for OSM parks
  const parkPolygonsGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: parks
      .filter((p) => p.boundary_geojson)
      .map((p) => ({
        type: 'Feature' as const,
        id: p.id,
        geometry: JSON.parse(p.boundary_geojson!) as GeoJSON.Geometry,
        properties: {
          id: p.id,
          name: p.name,
          dog_count: p.dog_count,
          has_dogs: p.dog_count > 0,
        },
      })),
  };

  // Convert parks to GeoJSON for Mapbox
  const parksGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: parks.map((park) => ({
      type: 'Feature',
      id: park.id,
      geometry: {
        type: 'Point',
        coordinates: [park.longitude, park.latitude],
      },
      properties: {
        id: park.id,
        name: park.name,
        dog_count: park.dog_count,
        neighborhood: park.neighborhood,
        has_dogs: park.dog_count > 0,
      },
    })),
  };

  if (isLoading && parks.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  const initialCenter = userLocation
    ? [userLocation.longitude, userLocation.latitude]
    : [-73.985428, 40.748817]; // Default to NYC

  return (
    <View style={styles.container}>
      <MapView style={styles.map} styleURL={Mapbox.StyleURL.Street}>
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: initialCenter,
            zoomLevel: 12,
          }}
        />

        <LocationPuck puckBearing="heading" puckBearingEnabled={true} />

        {/* Park boundary polygons for OSM parks */}
        <ShapeSource
          id="parkPolygons"
          shape={parkPolygonsGeoJSON}
          onPress={(e: any) => {
            const feature = e.features?.[0];
            if (feature?.properties) {
              const park = parks.find((p) => p.id === feature.properties?.id);
              if (park) handleMarkerPress(park);
            }
          }}
        >
          <FillLayer
            id="parkPolygonFill"
            style={{
              fillColor: ['case', ['get', 'has_dogs'], 'rgba(52, 199, 89, 0.15)', 'rgba(0, 122, 255, 0.1)'] as any,
            }}
          />
          <LineLayer
            id="parkPolygonOutline"
            style={{
              lineColor: ['case', ['get', 'has_dogs'], '#34C759', '#007AFF'] as any,
              lineWidth: 2,
              lineOpacity: 0.8,
            }}
          />
        </ShapeSource>

        <ShapeSource
          id="parks"
          shape={parksGeoJSON}
          cluster={true}
          clusterRadius={50}
          clusterMaxZoomLevel={14}
          onPress={(e: any) => {
            const feature = e.features?.[0];
            if (feature?.properties && !feature.properties.cluster) {
              const park = parks.find((p) => p.id === feature.properties?.id);
              if (park) {
                handleMarkerPress(park);
              }
            }
          }}
        >
          {/* Clustered markers */}
          <CircleLayer
            id="clusteredParks"
            filter={['has', 'point_count'] as any}
            style={{
              circleColor: '#007AFF',
              circleRadius: ['step', ['get', 'point_count'], 20, 5, 25, 10, 30] as any,
              circleOpacity: 0.84,
              circleStrokeWidth: 2,
              circleStrokeColor: '#fff',
            }}
          />

          <SymbolLayer
            id="clusterCount"
            filter={['has', 'point_count'] as any}
            style={{
              textField: ['get', 'point_count_abbreviated'] as any,
              textSize: 14,
              textColor: '#fff',
              textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            }}
          />

          {/* Individual park markers - with dogs (green) */}
          <CircleLayer
            id="parkMarkersWithDogs"
            filter={['all', ['!', ['has', 'point_count']], ['get', 'has_dogs']] as any}
            style={{
              circleColor: '#34C759',
              circleRadius: 20,
              circleStrokeWidth: 3,
              circleStrokeColor: '#fff',
            }}
          />

          {/* Individual park markers - no dogs (blue) */}
          <CircleLayer
            id="parkMarkersNoDogs"
            filter={['all', ['!', ['has', 'point_count']], ['!', ['get', 'has_dogs']]] as any}
            style={{
              circleColor: '#007AFF',
              circleRadius: 20,
              circleStrokeWidth: 3,
              circleStrokeColor: '#fff',
            }}
          />

          {/* Dog count labels */}
          <SymbolLayer
            id="parkDogCount"
            filter={['!', ['has', 'point_count']] as any}
            style={{
              textField: ['to-string', ['get', 'dog_count']] as any,
              textSize: 14,
              textColor: '#fff',
              textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            }}
          />
        </ShapeSource>
      </MapView>

      {/* My Location Button */}
      <TouchableOpacity style={styles.myLocationButton} onPress={handleCenterOnUser}>
        <Text style={styles.myLocationIcon}>📍</Text>
      </TouchableOpacity>

      {/* Park Info Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>

            {selectedPark && (
              <>
                <Text style={styles.modalParkName}>{selectedPark.name}</Text>
                <Text style={styles.modalNeighborhood}>{selectedPark.neighborhood}</Text>

                <View style={styles.dogCountContainer}>
                  <View
                    style={[
                      styles.dogCountBadge,
                      selectedPark.dog_count > 0 ? styles.dogCountActive : styles.dogCountEmpty,
                    ]}
                  >
                    <Text style={styles.dogCountNumber}>{selectedPark.dog_count}</Text>
                    <Text style={styles.dogCountLabel}>
                      {selectedPark.dog_count === 1 ? 'dog' : 'dogs'} here now
                    </Text>
                  </View>
                </View>

                {isLoadingDetails ? (
                  <ActivityIndicator style={styles.detailsLoader} color="#007AFF" />
                ) : parkDetails && parkDetails.current_dogs.length > 0 ? (
                  <View style={styles.dogsPreview}>
                    <Text style={styles.dogsPreviewTitle}>Currently at park:</Text>
                    {parkDetails.current_dogs.slice(0, 3).map((dog: DogWithOwner) => (
                      <View key={dog.id} style={styles.dogPreviewItem}>
                        <Text style={styles.dogPreviewName}>{dog.name}</Text>
                        <Text style={styles.dogPreviewDetails}>
                          {dog.breed && `${dog.breed}`}
                          {dog.size && ` · ${dog.size}`}
                        </Text>
                      </View>
                    ))}
                    {parkDetails.current_dogs.length > 3 && (
                      <Text style={styles.moreDogsText}>
                        +{parkDetails.current_dogs.length - 3} more
                      </Text>
                    )}
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={handleViewFullDetails}
                >
                  <Text style={styles.viewDetailsButtonText}>View Full Details</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  myLocationIcon: {
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: height * 0.6,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 28,
    color: '#999',
    fontWeight: '300',
  },
  modalParkName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    paddingRight: 30,
  },
  modalNeighborhood: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  dogCountContainer: {
    marginBottom: 16,
  },
  dogCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  dogCountActive: {
    backgroundColor: '#E8F5E9',
  },
  dogCountEmpty: {
    backgroundColor: '#F5F5F5',
  },
  dogCountNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginRight: 8,
    color: '#333',
  },
  dogCountLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailsLoader: {
    marginVertical: 20,
  },
  dogsPreview: {
    marginBottom: 16,
  },
  dogsPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  dogPreviewItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  dogPreviewName: {
    fontSize: 16,
    fontWeight: '600',
  },
  dogPreviewDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  moreDogsText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 4,
  },
  viewDetailsButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewDetailsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
