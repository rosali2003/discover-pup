CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE parks
  ADD COLUMN IF NOT EXISTS osm_id BIGINT,
  ADD COLUMN IF NOT EXISTS boundary GEOMETRY(GEOMETRY, 4326);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parks_osm_id_key') THEN
    ALTER TABLE parks ADD CONSTRAINT parks_osm_id_key UNIQUE (osm_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_parks_boundary ON parks USING GIST (boundary)
  WHERE boundary IS NOT NULL;
