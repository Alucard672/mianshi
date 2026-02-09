const crypto = require("crypto");
const path = require("path");

const express = require("express");
const multer = require("multer");
const { getPool } = require("../db");
const { parseResumeToText } = require("../ocr");
const { computeMatchRate } = require("../match");
const { parseKeywords, unique } = require("../utils/keywords");
const { hasCloudBaseConfig, uploadLocalFileToCloudBase } = require("../storage/cloudbase");

const router = express.Router();
const uploadsDir = path.join(__dirname, "..", "..", "uploads");

function extractCandidateProfile(resumeText) {
  const text = String(resumeText || "");
  const lower = text.toLowerCase();

  const emailMatch = lower.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  const email = emailMatch ? String(emailMatch[0]).trim() : "";

  // Mainland China 11-digit mobile numbers, tolerant of separators.
  const phoneMatch = text.replace(/\s+/g, "").match(/(?:\+?86)?1[3-9]\d{9}/);
  const phone = phoneMatch ? String(phoneMatch[0]).replace(/^\+?86/, "") : "";

  // Very lightweight "name" extraction: try "姓名" pattern, else fallback.
  let name = "";
  const nameMatch = text.match(/姓名[:：\s]*([^\s]{2,10})/);
  if (nameMatch && nameMatch[1]) name = String(nameMatch[1]).trim();
  if (!name) {
    // Fallback to first non-empty line (trim to a short-ish length).
    const firstLine = text.split(/\r?\n/).map((x) => String(x || "").trim()).find((x) => x) || "";
    name = firstLine.slice(0, 16);
  }

  return { name: name || "", email: email || "", phone: phone || "" };
}

function uuidFilename(originalName) {
  const ext = path.extname(originalName || "").slice(0, 16);
  return `${crypto.randomUUID()}${ext}`;
}

const applyUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, uuidFilename(file.originalname))
  }),
  // Keep a higher global ceiling; enforce per-field limits in handler.
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === "resume") {
      const ok = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ].includes(file.mimetype);
      if (!ok) return cb(new Error("不支持的简历文件类型（仅支持 PDF/Word）"));
      return cb(null, true);
    }
    if (file.fieldname === "image") {
      const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
      if (!ok) return cb(new Error("不支持的图片类型（仅支持 JPG/PNG/WebP）"));
      return cb(null, true);
    }
    if (file.fieldname === "video") {
      const ok = ["video/mp4"].includes(file.mimetype);
      if (!ok) return cb(new Error("不支持的视频类型（仅支持 MP4）"));
      return cb(null, true);
    }
    return cb(new Error(`不支持的上传字段：${file.fieldname}`));
  }
});

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

