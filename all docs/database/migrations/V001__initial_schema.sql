-- =============================================================================
-- Pepsi Cola PM Application — MariaDB schema (complete v1 DDL draft)
-- =============================================================================
-- References:
--   docs/DATABASE_DESIGN_DRAFT.md §8
--   docs/SAP_DATA_IMPORT_EXPORT_COLUMNS.md (IW37N 22Apr20, Confirm WO.xls,
--   GI/GR exports — column names stored as sanitized SQL identifiers)
--
-- Target: MariaDB 10.6+ (InnoDB, utf8mb4, DATETIME(3), JSON, CHECK)
--
-- Locked database name (repo standard): pepsi_pm
-- One-shot apply (creates DB if missing, then all tables):
--   mysql -h HOST -u USER -p < database/migrations/V001__initial_schema.sql
-- Or after manually creating pepsi_pm:
--   mysql -h HOST -u USER -p pepsi_pm < database/migrations/V001__initial_schema.sql
--   (CREATE DATABASE IF NOT EXISTS is harmless if DB already exists)
--
-- Staging: flat columns match baseline SAP exports + optional row_payload JSON
-- for unknown columns / future variants (see extract_sap_data_columns.py).
-- =============================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- 0. Database (locked name — see docs/DATABASE_DESIGN_DRAFT.md §1, database/README.md)
-- ---------------------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `pepsi_pm`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `pepsi_pm`;

-- ---------------------------------------------------------------------------
-- 1. Core: users & RBAC
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  gpid VARCHAR(64) NOT NULL COMMENT 'Plant business key / GPID',
  display_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_gpid (gpid),
  KEY idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Application users; gpid aligns with SRS / plant HR codes';

CREATE TABLE roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  label VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='RBAC roles (F10)';

CREATE TABLE permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(128) NOT NULL,
  label VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='RBAC permission codes';

CREATE TABLE role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Many-to-many roles ↔ permissions';

CREATE TABLE user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  valid_from DATE NULL,
  valid_until DATE NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  KEY idx_user_roles_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User ↔ role assignments';

-- ---------------------------------------------------------------------------
-- 2. Config: reason codes (SRS appendix + Rev.1 — seed separately or via app)
-- ---------------------------------------------------------------------------

CREATE TABLE reason_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  label_th VARCHAR(255) NULL,
  label_en VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  requires_when_status VARCHAR(128) NULL COMMENT 'Optional UI rule key',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_reason_codes_code (code),
  KEY idx_reason_codes_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Reason codes for confirmations / status rules';

-- ---------------------------------------------------------------------------
-- 3. Reference masters
-- ---------------------------------------------------------------------------

