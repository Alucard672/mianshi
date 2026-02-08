const { getPool } = require("../db");

function safeJson(v) {
  try {
    if (v == null) return null;
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

async function writeAuditLog({ actorEmployeeId, action, entityType, entityId, meta, ip, userAgent }) {
  const pool = getPool();
  const metaJson = safeJson(meta);
  await pool.query(
    "INSERT INTO audit_logs (actor_employee_id, action, entity_type, entity_id, meta_json, ip, user_agent) VALUES (?,?,?,?,CAST(? AS JSON),?,?)",
    [
      actorEmployeeId || null,
      String(action || "unknown"),
      String(entityType || "unknown"),
      entityId || null,
      metaJson,
      ip || null,
      userAgent || null
    ]
  );
}

function getActorEmployeeId(req) {
  const id = req.auth?.employee?.id;
  return Number.isFinite(id) ? id : null;
}

function getIp(req) {
  // best effort (no proxy trust config in MVP)
  return req.ip || req.connection?.remoteAddress || null;
}

function getUA(req) {
  const ua = String(req.headers["user-agent"] || "").slice(0, 255);
  return ua || null;
}

module.exports = { writeAuditLog, getActorEmployeeId, getIp, getUA };
