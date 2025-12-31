import { create, verify, getNumericDate } from "@djwt";
import type { JwtPayload } from "../models/types.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "your-secret-key";
const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(JWT_SECRET),
  { name: "HMAC", hash: "SHA-256" },
  true,
  ["sign", "verify"]
);

const JWT_EXPIRY_HOURS = 24 * 7; // 7 days

export async function generateToken(payload: Omit<JwtPayload, "exp">): Promise<string> {
  const jwt = await create(
    { alg: "HS256", typ: "JWT" },
    {
      ...payload,
      exp: getNumericDate(JWT_EXPIRY_HOURS * 3600),
    },
    key
  );
  return jwt;
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const payload = await verify(token, key);
    return payload as JwtPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}
