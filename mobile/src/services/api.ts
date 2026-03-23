import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import type {
  User,
  AuthResponse,
  Dog,
  CreateDogDto,
  Park,
  ParkWithDogCount,
  ParkDetails,
  PresenceSession,
  ApiResponse,
  PaginatedResponse,
  Location,
} from '../types';

// Configure this to point to your backend
// For iOS Simulator, use your Mac's local IP address
//'http://192.168.1.93:8000' for home
// 'http://10.0.116.121:8000' for office
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.93:8000' // Development - use your Mac's IP
  : 'https://your-production-api.com'; // Production

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse<any>>) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken();
        }
        return Promise.reject(error);
      }
    );
  }

  async setToken(token: string) {
    this.token = token;
    await SecureStore.setItemAsync('auth_token', token);
  }

  async loadToken() {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      this.token = token;
    }
    return token;
  }

  async clearToken() {
    this.token = null;
    await SecureStore.deleteItemAsync('auth_token');
  }

  // Auth endpoints
  async register(email: string, password: string, firstName?: string, lastName?: string): Promise<AuthResponse> {
    const response = await this.client.post<ApiResponse<AuthResponse>>('/auth/register', {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    });

    if (response.data.data) {
      await this.setToken(response.data.data.token);
      return response.data.data;
    }

    throw new Error(response.data.error || 'Registration failed');
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    });

    if (response.data.data) {
      await this.setToken(response.data.data.token);
      return response.data.data;
    }

    throw new Error(response.data.error || 'Login failed');
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<ApiResponse<User>>('/auth/me');

    if (response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to get user');
  }

  async logout() {
    await this.clearToken();
  }

  // Park endpoints
  async getParks(city?: string, limit = 50, offset = 0): Promise<PaginatedResponse<ParkWithDogCount>> {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const response = await this.client.get<PaginatedResponse<ParkWithDogCount>>(
      `/parks?${params.toString()}`
    );
    return response.data;
  }

  async getNearbyParks(location: Location, radius = 5000): Promise<ApiResponse<ParkWithDogCount[]>> {
    const params = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      radius: radius.toString(),
    });

    const response = await this.client.get<ApiResponse<ParkWithDogCount[]>>(
      `/parks/nearby?${params.toString()}`
    );
    return response.data;
  }

  async getParkDetails(parkId: string): Promise<ParkDetails> {
    const response = await this.client.get<ApiResponse<ParkDetails>>(`/parks/${parkId}`);

    if (response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to get park details');
  }

  // Dog endpoints
  async createDog(dog: CreateDogDto): Promise<Dog> {
    const response = await this.client.post<ApiResponse<Dog>>('/dogs', dog);

    if (response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to create dog');
  }

  async getMyDogs(): Promise<Dog[]> {
    const response = await this.client.get<ApiResponse<Dog[]>>('/dogs');
    return response.data.data || [];
  }

  async getDog(dogId: string): Promise<Dog> {
    const response = await this.client.get<ApiResponse<Dog>>(`/dogs/${dogId}`);

    if (response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to get dog');
  }

  async updateDog(dogId: string, updates: Partial<CreateDogDto>): Promise<Dog> {
    const response = await this.client.put<ApiResponse<Dog>>(`/dogs/${dogId}`, updates);

    if (response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to update dog');
  }

  async deleteDog(dogId: string): Promise<void> {
    await this.client.delete(`/dogs/${dogId}`);
  }

  // Presence endpoints
  async checkIn(dogId: string, parkId: string, location: Location): Promise<PresenceSession> {
    const response = await this.client.post<ApiResponse<PresenceSession>>('/presence/checkin', {
      dog_id: dogId,
      park_id: parkId,
      latitude: location.latitude,
      longitude: location.longitude,
    });

    if (response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to check in');
  }

  async checkOut(dogId: string): Promise<PresenceSession> {
    const response = await this.client.post<ApiResponse<PresenceSession>>('/presence/checkout', {
      dog_id: dogId,
    });

    if (response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to check out');
  }

  async ping(dogId: string): Promise<PresenceSession> {
    const response = await this.client.post<ApiResponse<PresenceSession>>('/presence/ping', {
      dog_id: dogId,
    });

    if (response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to ping');
  }

  async getMySessions(): Promise<any[]> {
    const response = await this.client.get<ApiResponse<any[]>>('/presence/my-sessions');
    return response.data.data || [];
  }
}

export default new ApiClient();
