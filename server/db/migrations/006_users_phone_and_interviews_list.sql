-- Add phone to candidate users and support applicants list UX.

ALTER TABLE users
  ADD COLUMN phone VARCHAR(32) DEFAULT NULL AFTER email;

CREATE INDEX idx_users_phone ON users (phone);

