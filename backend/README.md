# Pepsi PM — Backend (Node.js + Express)

สอด [`docs/BACKEND_STRUCTURE.md`](../docs/BACKEND_STRUCTURE.md), [`docs/PROGRAM_FLOW.md`](../docs/PROGRAM_FLOW.md), [`docs/ER_DIAGRAM.md`](../docs/ER_DIAGRAM.md) และสัญญา HTTP [`docs/api/openapi.yaml`](../docs/api/openapi.yaml)

## ความต้องการ

- Node **20+**
- MariaDB ชื่อ **`pepsi_pm`** — รัน [`V001`](../database/migrations/V001__initial_schema.sql); ทางเลือก [`V002`](../database/migrations/V002__demo_user.sql) (ผู้ใช้ `demo`); **ฟีเจอร์ normalize+confirm+คิว+KPI ต้องรัน [`V003`](../database/migrations/V003__import_jobs_oc_sync_dedupe.sql)**

## ติดตั้งและรัน dev

```bash
cd backend
cp .env.example .env
# แก้ DATABASE_* ให้ตรงเซิร์ฟเวอร์ของคุณ
npm install
npm run dev
```

- API: `http://127.0.0.1:5000` (ล็อกพอร์ต **5000** สอดเอกสารโครงสร้าง / ภาคผนวก ค)
- Health: `GET http://127.0.0.1:5000/health`
- **Frontend (Vite):** [`../frontend/`](../frontend/) — `npm run dev` พอร์ต **3000** · ตั้ง `VITE_API_BASE_URL=http://127.0.0.1:5000` (ดู `frontend/.env.example`) · `CORS_ORIGIN` ใน backend — คั่นหลาย origin ด้วย comma (ค่าเริ่มต้นรวม `http://127.0.0.1:3000` และ `http://localhost:3000` เพราะเบราว์เซอร์ถือว่าเป็นคนละ origin)

## Build production

```bash
npm run build
npm start
```

## Worker (คิว `import_jobs`)

รันกระบวนการหนักแยกจาก HTTP (normalize, KPI):

```bash
npm run worker
```

หลัง `npm run build` บนเซิร์ฟเวอร์: `npm run worker:prod` (รัน `dist/worker/runner.js`)

- คิวงาน: `POST /api/v1/import-batches/:id/normalize/async` หรือ `POST /api/v1/jobs/normalize-batch` / `POST /api/v1/jobs/kpi-snapshot`
- สถานะ: `GET /api/v1/jobs/:id`

## Middleware stack

ลำดับอยู่ใน `src/app.ts` — ดูตารางใน `docs/BACKEND_STRUCTURE.md` §3

## Auth (JWT)

- `SKIP_AUTH=true` (ค่าเริ่มต้นใน `.env.example`): ไม่ต้องส่ง `Authorization` — เหมาะ dev ในเครื่อง
- `SKIP_AUTH=false`: ตั้ง `JWT_SECRET` (อย่างน้อย 16 ตัวอักษร) แล้วส่ง `Authorization: Bearer <token>`
- รับ token ใน dev: `POST /api/v1/auth/dev-token` + header `X-Dev-Auth-Secret` ตรง `DEV_AUTH_SECRET` + body JSON `{ "gpid": "demo" }` (ต้องรัน migration `V002__demo_user.sql` ก่อน)
- ตรวจ user ปัจจุบัน: `GET /api/v1/auth/me`

## Import (SAP file → staging)

- `POST /api/v1/imports/:kind` — `kind` = `iw37n` | `confirm_wo` | `gi` | `gr` — field multipart `file` — parse ด้วย SheetJS (`xlsx`) หรือ fallback TSV สำหรับไฟล์ `.xls` แบบ tab-separated
- แถวถูกบันทึกใน `stg_iw37n_row` / `stg_confirm_wo_row` / `stg_mb51_row` และอัปเดต `import_batches` (รวม `source_sha256`, จำนวนแถว, สถานะ)
- **UI:** [`frontend`](../frontend/) เปิด **`/data/import`** — อัปโหลด, ดู batch, normalize, ดู `import_errors` (ต้องมีสิทธิ์ `import.run` เมื่อ `SKIP_AUTH=false`)

หลังอัปโหลดแล้ว:

- **`POST /api/v1/import-batches/{id}/normalize`** — sync ใน request เดียว
- **`POST /api/v1/import-batches/{id}/normalize/async`** — ใส่คิวให้ worker

ผลลัพธ์: upsert `work_orders` / `equipments`; **Confirm WO** เขียน `order_confirmations` (dedupe ด้วย `sap_line_key`); GI/GR → `goods_movements` + `materials`

**Dedupe ไฟล์ซ้ำ:** ตั้ง `DEDUPE_REJECT_DUPLICATE_FILE_SHA=true` แล้วอัปโหลดไฟล์เดิม (SHA เดิม + `source_kind` เดิม) จะได้ **409** พร้อม `existingBatchId`

**KPI:** `POST /api/v1/jobs/kpi-snapshot` body `{ "snapshotDate": "YYYY-MM-DD", "plant": "" }` — materialize `kpi_daily_snapshots`

**แดชบอร์ด:** `GET /api/v1/dashboard/stats` — สรุปจำนวน WO ตาม `system_status`, import รายวัน 14 วัน, import ตาม `source_kind` 30 วัน (สำหรับกราห์ UI `/dashboard`)

**KPI snapshot (DB):** `GET /api/v1/dashboard/kpi-snapshots?limit=60&plant=` — อ่าน `kpi_daily_snapshots` + `metrics_json` หลังรัน `POST /api/v1/jobs/kpi-snapshot` และ worker

หมายเหตุ: แพ็กเกจ `xlsx` มี advisory จาก npm — ใช้เฉพาะ parse ไฟล์ที่ไว้ใจได้

## Task log — อัปโหลดรูปหลักฐาน (WebP)

- `POST /api/v1/task-logs/{taskLogId}/attachments` — multipart ฟิลด์ **`file`** (JPEG/PNG/WebP/GIF/…)
- ค่าเริ่มต้น backend ใช้ **`sharp`** แปลงเป็น `image/webp` ย่อด้านยาวไม่เกิน 2048 px — สอด [`docs/MEDIA_WEBP_POLICY.md`](../docs/MEDIA_WEBP_POLICY.md)
- ไฟล์เขียนลง `ATTACHMENTS_DIR` (ค่าเริ่มต้น `data/attachments/` ภายใต้ `backend/`) และบันทึก metadata ใน `task_log_attachments`
- ต้องมีแถว `task_logs` ที่ `id` ตรงกับ `{taskLogId}` ก่อน (มิฉะนั้น **404**)
- เมื่อ `SKIP_AUTH=false` ต้องมีสิทธิ์ **`work_order.edit`**
- ปิดการแปลงฝั่งเซิร์ฟเวอร์ (รับเฉพาะ WebP จาก client): `ATTACHMENTS_USE_SHARP=false`

**Frontend:** แปลงในเบราว์เซอร์ด้วย [`frontend/src/lib/images/convertToWebp.ts`](../frontend/src/lib/images/convertToWebp.ts) ก่อนส่งก็ได้ — backend จะ re-encode ให้สม่ำเสมอเมื่อ `ATTACHMENTS_USE_SHARP=true`

**สร้าง task log ก่อนแนบรูป:** `POST /api/v1/work-orders/{workOrderId}/task-logs` body ทางเลือก `{ "logType": "photo" }` — จากนั้น `POST /api/v1/task-logs/{taskLogId}/attachments` · UI: [`frontend`](../frontend/) หน้า **`/evidence`**
