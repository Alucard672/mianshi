-- Migration for invite links + interview questions + video answers.
-- If you already created tables from an older schema, apply changes manually:
-- 1) Add new tables: invitations, interview_questions
-- 2) Alter interviews/results to include new columns

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

-- NOTE: MySQL doesn't support "ADD COLUMN IF NOT EXISTS" before 8.0.29.
-- Run these statements once; if they fail with "Duplicate column", skip.
ALTER TABLE interviews ADD COLUMN invite_id BIGINT DEFAULT NULL;
ALTER TABLE interviews ADD COLUMN resume_text MEDIUMTEXT DEFAULT NULL;
ALTER TABLE interviews ADD COLUMN stage VARCHAR(32) NOT NULL DEFAULT 'RESUME_SUBMITTED';
ALTER TABLE interviews ADD COLUMN second_round_invited TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE results ADD COLUMN answer_video_path TEXT DEFAULT NULL;

