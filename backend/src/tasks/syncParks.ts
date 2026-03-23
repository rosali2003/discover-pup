import { syncNycDogParks } from "../services/osmSync.ts";

console.log("Starting NYC dog park sync...");

try {
  const result = await syncNycDogParks();
  console.log("Sync complete:", result);
  console.log(`  Fetched:     ${result.fetched}`);
  console.log(`  Upserted:    ${result.upserted}`);
  console.log(`  Deactivated: ${result.deactivated}`);
  if (result.errors.length > 0) {
    console.warn("Errors:");
    for (const err of result.errors) {
      console.warn(" -", err);
    }
  }
} catch (err) {
  console.error("Sync failed:", err);
  Deno.exit(1);
}

Deno.exit(0);
