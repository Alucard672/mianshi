const crypto = require("crypto");
const path = require("path");

const express = require("express");
const multer = require("multer");

const { getPool } = require("../db");
const { computeMatchRate } = require("../match");
const { pickRandomQuestions } = require("../questions");
const { scoreAnswer } = require("../score");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "..", "uploads");

function uuidFilename(originalName) {
  const ext = path.extname(originalName || "").slice(0, 16);
  const id = crypto.randomUUID();
  return `${id}${ext}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, uuidFilename(file.originalname))
});

function fileFilter(_req, file, cb) {
  const isResume =
    file.fieldname === "resume" &&
    [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ].includes(file.mimetype);
  const isVideo = file.fieldname === "video" && ["video/mp4"].includes(file.mimetype);

  if (!isResume && !isVideo) return cb(new Error("不支持的文件类型"));
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // max per file; resume checked separately
  }
});

// POST /api/interview/init
// multipart/form-data:
//  - resume: PDF/Word (<5MB recommended, hard limit 10MB here)
//  - video: MP4 (<50MB)
//  - user_id, job_id, user_keywords
router.post(
  "/init",
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "video", maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const userId = Number(req.body.user_id);
      const jobId = Number(req.body.job_id);
      const userKeywords = String(req.body.user_keywords || "");
      if (!Number.isFinite(userId) || !Number.isFinite(jobId)) {
        return res.status(400).json({ error: "user_id 和 job_id 必须是数字" });
      }
      if (!userKeywords.trim()) return res.status(400).json({ error: "请填写 user_keywords（用户关键词）" });

      const resumeFile = (req.files?.resume || [])[0];
      const videoFile = (req.files?.video || [])[0];
      if (!resumeFile || !videoFile) {
        return res.status(400).json({ error: "请同时上传简历（resume）和视频（video）" });
      }
      if (resumeFile.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "简历文件过大（最大 10MB）" });
      }

      const pool = getPool();

      // fetch job keywords for matching
      const [jobs] = await pool.query("SELECT id, target_keywords FROM jobs WHERE id=? LIMIT 1", [jobId]);
      if (!jobs.length) return res.status(404).json({ error: "未找到该岗位" });
      const jobKeywords = jobs[0].target_keywords;

      const { matchRate, hits, job } = computeMatchRate(userKeywords, jobKeywords);

      const resumePath = `/uploads/${resumeFile.filename}`;
      const videoPath = `/uploads/${videoFile.filename}`;

      const [result] = await pool.query(
        "INSERT INTO interviews (user_id, job_id, resume_path, video_path, user_keywords, match_rate, total_score) VALUES (?,?,?,?,?,?,NULL)",
        [userId, jobId, resumePath, videoPath, userKeywords, matchRate]
      );
      const interviewId = result.insertId;

      const passed = matchRate >= 60;
      let questions = [];
      if (passed) questions = await pickRandomQuestions(pool, 5);

      res.json({
        interviewId,
        resumePath,
        videoPath,
        match: {
          matchRate: Number(matchRate.toFixed(2)),
          passed,
          hits,
          jobKeywords: job
        },
        questions
      });
    } catch (e) {
      // multer / filter errors -> 400
      if (e && String(e.message || "").includes("不支持的文件类型")) {
        return res.status(400).json({ error: e.message });
      }
      if (e && e.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "文件过大" });
      }
      next(e);
    }
  }
);

// POST /api/interview/:interviewId/answer
// JSON: { question_id, user_answer }
router.post("/:interviewId/answer", async (req, res, next) => {
  try {
    const interviewId = Number(req.params.interviewId);
    const questionId = Number(req.body.question_id);
    const userAnswer = String(req.body.user_answer || "");
    if (!Number.isFinite(interviewId) || !Number.isFinite(questionId)) {
      return res.status(400).json({ error: "interviewId 或 question_id 参数不合法" });
    }
    if (!userAnswer.trim()) return res.status(400).json({ error: "请填写 user_answer（回答内容）" });

    const pool = getPool();
    const [[interview]] = await pool.query(
      "SELECT id, job_id FROM interviews WHERE id = ? LIMIT 1",
      [interviewId]
    );
    if (!interview) return res.status(404).json({ error: "未找到该面试记录" });

    const [[job]] = await pool.query("SELECT target_keywords FROM jobs WHERE id=? LIMIT 1", [interview.job_id]);
    const coreKeywords = job?.target_keywords || "";

    const { total, breakdown } = scoreAnswer({ answer: userAnswer, coreKeywords });

    await pool.query(
      "INSERT INTO results (interview_id, question_id, user_answer, item_score) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE user_answer=VALUES(user_answer), item_score=VALUES(item_score)",
      [interviewId, questionId, userAnswer, total]
    );

    const [[agg]] = await pool.query(
      "SELECT SUM(item_score) AS sum_score, COUNT(*) AS cnt FROM results WHERE interview_id=?",
      [interviewId]
    );
    const totalScore = agg?.cnt ? Number(agg.sum_score) : 0;
    await pool.query("UPDATE interviews SET total_score=? WHERE id=?", [totalScore, interviewId]);

    res.json({ interviewId, questionId, itemScore: total, breakdown, totalScore });
  } catch (e) {
    next(e);
  }
});

// GET /api/interview/:interviewId
router.get("/:interviewId", async (req, res, next) => {
  try {
    const interviewId = Number(req.params.interviewId);
    if (!Number.isFinite(interviewId)) return res.status(400).json({ error: "interviewId 参数不合法" });

    const pool = getPool();
    const [[interview]] = await pool.query(
      "SELECT id, user_id, job_id, resume_path, video_path, user_keywords, match_rate, total_score, created_at FROM interviews WHERE id=? LIMIT 1",
      [interviewId]
    );
    if (!interview) return res.status(404).json({ error: "未找到该面试记录" });

    const [results] = await pool.query(
      "SELECT r.question_id, q.content AS question_content, r.user_answer, r.item_score, r.created_at FROM results r JOIN questions q ON q.id = r.question_id WHERE r.interview_id=? ORDER BY r.id ASC",
      [interviewId]
    );
    res.json({ interview, results });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
