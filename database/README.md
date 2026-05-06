# Database — Pepsi Cola PM Application

## ชื่อฐานข้อมูล (ล็อกใน repo)

| รายการ | ค่า |
|--------|------|
| **Database name** | `pepsi_pm` |
| **Charset / collation** | `utf8mb4` / `utf8mb4_unicode_ci` |

ไฟล์ [`migrations/V001__initial_schema.sql`](migrations/V001__initial_schema.sql) มี `CREATE DATABASE IF NOT EXISTS` และ `USE pepsi_pm` — รันครั้งเดียวได้ทั้งการสร้างฐานและตาราง (MariaDB 10.6+)

## รัน migration

จากราก repo:

```bash
mysql -h 127.0.0.1 -P 3306 -u YOUR_USER -p < database/migrations/V001__initial_schema.sql
```

ทางเลือก — ผู้ใช้ทดสอบ JWT (`gpid=demo`, role admin) สำหรับ backend:

```bash
mysql -h 127.0.0.1 -P 3306 -u YOUR_USER -p < database/migrations/V002__demo_user.sql
```

**V003** — `order_confirmations` คอลัมน์ซิงก์ SAP + ตาราง `import_jobs` (worker) + index SHA:

```bash
mysql -h 127.0.0.1 -P 3306 -u YOUR_USER -p < database/migrations/V003__import_jobs_oc_sync_dedupe.sql
```

- ไม่ต้องใส่ชื่อฐานหลัง `-p` บน CLI (สคริปต์สลับเข้า `pepsi_pm` ให้)
- ปรับ **`-P`** ให้ตรงพอร์ต MariaDB จริง (มัก `3306`; บางแผน deploy ใช้ `3307`)

## ตัวแปรแนะนำสำหรับแอป (ตัวอย่าง)

```env
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_NAME=pepsi_pm
DATABASE_USER=pepsi_pm_app
DATABASE_PASSWORD=change_me
```

Connection string (ตัวอย่าง):

```text
mysql://pepsi_pm_app:change_me@127.0.0.1:3306/pepsi_pm
```

## สภาพแวดล้อมอื่น (UAT / prod)

ถ้าต้องใช้ชื่อฐานอื่นบน instance เดียว ให้แก้บรรทัด `CREATE DATABASE` / `USE` ใน migration ฉบับท้องถิ่น หรือสร้างฐานเองแล้วลบ/ข้ามบล็อก §0 ในไฟล์ — **ชื่อมาตรฐานของโครงการใน repo ยังคือ `pepsi_pm`**

เอกสารออกแบบ: [`../docs/DATABASE_DESIGN_DRAFT.md`](../docs/DATABASE_DESIGN_DRAFT.md)  
Tree view (repo + DB ละเอียด): [`../docs/PROJECT_STRUCTURE.md`](../docs/PROJECT_STRUCTURE.md)  
Backend API (พอร์ต 5000): [`../docs/BACKEND_STRUCTURE.md`](../docs/BACKEND_STRUCTURE.md), [`../backend/README.md`](../backend/README.md)

## Node.js backend (`mysql2`) และ MariaDB authentication

ถ้า backend ขึ้น **`auth_gssapi_client`** / **`AUTH_SWITCH_PLUGIN_ERROR`** — ไลบรารี **mysql2** ใน Node **ไม่รองรับ** plugin GSSAPI ([upstream issue](https://github.com/sidorares/node-mysql2/issues/2819))  
ต้องให้บัญชีที่แอปใช้ (`DATABASE_USER`) authenticate แบบ **รหัสผ่าน + plugin ที่ mysql2 รองรับ** (เช่น `mysql_native_password`, `ed25519`, `caching_sha2_password` ตามเวอร์ชัน — **ไม่ใช่** `auth_gssapi_client`)

### ขั้นตอนสั้นๆ

1. **ตรวจ plugin** (ใน DBeaver / CLI เป็น admin):
   ```sql
   SELECT User, Host, plugin FROM mysql.user WHERE User IN ('root', 'pepsi_pm_app');
   ```
   ถ้า `root` หรือ user แอปเป็น `auth_gssapi_client` (หรือชื่อคล้าย gssapi) การล็อกอินจาก Node จะล้มได้แม้ DBeaver จะเข้าได้
2. **รันสคริปต์สร้าง user แอป** — [`scripts/create_pepsi_pm_app_user.sql`](scripts/create_pepsi_pm_app_user.sql)  
   - แก้รหัส `change_me` ในไฟล์ให้ตรงที่จะใส่ใน `backend/.env`  
   - สคริปต์จะ `DROP` แล้ว `CREATE` ใหม่ที่ทั้ง `'127.0.0.1'` และ `'localhost'` เพื่อให้ตรงกับ `DATABASE_HOST` ทั้งสองแบบ
3. **ถ้ายังล้ม** — ในสคริปต์มีคอมเมนต์ **`ALTER USER ... IDENTIFIED VIA ed25519`** หรือ **`mysql_native_password`** ให้เปิดใช้ทีละแบบ (แก้รหัสให้ตรงข้อ 2) แล้ว `FLUSH PRIVILEGES`
4. **ตั้ง `backend/.env`** ให้สอดคล้อง:
   ```env
   DATABASE_HOST=127.0.0.1
   DATABASE_PORT=3306
   DATABASE_NAME=pepsi_pm
   DATABASE_USER=pepsi_pm_app
   DATABASE_PASSWORD=<รหัสที่ตั้งในข้อ 2>
   ```
5. **รีสตาร์ท backend** แล้วทดสอบจากโฟลเดอร์ `backend`: `npm run check:connections` — ต้องเห็น `[DB] OK`

### ถ้าเป็นเครื่ององค์กรที่บังคับ GSSAPI เป็นค่าเริ่มต้น

ขอให้ DBA ตั้ง **`default_authentication_plugin`** ใน `my.cnf` / `my.ini` ของ MariaDB เป็น plugin ที่ไคลเอนต์ทั่วไปรองรับ (หรือสร้างเฉพาะ user `pepsi_pm_app` ด้วย `IDENTIFIED BY` / `IDENTIFIED VIA` ตามสคริปต์) — การแก้เฉพาะบนเครื่อง dev อาจใช้ instance MariaDB แยกที่ไม่บังคับ GSSAPI

### หมายเหตุ

เครื่องมืออย่าง **DBeaver ใช้ไดรเวอร์คนละตัวกับ Node** จึงอาจเชื่อม DB ได้ทั้งที่แอปยัง error จนกว่า user สำหรับ Node จะใช้ plugin ที่ถูกต้อง
