-- V003: order_confirmations ← SAP Confirm staging keys, import job queue, optional batch dedupe index
USE `pepsi_pm`;

-- ---------------------------------------------------------------------------
-- 1. order_confirmations — link import + dedupe key (cross-batch SAP line)
-- ---------------------------------------------------------------------------

ALTER TABLE order_confirmations
  ADD COLUMN import_batch_id BIGINT UNSIGNED NULL AFTER work_order_id,
  ADD COLUMN stg_confirm_row_id BIGINT UNSIGNED NULL AFTER import_batch_id,
  ADD COLUMN sap_confirm_no VARCHAR(64) NULL AFTER stg_confirm_row_id,
  ADD COLUMN sap_counter VARCHAR(32) NULL AFTER sap_confirm_no,
  ADD COLUMN sap_line_key VARCHAR(192) NULL COMMENT 'Stable key: WO|confirm|counter or WO|row:id' AFTER sap_counter;

UPDATE order_confirmations
SET sap_line_key = CONCAT('legacy-', LPAD(id, 16, '0'))
WHERE sap_line_key IS NULL;

ALTER TABLE order_confirmations
  MODIFY sap_line_key VARCHAR(192) NOT NULL;

ALTER TABLE order_confirmations
  ADD KEY idx_oc_import_batch (import_batch_id),
  ADD CONSTRAINT fk_oc_import_batch FOREIGN KEY (import_batch_id) REFERENCES import_batches (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX uk_oc_sap_line_key ON order_confirmations (sap_line_key);

-- ---------------------------------------------------------------------------
-- 2. import_jobs — DB-backed queue (worker process, not HTTP)
-- ---------------------------------------------------------------------------

CREATE TABLE import_jobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_type VARCHAR(64) NOT NULL COMMENT 'normalize_batch|kpi_snapshot',
  payload_json JSON NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending' COMMENT 'pending|running|done|failed|cancelled',
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 3,
  last_error VARCHAR(2048) NULL,
  available_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  started_at DATETIME(3) NULL,
  finished_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_ij_poll (status, available_at, id),
  KEY idx_ij_type_created (job_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Async jobs for worker (normalize, KPI)';

-- ---------------------------------------------------------------------------
-- 3. Faster duplicate-file detection (same bytes + same kind)
-- ---------------------------------------------------------------------------

CREATE INDEX idx_import_batches_sha_kind ON import_batches (source_sha256, source_kind, id);
