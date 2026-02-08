const crypto = require("crypto");
const express = require("express");
const { getPool } = require("../db");
const { adminAuth, sha256Hex } = require("../middleware/adminAuth");
const { sha256Hex: passwordHash } = require("../auth/password");

const router = express.Router();

router.get("/whoami", adminAuth, async (req, res) => {
  // In dev mode (no ADMIN_TOKEN), treat as anonymous admin.
  if (!String(process.env.ADMIN_TOKEN || "").trim()) {
    return res.json({ kind: "dev", employee: null });
  }
  if (req.auth?.kind === "admin") return res.json({ kind: "admin", employee: null });
  return res.json({ kind: "employee", employee: req.auth?.employee || null });
});

router.post("/employee/login", async (req, res, next) => {
  try {
    const token = String(req.body.token || "").trim();
    if (!token) return res.status(400).json({ error: "请填写员工授权码" });
    const h = sha256Hex(token);
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id, name, email, role, status FROM employees WHERE access_token_hash=? LIMIT 1",
      [h]
    );
    const e = rows[0] || null;
    if (!e || String(e.status) !== "active") {
      return res.status(400).json({ error: "授权码无效或账号已禁用" });
    }
    res.json({ employee: e });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/login
// body: { username, password }
// returns: { employee, token } where token is an API token stored in employees.access_token_hash
router.post("/login", async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier || "").trim();
    const password = String(req.body.password || "").trim();
    if (!identifier) return res.status(400).json({ error: "请输入用户名或手机号" });
    if (!password) return res.status(400).json({ error: "请输入密码" });

    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id, name, email, phone, username, role, status, password_hash FROM employees WHERE username=? OR phone=? LIMIT 1",
      [identifier, identifier]
    );
    const e = rows[0] || null;
    if (!e || String(e.status) !== "active") {
      return res.status(400).json({ error: "账号不存在或已禁用" });
    }
    const expected = String(e.password_hash || "");
    if (!expected || expected !== passwordHash(password)) {
      return res.status(400).json({ error: "用户名或密码错误" });
    }

    // Issue a fresh API token for admin APIs (stored as hash).
    const token = crypto.randomUUID();
    const h = sha256Hex(token);
    await pool.query("UPDATE employees SET access_token_hash=? WHERE id=?", [h, e.id]);

    res.json({
      employee: { id: e.id, name: e.name, email: e.email, phone: e.phone, username: e.username, role: e.role, status: e.status },
      token
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
