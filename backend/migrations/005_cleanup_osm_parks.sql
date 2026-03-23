-- Remove unnamed parks imported from OSM
DELETE FROM parks WHERE name = 'Unnamed Dog Park';

-- Re-insert hand-curated parks (skip if already present by name)
INSERT INTO parks (name, latitude, longitude, address, city, state, zip_code, neighborhood, description, amenities, geofence_radius, hours_json)
SELECT * FROM (VALUES
  (
    'Madison Square Park Dog Run',
    40.742054, -73.988084,
    'E 23rd St & Madison Ave', 'New York', 'NY', '10010', 'Flatiron',
    'Popular dog run in the heart of Flatiron. Separate areas for large and small dogs, with plenty of shade and seating for owners.',
    ARRAY['water-fountain', 'separate-small-dog-area', 'shade', 'seating'],
    80,
    '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "06:00", "close": "22:00"}}'::jsonb
  ),
  (
    'Union Square Dog Run',
    40.736671, -73.990802,
    '15th St & Union Square West', 'New York', 'NY', '10003', 'Union Square',
    'Spacious dog run near Union Square with great social scene. Popular with locals and their pups.',
    ARRAY['water-fountain', 'seating', 'double-gated-entry'],
    100,
    '{"monday": {"open": "06:00", "close": "23:00"}, "tuesday": {"open": "06:00", "close": "23:00"}, "wednesday": {"open": "06:00", "close": "23:00"}, "thursday": {"open": "06:00", "close": "23:00"}, "friday": {"open": "06:00", "close": "23:00"}, "saturday": {"open": "06:00", "close": "23:00"}, "sunday": {"open": "06:00", "close": "23:00"}}'::jsonb
  ),
  (
    'Washington Square Park Dog Run',
    40.731253, -73.997332,
    'Washington Square Park, Greenwich Village', 'New York', 'NY', '10012', 'Greenwich Village',
    'Classic Village dog run with a friendly, community vibe. Great for socializing dogs and meeting other owners.',
    ARRAY['water-fountain', 'seating', 'shade'],
    90,
    '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "06:00", "close": "22:00"}}'::jsonb
  ),
  (
    'Chelsea Waterside Park Dog Run',
    40.747619, -74.008529,
    'West 23rd St & 11th Ave', 'New York', 'NY', '10011', 'Chelsea',
    'Beautiful waterfront dog run with river views. Separate areas for different dog sizes, well-maintained facility.',
    ARRAY['water-fountain', 'separate-small-dog-area', 'shade', 'river-view', 'seating'],
    120,
    '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "06:00", "close": "22:00"}}'::jsonb
  ),
  (
    'Tompkins Square Park Dog Run',
    40.726440, -73.981360,
    'E 9th St & Avenue A', 'New York', 'NY', '10009', 'East Village',
    'Legendary East Village dog run, one of NYC''s first. Large space with mature trees and strong community presence.',
    ARRAY['water-fountain', 'shade', 'large-area', 'seating'],
    100,
    '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "06:00", "close": "22:00"}}'::jsonb
  ),
  (
    'Carl Schurz Park Dog Run',
    40.773922, -73.945733,
    'East End Ave & E 86th St', 'New York', 'NY', '10028', 'Upper East Side',
    'Upper East Side dog run with beautiful park surroundings. Well-maintained with great river views.',
    ARRAY['water-fountain', 'shade', 'river-view', 'seating'],
    90,
    '{"monday": {"open": "06:00", "close": "21:00"}, "tuesday": {"open": "06:00", "close": "21:00"}, "wednesday": {"open": "06:00", "close": "21:00"}, "thursday": {"open": "06:00", "close": "21:00"}, "friday": {"open": "06:00", "close": "21:00"}, "saturday": {"open": "06:00", "close": "21:00"}, "sunday": {"open": "06:00", "close": "21:00"}}'::jsonb
  ),
  (
    'Riverside Park Dog Run (72nd St)',
    40.781250, -73.987500,
    'Riverside Park at 72nd St', 'New York', 'NY', '10023', 'Upper West Side',
    'Popular Upper West Side spot with separate small and large dog areas. Great Hudson River views.',
    ARRAY['water-fountain', 'separate-small-dog-area', 'river-view', 'seating'],
    100,
    '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "06:00", "close": "22:00"}}'::jsonb
  ),
  (
    'J. Hood Wright Park Dog Run',
    40.851722, -73.937222,
    'Fort Washington Ave & W 173rd St', 'New York', 'NY', '10032', 'Washington Heights',
    'Washington Heights community dog park with friendly atmosphere. Great neighborhood spot.',
    ARRAY['water-fountain', 'seating', 'shade'],
    80,
    '{"monday": {"open": "06:00", "close": "21:00"}, "tuesday": {"open": "06:00", "close": "21:00"}, "wednesday": {"open": "06:00", "close": "21:00"}, "thursday": {"open": "06:00", "close": "21:00"}, "friday": {"open": "06:00", "close": "21:00"}, "saturday": {"open": "06:00", "close": "21:00"}, "sunday": {"open": "06:00", "close": "21:00"}}'::jsonb
  ),
  (
    'Prospect Park Dog Beach',
    40.660094, -73.969444,
    'Prospect Park, near 9th St entrance', 'Brooklyn', 'NY', '11215', 'Park Slope',
    'Unique dog-friendly beach area in Prospect Park! Dogs can swim and play in designated area during summer.',
    ARRAY['water-access', 'large-area', 'seasonal'],
    150,
    '{"monday": {"open": "05:00", "close": "21:00"}, "tuesday": {"open": "05:00", "close": "21:00"}, "wednesday": {"open": "05:00", "close": "21:00"}, "thursday": {"open": "05:00", "close": "21:00"}, "friday": {"open": "05:00", "close": "21:00"}, "saturday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "09:00", "close": "21:00"}}'::jsonb
  ),
  (
    'McCarren Park Dog Run',
    40.721389, -73.953056,
    'N 12th St & Bedford Ave', 'Brooklyn', 'NY', '11249', 'Williamsburg',
    'Williamsburg''s main dog run with separate areas for different sized dogs. Popular spot with hipster pups.',
    ARRAY['water-fountain', 'separate-small-dog-area', 'seating'],
    100,
    '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "06:00", "close": "22:00"}}'::jsonb
  ),
  (
    'Central Park - Great Hill Dog Run',
    40.795833, -73.958611,
    'Central Park at 106th St', 'New York', 'NY', '10025', 'Upper West Side',
    'Beautiful off-leash area in the northern section of Central Park. Scenic and less crowded than downtown runs.',
    ARRAY['water-fountain', 'shade', 'large-area', 'scenic'],
    120,
    '{"monday": {"open": "06:00", "close": "09:00"}, "tuesday": {"open": "06:00", "close": "09:00"}, "wednesday": {"open": "06:00", "close": "09:00"}, "thursday": {"open": "06:00", "close": "09:00"}, "friday": {"open": "06:00", "close": "09:00"}, "saturday": {"open": "06:00", "close": "09:00"}, "sunday": {"open": "06:00", "close": "09:00"}}'::jsonb
  ),
  (
    'Fort Greene Park Dog Run',
    40.690833, -73.976389,
    'DeKalb Ave & Fort Greene Place', 'Brooklyn', 'NY', '11217', 'Fort Greene',
    'Historic Brooklyn park with active dog community. Hilly terrain gives dogs a great workout.',
    ARRAY['water-fountain', 'shade', 'hills', 'seating'],
    100,
    '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "06:00", "close": "22:00"}}'::jsonb
  ),
  (
    'DUMBO Dog Run',
    40.703889, -73.989722,
    'Main Street Park, Water St', 'Brooklyn', 'NY', '11201', 'DUMBO',
    'Waterfront dog run with stunning Manhattan skyline views. Popular with local tech workers and their pups.',
    ARRAY['water-fountain', 'seating', 'skyline-view', 'double-gated-entry'],
    80,
    '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "06:00", "close": "22:00"}}'::jsonb
  ),
  (
    'Astoria Park Dog Run',
    40.777500, -73.922778,
    'Shore Blvd & Hoyt Ave', 'Queens', 'NY', '11102', 'Astoria',
    'Queens'' premier dog park with East River views. Large enclosed area with active community.',
    ARRAY['water-fountain', 'large-area', 'river-view', 'seating', 'shade'],
    120,
    '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "06:00", "close": "22:00"}}'::jsonb
  ),
  (
    'Flushing Meadows Dog Run',
    40.746389, -73.844722,
    'Flushing Meadows Corona Park', 'Queens', 'NY', '11368', 'Flushing',
    'Spacious dog area near the Unisphere. Great for high-energy dogs who need room to run.',
    ARRAY['water-fountain', 'large-area', 'seating'],
    150,
    '{"monday": {"open": "06:00", "close": "21:00"}, "tuesday": {"open": "06:00", "close": "21:00"}, "wednesday": {"open": "06:00", "close": "21:00"}, "thursday": {"open": "06:00", "close": "21:00"}, "friday": {"open": "06:00", "close": "21:00"}, "saturday": {"open": "06:00", "close": "21:00"}, "sunday": {"open": "06:00", "close": "21:00"}}'::jsonb
  ),
  (
    'Clove Lakes Park Dog Run',
    40.621944, -74.113889,
    'Clove Rd & Victory Blvd', 'Staten Island', 'NY', '10301', 'Sunnyside',
    'Staten Island''s favorite dog park. Wooded setting with friendly community atmosphere.',
    ARRAY['water-fountain', 'shade', 'seating', 'wooded'],
    100,
    '{"monday": {"open": "06:00", "close": "21:00"}, "tuesday": {"open": "06:00", "close": "21:00"}, "wednesday": {"open": "06:00", "close": "21:00"}, "thursday": {"open": "06:00", "close": "21:00"}, "friday": {"open": "06:00", "close": "21:00"}, "saturday": {"open": "06:00", "close": "21:00"}, "sunday": {"open": "06:00", "close": "21:00"}}'::jsonb
  ),
  (
    'Van Cortlandt Park Dog Run',
    40.899722, -73.886667,
    'Van Cortlandt Park, Broadway entrance', 'Bronx', 'NY', '10471', 'Riverdale',
    'Large dog run in the Bronx''s biggest park. Plenty of space for dogs to explore and play.',
    ARRAY['water-fountain', 'large-area', 'shade', 'seating'],
    130,
    '{"monday": {"open": "06:00", "close": "21:00"}, "tuesday": {"open": "06:00", "close": "21:00"}, "wednesday": {"open": "06:00", "close": "21:00"}, "thursday": {"open": "06:00", "close": "21:00"}, "friday": {"open": "06:00", "close": "21:00"}, "saturday": {"open": "06:00", "close": "21:00"}, "sunday": {"open": "06:00", "close": "21:00"}}'::jsonb
  ),
  (
    'Pelham Bay Park Dog Run',
    40.867500, -73.806389,
    'Pelham Bay Park, near Orchard Beach', 'Bronx', 'NY', '10464', 'Pelham Bay',
    'Bronx waterfront dog area. Dogs can enjoy beach access during designated hours.',
    ARRAY['water-access', 'large-area', 'beach', 'seating'],
    150,
    '{"monday": {"open": "06:00", "close": "20:00"}, "tuesday": {"open": "06:00", "close": "20:00"}, "wednesday": {"open": "06:00", "close": "20:00"}, "thursday": {"open": "06:00", "close": "20:00"}, "friday": {"open": "06:00", "close": "20:00"}, "saturday": {"open": "06:00", "close": "20:00"}, "sunday": {"open": "06:00", "close": "20:00"}}'::jsonb
  ),
  (
    'Peter Detmold Park Dog Run',
    40.758056, -73.965000,
    'E 51st St & Beekman Place', 'New York', 'NY', '10022', 'Midtown East',
    'Quiet Midtown dog run with a local feel. Great escape from the busy city streets.',
    ARRAY['water-fountain', 'shade', 'seating', 'quiet'],
    70,
    '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "06:00", "close": "22:00"}}'::jsonb
  ),
  (
    'DeWitt Clinton Park Dog Run',
    40.766389, -73.994722,
    'W 52nd St & 11th Ave', 'New York', 'NY', '10019', 'Hell''s Kitchen',
    'Hell''s Kitchen''s go-to dog run. Spacious with separate areas for large and small dogs.',
    ARRAY['water-fountain', 'separate-small-dog-area', 'seating', 'double-gated-entry'],
    100,
    '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "06:00", "close": "22:00"}}'::jsonb
  )
) AS v(name, latitude, longitude, address, city, state, zip_code, neighborhood, description, amenities, geofence_radius, hours_json)
WHERE NOT EXISTS (
  SELECT 1 FROM parks WHERE parks.name = v.name
);