CREATE TABLE equipments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  equipment_id_sap VARCHAR(64) NOT NULL,
  functional_location VARCHAR(128) NULL,
  description VARCHAR(512) NULL,
  plant VARCHAR(16) NOT NULL DEFAULT '',
  synced_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_equipments_sap_plant (equipment_id_sap, plant),
  KEY idx_equipments_fl (functional_location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Equipment master from SAP / IW37N–Confirm';

CREATE TABLE work_centers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_center_code VARCHAR(32) NOT NULL,
  plant VARCHAR(16) NOT NULL DEFAULT '',
  description VARCHAR(512) NULL,
  synced_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_work_centers_code_plant (work_center_code, plant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Work center master (F07); optional FK from work_orders later';

CREATE TABLE materials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  material_number_sap VARCHAR(64) NOT NULL,
  description VARCHAR(512) NULL,
  base_uom VARCHAR(16) NULL,
  barcode_hint VARCHAR(128) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_materials_sap (material_number_sap)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Material master; GI/GR staging links here after normalize';

-- ---------------------------------------------------------------------------
-- 4. Import platform
-- ---------------------------------------------------------------------------

CREATE TABLE import_batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_kind VARCHAR(32) NOT NULL COMMENT 'iw37n|confirm_wo|gi|gr|mb51|...',
  source_file_name VARCHAR(512) NOT NULL,
  source_sha256 CHAR(64) NULL,
  imported_by_user_id BIGINT UNSIGNED NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  finished_at DATETIME(3) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending' COMMENT 'pending|success|partial|failed',
  row_count_accepted INT UNSIGNED NOT NULL DEFAULT 0,
  row_count_rejected INT UNSIGNED NOT NULL DEFAULT 0,
  notes VARCHAR(1024) NULL,
  PRIMARY KEY (id),
  KEY idx_import_batches_kind_started (source_kind, started_at),
  KEY idx_import_batches_sha (source_sha256),
  CONSTRAINT fk_import_batches_user FOREIGN KEY (imported_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Each file or API import run';

CREATE TABLE import_errors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  import_batch_id BIGINT UNSIGNED NOT NULL,
  source_row_number INT UNSIGNED NULL,
  error_code VARCHAR(64) NULL,
  error_message VARCHAR(1024) NULL,
  raw_excerpt TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_import_errors_batch (import_batch_id),
  CONSTRAINT fk_import_errors_batch FOREIGN KEY (import_batch_id) REFERENCES import_batches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Per-row import failures';

-- ---------------------------------------------------------------------------
-- 4.1 Staging: IW37N — flat columns from IW37N (22Apr20).xls (superset baseline)
--     docs/SAP_DATA_IMPORT_EXPORT_COLUMNS.md § IW37N first table
-- ---------------------------------------------------------------------------

CREATE TABLE stg_iw37n_row (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  import_batch_id BIGINT UNSIGNED NOT NULL,
  source_row_number INT UNSIGNED NULL,
  s_flag VARCHAR(8) NULL COMMENT 'Column S',
  mnt_plan VARCHAR(64) NULL,
  order_no VARCHAR(64) NULL COMMENT 'SAP Order',
  type VARCHAR(32) NULL,
  mat VARCHAR(64) NULL,
  bsc_start VARCHAR(64) NULL,
  act_finish VARCHAR(64) NULL,
  system_status VARCHAR(128) NULL,
  op_ac VARCHAR(32) NULL,
  operation_short_text VARCHAR(512) NULL,
  c_check VARCHAR(8) NULL COMMENT 'Column C',
  op_work_ctr VARCHAR(64) NULL,
  work VARCHAR(128) NULL,
  act_work VARCHAR(64) NULL,
  un_val VARCHAR(64) NULL,
  description VARCHAR(512) NULL,
  equipment VARCHAR(64) NULL,
  equipment_descriptn VARCHAR(512) NULL,
  functional_location VARCHAR(128) NULL,
  funct_loc_descrip VARCHAR(512) NULL,
  row_payload JSON NULL COMMENT 'Optional full-row JSON for variant files',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_stg_iw37n_batch (import_batch_id),
  KEY idx_stg_iw37n_order (order_no),
  CONSTRAINT fk_stg_iw37n_batch FOREIGN KEY (import_batch_id) REFERENCES import_batches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='IW37N export staging (flat + optional JSON)';

-- ---------------------------------------------------------------------------
-- 4.2 Staging: Confirm WO — Confirm WO.xls (22 columns)
-- ---------------------------------------------------------------------------

CREATE TABLE stg_confirm_wo_row (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  import_batch_id BIGINT UNSIGNED NOT NULL,
  source_row_number INT UNSIGNED NULL,
  confirm_no VARCHAR(64) NULL COMMENT 'Confirm.',
  counter VARCHAR(32) NULL,
  ord_cat VARCHAR(32) NULL,
  order_no VARCHAR(64) NULL,
  posting_date VARCHAR(32) NULL COMMENT 'Postg date as in file',
  equipment VARCHAR(64) NULL,
  wk_ctr_act VARCHAR(64) NULL,
  act_work VARCHAR(64) NULL,
  un_wk_act VARCHAR(64) NULL,
  pg VARCHAR(32) NULL,
  pt_ac VARCHAR(32) NULL,
  created_on VARCHAR(32) NULL,
  un_col VARCHAR(64) NULL COMMENT 'Column Un.',
  rem_work VARCHAR(64) NULL,
  act_start_1 VARCHAR(64) NULL COMMENT 'First Act.start pair',
  act_finish_1 VARCHAR(64) NULL,
  act_start_2 VARCHAR(64) NULL COMMENT 'Duplicate header Act. start in SAP export',
  act_finish_2 VARCHAR(64) NULL,
  ccld_conf VARCHAR(32) NULL,
  wk_ctr_pln VARCHAR(64) NULL,
  sys_status VARCHAR(128) NULL,
  functional_location VARCHAR(128) NULL,
  row_payload JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_stg_confirm_batch (import_batch_id),
  KEY idx_stg_confirm_order (order_no),
  CONSTRAINT fk_stg_confirm_batch FOREIGN KEY (import_batch_id) REFERENCES import_batches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Confirm WO export staging';

-- ---------------------------------------------------------------------------
-- 4.3 Staging: GI/GR / MB51-style movement — superset GI 1May + Material (GR)
-- ---------------------------------------------------------------------------

CREATE TABLE stg_mb51_row (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  import_batch_id BIGINT UNSIGNED NOT NULL,
  source_row_number INT UNSIGNED NULL,
  order_no VARCHAR(64) NULL,
  mat_doc VARCHAR(64) NULL COMMENT 'Mat. Doc.',
  entry_date VARCHAR(32) NULL,
  po VARCHAR(64) NULL,
  pstng_date VARCHAR(32) NULL,
  doc_date VARCHAR(32) NULL,
  material_description VARCHAR(512) NULL,
  quantity_str VARCHAR(64) NULL COMMENT 'Raw quantity from file',
  bun VARCHAR(16) NULL,
  amount_in_lc_str VARCHAR(64) NULL,
  crcy VARCHAR(8) NULL,
  mvt VARCHAR(16) NULL,
  cost_ctr VARCHAR(32) NULL,
  time_str VARCHAR(32) NULL,
  mat_yr VARCHAR(16) NULL,
  material_no VARCHAR(64) NULL COMMENT 'Material number when present',
  row_payload JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_stg_mb51_batch (import_batch_id),
  KEY idx_stg_mb51_order (order_no),
  KEY idx_stg_mb51_material (material_no),
  CONSTRAINT fk_stg_mb51_batch FOREIGN KEY (import_batch_id) REFERENCES import_batches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='GI/GR / MB51-style movement staging';

-- ---------------------------------------------------------------------------
-- 5. Operational: work orders & assignments & confirmations
-- ---------------------------------------------------------------------------

CREATE TABLE work_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number VARCHAR(64) NOT NULL COMMENT 'SAP Order',
  order_type VARCHAR(16) NULL COMMENT 'ZB01, ZB02, ZB05, ...',
  equipment_id BIGINT UNSIGNED NULL,
  work_center_planned VARCHAR(64) NULL,
  work_center_actual VARCHAR(64) NULL,
  system_status VARCHAR(64) NULL,
  user_status VARCHAR(64) NULL,
  planned_start DATETIME(3) NULL,
  planned_finish DATETIME(3) NULL,
  basic_start DATETIME(3) NULL,
  basic_finish DATETIME(3) NULL,
  last_import_batch_id BIGINT UNSIGNED NULL,
  ui_metadata_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_work_orders_order_number (order_number),
  KEY idx_work_orders_equipment_planned (equipment_id, planned_start),
  KEY idx_work_orders_system_status (system_status),
  KEY idx_work_orders_last_batch (last_import_batch_id),
  CONSTRAINT fk_work_orders_equipment FOREIGN KEY (equipment_id) REFERENCES equipments (id) ON DELETE SET NULL,
  CONSTRAINT fk_work_orders_last_batch FOREIGN KEY (last_import_batch_id) REFERENCES import_batches (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Normalized PM/CM orders (F01/F02/F05)';

CREATE TABLE work_order_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_order_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  assigned_by_user_id BIGINT UNSIGNED NULL,
  unassigned_at DATETIME(3) NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'primary' COMMENT 'primary|assistant|...',
  PRIMARY KEY (id),
  KEY idx_woa_work_order_assigned (work_order_id, assigned_at),
  KEY idx_woa_user_assigned (user_id, assigned_at),
  CONSTRAINT fk_woa_work_order FOREIGN KEY (work_order_id) REFERENCES work_orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_woa_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_woa_assigned_by FOREIGN KEY (assigned_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Assignment history (multi technician)';

CREATE TABLE order_confirmations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_order_id BIGINT UNSIGNED NOT NULL,
  confirmed_by_user_id BIGINT UNSIGNED NULL,
  actual_start DATETIME(3) NULL,
  actual_finish DATETIME(3) NULL,
  actual_work_hours DECIMAL(12, 2) NULL,
  reason_code_id BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  sync_to_sap_status VARCHAR(32) NOT NULL DEFAULT 'not_applicable' COMMENT 'pending|sent|not_applicable',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_oc_work_order_created (work_order_id, created_at),
  KEY idx_oc_sync (sync_to_sap_status),
  CONSTRAINT fk_oc_work_order FOREIGN KEY (work_order_id) REFERENCES work_orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_oc_user FOREIGN KEY (confirmed_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_oc_reason FOREIGN KEY (reason_code_id) REFERENCES reason_codes (id) ON DELETE SET NULL,
  CONSTRAINT chk_oc_sync_status CHECK (sync_to_sap_status IN ('pending', 'sent', 'not_applicable', 'failed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='App-side confirmations (F05)';

-- ---------------------------------------------------------------------------
-- 6. Goods movements (normalized from GI/GR / MB51 pipeline)
-- ---------------------------------------------------------------------------

CREATE TABLE goods_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  movement_kind VARCHAR(8) NOT NULL COMMENT 'GI|GR',
  work_order_id BIGINT UNSIGNED NULL,
  material_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(18, 4) NOT NULL,
  posting_date DATE NULL,
  plant VARCHAR(16) NULL,
  storage_location VARCHAR(32) NULL,
  sap_document_reference VARCHAR(64) NULL COMMENT 'Mat. Doc. or combined ref',
  mat_doc VARCHAR(64) NULL,
  mvt VARCHAR(16) NULL,
  material_description VARCHAR(512) NULL,
  bun VARCHAR(16) NULL,
  amount_in_lc DECIMAL(18, 2) NULL,
  crcy VARCHAR(8) NULL,
  cost_ctr VARCHAR(32) NULL,
  entry_date DATE NULL,
  po_number VARCHAR(64) NULL,
  doc_date DATE NULL,
  import_batch_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_gm_posting_material (posting_date, material_id),
  KEY idx_gm_work_order (work_order_id),
  KEY idx_gm_mat_doc (mat_doc),
  CONSTRAINT chk_gm_kind CHECK (movement_kind IN ('GI', 'GR')),
  CONSTRAINT fk_gm_work_order FOREIGN KEY (work_order_id) REFERENCES work_orders (id) ON DELETE SET NULL,
  CONSTRAINT fk_gm_material FOREIGN KEY (material_id) REFERENCES materials (id) ON DELETE RESTRICT,
  CONSTRAINT fk_gm_import_batch FOREIGN KEY (import_batch_id) REFERENCES import_batches (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='GI/GR normalized rows (F03/F04)';

-- ---------------------------------------------------------------------------
-- 7. Evidence: task logs (handheld / parameters / attachments)
-- ---------------------------------------------------------------------------

CREATE TABLE task_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_order_id BIGINT UNSIGNED NOT NULL,
  log_type VARCHAR(32) NOT NULL COMMENT 'parameter|note|photo|...',
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_task_logs_wo_created (work_order_id, created_at),
  KEY idx_task_logs_type (log_type),
  CONSTRAINT fk_task_logs_work_order FOREIGN KEY (work_order_id) REFERENCES work_orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_task_logs_user FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='On-site log entries';

CREATE TABLE task_log_parameters (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_log_id BIGINT UNSIGNED NOT NULL,
  parameter_code VARCHAR(64) NOT NULL,
  value_numeric DECIMAL(24, 8) NULL,
  value_text VARCHAR(1024) NULL,
  unit VARCHAR(32) NULL,
  PRIMARY KEY (id),
  KEY idx_tlp_task_log (task_log_id),
  KEY idx_tlp_code (parameter_code),
  CONSTRAINT fk_tlp_task_log FOREIGN KEY (task_log_id) REFERENCES task_logs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Key/value readings for a task_log';

CREATE TABLE task_log_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_log_id BIGINT UNSIGNED NOT NULL,
  storage_path VARCHAR(1024) NOT NULL COMMENT 'Path on D: per SRS',
  mime_type VARCHAR(128) NULL,
  byte_size BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_tla_task_log (task_log_id),
  CONSTRAINT fk_tla_task_log FOREIGN KEY (task_log_id) REFERENCES task_logs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='File metadata; binary on disk';

-- ---------------------------------------------------------------------------
-- 8. Audit & KPI
-- ---------------------------------------------------------------------------

CREATE TABLE audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  action VARCHAR(32) NOT NULL COMMENT 'create|update|delete|import|...',
  actor_user_id BIGINT UNSIGNED NULL,
  payload_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_created (created_at),
  KEY idx_audit_actor (actor_user_id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Polymorphic audit trail';

CREATE TABLE kpi_daily_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  snapshot_date DATE NOT NULL,
  plant VARCHAR(16) NOT NULL DEFAULT '',
  metrics_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_kpi_date_plant (snapshot_date, plant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Optional daily KPI materialization (F09)';

-- ---------------------------------------------------------------------------
-- 9. Bootstrap seed (idempotent — safe to re-run)
-- ---------------------------------------------------------------------------

INSERT IGNORE INTO users (gpid, display_name, email, is_active)
VALUES ('__system__', 'System', NULL, 1);

INSERT IGNORE INTO roles (code, label) VALUES
  ('admin', 'Administrator'),
  ('planner', 'Planner'),
  ('technician', 'Technician'),
  ('viewer', 'Read-only');

INSERT IGNORE INTO permissions (code, label) VALUES
  ('work_order.view', 'View work orders'),
  ('work_order.assign', 'Assign technicians'),
  ('work_order.edit', 'Edit scheduling fields'),
  ('order_confirmation.create', 'Create confirmations'),
  ('goods_movement.view', 'View GI/GR'),
  ('goods_movement.import', 'Import GI/GR files'),
  ('import.run', 'Run SAP file imports'),
  ('report.dashboard', 'View dashboard / KPI'),
  ('admin.users', 'Manage users and roles');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'admin';

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.gpid = '__system__' AND r.code = 'admin';

-- =============================================================================
-- End of V001__initial_schema.sql
-- =============================================================================
