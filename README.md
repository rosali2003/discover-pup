# Discover Pup 🐕

A real-time dog park discovery app that lets you see which dogs are currently at your local parks - built with the **Broadcasters + Viewers** model.

## The Concept

**Two roles, one experience:**

### Broadcasters 📍
Dog owners physically at a park who "check in" their dog:
- Must be at the park (location verified via geofence)
- Creates a live presence session
- Session auto-expires after 20 minutes without updates
- Can check out manually

### Viewers 👀
Anyone, anywhere who wants to see which dogs are at parks:
- No location permission needed to browse
- View any park from home, office, subway, etc.
- See real-time dog counts and profiles
- Decide if it's worth heading out based on who's there

## Tech Stack

### Backend
- **Deno** - Modern TypeScript runtime
- **PostgreSQL** - Database with PostGIS for geospatial queries
- **Oak** - Web framework (like Express for Deno)
- **JWT** - Authentication
- **Bcrypt** - Password hashing

### Mobile
- **React Native** - Cross-platform mobile framework
- **Expo** - Development toolchain
- **React Navigation** - Navigation
- **Axios** - HTTP client
- **Mapbox** - Maps (configured, not yet in UI)
- **Expo Location** - Location services

### Architecture Choices
- **Polling** instead of WebSockets (simpler, "good enough" for 30-60s updates)
- **JWT auth** instead of sessions (stateless, mobile-friendly)
- **Monorepo** structure (backend + mobile together)
- **PostgreSQL with PostGIS** for efficient geospatial queries

## Project Structure

```
discover-pup/
├── backend/                    # Deno API Server
│   ├── src/
│   │   ├── db/
│   │   │   ├── connection.ts   # PostgreSQL pool
│   │   │   └── migrate.ts      # Migration runner
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT authentication
│   │   │   └── error.ts        # Error handling
│   │   ├── routes/
│   │   │   ├── auth.ts         # Register/login endpoints
│   │   │   ├── parks.ts        # Park browsing (public)
│   │   │   ├── presence.ts     # Check-in/out (protected)
│   │   │   └── dogs.ts         # Dog CRUD (protected)
│   │   ├── models/
│   │   │   └── types.ts        # TypeScript types
│   │   ├── utils/
│   │   │   ├── jwt.ts          # JWT helpers
│   │   │   ├── password.ts     # Password hashing
│   │   │   └── geofence.ts     # Distance calculations
│   │   └── main.ts             # Server entry point
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_seed_nyc_parks.sql
│   ├── deno.json
│   ├── .env.example
│   └── README.md
│
├── mobile/                     # React Native App
│   ├── src/
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx # Auth state management
│   │   ├── navigation/
│   │   │   └── index.tsx       # Navigation setup
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   ├── HomeScreen.tsx          # Parks list with polling
│   │   │   ├── ParkDetailScreen.tsx    # Park details + check-in
│   │   │   ├── MyDogsScreen.tsx        # Dog management
│   │   │   └── ProfileScreen.tsx       # User profile
│   │   ├── services/
│   │   │   └── api.ts          # API client
│   │   └── types/
│   │       └── index.ts        # TypeScript types
│   ├── App.tsx
│   ├── app.json
│   ├── package.json
│   └── README.md
│
└── README.md                   # This file
```

## Quick Start

### 1. Prerequisites

- [Deno](https://deno.land/) 1.37+
- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/) 14+ with PostGIS extension
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (optional but recommended)

### 2. Backend Setup

```bash
# Install PostgreSQL and create database
createdb discoverpup

# Enable extensions
psql discoverpup -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql discoverpup -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Configure environment
cd backend
cp .env.example .env
# Edit .env with your database credentials

# Run migrations (creates tables + seeds 10 NYC parks)
deno task migrate

# Start server
deno task dev
```

Backend runs on http://localhost:8000

### 3. Mobile Setup

```bash
cd mobile
npm install

# Update API URL in src/services/api.ts if needed
# For iOS Simulator: http://localhost:8000
# For Android Emulator: http://10.0.2.2:8000
# For physical device: http://YOUR_LOCAL_IP:8000

npm start
```

Then press `i` for iOS or `a` for Android.

## Database Schema

### Core Tables

**users**
- Authentication (email/password or OAuth)
- Profile information

**dogs**
- Dog profiles owned by users
- Breed, size, temperament, photos

**parks**
- Dog park locations
- GPS coordinates with geofence radius
- Amenities, hours, descriptions

**presence_sessions**
- Check-in records (the heart of the app!)
- Links dog + park + timestamp
- Tracks last_ping_at for auto-expiry

### Key Queries

**Get parks with dog counts:**
```sql
SELECT p.*, COUNT(ps.id) as dog_count
FROM parks p
LEFT JOIN presence_sessions ps ON ps.park_id = p.id
  AND ps.is_active = true
  AND ps.last_ping_at > (CURRENT_TIMESTAMP - INTERVAL '20 minutes')
GROUP BY p.id;
```

**Auto-expire stale sessions:**
```sql
UPDATE presence_sessions
SET is_active = false, ended_at = last_ping_at + INTERVAL '20 minutes'
WHERE is_active = true
  AND last_ping_at < (CURRENT_TIMESTAMP - INTERVAL '20 minutes');
```

## API Endpoints

### Public (No Auth Required)

