const crypto = require("crypto");
const express = require("express");
const { getPool } = require("../db");
const { adminAuth, requireAdminRole, sha256Hex } = require("../middleware/adminAuth");
const { writeAuditLog, getActorEmployeeId, getIp, getUA } = require("../middleware/audit");

const router = express.Router();

function appBaseUrl() {
  return (process.env.APP_BASE_URL || "http://localhost:5173").replace(/\/+$/, "");
}

router.use(adminAuth);

// Jobs CRUD (no auth for MVP)
router.get("/jobs", async (_req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, title, target_keywords, requirements, responsibilities,
              salary_min, salary_max, salary_note, location, employment_type, experience_level, education,
              benefits, status, updated_at
         FROM jobs
        ORDER BY id DESC`
    );
    res.json({ jobs: rows });
  } catch (e) {
    next(e);
  }
});

router.post("/jobs", async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim();
    const targetKeywords = String(req.body.target_keywords || "").trim();
    if (!title) return res.status(400).json({ error: "请填写岗位名称" });
    if (!targetKeywords) return res.status(400).json({ error: "请填写岗位关键词（target_keywords）" });
    const pool = getPool();
    const requirements = req.body.requirements ?? null;
    const responsibilities = req.body.responsibilities ?? null;
    const salaryMin = req.body.salary_min == null ? null : Number(req.body.salary_min);
    const salaryMax = req.body.salary_max == null ? null : Number(req.body.salary_max);
    const salaryNote = req.body.salary_note ?? null;
    const location = req.body.location ?? null;
    const employmentType = req.body.employment_type ?? null;
    const experienceLevel = req.body.experience_level ?? null;
    const education = req.body.education ?? null;
    const benefits = req.body.benefits ?? null;
    const status = String(req.body.status || "open");

    const [r] = await pool.query(
      `INSERT INTO jobs
        (title, target_keywords, requirements, responsibilities, salary_min, salary_max, salary_note,
         location, employment_type, experience_level, education, benefits, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        title,
        targetKeywords,
        requirements,
        responsibilities,
        salaryMin,
        salaryMax,
        salaryNote,
        location,
        employmentType,
        experienceLevel,
        education,
        benefits,
        status
      ]
    );
    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "create",
      entityType: "job",
      entityId: r.insertId,
      meta: { title },
      ip: getIp(req),
      userAgent: getUA(req)
    });
    res.status(201).json({
      job: {
        id: r.insertId,
        title,
        target_keywords: targetKeywords,
        requirements,
        responsibilities,
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_note: salaryNote,
        location,
        employment_type: employmentType,
        experience_level: experienceLevel,
        education,
        benefits,
        status
      }
    });
  } catch (e) {
    next(e);
  }
});

router.put("/jobs/:jobId", async (req, res, next) => {
  try {
    const jobId = Number(req.params.jobId);
    if (!Number.isFinite(jobId)) return res.status(400).json({ error: "jobId 参数不合法" });
    const title = String(req.body.title || "").trim();
    const targetKeywords = String(req.body.target_keywords || "").trim();
    if (!title) return res.status(400).json({ error: "请填写岗位名称" });
    if (!targetKeywords) return res.status(400).json({ error: "请填写岗位关键词（target_keywords）" });

    const requirements = req.body.requirements ?? null;
    const responsibilities = req.body.responsibilities ?? null;
    const salaryMin = req.body.salary_min == null ? null : Number(req.body.salary_min);
    const salaryMax = req.body.salary_max == null ? null : Number(req.body.salary_max);
    const salaryNote = req.body.salary_note ?? null;
    const location = req.body.location ?? null;
    const employmentType = req.body.employment_type ?? null;
    const experienceLevel = req.body.experience_level ?? null;
    const education = req.body.education ?? null;
    const benefits = req.body.benefits ?? null;
    const status = String(req.body.status || "open");

    const pool = getPool();
    await pool.query(
      `UPDATE jobs
          SET title=?,
              target_keywords=?,
              requirements=?,
              responsibilities=?,
              salary_min=?,
              salary_max=?,
              salary_note=?,
              location=?,
              employment_type=?,
              experience_level=?,
              education=?,
              benefits=?,
              status=?
        WHERE id=?`,
      [
        title,
        targetKeywords,
        requirements,
        responsibilities,
        salaryMin,
        salaryMax,
        salaryNote,
        location,
        employmentType,
        experienceLevel,
        education,
        benefits,
        status,
        jobId
      ]
    );
    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "update",
      entityType: "job",
      entityId: jobId,
      meta: { title },
      ip: getIp(req),
      userAgent: getUA(req)
    });
    res.json({
      job: {
        id: jobId,
        title,
        target_keywords: targetKeywords,
        requirements,
        responsibilities,
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_note: salaryNote,
        location,
        employment_type: employmentType,
        experience_level: experienceLevel,
        education,
        benefits,
        status
      }
    });
  } catch (e) {
    next(e);
  }
});

