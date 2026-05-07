-- V007: Allow multiple actual workers on work_orders (comma-separated labels).
ALTER TABLE work_orders
  MODIFY COLUMN work_center_actual VARCHAR(512) NULL
  COMMENT 'Actual resource label(s); comma-separated when multiple technicians';
