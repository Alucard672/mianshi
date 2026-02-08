const crypto = require("crypto");
const { getPool } = require("../db");

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

function getBearerToken(req) {
  const raw = String(req.headers["authorization"] || "");
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

async function resolveEmployeeByToken(token) {
  const t = String(token || "").trim();
  if (!t) return null;
  const h = sha256Hex(t);
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT id, name, email, role, status FROM employees WHERE access_token_hash=? LIMIT 1",
    [h]
  );
  const e = rows[0] || null;
  if (!e) return null;
  if (String(e.status) !== "active") return null;
  return e;
}

// If ADMIN_TOKEN is set:
// - Accept admin token via x-admin-token / Bearer
// - OR accept employee token via x-employee-token / Bearer (then req.auth.employee is set)
// If ADMIN_TOKEN is not set: allow (dev mode).
async function adminAuth(req, res, next) {
  try {
    const expectedAdmin = String(process.env.ADMIN_TOKEN || "").trim();
    if (!expectedAdmin) return next();

    const adminToken = String(req.headers["x-admin-token"] || "").trim() || getBearerToken(req);
    if (adminToken && adminToken === expectedAdmin) {
      req.auth = { kind: "admin", employee: null };
      return next();
    }

    const employeeToken = String(req.headers["x-employee-token"] || "").trim() || getBearerToken(req);
    const employee = await resolveEmployeeByToken(employeeToken);
    if (employee) {
      req.auth = { kind: "employee", employee };
      return next();
    }

    return res.status(401).json({ error: "未授权：请先登录管理后台" });
  } catch (e) {
    next(e);
  }
}

function requireAdminRole(req, res, next) {
  const expectedAdmin = String(process.env.ADMIN_TOKEN || "").trim();
  if (!expectedAdmin) return next(); // dev mode
  if (req.auth?.kind === "admin") return next();
  if (req.auth?.kind === "employee" && req.auth.employee?.role === "admin") return next();
  return res.status(403).json({ error: "权限不足：需要管理员权限" });
}

module.exports = { adminAuth, requireAdminRole, sha256Hex };

