-- Migration: employees + audit logs
-- Run on existing DB if you started from older schema.

CREATE TABLE IF NOT EXISTS employees (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(64) NOT NULL DEFAULT 'staff',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  access_token_hash CHAR(64) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_employees_email (email)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_employee_id BIGINT DEFAULT NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id BIGINT DEFAULT NULL,
  meta_json JSON DEFAULT NULL,
  ip VARCHAR(64) DEFAULT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_created_at (created_at),
  INDEX idx_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_employee_id) REFERENCES employees(id)
);

-- If employees table already existed from older migration, add column once:
ALTER TABLE employees ADD COLUMN access_token_hash CHAR(64) DEFAULT NULL;
