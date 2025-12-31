import { Pool } from "@postgres";
import "@dotenv/load";

const DATABASE_URL = Deno.env.get("DATABASE_URL");

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

// Parse connection string
const dbUrl = new URL(DATABASE_URL);

const pool = new Pool({
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1), // Remove leading slash
  hostname: dbUrl.hostname,
  port: parseInt(dbUrl.port || "5432"),
}, 10); // Pool size of 10

export default pool;

// Helper function for transactions
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.queryObject("BEGIN");
    const result = await callback(client);
    await client.queryObject("COMMIT");
    return result;
  } catch (error) {
    await client.queryObject("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
