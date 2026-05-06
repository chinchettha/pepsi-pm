-- =============================================================================
-- จัด user / authentication plugin ให้ backend Node.js (mysql2) เชื่อม MariaDB ได้
-- รันใน DBeaver หรือ mysql CLI เป็น root (หรือผู้มีสิทธิ์ CREATE USER / GRANT)
--
-- แก้รหัสผ่าน: ค้นหา change_me ทั้งไฟล์แล้วแทนด้วยรหัสจริง (ให้ตรง backend/.env → DATABASE_PASSWORD)
-- หลังรัน: รีสตาร์ท backend (npm run dev)
-- =============================================================================

USE pepsi_pm;

-- 0) ตรวจสอบ plugin (อ่านอย่างเดียว) — ถ้าเห็น auth_gssapi_client → ต้องสร้าง user แบบด้านล่าง
-- SELECT User, Host, plugin FROM mysql.user WHERE User IN ('root', 'pepsi_pm_app');

-- 1) ลบ user แอปเดิม (ถ้ามี) แล้วสร้างใหม่เพื่อไม่ติด plugin เดิม
DROP USER IF EXISTS 'pepsi_pm_app'@'127.0.0.1';
DROP USER IF EXISTS 'pepsi_pm_app'@'localhost';

-- 2) IDENTIFIED BY → MariaDB มักใช้ plugin ที่ mysql2 รองรับ (เช่น ed25519 บน 10.6+)
CREATE USER 'pepsi_pm_app'@'127.0.0.1' IDENTIFIED BY 'change_me';
CREATE USER 'pepsi_pm_app'@'localhost' IDENTIFIED BY 'change_me';

GRANT ALL PRIVILEGES ON pepsi_pm.* TO 'pepsi_pm_app'@'127.0.0.1';
GRANT ALL PRIVILEGES ON pepsi_pm.* TO 'pepsi_pm_app'@'localhost';
FLUSH PRIVILEGES;

-- 3) ถ้ายัง error auth_gssapi_client — เปิดคอมเมนต์บล็อกใดบล็อกหนึ่ง (แก้รหัสให้ตรงข้อ 2)
-- ed25519 (แนะนำบน MariaDB 10.6+ ถ้ารองรับ):
-- ALTER USER 'pepsi_pm_app'@'127.0.0.1' IDENTIFIED VIA ed25519 USING PASSWORD('change_me');
-- ALTER USER 'pepsi_pm_app'@'localhost' IDENTIFIED VIA ed25519 USING PASSWORD('change_me');
-- FLUSH PRIVILEGES;

-- mysql_native_password (ถ้าเวอร์ชันรองรับ):
-- ALTER USER 'pepsi_pm_app'@'127.0.0.1' IDENTIFIED VIA mysql_native_password USING PASSWORD('change_me');
-- ALTER USER 'pepsi_pm_app'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('change_me');
-- FLUSH PRIVILEGES;

-- 4) ตรวจสอบอีกครั้ง
-- SELECT User, Host, plugin FROM mysql.user WHERE User = 'pepsi_pm_app';
