# Discover Pup Backend API

Deno + PostgreSQL backend for the Discover Pup dog park presence app.

## Prerequisites

- [Deno](https://deno.land/) v1.37+
- PostgreSQL 14+
- PostgreSQL extensions: `uuid-ossp`, `postgis`

## Setup

### 1. Install PostgreSQL and Create Database

```bash
# macOS (with Homebrew)
brew install postgresql postgis
brew services start postgresql

# Create database
createdb discoverpup

# Enable extensions
psql discoverpup -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql discoverpup -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### 2. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/discoverpup
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=8000
```

### 3. Run Migrations

```bash
deno task migrate
```

This will:
- Create all database tables
- Set up indexes and constraints
- Seed 10 NYC dog parks

### 4. Start the Server

```bash
# Development (with auto-reload)
deno task dev

# Production
deno task start
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Authentication

```
POST   /auth/register        # Register with email/password
POST   /auth/login           # Login with email/password
GET    /auth/me              # Get current user (requires auth)
```

### Parks (Public - No Auth Required)

```
GET    /parks                # List all parks with dog counts
                             # Query: ?city=Brooklyn&limit=50&offset=0

GET    /parks/nearby         # Find nearby parks
                             # Query: ?latitude=40.7589&longitude=-73.9851&radius=5000

GET    /parks/:parkId        # Get park details with current dogs
```

### Presence (Requires Authentication)

```
POST   /presence/checkin     # Check in a dog at a park (geofence verified)
                             # Body: { dog_id, park_id, latitude, longitude }

POST   /presence/checkout    # Check out a dog
                             # Body: { dog_id }

POST   /presence/ping        # Keep session alive (update last_ping_at)
                             # Body: { dog_id }

GET    /presence/my-sessions # Get all sessions for user's dogs
```

### Dogs (Requires Authentication)

```
POST   /dogs                 # Create a new dog
GET    /dogs                 # Get user's dogs
GET    /dogs/:dogId          # Get specific dog (public)
PUT    /dogs/:dogId          # Update dog (owner only)
DELETE /dogs/:dogId          # Delete dog (owner only)
```

### Health Check

```
GET    /health               # Server health check
```

## Authentication

Protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Tokens are valid for 7 days and returned upon registration or login.

## Broadcaster + Viewer Model

**Broadcasters** (check-in):
- Must be physically at the park (geofence validated)
- Creates a `presence_session` for their dog
- Session expires after 20 minutes of no pings

**Viewers** (browse):
- Can view any park from anywhere (no location required)
- See real-time list of dogs currently at each park
- All park and dog viewing endpoints are public

## Database Schema

Main tables:
- `users` - User accounts
- `dogs` - Dog profiles
- `parks` - Dog park locations
- `presence_sessions` - Active/historical check-ins

## Development Tips

### Manual Testing

```bash
# Register user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","first_name":"Test"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# List parks
curl http://localhost:8000/parks

# Get park details
curl http://localhost:8000/parks/<park-id>
```

### Database Access

```bash
# Connect to database
psql discoverpup

# Useful queries
SELECT * FROM parks;
SELECT * FROM presence_sessions WHERE is_active = true;
SELECT name, (SELECT COUNT(*) FROM presence_sessions WHERE park_id = p.id AND is_active = true) as dog_count FROM parks p;
```

## Production Considerations

- [ ] Configure CORS properly (restrict origins)
- [ ] Use environment-specific JWT secrets
- [ ] Set up database connection pooling limits
- [ ] Add rate limiting
- [ ] Set up OAuth for Google/Apple (endpoints exist but need API keys)
- [ ] Add monitoring and logging
- [ ] Configure proper error reporting
- [ ] Set up automated backups for PostgreSQL

## OAuth Setup (Optional)

To enable Google/Apple login:

1. **Google OAuth:**
   - Create project in Google Cloud Console
   - Enable Google+ API
   - Create OAuth credentials
   - Add to `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

2. **Apple Sign In:**
   - Configure in Apple Developer Portal
   - Add to `.env`: `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH`

Note: OAuth endpoints are stubbed but not fully implemented yet.
