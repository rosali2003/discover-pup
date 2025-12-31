import { Context, Next, isHttpError } from "@oak";

/**
 * Global error handling middleware
 */
export async function errorHandler(ctx: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (err) {
    console.error("Error:", err);

    if (isHttpError(err)) {
      ctx.response.status = err.status;
      ctx.response.body = {
        success: false,
        error: err.message,
      };
    } else {
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Internal server error",
        ...(Deno.env.get("NODE_ENV") === "development" && {
          details: err.message,
          stack: err.stack,
        }),
      };
    }
  }
}

/**
 * Logger middleware
 */
export async function logger(ctx: Context, next: Next): Promise<void> {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.request.method} ${ctx.request.url.pathname} - ${ms}ms`);
}
