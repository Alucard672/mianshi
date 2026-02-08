-- AI 面试官全栈系统 - MySQL schema (minimum viable)
-- Apply on a fresh DB:
--   CREATE DATABASE ai_interviewer DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--   USE ai_interviewer;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Department staff (admin users)
CREATE TABLE IF NOT EXISTS employees (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(32) DEFAULT NULL,
  username VARCHAR(64) NOT NULL,
  password_hash CHAR(64) DEFAULT NULL,
  role VARCHAR(64) NOT NULL DEFAULT 'staff', /* staff/admin */
  status VARCHAR(32) NOT NULL DEFAULT 'active', /* active/disabled */
  access_token_hash CHAR(64) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_employees_email (email),
  UNIQUE KEY uq_employees_phone (phone),
  UNIQUE KEY uq_employees_username (username)
);

CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  -- store as comma-separated keywords (e.g. "nodejs,express,mysql,vue")
  target_keywords TEXT NOT NULL,
  requirements MEDIUMTEXT DEFAULT NULL,
  responsibilities MEDIUMTEXT DEFAULT NULL,
  salary_min INT DEFAULT NULL,
  salary_max INT DEFAULT NULL,
  salary_note VARCHAR(255) DEFAULT NULL,
  location VARCHAR(255) DEFAULT NULL,
  employment_type VARCHAR(64) DEFAULT NULL,
  experience_level VARCHAR(64) DEFAULT NULL,
  education VARCHAR(64) DEFAULT NULL,
  benefits MEDIUMTEXT DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open', /* open/closed */
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_posts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(64) NOT NULL,
  description MEDIUMTEXT DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'published', /* draft/published */
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_job_posts_slug (slug)
);

CREATE TABLE IF NOT EXISTS job_post_jobs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  job_id BIGINT NOT NULL,
  ord INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_jpj_post FOREIGN KEY (post_id) REFERENCES job_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_jpj_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  UNIQUE KEY uq_post_ord (post_id, ord),
  UNIQUE KEY uq_post_job (post_id, job_id)
);

CREATE TABLE IF NOT EXISTS interviews (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  job_id BIGINT NOT NULL,
  invite_id BIGINT DEFAULT NULL,
  resume_path TEXT,
  resume_file_id TEXT DEFAULT NULL,
  -- initial intro video is no longer required; keep nullable for backward compat
  video_path TEXT,
  video_file_id TEXT DEFAULT NULL,
  -- extension fields needed by PRD matching/flow
  user_keywords TEXT NOT NULL,
  resume_text MEDIUMTEXT DEFAULT NULL,
  match_rate DECIMAL(5,2) DEFAULT NULL,
  total_score DECIMAL(8,2) DEFAULT NULL,
  stage VARCHAR(32) NOT NULL DEFAULT 'RESUME_SUBMITTED',
  second_round_invited TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_interviews_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_interviews_job FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE IF NOT EXISTS questions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  content TEXT NOT NULL,
  category VARCHAR(255) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS interview_questions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  interview_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  ord INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_iq_interview FOREIGN KEY (interview_id) REFERENCES interviews(id),
  CONSTRAINT fk_iq_question FOREIGN KEY (question_id) REFERENCES questions(id),
  UNIQUE KEY uq_interview_ord (interview_id, ord),
  UNIQUE KEY uq_interview_question2 (interview_id, question_id)
);

CREATE TABLE IF NOT EXISTS results (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  interview_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  user_answer MEDIUMTEXT NOT NULL,
  answer_video_path TEXT DEFAULT NULL,
  answer_video_file_id TEXT DEFAULT NULL,
  item_score DECIMAL(6,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_results_interview FOREIGN KEY (interview_id) REFERENCES interviews(id),
  CONSTRAINT fk_results_question FOREIGN KEY (question_id) REFERENCES questions(id),
  UNIQUE KEY uq_interview_question (interview_id, question_id)
);

CREATE TABLE IF NOT EXISTS invitations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  job_id BIGINT NOT NULL,
  token CHAR(36) NOT NULL,
  max_uses INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_job FOREIGN KEY (job_id) REFERENCES jobs(id),
  UNIQUE KEY uq_inv_token (token)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_employee_id BIGINT DEFAULT NULL,
  action VARCHAR(64) NOT NULL, /* create/update/delete/generate */
  entity_type VARCHAR(64) NOT NULL, /* job/question/invitation/employee */
  entity_id BIGINT DEFAULT NULL,
  meta_json JSON DEFAULT NULL,
  ip VARCHAR(64) DEFAULT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_created_at (created_at),
  INDEX idx_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_employee_id) REFERENCES employees(id)
);

-- Optional seed data for quick local testing
INSERT INTO employees (name, email, username, password_hash, role, status)
SELECT name, email, username, password_hash, role, status
FROM (
  SELECT
    '系统管理员' AS name,
    'admin@local' AS email,
    'admin' AS username,
    SHA2('111111', 256) AS password_hash,
    'admin' AS role,
    'active' AS status
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE username = 'admin') LIMIT 1;

INSERT INTO jobs (title, target_keywords)
SELECT * FROM (SELECT 'Fullstack (Node/Vue)', 'nodejs,express,mysql,vue,tailwind,rest,auth' ) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM jobs WHERE title = 'Fullstack (Node/Vue)') LIMIT 1;

INSERT INTO questions (content, category)
SELECT * FROM (SELECT '请解释你如何在 Node.js 中处理大文件上传，并保证安全性与稳定性。', 'backend') AS tmp
WHERE NOT EXISTS (SELECT 1 FROM questions WHERE content LIKE '请解释你如何在 Node.js%') LIMIT 1;

INSERT INTO questions (content, category)
SELECT * FROM (SELECT '描述一次你做接口性能优化的经历：你如何定位瓶颈，如何验证优化效果？', 'backend') AS tmp
WHERE NOT EXISTS (SELECT 1 FROM questions WHERE content LIKE '描述一次你做接口性能优化%') LIMIT 1;

INSERT INTO questions (content, category)
SELECT * FROM (SELECT 'Vue3 组合式 API 的优势是什么？在大型项目中你如何组织组件与状态？', 'frontend') AS tmp
WHERE NOT EXISTS (SELECT 1 FROM questions WHERE content LIKE 'Vue3 组合式 API%') LIMIT 1;

INSERT INTO questions (content, category)
SELECT * FROM (SELECT '你如何设计一套面试系统的数据库模型，既能记录问答又便于统计分析？', 'system') AS tmp
WHERE NOT EXISTS (SELECT 1 FROM questions WHERE content LIKE '你如何设计一套面试系统的数据库模型%') LIMIT 1;
