const crypto = require("crypto");
const path = require("path");

const express = require("express");
const multer = require("multer");

const { getPool } = require("../db");
const { computeMatchRate } = require("../match");
const { parseKeywords, unique } = require("../utils/keywords");
const { parseResumeToText } = require("../ocr");
const { scoreAnswer } = require("../score");
const { hasCloudBaseConfig, uploadLocalFileToCloudBase } = require("../storage/cloudbase");

const router = express.Router();
const uploadsDir = path.join(__dirname, "..", "..", "uploads");

function uuidFilename(originalName) {
  const ext = path.extname(originalName || "").slice(0, 16);
  return `${crypto.randomUUID()}${ext}`;
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return Number.isFinite(t) && t < Date.now();
}

function deriveKeywordsFromResumeText(jobKeywordsRaw, resumeText) {
  const jobKeywords = unique(parseKeywords(jobKeywordsRaw));
  const text = String(resumeText || "").toLowerCase();
  if (!text) return [];
  return jobKeywords.filter((k) => k && text.includes(String(k).toLowerCase()));
}

async function pickRandomQuestions(pool, countMin, countMax) {
  const nMin = Math.max(1, Number(countMin || 1));
  const nMax = Math.max(nMin, Number(countMax || 3));
  const n = Math.floor(Math.random() * (nMax - nMin + 1)) + nMin;
  const [rows] = await pool.query(
    "SELECT id, content, category FROM questions ORDER BY RAND() LIMIT ?",
    [n]
  );
  return rows;
}

// resume upload (must use invite token)
const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, uuidFilename(file.originalname))
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const ok = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ].includes(file.mimetype);
    if (!ok) return cb(new Error("不支持的简历文件类型（仅支持 PDF/Word）"));
    cb(null, true);
  }
});

// answer video upload (mp4 <= 50MB)
const answerVideoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, uuidFilename(file.originalname))
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === "video/mp4";
    if (!ok) return cb(new Error("不支持的视频类型（仅支持 MP4）"));
    cb(null, true);
  }
});

