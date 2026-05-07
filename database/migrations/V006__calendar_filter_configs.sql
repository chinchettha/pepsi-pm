-- V006: shared calendar filter menu options by role (admin/planner)
USE `pepsi_pm`;

CREATE TABLE IF NOT EXISTS calendar_filter_configs (
  role_key VARCHAR(32) NOT NULL COMMENT 'admin|planner',
  config_json JSON NOT NULL,
  updated_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (role_key),
  CONSTRAINT chk_calendar_filter_role CHECK (role_key IN ('admin', 'planner')),
  CONSTRAINT fk_calendar_filter_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
    ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Shared filter menu customization for calendar by role';
