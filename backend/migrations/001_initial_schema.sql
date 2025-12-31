-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PostGIS is optional - comment out if not installed
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- Nullable for OAuth-only users
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url TEXT,

  -- OAuth fields
  google_id VARCHAR(255) UNIQUE,
  apple_id VARCHAR(255) UNIQUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Dogs table
CREATE TABLE dogs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  breed VARCHAR(100),

  -- Physical attributes
  size VARCHAR(20) CHECK (size IN ('tiny', 'small', 'medium', 'large', 'giant')),
  weight_lbs INTEGER CHECK (weight_lbs > 0 AND weight_lbs < 300),
  age_years DECIMAL(3,1) CHECK (age_years >= 0 AND age_years < 30),

  -- Appearance
  color VARCHAR(50),
  photo_url TEXT,

  -- Temperament (stored as array)
  temperament TEXT[], -- e.g., ['friendly', 'high-energy', 'good-with-small-dogs']

  -- Additional info
  bio TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Parks table
CREATE TABLE parks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,

  -- Location
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50),
  zip_code VARCHAR(10),
  neighborhood VARCHAR(100),

  -- Geofence radius in meters
  geofence_radius INTEGER DEFAULT 100,

  -- Park details
  description TEXT,
  amenities TEXT[], -- e.g., ['water-fountain', 'separate-small-dog-area', 'shade']
  size_sqft INTEGER,
  photo_url TEXT,

  -- Hours (store as JSON for flexibility)
  hours_json JSONB, -- e.g., {"monday": {"open": "06:00", "close": "22:00"}}

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for location-based queries (basic without PostGIS)
CREATE INDEX idx_parks_lat_lng ON parks(latitude, longitude);

-- Presence sessions table (the core of the broadcaster/viewer model)
CREATE TABLE presence_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  park_id UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,

  -- Session timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP WITH TIME ZONE,
  last_ping_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Location tracking (optional, for verification)
  checkin_latitude DECIMAL(10, 8),
  checkin_longitude DECIMAL(11, 8),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Note: unique constraint for active sessions handled by partial index below
  CONSTRAINT check_active_consistency CHECK (
    (is_active = true AND ended_at IS NULL) OR
    (is_active = false AND ended_at IS NOT NULL)
  )
);

-- Indexes for common queries
CREATE INDEX idx_presence_sessions_active ON presence_sessions (park_id, is_active) WHERE is_active = true;
CREATE INDEX idx_presence_sessions_dog ON presence_sessions (dog_id);
CREATE INDEX idx_presence_sessions_last_ping ON presence_sessions (last_ping_at) WHERE is_active = true;

-- Partial unique index to prevent multiple active sessions per dog (PostgreSQL 14 compatible)
CREATE UNIQUE INDEX idx_unique_active_dog_session ON presence_sessions (dog_id) WHERE is_active = true;

-- Favorites table (for users to favorite parks)
CREATE TABLE favorite_parks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  park_id UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Prevent duplicate favorites
  CONSTRAINT unique_user_park_favorite UNIQUE (user_id, park_id)
);

-- Dog connections (favorite other dogs, play dates)
CREATE TABLE dog_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  following_dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Prevent self-follows and duplicates
  CONSTRAINT no_self_follow CHECK (follower_dog_id != following_dog_id),
  CONSTRAINT unique_dog_connection UNIQUE (follower_dog_id, following_dog_id)
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dogs_updated_at BEFORE UPDATE ON dogs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parks_updated_at BEFORE UPDATE ON parks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-expire stale sessions
CREATE OR REPLACE FUNCTION expire_stale_sessions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE presence_sessions
    SET
      is_active = false,
      ended_at = last_ping_at + INTERVAL '20 minutes'
    WHERE
      is_active = true
      AND last_ping_at < (CURRENT_TIMESTAMP - INTERVAL '20 minutes')
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX idx_users_apple_id ON users(apple_id) WHERE apple_id IS NOT NULL;

-- Create indexes for dogs table
CREATE INDEX idx_dogs_owner ON dogs(owner_id);
CREATE INDEX idx_dogs_active ON dogs(is_active) WHERE is_active = true;