// Public apply via job post page:
// POST /api/public/posts/:slug/apply (multipart/form-data)
//  - job_id (required, must belong to post)
//  - resume (required, PDF/Word <= 5MB)
// Resume parsing will attempt to extract name/phone/email automatically.
//  - resume (required, PDF/Word <= 5MB)
//  - image (optional, JPG/PNG/WebP <= 5MB)
//  - video (optional, MP4 <= 50MB)
router.post(
  "/posts/:slug/apply",
  applyUpload.fields([
    { name: "resume", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 }
  ]),
  async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!slug) return res.status(400).json({ error: "slug 不能为空" });

    const jobId = Number(req.body.job_id);
    if (!Number.isFinite(jobId)) return res.status(400).json({ error: "job_id 参数不合法" });

    const userKeywordsInput = String(req.body.user_keywords || "").trim();

    const resumeFile = (req.files?.resume || [])[0];
    if (!resumeFile) return res.status(400).json({ error: "请上传简历文件（resume）" });
    if (Number(resumeFile.size || 0) > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "简历文件过大（最大 5MB）" });
    }

    const imageFile = (req.files?.image || [])[0] || null;
    if (imageFile && Number(imageFile.size || 0) > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "图片文件过大（最大 5MB）" });
    }
    const videoFile = (req.files?.video || [])[0] || null;

    const pool = getPool();
    const [[post]] = await pool.query("SELECT id, title, slug, status FROM job_posts WHERE slug=? LIMIT 1", [
      slug
    ]);
    if (!post) return res.status(404).json({ error: "未找到职位发布页" });

    // Verify job belongs to post
    const [[job]] = await pool.query(
      `SELECT j.id, j.title, j.target_keywords
         FROM job_post_jobs jpj
         JOIN jobs j ON j.id = jpj.job_id
        WHERE jpj.post_id=? AND jpj.job_id=?
        LIMIT 1`,
      [post.id, jobId]
    );
    if (!job) return res.status(400).json({ error: "所选岗位不属于该发布页" });

    // Store resume to /uploads and optionally upload to CloudBase
    const resumeAbsPath = path.join(uploadsDir, resumeFile.filename);
    let resumePath = `/uploads/${resumeFile.filename}`;
    let resumeFileId = null;
    let resumeUrl = null;
    if (hasCloudBaseConfig()) {
      const up = await uploadLocalFileToCloudBase({
        localPath: resumeAbsPath,
        cloudPathPrefix: "uploads/resumes"
      });
      resumeFileId = up.fileID;
      resumeUrl = up.tempUrl || null;
      resumePath = resumeUrl || resumePath;
    }

    // Optional image
    let imagePath = null;
    let imageFileId = null;
    let imageUrl = null;
    if (imageFile) {
      const imageAbsPath = path.join(uploadsDir, imageFile.filename);
      imagePath = `/uploads/${imageFile.filename}`;
      if (hasCloudBaseConfig()) {
        const up = await uploadLocalFileToCloudBase({
          localPath: imageAbsPath,
          cloudPathPrefix: "uploads/images"
        });
        imageFileId = up.fileID;
        imageUrl = up.tempUrl || null;
        imagePath = imageUrl || imagePath;
      }
    }

    // Optional intro video (reuses interviews.video_* columns)
    let videoPath = null;
    let videoFileId = null;
    let videoUrl = null;
    if (videoFile) {
      const videoAbsPath = path.join(uploadsDir, videoFile.filename);
      videoPath = `/uploads/${videoFile.filename}`;
      if (hasCloudBaseConfig()) {
        const up = await uploadLocalFileToCloudBase({
          localPath: videoAbsPath,
          cloudPathPrefix: "uploads/intro-videos"
        });
        videoFileId = up.fileID;
        videoUrl = up.tempUrl || null;
        videoPath = videoUrl || videoPath;
      }
    }

    // OCR parse (best-effort)
    let resumeText = "";
    try {
      resumeText = await parseResumeToText({ filePath: resumeAbsPath });
    } catch {
      resumeText = "";
    }

    // Matching (best-effort for MVP): user_keywords + derived hits from resume text
    const jobKeywordsNormalized = unique(parseKeywords(job.target_keywords));
    const resumeLower = String(resumeText || "").toLowerCase();
    const derived = resumeLower
      ? jobKeywordsNormalized.filter((k) => k && resumeLower.includes(String(k).toLowerCase()))
      : [];
    const mergedKeywords = unique([...parseKeywords(userKeywordsInput), ...derived]);
    const mergedRaw = mergedKeywords.join(",");
    const { matchRate } = computeMatchRate(mergedRaw, job.target_keywords);

    // Extract candidate profile best-effort from resume text (name/phone/email).
    // Do this AFTER OCR parse so we can de-dup by extracted email.
    const prof = extractCandidateProfile(resumeText);
    let name = String(prof.name || "").trim();
    let phone = String(prof.phone || "").trim();
    let email = String(prof.email || "").trim();
    if (!email) email = `unknown+${crypto.randomUUID()}@local.invalid`;
    if (!name) name = "候选人";

    // user: reuse by email if exists; otherwise create
    let userId = null;
    const [[existing]] = await pool.query(
      "SELECT id, status FROM users WHERE email=? ORDER BY id DESC LIMIT 1",
      [email]
    );
    if (existing?.id) {
      if (String(existing.status || "active") === "disabled") {
        return res.status(403).json({ error: "该候选人账号已被停用，请联系管理员" });
      }
      userId = Number(existing.id);
      await pool.query("UPDATE users SET username=?, phone=? WHERE id=?", [name, phone || null, userId]);
    } else {
      const [ur] = await pool.query("INSERT INTO users (username, email, phone, status) VALUES (?,?,?,?)", [
        name,
        email,
        phone || null,
        "active"
      ]);
      userId = ur.insertId;
    }

    // Always assign questions for first-round video answers; use match_rate for HR filtering later.
    const stage = "QUESTIONS_ASSIGNED";

    const publicToken = crypto.randomUUID();

    const [ir] = await pool.query(
      "INSERT INTO interviews (user_id, job_id, invite_id, public_token, resume_path, resume_file_id, image_path, image_file_id, video_path, video_file_id, user_keywords, resume_text, match_rate, total_score, stage, second_round_invited) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)",
      [
        userId,
        jobId,
        null,
        publicToken,
        resumePath,
        resumeFileId,
        imagePath,
        imageFileId,
        videoPath,
        videoFileId,
        mergedRaw,
        resumeText,
        matchRate,
        null,
        stage
      ]
    );
    const interviewId = ir.insertId;

    // Assign 3 random questions for first-round.
    const [rows] = await pool.query("SELECT id, content, category FROM questions ORDER BY RAND() LIMIT 3");
    const questions = rows || [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await pool.query("INSERT INTO interview_questions (interview_id, question_id, ord) VALUES (?,?,?)", [
        interviewId,
        q.id,
        i + 1
      ]);
      await pool.query(
        "INSERT INTO results (interview_id, question_id, user_answer, answer_video_path, item_score) VALUES (?,?,?,?,?)",
        [interviewId, q.id, "", null, 0]
      );
    }

    res.json({
      ok: true,
      interviewId,
      publicToken,
      post: { id: post.id, title: post.title, slug: post.slug },
      job: { id: job.id, title: job.title },
      user: { id: userId, username: name, email, phone },
      resumePath,
      resumeFileId,
      resumeUrl,
      imagePath,
      imageFileId,
      imageUrl,
      videoPath,
      videoFileId,
      videoUrl,
      matchRate: Number(Number(matchRate || 0).toFixed(2)),
      stage,
      questions
    });
  } catch (e) {
    if (e && e.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "上传文件过大（最大 50MB）" });
    if (e && String(e.message || "").includes("不支持")) return res.status(400).json({ error: e.message });
    next(e);
  }
});

