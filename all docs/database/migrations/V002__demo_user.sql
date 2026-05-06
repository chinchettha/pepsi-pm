-- Demo user for local JWT / integration tests (optional — safe to re-run)
USE `pepsi_pm`;

INSERT IGNORE INTO users (gpid, display_name, email, is_active)
VALUES ('demo', 'Demo User', NULL, 1);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.gpid = 'demo' AND r.code = 'admin';