router.delete("/jobs/:jobId", async (req, res, next) => {
  try {
    const jobId = Number(req.params.jobId);
    if (!Number.isFinite(jobId)) return res.status(400).json({ error: "jobId 参数不合法" });
    const pool = getPool();
    await pool.query("DELETE FROM jobs WHERE id=?", [jobId]);
    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "delete",
      entityType: "job",
      entityId: jobId,
      meta: null,
      ip: getIp(req),
      userAgent: getUA(req)
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Question library CRUD
router.get("/questions", async (_req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id, content, category FROM questions ORDER BY id DESC LIMIT 200"
    );
    res.json({ questions: rows });
  } catch (e) {
    next(e);
  }
});

router.post("/questions", async (req, res, next) => {
  try {
    const content = String(req.body.content || "").trim();
    const category = String(req.body.category || "").trim() || null;
    if (!content) return res.status(400).json({ error: "请填写题目内容" });
    const pool = getPool();
    const [r] = await pool.query("INSERT INTO questions (content, category) VALUES (?,?)", [
      content,
      category
    ]);
    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "create",
      entityType: "question",
      entityId: r.insertId,
      meta: { category },
      ip: getIp(req),
      userAgent: getUA(req)
    });
    res.status(201).json({ question: { id: r.insertId, content, category } });
  } catch (e) {
    next(e);
  }
});

router.put("/questions/:questionId", async (req, res, next) => {
  try {
    const questionId = Number(req.params.questionId);
    if (!Number.isFinite(questionId)) return res.status(400).json({ error: "questionId 参数不合法" });
    const content = String(req.body.content || "").trim();
    const category = String(req.body.category || "").trim() || null;
    if (!content) return res.status(400).json({ error: "请填写题目内容" });
    const pool = getPool();
    await pool.query("UPDATE questions SET content=?, category=? WHERE id=?", [
      content,
      category,
      questionId
    ]);
    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "update",
      entityType: "question",
      entityId: questionId,
      meta: { category },
      ip: getIp(req),
      userAgent: getUA(req)
    });
    res.json({ question: { id: questionId, content, category } });
  } catch (e) {
    next(e);
  }
});

router.delete("/questions/:questionId", async (req, res, next) => {
  try {
    const questionId = Number(req.params.questionId);
    if (!Number.isFinite(questionId)) return res.status(400).json({ error: "questionId 参数不合法" });
    const pool = getPool();
    await pool.query("DELETE FROM questions WHERE id=?", [questionId]);
    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "delete",
      entityType: "question",
      entityId: questionId,
      meta: null,
      ip: getIp(req),
      userAgent: getUA(req)
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Invitations (invite link / QR)
router.post("/invitations", async (req, res, next) => {
  try {
    const jobId = Number(req.body.job_id);
    const maxUses = Number(req.body.max_uses || 1);
    const expiresInHours = req.body.expires_in_hours == null ? null : Number(req.body.expires_in_hours);
    if (!Number.isFinite(jobId)) return res.status(400).json({ error: "job_id 参数不合法" });
    if (!Number.isFinite(maxUses) || maxUses <= 0) return res.status(400).json({ error: "max_uses 参数不合法" });

    const expiresAt =
      expiresInHours == null
        ? null
        : new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");

    const token = crypto.randomUUID();
    const pool = getPool();

    const [jobs] = await pool.query("SELECT id FROM jobs WHERE id=? LIMIT 1", [jobId]);
    if (!jobs.length) return res.status(404).json({ error: "未找到该岗位" });

    const [r] = await pool.query(
      "INSERT INTO invitations (job_id, token, max_uses, used_count, expires_at) VALUES (?,?,?,?,?)",
      [jobId, token, maxUses, 0, expiresAt]
    );

    const inviteUrl = `${appBaseUrl()}/share/${encodeURIComponent(token)}`;
    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "generate",
      entityType: "invitation",
      entityId: r.insertId,
      meta: { jobId, maxUses, expiresAt },
      ip: getIp(req),
      userAgent: getUA(req)
    });
    res.status(201).json({
      invitation: { id: r.insertId, job_id: jobId, token, max_uses: maxUses, expires_at: expiresAt },
      inviteUrl
    });
  } catch (e) {
    next(e);
  }
});

// Employees CRUD
router.get("/employees", async (_req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id, name, email, phone, username, role, status, created_at FROM employees ORDER BY id DESC LIMIT 200"
    );
    res.json({ employees: rows });
  } catch (e) {
    next(e);
  }
});

