import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ParkDetailScreen from '../screens/ParkDetailScreen';
import MyDogsScreen from '../screens/MyDogsScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Navigation types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  MyDogs: undefined;
  Profile: undefined;
  Map: undefined;
};

export type HomeStackParamList = {
  HomeList: undefined;
  ParkDetail: { parkId: string; parkName: string };
};

export type MapStackParamList = {
  MapView: undefined;
  ParkDetail: { parkId: string; parkName: string };
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const MapStack = createStackNavigator<MapStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function HomeNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="HomeList"
        component={HomeScreen}
        options={{ title: 'Dog Parks' }}
      />
      <HomeStack.Screen
        name="ParkDetail"
        component={ParkDetailScreen}
        options={({ route }) => ({ title: route.params.parkName })}
      />
    </HomeStack.Navigator>
  );
}

function MapNavigator() {
  return (
    <MapStack.Navigator>
      <MapStack.Screen
        name="MapView"
        component={MapScreen}
        options={{ headerShown: false }}
      />
      <MapStack.Screen
        name="ParkDetail"
        component={ParkDetailScreen}
        options={({ route }) => ({ title: route.params.parkName })}
      />
    </MapStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <MainTab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          tabBarLabel: 'Parks',
          // tabBarIcon: () => null, // Add icons later
          headerShown: true,
          title: 'Dog Parks',
        }}
      />
      <MainTab.Screen
        name="MyDogs"
        component={MyDogsScreen}
        options={{
          tabBarLabel: 'My Dogs',
          headerShown: true,
          title: 'My Dogs',
        }}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          headerShown: true,
        }}
      />
      <MainTab.Screen
        name="Map"
        component={MapNavigator}
        options={{
          tabBarLabel: 'Map',
          headerShown: false,
        }}
      />
    </MainTab.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