```
GET  /parks                # List parks with dog counts
GET  /parks/nearby         # Find parks near lat/lng
GET  /parks/:parkId        # Get park details + current dogs
```

### Protected (Auth Required)

```
POST /auth/register        # Create account
POST /auth/login           # Login
GET  /auth/me              # Get current user

POST /presence/checkin     # Check in (location verified!)
POST /presence/checkout    # Check out
POST /presence/ping        # Keep session alive

POST /dogs                 # Create dog
GET  /dogs                 # List my dogs
PUT  /dogs/:dogId          # Update dog
DELETE /dogs/:dogId        # Delete dog
```

## How Polling Works

Instead of WebSockets, we use simple HTTP polling:

**Home Screen (Park List)**
- Polls every 30 seconds when screen is focused
- Pauses when user navigates away
- Shows updated dog counts automatically

**Park Detail Screen**
- Polls every 15 seconds (more frequent)
- Updates the list of dogs currently at park
- Shows "last updated" timestamp

**Why polling?**
- Simpler to implement and debug
- Easier to deploy (no WebSocket infrastructure)
- "Good enough" for a 30-60s update interval
- Lower server resource usage for small user base
- Can upgrade to SSE/WebSockets later if needed

## Location & Privacy

**For Viewers (Browsing):**
- No location permission needed
- Browse any park from anywhere
- See all public dog profiles

**For Broadcasters (Check-in):**
- Location permission requested only when checking in
- Server validates you're within park's geofence radius (default 100m)
- Location coordinates stored only for verification
- Session auto-expires after 20 minutes

**Privacy Features:**
- No background location tracking
- No precise GPS pins shown to others (just "at park X")
- Sessions auto-expire for safety
- Location only used for check-in verification

## Seeded Data

The app comes with 10 NYC dog parks:
- Madison Square Park Dog Run
- Union Square Dog Run
- Washington Square Park Dog Run
- Chelsea Waterside Park Dog Run
- Tompkins Square Park Dog Run
- Carl Schurz Park Dog Run
- Riverside Park Dog Run (72nd St)
- J. Hood Wright Park Dog Run
- Prospect Park Dog Beach (Brooklyn)
- McCarren Park Dog Run (Brooklyn)

All with real coordinates, neighborhoods, and amenities!

## Features Implemented

- [x] User registration and login
- [x] JWT authentication
- [x] Browse parks from anywhere (no location needed)
- [x] Real-time dog counts via polling
- [x] Park details with current dogs
- [x] Location-verified check-in
- [x] Geofence validation
- [x] Auto-expire sessions after 20 min
- [x] Dog profile management
- [x] Polling for real-time updates
- [x] Session keepalive pings

## Future Enhancements

- [ ] OAuth login (Google/Apple) - stubbed but not implemented
- [ ] Map view with Mapbox
- [ ] Dog and park photos
- [ ] Favorite dogs and notifications
- [ ] Park reviews and ratings
- [ ] "Busy hours" heatmap
- [ ] Social features (follow dogs, play dates)
- [ ] Push notifications
- [ ] Analytics dashboard

## Development Tips

### Testing Check-in Locally

If you're not near a real park, modify the geofence radius:

1. In `backend/.env`:
   ```
   PARK_CHECKIN_RADIUS_METERS=50000  # 50km for testing
   ```

2. Or temporarily disable geofence check in `backend/src/routes/presence.ts`

### Adding Test Data

```bash
# Connect to database
psql discoverpup

# Create test user
INSERT INTO users (email, password_hash, first_name)
VALUES ('test@example.com', '$2b$...', 'Test');

# Create test dog
INSERT INTO dogs (owner_id, name, breed, size)
VALUES ('user-uuid', 'Buddy', 'Golden Retriever', 'large');
```

### Debugging API

```bash
# Test registration
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test park list
curl http://localhost:8000/parks
```

## Production Checklist

Before deploying:

- [ ] Change JWT_SECRET to a secure random value
- [ ] Configure CORS to restrict origins
- [ ] Set up proper database backups
- [ ] Add rate limiting
- [ ] Configure OAuth credentials (Google/Apple)
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Add analytics
- [ ] Configure production database URL
- [ ] Update API_BASE_URL in mobile app
- [ ] Build and sign mobile apps for stores

## Troubleshooting

**Backend won't start:**
- Check PostgreSQL is running: `psql discoverpup`
- Verify extensions: `SELECT * FROM pg_extension;`
- Check .env file exists and has correct DATABASE_URL

**Mobile can't connect:**
- iOS Simulator: use `http://localhost:8000`
- Android Emulator: use `http://10.0.2.2:8000`
- Physical device: use `http://YOUR_COMPUTER_IP:8000`
- Check firewall isn't blocking port 8000

**Location services not working:**
- Check phone settings granted location permission
- iOS: Settings → Discover Pup → Location → While Using
- Android: Settings → Apps → Discover Pup → Permissions → Location

## Contributing

This is a learning/portfolio project, but contributions are welcome!

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this for learning or building your own projects!

## Acknowledgments

Built as a full-stack TypeScript project to demonstrate:
- Deno backend development
- React Native mobile development
- Real-time features with polling
- Geospatial queries with PostGIS
- JWT authentication
- RESTful API design
- Monorepo project structure

---

Made with ❤️ for dog lovers and their pups!
