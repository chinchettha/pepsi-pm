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
mysql -h 127.0.0.1 -P 3307 -u YOUR_USER -p < database/migrations/V001__initial_schema.sql
```

ทางเลือก — ผู้ใช้ทดสอบ JWT (`gpid=demo`, role admin) สำหรับ backend:

```bash
mysql -h 127.0.0.1 -P 3307 -u YOUR_USER -p < database/migrations/V002__demo_user.sql
```

**V003** — `order_confirmations` คอลัมน์ซิงก์ SAP + ตาราง `import_jobs` (worker) + index SHA:

```bash
mysql -h 127.0.0.1 -P 3307 -u YOUR_USER -p < database/migrations/V003__import_jobs_oc_sync_dedupe.sql
```

- ไม่ต้องใส่ชื่อฐานหลัง `-p` บน CLI (สคริปต์สลับเข้า `pepsi_pm` ให้)
- พอร์ต **3307** ตรงกับภาคผนวกค / แผน deploy ในเอกสารโครงการ (ปรับ `-P` ถ้าเซิร์ฟเวอร์ใช้พอร์ตอื่น)

## ตัวแปรแนะนำสำหรับแอป (ตัวอย่าง)

```env
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3307
DATABASE_NAME=pepsi_pm
DATABASE_USER=pepsi_pm_app
DATABASE_PASSWORD=change_me
```

Connection string (ตัวอย่าง):

```text
mysql://pepsi_pm_app:change_me@127.0.0.1:3307/pepsi_pm
```

## สภาพแวดล้อมอื่น (UAT / prod)

ถ้าต้องใช้ชื่อฐานอื่นบน instance เดียว ให้แก้บรรทัด `CREATE DATABASE` / `USE` ใน migration ฉบับท้องถิ่น หรือสร้างฐานเองแล้วลบ/ข้ามบล็อก §0 ในไฟล์ — **ชื่อมาตรฐานของโครงการใน repo ยังคือ `pepsi_pm`**

เอกสารออกแบบ: [`../docs/DATABASE_DESIGN_DRAFT.md`](../docs/DATABASE_DESIGN_DRAFT.md)  
Tree view (repo + DB ละเอียด): [`../docs/PROJECT_STRUCTURE.md`](../docs/PROJECT_STRUCTURE.md)  
Backend API (พอร์ต 5000): [`../docs/BACKEND_STRUCTURE.md`](../docs/BACKEND_STRUCTURE.md), [`../backend/README.md`](../backend/README.md)
