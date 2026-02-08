/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

dotenv.config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function stripLineComments(sql) {
  return sql
    .split(/\r?\n/g)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

function splitStatements(sql) {
  return stripLineComments(sql)
    .split(/;\s*\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isIgnorableMysqlError(e) {
  const code = e && e.code;
  return (
    code === "ER_DUP_FIELDNAME" ||
    code === "ER_DUP_KEYNAME" ||
    code === "ER_TABLE_EXISTS_ERROR" ||
    code === "ER_DUP_ENTRY"
  );
}

async function main() {
  const host = required("DB_HOST");
  const port = Number(process.env.DB_PORT || 3306);
  const user = required("DB_USER");
  const password = process.env.DB_PASS || "";
  const dbName = required("DB_NAME");

  const migrationsDir = path.join(__dirname, "..", "db", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (!files.length) {
    console.log("[db:migrate] no migrations found");
    return;
  }

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

  for (const f of files) {
    const p = path.join(migrationsDir, f);
    const sql = fs.readFileSync(p, "utf8");
    const statements = splitStatements(sql);
    console.log(`[db:migrate] applying ${f} (${statements.length} statements)`);
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await conn.query(stmt);
      } catch (e) {
        if (isIgnorableMysqlError(e)) continue;
        const head = stmt.split("\n").slice(0, 3).join(" ").slice(0, 220);
        console.error(`[db:migrate] ${f} statement #${i + 1} failed:`, head);
        throw e;
      }
    }
  }

  await conn.end();
  console.log("[db:migrate] OK");
}

main().catch((e) => {
  console.error("[db:migrate] FAILED:", e.code || "", e.message || e);
  process.exit(1);
});

