# Program flow — Pepsi PM (repo ปัจจุบัน)

เอกสารนี้สรุป **ลำดับการทำงานหลัก** ของแอปตามโค้ด backend + แผน frontend ใน repo — ไม่ใช่ SRS ฉบับลูกค้าแต่เป็น **technical flow** สำหรับทีมพัฒนา

**อ้างอิง:** [`BACKEND_STRUCTURE.md`](BACKEND_STRUCTURE.md) · [`api/openapi.yaml`](api/openapi.yaml) · [`ER_DIAGRAM.md`](ER_DIAGRAM.md) · [`DATABASE_DESIGN_DRAFT.md`](DATABASE_DESIGN_DRAFT.md)

---

## 0. คีย์สัญลักษณ์ (Flowchart)

แผนภาพใช้ **Mermaid `flowchart`** ให้สอด **สัญลักษณ์ทาง flow แบบทั่วไป** (เทียบ ANSI / ตำรา flowchart):

| รูปร่างใน Mermaid | สัญลักษณ์ | ความหมาย |
|-------------------|-----------|-----------|
| `((ข้อความ))` | **วงรี (Terminator)** | จุดเริ่ม **START** / จุดจบ **END** |
| `[/ ข้อความ /]` | **สี่เหลี่ยมด้านเฉียง (Input/Output)** | ข้อมูลเข้า–ออก เช่น HTTP, multipart, JSON response |
| `[ข้อความ]` | **สี่เหลี่ยม (Process)** | ประมวลผล / คำสั่ง / middleware / ฟังก์ชัน |
| `{ข้อความ?}` | **สี่เหลี่ยมขนมเปียกปู (Decision)** | เงื่อนไข ใช่/ไม่ใช่, แยกสาขา |
| `[(ข้อความ)]` | **ทรงกระบอก (Data store)** | ฐานข้อมูล / ที่เก็บข้อมูลถาวร |
| `subgraph` | **กรอบกลุ่ม** | ชั้นระบบหรือกลุ่มโปรเซส |

**อักขระเสริม (บนลูกศร):** ป้ายกำกับสาย เช่น `|yes|` `|REST|` = เงื่อนไขหรือชนิดข้อมูลที่ไหลผ่าน

**หมายเหตุ:** แผนภาพแบบ `sequenceDiagram` (§5) ใช้ **UML sequence** (เส้นชีวิต + ข้อความ) — ไม่ใช่ flowchart แต่แสดงลำดับเวลาเดียวกัน; ด้านล่างมี **flowchart คู่ขนาน** สำหรับ worker

---

## 1. ภาพรวมชั้นระบบ

```mermaid
flowchart TB
  START((START))
  START --> FE[/ Client\nBrowser / FE แผน /]
  subgraph client [ชั้น Client]
    FE
  end
  FE -->|REST multipart| API[Express API :5000]
  subgraph server [ชั้น Application Server]
    API
    W[Worker\nnpm run worker]
  end
  API --> DB[(MariaDB pepsi_pm :3307)]
  W --> DB
  API -.->|INSERT import_jobs| DB
  W -.->|claim SKIP LOCKED| DB
  DB --> END((END))
```

- **HTTP:** ผู้ใช้ / FE เรียก API เท่านั้น  
- **Worker:** ดึงงานจากตาราง `import_jobs` — ไม่รับ HTTP โดยตรง

---

## 2. HTTP request (middleware chain)

ลำดับจริงอยู่ที่ [`backend/src/app.ts`](../backend/src/app.ts)

```mermaid
flowchart TD
  START((START))
  START --> REQ[/ HTTP request เข้า /]
  REQ --> B[helmet]
  B --> C[cors]
  C --> D["express.json\nurlencoded"]
  D --> E[requestId]
  E --> F[morgan]
  F --> G[optionalAuth\nSKIP_AUTH หรือ JWT]
  G --> H{แยก route?}
  H -->|prefix /api/v1| I[routers /api/v1]
  H -->|GET /health| J[healthRouter]
  I --> K{ต้องการ\nrequireAuth?}
  K -->|ใช่| L{ต้องการ\nrequirePermission?}
  K -->|ไม่| M[Handler]
  L -->|ผ่าน| M
  L -->|ไม่ผ่าน| E403[/ 403 JSON /]
  M --> N{เกิด Error?}
  N -->|ใช่| O[errorHandler]
  N -->|ไม่| P[/ JSON response /]
  O --> P
  J --> P
  P --> END((END))
```

---

## 3. นำเข้าไฟล์ SAP → staging

```mermaid
flowchart TD
  START((START))
  START --> IN[/ POST multipart\n/api/v1/imports/:kind /]
  IN --> A{requireAuth +\nimport.run?}
  A -->|ไม่ผ่าน| E401[/ 401 หรือ 403 /]
  A -->|ผ่าน| B[multer memory]
  B --> C{parseSpreadsheetToRows\nสำเร็จ?}
  C -->|ไม่| E400[/ 400 UNREADABLE /]
  C -->|ใช่| D{DEDUPE_REJECT_\nDUPLICATE_FILE_SHA\nและ SHA ซ้ำ?}
  D -->|ใช่| E409[/ 409 DUPLICATE_FILE_SHA /]
  D -->|ไม่| T[BEGIN transaction]
  T --> I[INSERT import_batches\npending + sha256]
  I --> L[Bulk INSERT stg_*]
  L --> U[UPDATE batch\nstatus + counts]
  U --> COMMIT[COMMIT]
  COMMIT --> R202[/ 202 + batchId /]
  R202 --> END((END))
  E401 --> END
  E400 --> END
  E409 --> END
```

