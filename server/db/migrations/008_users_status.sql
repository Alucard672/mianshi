-- Add status to candidate users for disable/enable.

ALTER TABLE users
  ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'active' AFTER phone;

CREATE INDEX idx_users_status ON users (status);

