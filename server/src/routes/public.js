const express = require("express");
const { getPool } = require("../db");

const router = express.Router();

router.get("/posts/:slug", async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!slug) return res.status(400).json({ error: "slug 不能为空" });
    const pool = getPool();
    const [[post]] = await pool.query(
      "SELECT id, title, slug, description, status, created_at, updated_at FROM job_posts WHERE slug=? LIMIT 1",
      [slug]
    );
    if (!post) return res.status(404).json({ error: "未找到职位发布页" });

    const [jobs] = await pool.query(
      `SELECT j.id, j.title, j.target_keywords, j.requirements, j.responsibilities,
              j.salary_min, j.salary_max, j.salary_note, j.location, j.employment_type, j.experience_level, j.education,
              j.benefits, j.status,
              jpj.ord
         FROM job_post_jobs jpj
         JOIN jobs j ON j.id = jpj.job_id
        WHERE jpj.post_id=?
        ORDER BY jpj.ord ASC`,
      [post.id]
    );
    res.json({ post, jobs });
  } catch (e) {
    next(e);
  }
});

module.exports = router;