// POST /api/candidate/submit-resume
// multipart/form-data:
//  - invite_token (required)
//  - username/email (optional if user_id provided)
//  - user_id (optional)
//  - user_keywords (optional, will be merged with OCR keywords)
//  - resume (required)
router.post("/submit-resume", resumeUpload.single("resume"), async (req, res, next) => {
  try {
    const inviteToken = String(req.body.invite_token || "").trim();
    if (!inviteToken) return res.status(400).json({ error: "请使用邀请链接提交（invite_token 不能为空）" });

    const resumeFile = req.file;
    if (!resumeFile) return res.status(400).json({ error: "请上传简历文件（resume）" });

    const pool = getPool();

    const [invRows] = await pool.query("SELECT * FROM invitations WHERE token=? LIMIT 1", [inviteToken]);
    if (!invRows.length) return res.status(404).json({ error: "邀请链接不存在" });
    const inv = invRows[0];
    if (isExpired(inv.expires_at)) return res.status(400).json({ error: "邀请链接已过期" });
    if (inv.used_count >= inv.max_uses) return res.status(400).json({ error: "邀请链接已使用完" });

    const jobId = inv.job_id;
    const [jobRows] = await pool.query("SELECT id, title, target_keywords FROM jobs WHERE id=? LIMIT 1", [jobId]);
    if (!jobRows.length) return res.status(404).json({ error: "未找到该岗位" });
    const job = jobRows[0];

    // user: existing or create
    let userId = req.body.user_id ? Number(req.body.user_id) : NaN;
    if (!Number.isFinite(userId)) {
      const username = String(req.body.username || "").trim();
      const email = String(req.body.email || "").trim();
      if (!username || !email) return res.status(400).json({ error: "请填写用户名和邮箱（或直接提供 user_id）" });
      const [r] = await pool.query("INSERT INTO users (username, email) VALUES (?,?)", [username, email]);
      userId = r.insertId;
    }

    // OCR parse resume -> text
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
      // Store URL for immediate preview; file_id for later refresh.
      resumePath = resumeUrl || resumePath;
    }

    let resumeText = "";
    try {
      resumeText = await parseResumeToText({ filePath: resumeAbsPath });
    } catch (e) {
      // OCR is best-effort in MVP; store empty and continue.
      resumeText = "";
    }

    const userKeywordsInput = String(req.body.user_keywords || "").trim();
    const derived = deriveKeywordsFromResumeText(job.target_keywords, resumeText);
    const merged = unique([...parseKeywords(userKeywordsInput), ...derived]);
    const mergedRaw = merged.join(",");

    const { matchRate, hits, job: jobKeywordsNormalized } = computeMatchRate(mergedRaw, job.target_keywords);
    const passed = matchRate >= 60;

    let questions = [];
    if (passed) {
      questions = await pickRandomQuestions(pool, 1, 3);
      if (!questions.length) {
        return res.status(400).json({ error: "题库为空：请先在后台管理中添加题目后再发放面试" });
      }
    }

    const stage = passed ? "RESUME_PASSED" : "RESUME_REJECTED";

    const [ir] = await pool.query(
      "INSERT INTO interviews (user_id, job_id, invite_id, resume_path, resume_file_id, video_path, video_file_id, user_keywords, resume_text, match_rate, total_score, stage, second_round_invited) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0)",
      [userId, jobId, inv.id, resumePath, resumeFileId, null, null, mergedRaw, resumeText, matchRate, null, stage]
    );
    const interviewId = ir.insertId;

    // consume invite once resume is submitted
    await pool.query("UPDATE invitations SET used_count = used_count + 1 WHERE id=?", [inv.id]);

    if (passed) {
      // persist assigned questions + placeholder results rows for video answers
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await pool.query(
          "INSERT INTO interview_questions (interview_id, question_id, ord) VALUES (?,?,?)",
          [interviewId, q.id, i + 1]
        );
        await pool.query(
          "INSERT INTO results (interview_id, question_id, user_answer, answer_video_path, item_score) VALUES (?,?,?,?,?)",
          [interviewId, q.id, "", null, 0]
        );
      }
    }

    res.json({
      interviewId,
      resumePath,
      resumeFileId,
      resumeUrl,
      job: { id: job.id, title: job.title },
      match: {
        matchRate: Number(matchRate.toFixed(2)),
        passed,
        hits,
        jobKeywords: jobKeywordsNormalized
      },
      questions,
      next: passed ? "UPLOAD_ANSWER_VIDEOS" : "END"
    });
  } catch (e) {
    if (e && e.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "简历文件过大（最大 5MB）" });
    if (e && String(e.message || "").includes("不支持")) return res.status(400).json({ error: e.message });
    next(e);
  }
});