// Upload answer videos for assigned questions (no login; protected by interview public_token)
// POST /api/public/interviews/:id/answers (multipart/form-data)
//  - token (required, must match interviews.public_token)
//  - video_<questionId> files (MP4)
const answerUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, uuidFilename(file.originalname))
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (_req, file, cb) => {
    if (!String(file.fieldname || "").startsWith("video_")) return cb(new Error("不支持的上传字段"));
    if (file.mimetype !== "video/mp4") return cb(new Error("不支持的视频类型（仅支持 MP4）"));
    return cb(null, true);
  }
});

router.post("/interviews/:interviewId/answers", answerUpload.any(), async (req, res, next) => {
  try {
    const interviewId = Number(req.params.interviewId);
    if (!Number.isFinite(interviewId)) return res.status(400).json({ error: "interviewId 参数不合法" });
    const token = String(req.body.token || req.query.token || "").trim();
    if (!token) return res.status(400).json({ error: "token 不能为空" });

    const pool = getPool();
    const [[it]] = await pool.query("SELECT id, public_token FROM interviews WHERE id=? LIMIT 1", [interviewId]);
    if (!it) return res.status(404).json({ error: "未找到面试记录" });
    if (String(it.public_token || "") !== token) return res.status(403).json({ error: "token 无效" });

    const [qrows] = await pool.query("SELECT question_id FROM interview_questions WHERE interview_id=?", [interviewId]);
    const allowed = new Set((qrows || []).map((x) => String(x.question_id)));
    if (!allowed.size) return res.status(400).json({ error: "当前面试未分配题目" });

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) return res.status(400).json({ error: "请上传答题视频" });

    const updates = [];
    for (const f of files) {
      const field = String(f.fieldname || "");
      const qid = field.startsWith("video_") ? field.slice("video_".length) : "";
      if (!qid || !allowed.has(String(qid))) continue;
      const videoAbsPath = path.join(uploadsDir, f.filename);
      let videoPath = `/uploads/${f.filename}`;
      let videoFileId = null;
      let videoUrl = null;
      if (hasCloudBaseConfig()) {
        const up = await uploadLocalFileToCloudBase({
          localPath: videoAbsPath,
          cloudPathPrefix: "uploads/answer-videos"
        });
        videoFileId = up.fileID;
        videoUrl = up.tempUrl || null;
        videoPath = videoUrl || videoPath;
      }
      updates.push({ qid: Number(qid), videoPath, videoFileId, videoUrl });
    }

    if (!updates.length) return res.status(400).json({ error: "未识别到有效的视频字段（video_<questionId>）" });

    for (const u of updates) {
      await pool.query(
        "UPDATE results SET answer_video_path=?, answer_video_file_id=? WHERE interview_id=? AND question_id=?",
        [u.videoPath, u.videoFileId, interviewId, u.qid]
      );
    }
    await pool.query("UPDATE interviews SET stage=? WHERE id=?", ["ANSWER_SUBMITTED", interviewId]);

    res.json({ ok: true, interviewId, uploaded: updates.map((x) => ({ questionId: x.qid, videoPath: x.videoPath })) });
  } catch (e) {
    if (e && e.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "上传文件过大（最大 50MB）" });
    if (e && String(e.message || "").includes("不支持")) return res.status(400).json({ error: e.message });
    next(e);
  }
});

module.exports = router;
