import { Context, Next } from "@oak";
import { verifyToken, extractTokenFromHeader } from "../utils/jwt.ts";

export interface AuthState {
  userId: string;
  email: string;
}

/**
 * Middleware to require authentication on protected routes
 */
export async function requireAuth(
  ctx: Context<AuthState>,
  next: Next
): Promise<void> {
  const authHeader = ctx.request.headers.get("Authorization");
  const token = extractTokenFromHeader(authHeader || "");

  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      error: "No authorization token provided",
    };
    return;
  }

  const payload = await verifyToken(token);

  if (!payload) {
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      error: "Invalid or expired token",
    };
    return;
  }

  // Set user context
  ctx.state.userId = payload.user_id;
  ctx.state.email = payload.email;

  await next();
}

/**
 * Optional auth middleware - sets user context if token is valid, but doesn't require it
 */
export async function optionalAuth(
  ctx: Context<AuthState>,
  next: Next
): Promise<void> {
  const authHeader = ctx.request.headers.get("Authorization");
  const token = extractTokenFromHeader(authHeader || "");

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      ctx.state.userId = payload.user_id;
      ctx.state.email = payload.email;
    }
  }

  await next();
}
