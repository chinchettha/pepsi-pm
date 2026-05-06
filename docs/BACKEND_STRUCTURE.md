# Backend structure — API, layers, middleware

สถานะ: **scaffold ใน repo** ที่ [`../backend/`](../backend/) — Node.js + Express + TypeScript (สอด SRS / Requirement: **React + Node + MariaDB**)

คู่มือรันเร็ว: [`../backend/README.md`](../backend/README.md) · สัญญา HTTP ฉบับร่าง: [`api/openapi.yaml`](api/openapi.yaml) · **Flow / ER:** [`PROGRAM_FLOW.md`](PROGRAM_FLOW.md), [`ER_DIAGRAM.md`](ER_DIAGRAM.md) · **SDD:** [`SOFTWARE_DESIGN_DOCUMENT.md`](SOFTWARE_DESIGN_DOCUMENT.md)

---

## 1. Tree view — โฟลเดอร์ `backend/`

```
backend/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── src/
│   ├── server.ts                    # bootstrap HTTP, listen PORT (ล็อก 5000 สอดภาคผนวก ค)
│   ├── app.ts                       # ประกอบ Express + middleware chain + routes
│   ├── config/
│   │   └── env.ts                   # โหลด dotenv + Zod validate
│   ├── db/
│   │   └── pool.ts                  # mysql2/promise pool → pepsi_pm
│   ├── middleware/                  # ลำดับการ mount ดู §3
│   │   ├── requestId.ts
│   │   ├── logger.ts                # HTTP access log (morgan)
│   │   ├── auth.ts                  # ตรวจ JWT / session (ร่าง — ดู §4)
│   │   ├── requirePermission.ts     # RBAC F10 — ผูกกับ permissions ใน DB
│   │   ├── errorHandler.ts          # จับ error → JSON มาตรฐาน
│   │   └── notFound.ts              # 404 JSON
│   ├── routes/                      # HTTP API (เวอร์ชัน URL: /api/v1)
│   │   ├── index.ts                 # mount ย่อย
│   │   ├── dashboard.ts             # GET /dashboard/stats (สรุปกราฟ)
│   │   ├── health.ts
│   │   ├── auth.ts                  # dev-token + GET /me
│   │   ├── imports.ts               # F01/F03/F04 — multipart นำเข้า SAP file → stg_*
│   │   ├── importBatches.ts         # GET batches + errors + POST normalize (+ async queue)
│   │   ├── jobs.ts                # POST enqueue normalize / KPI, GET job status
│   │   ├── workOrders.ts            # F02 — GET list + GET :id (รายละเอียด) + POST …/task-logs (หลักฐาน)
│   │   └── taskLogAttachments.ts    # POST รูปหลักฐาน → WebP + task_log_attachments
│   ├── jobs/
│   │   ├── importJobStore.ts        # import_jobs CRUD + SKIP LOCKED claim
│   │   ├── processImportJob.ts      # dispatch normalize / kpi_snapshot
│   │   └── kpiSnapshot.ts           # materialize kpi_daily_snapshots
│   ├── worker/
│   │   └── runner.ts                # `npm run worker` — poll queue (แยกจาก HTTP)
│   ├── services/
│   │   ├── spreadsheetParse.ts      # xlsx + TSV fallback
│   │   ├── importMaps.ts            # หัวคอลัมน์ SAP → คอลัมน์ staging
│   │   ├── importRun.ts             # transaction: import_batches + bulk INSERT stg_*
│   │   ├── dedupeImport.ts          # ค้นหา batch เดิมจาก SHA + kind
│   │   ├── normalizeBatch.ts        # staging → WO / GM / order_confirmations (V003)
│   │   ├── attachmentWebp.ts        # sharp: resize + encode WebP (MEDIA_WEBP_POLICY)
│   │   └── userPermissions.ts      # JWT sub → users + roles/permissions
│   └── types/
│       └── express.d.ts             # ขยาย Request (requestId, user, …)
└── tests/
    └── .gitkeep
```

---

## 2. ชั้นโค้ด (layers)

| ชั้น | โฟลเดอร์ | หน้าที่ |
|------|-----------|---------|
| HTTP | `routes/` | รับ request, validate input, ส่ง response — ไม่ใส่ SQL ยาว |
| Service | `services/` | กฎธุรกิจ, import pipeline, normalize → `work_orders` |
| Data | `db/pool.ts` + (ถัดไป) `repositories/` | query ตาราง [`pepsi_pm`](../database/migrations/V001__initial_schema.sql) |
| Cross-cutting | `middleware/` | auth, log, error, correlation id |

---

## 3. Middleware — ลำดับการ mount (บน Express)

ลำดับใน [`src/app.ts`](../backend/src/app.ts) จากนอกเข้าใน:

| ลำดับ | Middleware | หมายเหตุ |
|-------|------------|----------|
| 1 | `helmet()` | หัวข้อความปลอดภัยพื้นฐาน |
| 2 | `cors` — `CORS_ORIGIN` คั่นหลาย URL ด้วย comma + **ขยาย loopback คู่กัน** (`localhost` ↔ `127.0.0.1` พอร์ตเดียวกัน) | กันพลาดตอนเปิด FE ที่ `localhost` แต่ `.env` ใส่แค่ `127.0.0.1` |
| 3 | `express.json()` | body JSON |
| 4 | `express.urlencoded({ extended: true })` | form (ถ้ามี) |
| 5 | `requestId` | `X-Request-Id` — trace ข้าม FE–BE–DB |
| 6 | `morgan` (ใน `logger.ts`) | access log |
| 7 | `optionalAuth` / `requireAuth` | เฉพาะ route ที่ต้องล็อกอิน — ร่างอ่าน `Authorization` หรือ `SKIP_AUTH` |
| 8 | `requirePermission('code')` | หลังมี user — เช็คกับ `user_roles` / `permissions` |
| 9 | **routers** `/api/v1/*` | |
| 10 | `notFound` | |
| 11 | `errorHandler` | จับ error สุดท้าย |

---

## 4. Auth / RBAC (F10)

- **`SKIP_AUTH=true`:** `optionalAuth` ใส่ `req.user` จำลอง (`permissions: ['*']`, `id: 0`) — ไม่บันทึก `imported_by_user_id`  
- **`SKIP_AUTH=false`:** ต้องมี `JWT_SECRET` (≥16 ตัวอักษร) — อ่าน `Authorization: Bearer …` ตรวจ HS256 แล้วโหลด `users` + สิทธิ์จาก `user_roles` / `role_permissions` (บทบาท `admin` = `*`)  
- **Dev token:** `POST /api/v1/auth/dev-token` (ปิดใน `NODE_ENV=production`) + header `X-Dev-Auth-Secret` = `DEV_AUTH_SECRET` + body `{ "gpid": "…" }` — ต้องมีผู้ใช้ในฐาน (เช่น migration `V002__demo_user.sql`)  
- **`requirePermission('…')`:** เช็ค `req.user.permissions` (ยกเว้นเมื่อ `SKIP_AUTH` — ข้าม RBAC เพื่อความสะดวก dev)

---

## 5. API — เส้นทางหลัก (prefix `/api/v1`)

| Method | Path | หมายเหตุ |
|--------|------|----------|
| GET | `/health` | liveness (ไม่มี prefix) |
| GET | `/api/v1/health` | พร้อมเวอร์ชัน API |
| POST | `/api/v1/auth/dev-token` | dev เท่านั้น — ออก JWT สำหรับ `users.gpid` |
| GET | `/api/v1/auth/me` | ข้อมูลผู้ใช้ + permissions (ต้องล็อกอิน) |
| POST | `/api/v1/imports/:kind` | `kind` = `iw37n` \| `confirm_wo` \| `gi` \| `gr` — multipart ไฟล์เดียว → `import_batches` + `stg_*` |
| GET | `/api/v1/import-batches` | รายการ batch + filter |
| POST | `/api/v1/import-batches/:id/normalize` | sync เดียวกับด้านล่าง (ใน HTTP request) |
| POST | `/api/v1/import-batches/:id/normalize/async` | คิว `import_jobs` — รัน `npm run worker` |
| POST | `/api/v1/jobs/normalize-batch` | body `{ batchId }` — คิว normalize (สิทธิ์ `import.run`) |
| POST | `/api/v1/jobs/kpi-snapshot` | body `{ snapshotDate, plant? }` — คิว KPI (`report.dashboard`) |
| GET | `/api/v1/jobs/:id` | สถานะ job (`pending` \| `running` \| `done` \| `failed`) |
| GET | `/api/v1/import-batches/:id/errors` | รายการ `import_errors` |
| GET | `/api/v1/work-orders` | list (query `page`, `pageSize`) |
| GET | `/api/v1/work-orders/:workOrderId` | รายละเอียดใบงานหนึ่งรายการ (`item` จาก `work_orders`; **400** `INVALID_WORK_ORDER_ID`, **404** `WORK_ORDER_NOT_FOUND`) |
| POST | `/api/v1/work-orders/:workOrderId/task-logs` | สร้าง `task_logs` ก่อนอัปโหลดหลักฐาน (สิทธิ์ `work_order.edit` เมื่อไม่ `SKIP_AUTH`) |

**Normalize (สรุป):** `iw37n` / `confirm_wo` → upsert `work_orders` + `equipments`; **`confirm_wo`** เพิ่ม `order_confirmations` (dedupe ด้วย `sap_line_key`, migration **V003**); `gi` / `gr` → `materials` + `goods_movements` (ลบ GM เดิมของ batch ก่อน insert)

