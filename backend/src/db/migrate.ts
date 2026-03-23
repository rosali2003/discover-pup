import pool from "./connection.ts";

const MIGRATIONS = [
  { name: "001_initial_schema", file: "./migrations/001_initial_schema.sql" },
  { name: "002_seed_nyc_parks", file: "./migrations/002_seed_nyc_parks.sql" },
  { name: "003_more_parks",     file: "./migrations/003_more_parks.sql" },
  { name: "004_postgis_osm",    file: "./migrations/004_postgis_osm.sql" },
  { name: "005_cleanup_osm_parks", file: "./migrations/005_cleanup_osm_parks.sql" },
];

async function runMigrations() {
  console.log("Running database migrations...");

  const client = await pool.connect();

  try {
    // Create tracking table if it doesn't exist
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const migration of MIGRATIONS) {
      const already = await client.queryObject<{ name: string }>(
        "SELECT name FROM schema_migrations WHERE name = $1",
        [migration.name]
      );

      if (already.rows.length > 0) {
        console.log(`  skip ${migration.name} (already applied)`);
        continue;
      }

      console.log(`  applying ${migration.name}...`);
      const sql = await Deno.readTextFile(migration.file);
      await client.queryObject(sql);
      await client.queryObject(
        "INSERT INTO schema_migrations (name) VALUES ($1)",
        [migration.name]
      );
      console.log(`  ✓ ${migration.name}`);
    }

    console.log("\n✓ All migrations completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
  }

  await pool.end();
}

// Run migrations
if (import.meta.main) {
  runMigrations();
}
