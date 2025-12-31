import { Application } from "@oak";
import { oakCors } from "@cors";
import "@dotenv/load";

// Middleware
import { errorHandler, logger } from "./middleware/error.ts";
import { requireAuth } from "./middleware/auth.ts";

// Routes
import authRoutes from "./routes/auth.ts";
import parkRoutes from "./routes/parks.ts";
import presenceRoutes from "./routes/presence.ts";
import dogRoutes from "./routes/dogs.ts";

const app = new Application();

const PORT = parseInt(Deno.env.get("PORT") || "8000");

// Global middleware
app.use(logger);
app.use(errorHandler);
app.use(
  oakCors({
    origin: "*", // Configure this properly in production
    credentials: true,
  })
);

// Public routes (no auth required)
app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());

app.use(parkRoutes.routes());
app.use(parkRoutes.allowedMethods());

// Protected routes (auth required)
app.use(requireAuth);
app.use(presenceRoutes.routes());
app.use(presenceRoutes.allowedMethods());

app.use(dogRoutes.routes());
app.use(dogRoutes.allowedMethods());

// Health check endpoint
app.use((ctx) => {
  if (ctx.request.url.pathname === "/health") {
    ctx.response.body = {
      success: true,
      message: "Discover Pup API is running",
      timestamp: new Date().toISOString(),
    };
  } else {
    ctx.response.status = 404;
    ctx.response.body = {
      success: false,
      error: "Route not found",
    };
  }
});

// Start background task to expire stale sessions
async function startSessionExpiryTask() {
  const { default: pool } = await import("./db/connection.ts");

  setInterval(async () => {
    try {
      const client = await pool.connect();
      const result = await client.queryObject<{ expire_stale_sessions: number }>(
        "SELECT expire_stale_sessions() as expired_count"
      );
      const expiredCount = result.rows[0]?.expire_stale_sessions || 0;
      if (expiredCount > 0) {
        console.log(`Expired ${expiredCount} stale session(s)`);
      }
      client.release();
    } catch (error) {
      console.error("Error expiring stale sessions:", error);
    }
  }, 5 * 60 * 1000); // Run every 5 minutes
}

console.log(`
╔══════════════════════════════════════╗
║      🐕 Discover Pup API 🐕         ║
╚══════════════════════════════════════╝

Server starting on port ${PORT}...
Environment: ${Deno.env.get("NODE_ENV") || "development"}

Available endpoints:
  POST   /auth/register
  POST   /auth/login
  GET    /auth/me

  GET    /parks
  GET    /parks/nearby
  GET    /parks/:parkId

  POST   /presence/checkin    (auth required)
  POST   /presence/checkout   (auth required)
  POST   /presence/ping       (auth required)
  GET    /presence/my-sessions (auth required)

  POST   /dogs                (auth required)
  GET    /dogs                (auth required)
  GET    /dogs/:dogId
  PUT    /dogs/:dogId         (auth required)
  DELETE /dogs/:dogId         (auth required)

  GET    /health
`);

// Start expiry task
startSessionExpiryTask();

await app.listen({ port: PORT });
