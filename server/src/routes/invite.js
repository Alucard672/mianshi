const express = require("express");
const { getPool } = require("../db");

const router = express.Router();

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return Number.isFinite(t) && t < Date.now();
}

router.get("/:token", async (req, res, next) => {
  try {
    const token = String(req.params.token || "").trim();
    if (!token) return res.status(400).json({ error: "token 不能为空" });
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT i.id, i.job_id, i.token, i.max_uses, i.used_count, i.expires_at, i.created_at,
              j.title AS job_title, j.target_keywords
         FROM invitations i
         JOIN jobs j ON j.id = i.job_id
        WHERE i.token = ?
        LIMIT 1`,
      [token]
    );
    if (!rows.length) return res.status(404).json({ error: "邀请链接不存在" });
    const inv = rows[0];
    const expired = isExpired(inv.expires_at);
    const exhausted = inv.used_count >= inv.max_uses;

    res.json({
      invitation: {
        id: inv.id,
        token: inv.token,
        job_id: inv.job_id,
        max_uses: inv.max_uses,
        used_count: inv.used_count,
        expires_at: inv.expires_at,
        created_at: inv.created_at,
        expired,
        exhausted
      },
      job: {
        id: inv.job_id,
        title: inv.job_title,
        target_keywords: inv.target_keywords
      }
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
