// User types
export interface User {
  id: string;
  email: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  google_id?: string;
  apple_id?: string;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
}

export interface CreateUserDto {
  email: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  google_id?: string;
  apple_id?: string;
}

export interface LoginDto {
  email: string;
  password: string;
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
  created_at: Date;
  updated_at: Date;
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
  hours_json?: ParkHours;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ParkHours {
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  wednesday?: { open: string; close: string };
  thursday?: { open: string; close: string };
  friday?: { open: string; close: string };
  saturday?: { open: string; close: string };
  sunday?: { open: string; close: string };
}

export interface ParkWithDogCount extends Park {
  dog_count: number;
  current_dogs?: DogWithOwner[];
}

// Presence session types
export interface PresenceSession {
  id: string;
  dog_id: string;
  park_id: string;
  started_at: Date;
  ended_at?: Date;
  last_ping_at: Date;
  checkin_latitude?: number;
  checkin_longitude?: number;
  is_active: boolean;
}

export interface CreateSessionDto {
  dog_id: string;
  park_id: string;
  latitude: number;
  longitude: number;
}

export interface DogWithOwner extends Dog {
  owner_first_name?: string;
  owner_avatar_url?: string;
  session_started_at: Date;
  last_seen: Date;
}

// Location types
export interface Location {
  latitude: number;
  longitude: number;
}

// API response types
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
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// JWT payload
export interface JwtPayload {
  user_id: string;
  email: string;
  exp?: number;
}

// Context type for authenticated requests
export interface AuthContext {
  user_id: string;
  email: string;
}
