-- Migration: store cloud storage file IDs for resume/video.

ALTER TABLE interviews ADD COLUMN resume_file_id TEXT DEFAULT NULL;
ALTER TABLE interviews ADD COLUMN video_file_id TEXT DEFAULT NULL;
ALTER TABLE results ADD COLUMN answer_video_file_id TEXT DEFAULT NULL;