router.post("/employees", requireAdminRole, async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim();
    const username = String(req.body.username || "").trim();
    const phone = String(req.body.phone || "").trim() || null;
    const password = String(req.body.password || "").trim();
    const role = String(req.body.role || "staff").trim();
    if (!name) return res.status(400).json({ error: "请填写员工姓名" });
    if (!email) return res.status(400).json({ error: "请填写员工邮箱" });
    if (!username) return res.status(400).json({ error: "请填写员工用户名" });
    if (!["staff", "admin"].includes(role)) return res.status(400).json({ error: "role 仅支持 staff/admin" });

    // generate one-time access token (show once)
    const accessToken = crypto.randomUUID();
    const accessTokenHash = sha256Hex(accessToken);
    const passwordHash = password ? sha256Hex(password) : null;

    const pool = getPool();
    const [r] = await pool.query(
      "INSERT INTO employees (name, email, phone, username, password_hash, role, status, access_token_hash) VALUES (?,?,?,?,?,?,?,?)",
      [name, email, phone, username, passwordHash, role, "active", accessTokenHash]
    );
    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "create",
      entityType: "employee",
      entityId: r.insertId,
      meta: { email, role, username },
      ip: getIp(req),
      userAgent: getUA(req)
    });
    res.status(201).json({
      employee: { id: r.insertId, name, email, phone, username, role, status: "active" },
      accessToken
    });
  } catch (e) {
    if (e && e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "邮箱或用户名已存在" });
    next(e);
  }
});

router.put("/employees/:employeeId", requireAdminRole, async (req, res, next) => {
  try {
    const employeeId = Number(req.params.employeeId);
    if (!Number.isFinite(employeeId)) return res.status(400).json({ error: "employeeId 参数不合法" });
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim();
    const username = String(req.body.username || "").trim();
    const phone = String(req.body.phone || "").trim() || null;
    const role = String(req.body.role || "staff").trim();
    const status = String(req.body.status || "active").trim();
    if (!name) return res.status(400).json({ error: "请填写员工姓名" });
    if (!email) return res.status(400).json({ error: "请填写员工邮箱" });
    if (!username) return res.status(400).json({ error: "请填写员工用户名" });
    if (!["staff", "admin"].includes(role)) return res.status(400).json({ error: "role 仅支持 staff/admin" });
    if (!["active", "disabled"].includes(status)) return res.status(400).json({ error: "status 仅支持 active/disabled" });

    const pool = getPool();
    await pool.query("UPDATE employees SET name=?, email=?, phone=?, username=?, role=?, status=? WHERE id=?", [
      name,
      email,
      phone,
      username,
      role,
      status,
      employeeId
    ]);
    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "update",
      entityType: "employee",
      entityId: employeeId,
      meta: { email, phone, username, role, status },
      ip: getIp(req),
      userAgent: getUA(req)
    });
    res.json({ employee: { id: employeeId, name, email, phone, username, role, status } });
  } catch (e) {
    if (e && e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "邮箱或用户名已存在" });
    next(e);
  }
});

router.delete("/employees/:employeeId", requireAdminRole, async (req, res, next) => {
  try {
    const employeeId = Number(req.params.employeeId);
    if (!Number.isFinite(employeeId)) return res.status(400).json({ error: "employeeId 参数不合法" });
    const pool = getPool();
    await pool.query("DELETE FROM employees WHERE id=?", [employeeId]);
    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "delete",
      entityType: "employee",
      entityId: employeeId,
      meta: null,
      ip: getIp(req),
      userAgent: getUA(req)
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Audit logs (read-only)
router.get("/audit-logs", async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT a.id, a.actor_employee_id, e.name AS actor_name, a.action, a.entity_type, a.entity_id,
              a.meta_json, a.ip, a.user_agent, a.created_at
         FROM audit_logs a
         LEFT JOIN employees e ON e.id = a.actor_employee_id
        ORDER BY a.id DESC
        LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    res.json({ logs: rows, limit, offset });
  } catch (e) {
    next(e);
  }
});

// Candidate users CRUD (for department usage)
router.get("/users", async (_req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id, username, email, created_at FROM users ORDER BY id DESC LIMIT 200"
    );
    res.json({ users: rows });
  } catch (e) {
    next(e);
  }
});

