-- Migration: add username/password_hash for employees and seed default admin.
-- If columns already exist, skip the ALTER statements that fail with duplicate column.

ALTER TABLE employees ADD COLUMN username VARCHAR(64) NOT NULL;
ALTER TABLE employees ADD COLUMN password_hash CHAR(64) DEFAULT NULL;
ALTER TABLE employees ADD COLUMN phone VARCHAR(32) DEFAULT NULL;
ALTER TABLE employees ADD UNIQUE KEY uq_employees_username (username);
ALTER TABLE employees ADD UNIQUE KEY uq_employees_phone (phone);

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