**Dedupe ไฟล์ซ้ำ:** env `DEDUPE_REJECT_DUPLICATE_FILE_SHA=true` → `POST /imports/:kind` ตอบ **409** ถ้า `source_sha256` + `source_kind` ซ้ำกับ batch ที่มีอยู่

รายละเอียด request/response ฉบับ OpenAPI: [`api/openapi.yaml`](api/openapi.yaml)

---

## 6. ความสัมพันธ์กับ frontend / DB

| คู่ | ลิงก์ |
|-----|--------|
| FE → BE | `VITE_API_BASE_URL` → `http://<host>:5000` — [`FRONTEND_STRUCTURE.md`](FRONTEND_STRUCTURE.md) |
| BE → DB | `DATABASE_*` → `pepsi_pm` — [`database/README.md`](../database/README.md) |
| Import pipeline | staging + `import_jobs` + V003 — [`DATABASE_DESIGN_DRAFT.md`](DATABASE_DESIGN_DRAFT.md) §8 · [`database/migrations/V003__import_jobs_oc_sync_dedupe.sql`](../database/migrations/V003__import_jobs_oc_sync_dedupe.sql) |

---

## 7. งานถัดไป (backend)

- [x] Parser + `INSERT` เข้า `stg_*` (IW37N / Confirm WO / GI·GR → `stg_mb51_row`) + `import_batches`  
- [x] Normalize → `work_orders` / `goods_movements` / `order_confirmations` (Confirm WO) + dedupe `sap_line_key`  
- [x] คิว `import_jobs` + worker (`npm run worker`) แยกจาก HTTP + KPI snapshot job  
- [x] Dedupe ไฟล์ซ้ำด้วย SHA (opt-in `DEDUPE_REJECT_DUPLICATE_FILE_SHA`)  
- [x] JWT + โหลดสิทธิ์จาก DB + `requirePermission` (ยกเว้น `SKIP_AUTH`)  
- [ ] IdP โรงงาน (SSO / session) แทน `dev-token` ใน production  
- [ ] Docker Compose รวม `backend` + `mariadb` + worker (อ้าง [`INSTALL_SOP_TAILSCALE_DOCKER.md`](INSTALL_SOP_TAILSCALE_DOCKER.md))  
- [x] API แนบรูป `task_log_attachments`: `POST /api/v1/task-logs/:taskLogId/attachments` + **sharp** (ปิดได้ด้วย `ATTACHMENTS_USE_SHARP`) — [`MEDIA_WEBP_POLICY.md`](MEDIA_WEBP_POLICY.md)

---

| เวอร์ชัน | หมายเหตุ |
|----------|----------|
| 1.0 | 2026-05-04 — scaffold backend + เอกสารนี้ + openapi ร่าง |
| 1.1 | 2026-05-04 — parser staging, JWT, multer 2.x |
| 1.2 | 2026-05-04 — normalize job staging → operational tables |
| 1.3 | 2026-05-04 — Confirm→`order_confirmations`, `import_jobs`+worker, KPI job, SHA dedupe |
| 1.4 | 2026-05-04 — ลิงก์ [`PROGRAM_FLOW.md`](PROGRAM_FLOW.md), [`ER_DIAGRAM.md`](ER_DIAGRAM.md) |
| 1.5 | 2026-05-04 — ลิงก์ [`MEDIA_WEBP_POLICY.md`](MEDIA_WEBP_POLICY.md); งานถัดไป attachment API |
| 1.6 | 2026-05-04 — `POST /task-logs/:id/attachments`, `attachmentWebp.ts` + sharp, env `ATTACHMENTS_*` |
| 1.7 | 2026-05-05 — `POST /work-orders/:workOrderId/task-logs` (รองรับ SKIP_AUTH → `__system__`) |
| 1.8 | 2026-05-05 — `GET /dashboard/stats` (WO ตาม status, import รายวัน/ตาม kind) |
| 1.9 | 2026-05-05 — `GET /dashboard/kpi-snapshots` → `kpi_daily_snapshots` / `metrics_json` |
| 1.10 | 2026-05-05 — `GET /work-orders/:workOrderId` รายละเอียดใบงาน (รองรับหน้า FE detail) · OpenAPI `WorkOrderDetail` |
| 1.11 | 2026-05-05 — `CORS_ORIGIN` รองรับหลาย origin (comma) · ค่าเริ่มต้นรวม `localhost` + `127.0.0.1` |
| 1.12 | 2026-05-05 — CORS ขยาย `localhost` ↔ `127.0.0.1` (พอร์ตเดียวกัน) อัตโนมัติ · log ตอนบูตแสดงรายการที่อนุญาตทั้งหมด |
