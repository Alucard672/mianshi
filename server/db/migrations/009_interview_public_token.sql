-- Add a public token to safely allow candidates to upload answer videos without login.
ALTER TABLE interviews
  ADD COLUMN public_token VARCHAR(64) DEFAULT NULL AFTER invite_id,
  ADD INDEX idx_interviews_public_token (public_token);

