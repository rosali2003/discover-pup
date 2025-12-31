import { Router } from "@oak";
import type { RouterContext } from "@oak";
import pool from "../db/connection.ts";
import type { Dog, CreateDogDto } from "../models/types.ts";

const router = new Router();

/**
 * POST /dogs
 * Create a new dog for the current user
 */
router.post("/dogs", async (ctx: RouterContext<string>) => {
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
  const {
    name,
    breed,
    size,
    weight_lbs,
    age_years,
    color,
    photo_url,
    temperament,
    bio,
  }: CreateDogDto = body;

  if (!name) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: "Dog name is required",
    };
    return;
  }

  const client = await pool.connect();

  try {
    const result = await client.queryObject<Dog>(
      `INSERT INTO dogs
       (owner_id, name, breed, size, weight_lbs, age_years, color, photo_url, temperament, bio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        name,
        breed || null,
        size || null,
        weight_lbs || null,
        age_years || null,
        color || null,
        photo_url || null,
        temperament || null,
        bio || null,
      ]
    );

    ctx.response.status = 201;
    ctx.response.body = {
      success: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Create dog error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to create dog",
    };
  } finally {
    client.release();
  }
});

/**
 * GET /dogs
 * Get all dogs for the current user
 */
router.get("/dogs", async (ctx: RouterContext<string>) => {
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
    const result = await client.queryObject<Dog>(
      `SELECT * FROM dogs
       WHERE owner_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [userId]
    );

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: result.rows,
    };
  } catch (error) {
    console.error("Get dogs error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to get dogs",
    };
  } finally {
    client.release();
  }
});

/**
 * GET /dogs/:dogId
 * Get a specific dog by ID
 */
router.get("/dogs/:dogId", async (ctx: RouterContext<string>) => {
  const { dogId } = ctx.params;

  const client = await pool.connect();

  try {
    const result = await client.queryObject<Dog>(
      `SELECT d.*, u.first_name as owner_first_name
       FROM dogs d
       JOIN users u ON u.id = d.owner_id
       WHERE d.id = $1 AND d.is_active = true`,
      [dogId]
    );

    if (result.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: "Dog not found",
      };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Get dog error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to get dog",
    };
  } finally {
    client.release();
  }
});

/**
 * PUT /dogs/:dogId
 * Update a dog (owner only)
 */
router.put("/dogs/:dogId", async (ctx: RouterContext<string>) => {
  const userId = ctx.state.userId;
  const { dogId } = ctx.params;

  if (!userId) {
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      error: "Authentication required",
    };
    return;
  }

  const body = await ctx.request.body({ type: "json" }).value;
  const {
    name,
    breed,
    size,
    weight_lbs,
    age_years,
    color,
    photo_url,
    temperament,
    bio,
  } = body;

  const client = await pool.connect();

  try {
    // Verify ownership
    const ownerCheck = await client.queryObject(
      "SELECT owner_id FROM dogs WHERE id = $1",
      [dogId]
    );

    if (
      ownerCheck.rows.length === 0 ||
      (ownerCheck.rows[0] as any).owner_id !== userId
    ) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Unauthorized",
      };
      return;
    }

    // Update dog
    const result = await client.queryObject<Dog>(
      `UPDATE dogs
       SET
         name = COALESCE($1, name),
         breed = COALESCE($2, breed),
         size = COALESCE($3, size),
         weight_lbs = COALESCE($4, weight_lbs),
         age_years = COALESCE($5, age_years),
         color = COALESCE($6, color),
         photo_url = COALESCE($7, photo_url),
         temperament = COALESCE($8, temperament),
         bio = COALESCE($9, bio),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        name,
        breed,
        size,
        weight_lbs,
        age_years,
        color,
        photo_url,
        temperament,
        bio,
        dogId,
      ]
    );

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Update dog error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to update dog",
    };
  } finally {
    client.release();
  }
});

/**
 * DELETE /dogs/:dogId
 * Soft delete a dog (owner only)
 */
router.delete("/dogs/:dogId", async (ctx: RouterContext<string>) => {
  const userId = ctx.state.userId;
  const { dogId } = ctx.params;

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
    // Verify ownership and soft delete
    const result = await client.queryObject(
      `UPDATE dogs
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND owner_id = $2
       RETURNING id`,
      [dogId, userId]
    );

    if (result.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: "Dog not found or unauthorized",
      };
      return;
    }

    // Also end any active sessions
    await client.queryObject(
      `UPDATE presence_sessions
       SET is_active = false, ended_at = CURRENT_TIMESTAMP
       WHERE dog_id = $1 AND is_active = true`,
      [dogId]
    );

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Dog deleted successfully",
    };
  } catch (error) {
    console.error("Delete dog error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to delete dog",
    };
  } finally {
    client.release();
  }
});

export default router;
