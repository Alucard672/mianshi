const express = require("express");
const { getPool } = require("../db");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query("SELECT id, title, target_keywords FROM jobs ORDER BY id DESC");
    res.json({ jobs: rows });
  } catch (e) {
    next(e);
  }
});

router.get("/:jobId", async (req, res, next) => {
  try {
    const jobId = Number(req.params.jobId);
    if (!Number.isFinite(jobId)) return res.status(400).json({ error: "jobId 参数不合法" });

    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id, title, target_keywords FROM jobs WHERE id = ? LIMIT 1",
      [jobId]
    );
    if (!rows.length) return res.status(404).json({ error: "未找到该岗位" });
    res.json({ job: rows[0] });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
