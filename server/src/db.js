const mysql = require("mysql2/promise");

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

let pool;

function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: requiredEnv("DB_HOST"),
    port: Number(process.env.DB_PORT || 3306),
    user: requiredEnv("DB_USER"),
    password: process.env.DB_PASS || "",
    database: requiredEnv("DB_NAME"),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  return pool;
}

module.exports = { getPool };

