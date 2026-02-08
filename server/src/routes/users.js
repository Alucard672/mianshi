const express = require("express");
const { getPool } = require("../db");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id, username, email, created_at FROM users ORDER BY id DESC LIMIT 50"
    );
    res.json({ users: rows });
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim();
    if (!username) return res.status(400).json({ error: "请填写用户名" });
    if (!email) return res.status(400).json({ error: "请填写邮箱" });

    const pool = getPool();
    const [result] = await pool.query("INSERT INTO users (username, email) VALUES (?,?)", [
      username,
      email
    ]);
    res.status(201).json({ user: { id: result.insertId, username, email } });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
