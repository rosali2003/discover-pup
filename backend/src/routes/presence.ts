import { Router } from "@oak";
import type { RouterContext } from "@oak";
import pool from "../db/connection.ts";
import { isWithinGeofence } from "../utils/geofence.ts";
import type {
  CreateSessionDto,
  PresenceSession,
  Park,
} from "../models/types.ts";

const router = new Router();

const PARK_CHECKIN_RADIUS_METERS = parseInt(
  Deno.env.get("PARK_CHECKIN_RADIUS_METERS") || "100"
);

/**
 * POST /presence/checkin
 * Check in a dog at a park (requires auth + location verification)
 */
router.post("/presence/checkin", async (ctx: RouterContext<string>) => {
  const userId = ctx.state.userId;

  if (!userId) {
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      error: "Authentication required",
    };
    return;
  }

  const body = await ctx.request.body({ type: "json" }).value;
  const { dog_id, park_id, latitude, longitude }: CreateSessionDto = body;

  if (!dog_id || !park_id || !latitude || !longitude) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: "dog_id, park_id, latitude, and longitude are required",
    };
    return;
  }

  const client = await pool.connect();

  try {
    // Verify the dog belongs to the user
    const dogResult = await client.queryObject(
      "SELECT owner_id FROM dogs WHERE id = $1 AND is_active = true",
      [dog_id]
    );

    if (dogResult.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: "Dog not found",
      };
      return;
    }

    const dog = dogResult.rows[0] as { owner_id: string };

    if (dog.owner_id !== userId) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "You do not own this dog",
      };
      return;
    }

    // Check if dog already has an active session
    const activeSessionResult = await client.queryObject<PresenceSession>(
      `SELECT * FROM presence_sessions
       WHERE dog_id = $1 AND is_active = true`,
      [dog_id]
    );

    if (activeSessionResult.rows.length > 0) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "Dog already checked in at another park",
        data: activeSessionResult.rows[0],
      };
      return;
    }

    // Get park details with optional polygon containment check
    const parkResult = await client.queryObject<Park & { within_boundary: boolean | null }>(
      `SELECT p.*,
        CASE WHEN p.boundary IS NOT NULL THEN
          ST_Within(ST_SetSRID(ST_MakePoint($2, $3), 4326), p.boundary)
        ELSE NULL END as within_boundary
       FROM parks p WHERE p.id = $1 AND p.is_active = true`,
      [park_id, longitude, latitude]
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

    // Verify user is within geofence — prefer polygon check, fall back to Haversine
    const isInGeofence =
      park.within_boundary !== null
        ? park.within_boundary
        : isWithinGeofence(
            { latitude, longitude },
            { latitude: Number(park.latitude), longitude: Number(park.longitude) },
            park.geofence_radius || PARK_CHECKIN_RADIUS_METERS
          );

    if (!isInGeofence) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "You must be at the park to check in",
        details: "Your location is outside the park's geofence",
      };
      return;
    }

    // Create presence session
    const sessionResult = await client.queryObject<PresenceSession>(
      `INSERT INTO presence_sessions
       (dog_id, park_id, checkin_latitude, checkin_longitude, started_at, last_ping_at, is_active)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true)
       RETURNING *`,
      [dog_id, park_id, latitude, longitude]
    );

    ctx.response.status = 201;
    ctx.response.body = {
      success: true,
      message: "Successfully checked in!",
      data: sessionResult.rows[0],
    };
  } catch (error) {
    console.error("Check-in error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to check in",
    };
  } finally {
    client.release();
  }
});

/**
 * POST /presence/checkout
 * Check out a dog (end active session)
 */
router.post("/presence/checkout", async (ctx: RouterContext<string>) => {
  const userId = ctx.state.userId;

  if (!userId) {
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      error: "Authentication required",
    };
    return;
  }

  const body = await ctx.request.body({ type: "json" }).value;
  const { dog_id } = body;

  if (!dog_id) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: "dog_id is required",
    };
    return;
  }

  const client = await pool.connect();

  try {
    // Verify the dog belongs to the user
    const dogResult = await client.queryObject(
      "SELECT owner_id FROM dogs WHERE id = $1",
      [dog_id]
    );

    if (dogResult.rows.length === 0 || (dogResult.rows[0] as any).owner_id !== userId) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Unauthorized",
      };
      return;
    }

    // End active session
    const result = await client.queryObject<PresenceSession>(
      `UPDATE presence_sessions
       SET is_active = false, ended_at = CURRENT_TIMESTAMP
       WHERE dog_id = $1 AND is_active = true
       RETURNING *`,
      [dog_id]
    );

    if (result.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: "No active session found",
      };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Successfully checked out!",
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Check-out error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to check out",
    };
  } finally {
    client.release();
  }
});

/**
 * POST /presence/ping
 * Update last_ping_at for active session (keep session alive)
 */
router.post("/presence/ping", async (ctx: RouterContext<string>) => {
  const userId = ctx.state.userId;

  if (!userId) {
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      error: "Authentication required",
    };
    return;
  }

  const body = await ctx.request.body({ type: "json" }).value;
  const { dog_id } = body;

  if (!dog_id) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: "dog_id is required",
    };
    return;
  }

  const client = await pool.connect();

  try {
    // Verify ownership and update ping
    const result = await client.queryObject<PresenceSession>(
      `UPDATE presence_sessions ps
       SET last_ping_at = CURRENT_TIMESTAMP
       FROM dogs d
       WHERE ps.dog_id = d.id
         AND d.owner_id = $1
         AND ps.dog_id = $2
         AND ps.is_active = true
       RETURNING ps.*`,
      [userId, dog_id]
    );

    if (result.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: "No active session found",
      };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Ping error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to ping",
    };
  } finally {
    client.release();
  }
});

/**
 * GET /presence/my-sessions
 * Get all sessions for the current user's dogs
 */
router.get("/presence/my-sessions", async (ctx: RouterContext<string>) => {
  const userId = ctx.state.userId;

  if (!userId) {
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      error: "Authentication required",
    };
    return;
  }

  const client = await pool.connect();

  try {
    const result = await client.queryObject(
      `SELECT ps.*, d.name as dog_name, p.name as park_name
       FROM presence_sessions ps
       JOIN dogs d ON d.id = ps.dog_id
       JOIN parks p ON p.id = ps.park_id
       WHERE d.owner_id = $1
       ORDER BY ps.started_at DESC
       LIMIT 50`,
      [userId]
    );

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: result.rows,
    };
  } catch (error) {
    console.error("Get sessions error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to get sessions",
    };
  } finally {
    client.release();
  }
});

export default router;
