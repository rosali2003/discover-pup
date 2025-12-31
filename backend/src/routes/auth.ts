import { Router } from "@oak";
import type { RouterContext } from "@oak";
import pool from "../db/connection.ts";
import { hashPassword, comparePassword } from "../utils/password.ts";
import { generateToken } from "../utils/jwt.ts";
import type { CreateUserDto, LoginDto, User } from "../models/types.ts";

const router = new Router();

/**
 * POST /auth/register
 * Register a new user with email and password
 */
router.post("/auth/register", async (ctx: RouterContext<string>) => {
  const body = await ctx.request.body({ type: "json" }).value;
  const { email, password, first_name, last_name }: CreateUserDto = body;

  if (!email || !password) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: "Email and password are required",
    };
    return;
  }

  // Validate email format
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: "Invalid email format",
    };
    return;
  }

  // Validate password strength
  if (password.length < 8) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: "Password must be at least 8 characters long",
    };
    return;
  }

  const client = await pool.connect();

  try {
    // Check if user already exists
    const existing = await client.queryObject<User>(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      ctx.response.status = 409;
      ctx.response.body = {
        success: false,
        error: "User with this email already exists",
      };
      return;
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const result = await client.queryObject<User>(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name, created_at`,
      [email, password_hash, first_name || null, last_name || null]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = await generateToken({
      user_id: user.id,
      email: user.email,
    });

    ctx.response.status = 201;
    ctx.response.body = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          created_at: user.created_at,
        },
        token,
      },
    };
  } catch (error) {
    console.error("Registration error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to register user",
    };
  } finally {
    client.release();
  }
});

/**
 * POST /auth/login
 * Login with email and password
 */
router.post("/auth/login", async (ctx: RouterContext<string>) => {
  const body = await ctx.request.body({ type: "json" }).value;
  const { email, password }: LoginDto = body;

  if (!email || !password) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: "Email and password are required",
    };
    return;
  }

  const client = await pool.connect();

  try {
    // Find user by email
    const result = await client.queryObject<User>(
      `SELECT id, email, password_hash, first_name, last_name, avatar_url
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      ctx.response.status = 401;
      ctx.response.body = {
        success: false,
        error: "Invalid email or password",
      };
      return;
    }

    const user = result.rows[0];

    // Check if user has a password (might be OAuth-only)
    if (!user.password_hash) {
      ctx.response.status = 401;
      ctx.response.body = {
        success: false,
        error: "Please login with your social account",
      };
      return;
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash);

    if (!isValid) {
      ctx.response.status = 401;
      ctx.response.body = {
        success: false,
        error: "Invalid email or password",
      };
      return;
    }

    // Update last login
    await client.queryObject(
      "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    // Generate JWT token
    const token = await generateToken({
      user_id: user.id,
      email: user.email,
    });

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url,
        },
        token,
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to login",
    };
  } finally {
    client.release();
  }
});

/**
 * GET /auth/me
 * Get current user info (requires auth)
 */
router.get("/auth/me", async (ctx: RouterContext<string>) => {
  const userId = ctx.state.userId;

  if (!userId) {
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      error: "Not authenticated",
    };
    return;
  }

  const client = await pool.connect();

  try {
    const result = await client.queryObject<User>(
      `SELECT id, email, first_name, last_name, avatar_url, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: "User not found",
      };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Get user error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to get user info",
    };
  } finally {
    client.release();
  }
});

export default router;