// POST /api/candidate/:interviewId/answer-video
// multipart/form-data:
//  - question_id (required)
//  - answer_text (optional)
//  - video (required, mp4)
router.post(
  "/:interviewId/answer-video",
  answerVideoUpload.single("video"),
  async (req, res, next) => {
    try {
      const interviewId = Number(req.params.interviewId);
      const questionId = Number(req.body.question_id);
      if (!Number.isFinite(interviewId) || !Number.isFinite(questionId)) {
        return res.status(400).json({ error: "interviewId 或 question_id 参数不合法" });
      }
      const videoFile = req.file;
      if (!videoFile) return res.status(400).json({ error: "请上传回答视频（video）" });

      const answerText = String(req.body.answer_text || "").trim();

      const pool = getPool();
      const [[interview]] = await pool.query(
        "SELECT id, job_id, stage, match_rate FROM interviews WHERE id=? LIMIT 1",
        [interviewId]
      );
      if (!interview) return res.status(404).json({ error: "未找到该面试记录" });
      if (String(interview.stage) !== "RESUME_PASSED") {
        return res.status(400).json({ error: "当前面试不在可上传回答视频的阶段" });
      }

      const [assigned] = await pool.query(
        "SELECT question_id, ord FROM interview_questions WHERE interview_id=? AND question_id=? LIMIT 1",
        [interviewId, questionId]
      );
      if (!assigned.length) return res.status(400).json({ error: "该题目不属于本次面试" });

      const answerVideoPath = `/uploads/${videoFile.filename}`;
      let answerVideoFileId = null;
      let answerVideoUrl = null;
      const answerVideoAbsPath = path.join(uploadsDir, videoFile.filename);

      if (hasCloudBaseConfig()) {
        const up = await uploadLocalFileToCloudBase({
          localPath: answerVideoAbsPath,
          cloudPathPrefix: "uploads/answer-videos"
        });
        answerVideoFileId = up.fileID;
        answerVideoUrl = up.tempUrl || null;
      }

      // Score: if answer_text provided -> keyword/expression scoring; otherwise keep 0 for MVP.
      const [[job]] = await pool.query("SELECT target_keywords FROM jobs WHERE id=? LIMIT 1", [interview.job_id]);
      const coreKeywords = job?.target_keywords || "";
      const scored = answerText ? scoreAnswer({ answer: answerText, coreKeywords }) : null;
      const itemScore = scored ? scored.total : 0;

      await pool.query(
        "UPDATE results SET user_answer=?, answer_video_path=?, answer_video_file_id=?, item_score=? WHERE interview_id=? AND question_id=?",
        [answerText || "", answerVideoUrl || answerVideoPath, answerVideoFileId, itemScore, interviewId, questionId]
      );

      const [[progress]] = await pool.query(
        `SELECT
           SUM(CASE WHEN answer_video_path IS NOT NULL THEN 1 ELSE 0 END) AS answered,
           COUNT(*) AS total
         FROM interview_questions iq
         LEFT JOIN results r ON r.interview_id = iq.interview_id AND r.question_id = iq.question_id
        WHERE iq.interview_id=?`,
        [interviewId]
      );

      const answered = Number(progress.answered || 0);
      const total = Number(progress.total || 0);
      const done = total > 0 && answered >= total;

      let final = null;
      if (done) {
        // Total score: for MVP, combine match_rate + average item score.
        const [[sum]] = await pool.query(
          "SELECT SUM(item_score) AS sum_score, COUNT(*) AS cnt FROM results WHERE interview_id=?",
          [interviewId]
        );
        const avgItem = sum?.cnt ? Number(sum.sum_score) / Number(sum.cnt) : 0;
        const matchRate = Number(interview.match_rate || 0);
        const totalScore = Math.max(0, Math.min(100, matchRate * 0.5 + avgItem * 0.5));

        const secondRoundInvited = totalScore >= 70 ? 1 : 0;
        await pool.query(
          "UPDATE interviews SET total_score=?, stage='FIRST_INTERVIEW_DONE', second_round_invited=? WHERE id=?",
          [totalScore, secondRoundInvited, interviewId]
        );

        final = {
          totalScore: Number(totalScore.toFixed(2)),
          firstRoundResult: secondRoundInvited ? "通过（进入复面）" : "未通过",
          secondRoundNotice: secondRoundInvited
            ? "恭喜，你已通过初面筛选。请等待复面安排通知。"
            : "很遗憾，本次初面未通过。感谢你的投递。"
        };
      }

      res.json({
        interviewId,
        questionId,
        answerVideoPath: answerVideoUrl || answerVideoPath,
        answerVideoFileId,
        itemScore,
        progress: { answered, total, done },
        final
      });
    } catch (e) {
      if (e && e.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "视频文件过大（最大 50MB）" });
      if (e && String(e.message || "").includes("不支持")) return res.status(400).json({ error: e.message });
      next(e);
    }
  }
);

// GET /api/candidate/:interviewId/result
router.get("/:interviewId/result", async (req, res, next) => {
  try {
    const interviewId = Number(req.params.interviewId);
    if (!Number.isFinite(interviewId)) return res.status(400).json({ error: "interviewId 参数不合法" });
    const pool = getPool();
    const [[interview]] = await pool.query(
      "SELECT id, user_id, job_id, resume_path, match_rate, total_score, stage, second_round_invited, created_at FROM interviews WHERE id=? LIMIT 1",
      [interviewId]
    );
    if (!interview) return res.status(404).json({ error: "未找到该面试记录" });

    const [rows] = await pool.query(
      `SELECT iq.ord, q.id AS question_id, q.content, q.category,
              r.answer_video_path, r.user_answer, r.item_score
         FROM interview_questions iq
         JOIN questions q ON q.id = iq.question_id
         LEFT JOIN results r ON r.interview_id = iq.interview_id AND r.question_id = iq.question_id
        WHERE iq.interview_id=?
        ORDER BY iq.ord ASC`,
      [interviewId]
    );
    res.json({ interview, questions: rows });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
