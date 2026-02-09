/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

// Prefer values from server/.env even if the host environment defines DB_* vars.
dotenv.config({ override: true });

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const host = required("DB_HOST");
  const port = Number(process.env.DB_PORT || 3306);
  const user = required("DB_USER");
  const password = process.env.DB_PASS || "";
  const dbName = required("DB_NAME");

  const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  // Connect without selecting a DB so we can CREATE DATABASE if missing.
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true
  });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`
  );
  await conn.query(`USE \`${dbName}\`;`);
  // Execute schema statements one-by-one so we can pinpoint errors.
  // Strip line comments so seed blocks that start with "--" don't get dropped.
  const sqlNoLineComments = schemaSql
    .split(/\r?\n/g)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = sqlNoLineComments
    .split(/;\s*\r?\n/g)
    .map((s) => s.trim())
    .filter((s) => s);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await conn.query(stmt);
    } catch (e) {
      const head = stmt.split("\n").slice(0, 3).join(" ").slice(0, 220);
      console.error(`[db:init] statement #${i + 1} failed:`, head);
      throw e;
    }
  }
  await conn.end();

  console.log(`[db:init] OK: ensured database '${dbName}' and applied schema.sql`);
}

main().catch((e) => {
  console.error("[db:init] FAILED:", e.code || "", e.message || e);
  process.exit(1);
});