ชนิด `kind` แยก staging: `iw37n` → `stg_iw37n_row`, `confirm_wo` → `stg_confirm_wo_row`, `gi`/`gr` → `stg_mb51_row`

---

## 4. Normalize batch → ตาราง operational

ทาง **sync:** `POST /api/v1/import-batches/:id/normalize`  
ทาง **async:** `POST .../normalize/async` หรือ `POST /api/v1/jobs/normalize-batch` → worker เรียก logic เดียวกัน

```mermaid
flowchart TD
  START((START))
  START --> N[/ POST normalize\nหรือ worker เรียก /]
  N --> V{source_kind?}
  V -->|iw37n| I[อ่าน stg_iw37n_row]
  I --> E1[ensure equipments]
  E1 --> W1[UPSERT work_orders]
  V -->|confirm_wo| C[อ่าน stg_confirm_wo_row]
  C --> E2[ensure equipments]
  E2 --> W2[UPSERT work_orders]
  W2 --> OC[DELETE order_confirmations\nby sap_line_key]
  OC --> OI[INSERT order_confirmations]
  V -->|gi หรือ gr| G[DELETE goods_movements\nbatch นี้]
  G --> M[ensure materials]
  M --> GM[INSERT goods_movements]
  W1 --> NB[UPDATE import_batches.notes]
  W2 --> NB
  OI --> NB
  GM --> NB
  NB --> CM[COMMIT transaction]
  CM --> OK[/ 200 summary JSON /]
  OK --> END((END))
```

ทั้งกระบวนการอยู่ใน **transaction เดียว** — ถ้า error ระหว่างทาง service จะ **ROLLBACK** แล้วส่งต่อไป `errorHandler` (ไม่วิ่งมาถึง `OK` ในแผนภาพนี้)

หมายเหตุ: **Worker loop (§5.2)** ไม่มี `END` — รันต่อเนื่องจนกว่าจะหยุดโปรเซส

---

## 5. Worker กับคิว KPI

### 5.1 UML sequence (ลำดับเวลา)

```mermaid
sequenceDiagram
  participant U as Operator / FE
  participant API as Express
  participant DB as MariaDB
  participant W as Worker process
  U->>API: POST jobs kpi-snapshot or normalize async
  API->>DB: INSERT import_jobs pending
  API-->>U: 202 jobId
  loop poll WORKER_POLL_MS
    W->>DB: SELECT ... FOR UPDATE SKIP LOCKED
    DB-->>W: job row หรือว่าง
    alt มีงาน
      W->>DB: UPDATE running
      W->>DB: execute job\nnormalize / kpi_snapshot
      W->>DB: UPDATE done / failed
    end
  end
  U->>API: GET /jobs/:id
  API->>DB: SELECT status
  API-->>U: pending | running | done | failed
```

### 5.2 Flowchart สัญลักษณ์เดียวกับ §0 (Worker loop)

```mermaid
flowchart TD
  START((START))
  START --> W0[Worker boot\ngetPool]
  W0 --> POLL{มีงาน\npending + available?}
  POLL -->|ไม่| SLEEP[รอ WORKER_POLL_MS]
  SLEEP --> POLL
  POLL -->|ใช่| CLAIM[SELECT SKIP LOCKED\nUPDATE running]
  CLAIM --> RUN{job_type?}
  RUN -->|normalize_batch| NORM[normalizeImportBatch]
  RUN -->|kpi_snapshot| KPI[runKpiSnapshot]
  NORM --> RES{สำเร็จ?}
  KPI --> RES
  RES -->|ใช่| DONE[UPDATE import_jobs\ndone]
  RES -->|ไม่| FAIL[UPDATE import_jobs\nfailed + last_error]
  DONE --> POLL
  FAIL --> POLL
```

---

## 6. Auth (JWT) แบบย่อ

```mermaid
flowchart TD
  START((START))
  START --> REQ[/ Authorization\nheader /]
  REQ --> MODE{SKIP_AUTH\n= true?}
  MODE -->|ใช่| STUB[optionalAuth\nใส่ req.user stub]
  MODE -->|ไม่| BT{มี Bearer token?}
  BT -->|ไม่| ANON[anonymous\nไม่มี req.user]
  BT -->|ใช่| JWT[jwt.verify +\nloadAuthUser]
  JWT --> OK[req.user + permissions]
  STUB --> END((END))
  ANON --> END
  OK --> END
```

รับ token dev: `POST /api/v1/auth/dev-token` (เมื่อไม่ใช่ production) — ดู [`BACKEND_STRUCTURE.md`](BACKEND_STRUCTURE.md) §4

---

## 7. แผน frontend (อ้างอิงเท่านั้น)

โค้ด FE ยังไม่ใน repo — flow ที่วางไว้: หน้า import → API upload → แสดง batch → กด normalize (sync หรือ async) → ดู work orders / dashboard — ดู [`FRONTEND_STRUCTURE.md`](FRONTEND_STRUCTURE.md) §3–5

---

## 8. เวอร์ชันเอกสาร

| เวอร์ชัน | วันที่ | เปลี่ยนแปลง |
|----------|--------|-------------|
| 1.0 | 2026-05-04 | ร่างแรก: ภาพรวม, HTTP, import, normalize, worker, auth |
| 1.1 | 2026-05-04 | คีย์สัญลักษณ์ §0; ปรับทุก flowchart เป็น terminator / I-O / process / decision / DB |
