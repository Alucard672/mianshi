-- Optional media uploaded on public apply page.
-- Safe to run multiple times: migrate-db.js ignores duplicate column errors.

ALTER TABLE interviews
  ADD COLUMN image_path TEXT DEFAULT NULL AFTER resume_file_id;

ALTER TABLE interviews
  ADD COLUMN image_file_id TEXT DEFAULT NULL AFTER image_path;

