import pool from "./connection.ts";

async function runMigrations() {
  console.log("Running database migrations...");

  const client = await pool.connect();

  try {
    // Read and execute initial schema
    const schema = await Deno.readTextFile("./migrations/001_initial_schema.sql");
    await client.queryObject(schema);
    console.log("✓ Schema created successfully");

    // Seed NYC dog parks
    console.log("Seeding NYC dog parks...");
    const seedSql = await Deno.readTextFile("./migrations/002_seed_nyc_parks.sql");
    await client.queryObject(seedSql);
    console.log("✓ NYC parks seeded successfully");

    // Add more parks
    console.log("Adding more parks...");
    const moreParks = await Deno.readTextFile("./migrations/003_more_parks.sql");
    await client.queryObject(moreParks);
    console.log("✓ More parks added successfully");

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
