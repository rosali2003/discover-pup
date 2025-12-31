import { Router } from "@oak";
import type { RouterContext } from "@oak";
import pool from "../db/connection.ts";
import type { Park, ParkWithDogCount, DogWithOwner } from "../models/types.ts";

const router = new Router();

/**
 * GET /parks
 * List all parks with current dog counts (no auth required - global viewing)
 * Query params: city, limit, offset
 */
router.get("/parks", async (ctx: RouterContext<string>) => {
  const city = ctx.request.url.searchParams.get("city");
  const limit = parseInt(ctx.request.url.searchParams.get("limit") || "50");
  const offset = parseInt(ctx.request.url.searchParams.get("offset") || "0");

  const client = await pool.connect();

  try {
    // Build query with optional city filter
    let query = `
      SELECT
        p.*,
        COUNT(DISTINCT ps.id) FILTER (WHERE ps.is_active = true) as dog_count
      FROM parks p
      LEFT JOIN presence_sessions ps ON ps.park_id = p.id
        AND ps.is_active = true
        AND ps.last_ping_at > (CURRENT_TIMESTAMP - INTERVAL '20 minutes')
      WHERE p.is_active = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (city) {
      query += ` AND LOWER(p.city) = LOWER($${paramIndex})`;
      params.push(city);
      paramIndex++;
    }

    query += `
      GROUP BY p.id
      ORDER BY dog_count DESC, p.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await client.queryObject<ParkWithDogCount>(query, params);

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM parks WHERE is_active = true";
    const countParams: any[] = [];
    if (city) {
      countQuery += " AND LOWER(city) = LOWER($1)";
      countParams.push(city);
    }

    const countResult = await client.queryObject<{ total: number }>(
      countQuery,
      countParams
    );
    const total = Number(countResult.rows[0].total);

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: result.rows.map((row) => ({
        ...row,
        dog_count: Number(row.dog_count),
      })),
      pagination: {
        limit,
        offset,
        total,
        has_more: offset + limit < total,
      },
    };
  } catch (error) {
    console.error("List parks error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to list parks",
    };
  } finally {
    client.release();
  }
});

/**
 * GET /parks/nearby
 * Find parks near a given location (no auth required)
 * Query params: latitude, longitude, radius (in meters, default 5000)
 */
router.get("/parks/nearby", async (ctx: RouterContext<string>) => {
  const lat = parseFloat(ctx.request.url.searchParams.get("latitude") || "");
  const lng = parseFloat(ctx.request.url.searchParams.get("longitude") || "");
  const radius = parseInt(
    ctx.request.url.searchParams.get("radius") || "5000"
  );

  if (isNaN(lat) || isNaN(lng)) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: "Valid latitude and longitude are required",
    };
    return;
  }

  const client = await pool.connect();

  try {
    // Use PostGIS to find nearby parks
    const query = `
      SELECT
        p.*,
        COUNT(DISTINCT ps.id) FILTER (WHERE ps.is_active = true) as dog_count,
        ST_Distance(
          p.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance
      FROM parks p
      LEFT JOIN presence_sessions ps ON ps.park_id = p.id
        AND ps.is_active = true
        AND ps.last_ping_at > (CURRENT_TIMESTAMP - INTERVAL '20 minutes')
      WHERE
        p.is_active = true
        AND ST_DWithin(
          p.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      GROUP BY p.id
      ORDER BY distance ASC
    `;

    const result = await client.queryObject<
      ParkWithDogCount & { distance: number }
    >(query, [lng, lat, radius]);

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: result.rows.map((row) => ({
        ...row,
        dog_count: Number(row.dog_count),
        distance: Math.round(Number(row.distance)),
      })),
    };
  } catch (error) {
    console.error("Nearby parks error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to find nearby parks",
    };
  } finally {
    client.release();
  }
});

/**
 * GET /parks/:parkId
 * Get park details with current dogs (no auth required - global viewing)
 */
router.get("/parks/:parkId", async (ctx: RouterContext<string>) => {
  const { parkId } = ctx.params;

  const client = await pool.connect();

  try {
    // Get park details
    const parkResult = await client.queryObject<Park>(
      "SELECT * FROM parks WHERE id = $1 AND is_active = true",
      [parkId]
    );

    if (parkResult.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: "Park not found",
      };
      return;
    }

    const park = parkResult.rows[0];

    // Get current dogs at this park
    const dogsQuery = `
      SELECT
        d.*,
        u.first_name as owner_first_name,
        u.avatar_url as owner_avatar_url,
        ps.started_at as session_started_at,
        ps.last_ping_at as last_seen
      FROM presence_sessions ps
      JOIN dogs d ON d.id = ps.dog_id
      JOIN users u ON u.id = d.owner_id
      WHERE
        ps.park_id = $1
        AND ps.is_active = true
        AND ps.last_ping_at > (CURRENT_TIMESTAMP - INTERVAL '20 minutes')
      ORDER BY ps.started_at DESC
    `;

    const dogsResult = await client.queryObject<DogWithOwner>(dogsQuery, [
      parkId,
    ]);

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: {
        ...park,
        dog_count: dogsResult.rows.length,
        current_dogs: dogsResult.rows,
      },
    };
  } catch (error) {
    console.error("Get park error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to get park details",
    };
  } finally {
    client.release();
  }
});

export default router;
