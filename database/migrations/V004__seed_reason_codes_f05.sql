-- V004: เหตุผลตัวอย่างสำหรับ Confirm WO (F05) — ปรับ/เติมตามลูกค้าได้ภายหลัง
USE `pepsi_pm`;

INSERT IGNORE INTO reason_codes (code, label_th, label_en, sort_order, is_active) VALUES
  ('DELAY_MATERIAL', 'รออะไหล่ / วัสดุ', 'Waiting for material', 10, 1),
  ('DELAY_WEATHER', 'สภาพอากาศ / สิ่งแวดล้อม', 'Weather / environment', 20, 1),
  ('PLAN_CHANGE', 'เปลี่ยนแผนงาน', 'Plan change', 30, 1),
  ('OTHER', 'อื่น ๆ (ระบุในหมายเหตุ)', 'Other (see notes)', 99, 1);