router.post("/users", async (req, res, next) => {
  try {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim();
    if (!username) return res.status(400).json({ error: "请填写用户名" });
    if (!email) return res.status(400).json({ error: "请填写邮箱" });

    const pool = getPool();
    const [r] = await pool.query("INSERT INTO users (username, email) VALUES (?,?)", [username, email]);
    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "create",
      entityType: "user",
      entityId: r.insertId,
      meta: { email },
      ip: getIp(req),
      userAgent: getUA(req)
    });
    res.status(201).json({ user: { id: r.insertId, username, email, created_at: new Date().toISOString() } });
  } catch (e) {
    next(e);
  }
});

router.put("/users/:userId", async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: "userId 参数不合法" });
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim();
    if (!username) return res.status(400).json({ error: "请填写用户名" });
    if (!email) return res.status(400).json({ error: "请填写邮箱" });

    const pool = getPool();
    await pool.query("UPDATE users SET username=?, email=? WHERE id=?", [username, email, userId]);
    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "update",
      entityType: "user",
      entityId: userId,
      meta: { email },
      ip: getIp(req),
      userAgent: getUA(req)
    });
    res.json({ user: { id: userId, username, email } });
  } catch (e) {
    next(e);
  }
});

router.delete("/users/:userId", async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: "userId 参数不合法" });
    const pool = getPool();
    await pool.query("DELETE FROM users WHERE id=?", [userId]);
    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "delete",
      entityType: "user",
      entityId: userId,
      meta: null,
      ip: getIp(req),
      userAgent: getUA(req)
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Job posts (multi-job publish pages)
router.get("/posts", async (_req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id, title, slug, status, created_at, updated_at FROM job_posts ORDER BY id DESC LIMIT 200"
    );
    res.json({ posts: rows });
  } catch (e) {
    next(e);
  }
});

router.get("/posts/:postId", async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);
    if (!Number.isFinite(postId)) return res.status(400).json({ error: "postId 参数不合法" });
    const pool = getPool();
    const [[post]] = await pool.query(
      "SELECT id, title, slug, description, status, created_at, updated_at FROM job_posts WHERE id=? LIMIT 1",
      [postId]
    );
    if (!post) return res.status(404).json({ error: "未找到职位发布页" });
    const [jobs] = await pool.query(
      `SELECT j.id, j.title, j.target_keywords, j.requirements, j.responsibilities,
              j.salary_min, j.salary_max, j.salary_note, j.location, j.employment_type, j.experience_level, j.education,
              j.benefits, j.status, j.updated_at,
              jpj.ord
         FROM job_post_jobs jpj
         JOIN jobs j ON j.id = jpj.job_id
        WHERE jpj.post_id=?
        ORDER BY jpj.ord ASC`,
      [postId]
    );
    res.json({ post, jobs });
  } catch (e) {
    next(e);
  }
});

router.post("/posts", async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim();
    const slug = String(req.body.slug || "").trim();
    const description = req.body.description ?? null;
    const status = String(req.body.status || "published");
    const jobIds = Array.isArray(req.body.job_ids) ? req.body.job_ids.map((x) => Number(x)) : [];

    if (!title) return res.status(400).json({ error: "请填写发布页标题" });
    if (!slug) return res.status(400).json({ error: "请填写 slug" });
    if (!jobIds.length) return res.status(400).json({ error: "请至少选择 1 个岗位" });

    const pool = getPool();
    const [r] = await pool.query(
      "INSERT INTO job_posts (title, slug, description, status) VALUES (?,?,?,?)",
      [title, slug, description, status]
    );
    const postId = r.insertId;
    for (let i = 0; i < jobIds.length; i++) {
      const jobId = jobIds[i];
      if (!Number.isFinite(jobId)) continue;
      await pool.query("INSERT INTO job_post_jobs (post_id, job_id, ord) VALUES (?,?,?)", [
        postId,
        jobId,
        i + 1
      ]);
    }

    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "create",
      entityType: "job_post",
      entityId: postId,
      meta: { title, slug, jobCount: jobIds.length },
      ip: getIp(req),
      userAgent: getUA(req)
    });

    res.status(201).json({ post: { id: postId, title, slug, description, status } });
  } catch (e) {
    if (e && e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "slug 已存在，请换一个" });
    next(e);
  }
});

router.delete("/posts/:postId", async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);
    if (!Number.isFinite(postId)) return res.status(400).json({ error: "postId 参数不合法" });
    const pool = getPool();
    await pool.query("DELETE FROM job_posts WHERE id=?", [postId]);
    await writeAuditLog({
      actorEmployeeId: getActorEmployeeId(req),
      action: "delete",
      entityType: "job_post",
      entityId: postId,
      meta: null,
      ip: getIp(req),
      userAgent: getUA(req)
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
