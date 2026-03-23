import pool from "../db/connection.ts";
import osmtogeojson from "osmtogeojson";

export interface SyncResult {
  fetched: number;
  upserted: number;
  deactivated: number;
  errors: string[];
}

const OVERPASS_QUERY = `
[out:json][timeout:60];
(
  node["leisure"="dog_park"](40.477,-74.259,40.917,-73.700);
  way["leisure"="dog_park"](40.477,-74.259,40.917,-73.700);
  relation["leisure"="dog_park"](40.477,-74.259,40.917,-73.700);
);
out body;
>;
out skel qt;
`.trim();

export async function syncNycDogParks(): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, upserted: 0, deactivated: 0, errors: [] };

  // Fetch from Overpass
  const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(OVERPASS_QUERY);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Overpass API returned ${res.status}`);
  }
  console.log('************', res);
  const osm = await res.json();
  const geojson = osmtogeojson(osm);

  const polygons = geojson.features.filter(
    (f: any) =>
      f.geometry &&
      (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
  );

  result.fetched = polygons.length;

  const client = await pool.connect();
  const upsertedOsmIds: number[] = [];

  try {
    await client.queryObject("BEGIN");

    for (const feature of polygons) {
      try {
        const osmId = parseInt((feature.id as string).split("/")[1], 10);
        const name = (feature.properties as any)?.name || "Unnamed Dog Park";
        const address = (feature.properties as any)?.["addr:street"] || null;
        const city = (feature.properties as any)?.["addr:city"] || "New York";
        const state = (feature.properties as any)?.["addr:state"] || "NY";
        const zipCode = (feature.properties as any)?.["addr:postcode"] || null;
        const geometryJson = JSON.stringify(feature.geometry);

        await client.queryObject(
          `INSERT INTO parks (osm_id, name, latitude, longitude, address, city, state, zip_code, boundary, is_active, geofence_radius)
           VALUES (
             $1, $2,
             ST_Y(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))),
             ST_X(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))),
             $4, $5, $6, $7,
             ST_SetSRID(ST_GeomFromGeoJSON($3), 4326),
             true, 100
           )
           ON CONFLICT (osm_id) DO UPDATE SET
             name = EXCLUDED.name,
             latitude = EXCLUDED.latitude,
             longitude = EXCLUDED.longitude,
             boundary = EXCLUDED.boundary,
             is_active = true,
             updated_at = CURRENT_TIMESTAMP`,
          [osmId, name, geometryJson, address, city, state, zipCode]
        );

        upsertedOsmIds.push(osmId);
        result.upserted++;
      } catch (err) {
        result.errors.push(`Feature ${feature.id}: ${(err as Error).message}`);
      }
    }

    // Deactivate parks no longer in OSM
    if (upsertedOsmIds.length > 0) {
      const deactivateResult = await client.queryObject<{ count: number }>(
        `UPDATE parks SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE osm_id IS NOT NULL AND is_active = true AND osm_id != ALL($1::bigint[])
         RETURNING id`,
        [upsertedOsmIds]
      );
      result.deactivated = deactivateResult.rows.length;
    }

    await client.queryObject("COMMIT");
  } catch (err) {
    await client.queryObject("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return result;
}
