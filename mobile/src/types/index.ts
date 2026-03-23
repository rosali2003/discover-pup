// User types
export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Dog types
export type DogSize = 'tiny' | 'small' | 'medium' | 'large' | 'giant';

export interface Dog {
  id: string;
  owner_id: string;
  name: string;
  breed?: string;
  size?: DogSize;
  weight_lbs?: number;
  age_years?: number;
  color?: string;
  photo_url?: string;
  temperament?: string[];
  bio?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDogDto {
  name: string;
  breed?: string;
  size?: DogSize;
  weight_lbs?: number;
  age_years?: number;
  color?: string;
  photo_url?: string;
  temperament?: string[];
  bio?: string;
}

// Park types
export interface Park {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  city: string;
  state?: string;
  zip_code?: string;
  neighborhood?: string;
  geofence_radius: number;
  description?: string;
  amenities?: string[];
  size_sqft?: number;
  photo_url?: string;
  is_active: boolean;
  created_at: string;
  osm_id?: number;
  boundary_geojson?: string; // GeoJSON geometry string from PostGIS
}

export interface ParkWithDogCount extends Park {
  dog_count: number;
  distance?: number;
}

export interface DogWithOwner extends Dog {
  owner_first_name?: string;
  owner_avatar_url?: string;
  session_started_at: string;
  last_seen: string;
}

export interface ParkDetails extends Park {
  dog_count: number;
  current_dogs: DogWithOwner[];
}

// Presence types
export interface PresenceSession {
  id: string;
  dog_id: string;
  park_id: string;
  started_at: string;
  ended_at?: string;
  last_ping_at: string;
  is_active: boolean;
}

// Location types
export interface Location {
  latitude: number;
  longitude: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}
