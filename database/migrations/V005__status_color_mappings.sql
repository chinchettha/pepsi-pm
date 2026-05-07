-- V005: admin-config mapping SAP status code -> calendar color tone
USE `pepsi_pm`;

CREATE TABLE IF NOT EXISTS status_color_mappings (
  code VARCHAR(32) NOT NULL,
  tone VARCHAR(16) NOT NULL COMMENT 'green|blue|red|default',
  label VARCHAR(255) NULL,
  priority INT NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (code),
  KEY idx_scm_active_priority (is_active, priority, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Admin configurable mapping from SAP status code to UI color tone';

INSERT INTO status_color_mappings (code, tone, label, priority, is_active) VALUES
  ('TECO', 'green', 'Technical Complete', 10, 1),
  ('CLSD', 'green', 'Closed', 20, 1),
  ('REL', 'blue', 'Released', 30, 1),
  ('CNF', 'blue', 'Confirmed', 40, 1),
  ('CRTD', 'red', 'Created', 50, 1),
  ('PCNF', 'red', 'Partially Confirmed', 60, 1)
ON DUPLICATE KEY UPDATE
  tone = VALUES(tone),
  label = COALESCE(status_color_mappings.label, VALUES(label)),
  priority = LEAST(status_color_mappings.priority, VALUES(priority)),
  is_active = status_color_mappings.is_active;
