/* eslint-disable no-console */
const dotenv = require("dotenv");

dotenv.config();

async function boot() {
  const flag = String(process.env.DB_MIGRATE_ON_START || "").toLowerCase();
  const shouldMigrate = flag === "1" || flag === "true" || flag === "yes";

  if (shouldMigrate) {
    console.log("[boot] DB_MIGRATE_ON_START enabled; running migrations...");
    const { migrateDb } = require("./migrate-db");
    await migrateDb();
  }

  // Starts the HTTP server and mounts routes.
  require("../src/index");
}

boot().catch((e) => {
  console.error("[boot] FAILED:", e?.message || e);
  process.exit(1);
});

