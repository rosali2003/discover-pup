import type { Location } from "../models/types.ts";

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if a location is within a geofence radius of a park
 */
export function isWithinGeofence(
  userLocation: Location,
  parkLocation: Location,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(userLocation, parkLocation);
  return distance <= radiusMeters;
}

/**
 * Find nearby parks within a given radius
 * This is a simple implementation - for production, use PostGIS spatial queries
 */
export function findNearbyParks(
  userLocation: Location,
  parks: Array<{ id: string; latitude: number; longitude: number }>,
  radiusMeters: number = 5000 // Default 5km
): Array<{ id: string; distance: number }> {
  return parks
    .map((park) => ({
      id: park.id,
      distance: calculateDistance(userLocation, {
        latitude: park.latitude,
        longitude: park.longitude,
      }),
    }))
    .filter((result) => result.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance);
}
