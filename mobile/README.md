# Discover Pup Mobile App

React Native mobile application for Discover Pup - find dogs at your local dog parks in real-time!

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android Emulator

## Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure API Endpoint

Edit `src/services/api.ts` and update the API_BASE_URL:

```typescript
const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'  // Your backend server
  : 'https://your-production-api.com';
```

For iOS Simulator: Use `http://localhost:8000`
For Android Emulator: Use `http://10.0.2.2:8000`
For Physical Device: Use your computer's local IP (e.g., `http://192.168.1.100:8000`)

### 3. Configure Mapbox

1. Sign up for a free Mapbox account: https://www.mapbox.com/
2. Get your access token and download token
3. Update `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@rnmapbox/maps",
        {
          "RNMapboxMapsDownloadToken": "YOUR_MAPBOX_DOWNLOAD_TOKEN"
        }
      ]
    ]
  }
}
```

## Running the App

### Start Development Server

```bash
npm start
```

This will open the Expo Developer Tools in your browser.

### Run on iOS Simulator (macOS only)

```bash
npm run ios
```

### Run on Android Emulator

```bash
npm run android
```

### Run on Physical Device

1. Install the Expo Go app on your phone
2. Scan the QR code from the Expo Developer Tools

## Features

### Browse Parks (No Location Required)
- View all dog parks in NYC
- See real-time count of dogs at each park
- Browse park details and amenities
- Auto-updates every 30 seconds via polling

### Check In (Location Required)
- Add your dogs to your profile
- Check in when you arrive at a park
- Location is verified using geofence
- Sessions auto-expire after 20 minutes of inactivity

### Real-Time Updates
- Park list updates every 30 seconds
- Park detail page updates every 15 seconds
- See which dogs are currently at each park
- View dog profiles and temperaments

## App Structure

```
mobile/
├── App.tsx                 # Root component
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx # Authentication state management
│   ├── navigation/
│   │   └── index.tsx       # Navigation configuration
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── HomeScreen.tsx          # Park list with polling
│   │   ├── ParkDetailScreen.tsx    # Park details with check-in
│   │   ├── MyDogsScreen.tsx        # Dog management
│   │   └── ProfileScreen.tsx
│   ├── services/
│   │   └── api.ts          # API client with axios
│   └── types/
│       └── index.ts        # TypeScript type definitions
```

## Key Technologies

- **Expo**: React Native development framework
- **React Navigation**: Stack and tab navigation
- **Axios**: HTTP client for API calls
- **Expo Location**: Location services for check-in
- **Expo Secure Store**: Secure token storage
- **Mapbox**: Maps integration (configured but not yet used in UI)

## Polling Implementation

The app uses simple polling instead of WebSockets:

- **Home Screen**: Polls every 30 seconds for park list
- **Park Detail Screen**: Polls every 15 seconds for current dogs
- Polling pauses when screen is not focused
- Uses `useFocusEffect` to manage polling lifecycle

## Location Permissions

The app requests location permissions only when checking in:

- **iOS**: Requires "When In Use" permission
- **Android**: Requires fine location permission
- Location is verified server-side using geofence
- No background location tracking

## Environment-Specific Configuration

### Development
- Points to `localhost:8000` or local network IP
- Detailed error messages shown
- Fast refresh enabled

### Production
- Update `API_BASE_URL` in `src/services/api.ts`
- Build production bundles:
  ```bash
  expo build:ios
  expo build:android
  ```

## Troubleshooting

### Cannot connect to backend
- Ensure backend is running on `http://localhost:8000`
- For physical device, use your computer's local IP
- Check firewall settings

### Location permissions denied
- Check phone settings and grant location permission
- iOS: Settings → Discover Pup → Location
- Android: Settings → Apps → Discover Pup → Permissions

### Expo Go issues
- Clear Expo cache: `expo start -c`
- Reinstall Expo Go app
- Try development build: `expo run:ios` or `expo run:android`

## Next Steps / Future Enhancements

- [ ] Add map view to show parks on a map (Mapbox already configured)
- [ ] Implement social OAuth login (Google/Apple)
- [ ] Add push notifications for favorite dogs
- [ ] Add dog photos and profile pictures
- [ ] Implement favorites and following
- [ ] Add park reviews and ratings
- [ ] Create onboarding flow for new users
- [ ] Add dark mode support

## Building for Production

### iOS

1. Configure app signing in `app.json`
2. Build:
   ```bash
   eas build --platform ios
   ```

### Android

1. Configure keystore
2. Build:
   ```bash
   eas build --platform android
   ```

## Support

For issues or questions, check the main project README or open an issue on GitHub.
