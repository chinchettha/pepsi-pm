# แผนการดำเนินงานโครงการ (Project Plan) ฉบับสมบูรณ์ — Pepsi Cola PM Application

เอกสารนี้เป็น **แผนละเอียดสำหรับนำไปสร้างงานใน ClickUp** (หรือเครื่องมือจัดการงานอื่น) — สอด [`PROJECT_PLAN.md`](PROJECT_PLAN.md) ฉบับ repo และขยายเป็นงานย่อยที่ตรวจสอบได้

| Field | Value |
|-------|-------|
| โครงการ | Pepsi Cola PM Application (`pepsi_pm`) |
| ลูกค้า | บริษัท เป๊ปซี่โคล่า (ไทย) เทรดดิ้ง จำกัด (ลำพูน) |
| วันเริ่มแผน (ร่าง) | 2026-05-09 |
| วันเป้าส่งมอบ (ร่าง) | 2026-06-30 |
| เจ้าของแผน (PO/PM) | TBD |
| อัปเดตเอกสาร | 2026-05-04 |

---

## วิธี map เข้า ClickUp (แนะนำ)

| องค์ประกอบ ClickUp | แนะนำใน repo นี้ |
|---------------------|------------------|
| **Space / Folder** | `Pepsi PM` หรือ `2020-pepsi-pm` |
| **List ระดับบน** | ตาม **Milestone** (`M0` … `M6`) หรือตาม **Phase** (`Phase 0` … `Phase 6`) |
| **Task** | แต่ละแถวที่มี **Task ID** (เช่น `P0-1`, `F01-S3`) — ใช้เป็น prefix ชื่องาน |
| **Subtask** | bullet ย่อยภายใต้งานหลัก (ถ้าต้องการแตกรายวัน) |
| **Custom Field** | `Owner` (PO/TL/BE/FE/QA/IT/KEY), `Milestone` (M0–M6), `Feature` (F01–F12), `Doc` (ลิงก์ docs), `Priority` |
| **Dependency** | M1 ขึ้นกับ M0 scope lock; M2 ขึ้นกับ M1 infra; M3 ขึ้นกับ M2 slice; M4 หลัง M3; M5 หลัง M4; M6 หลัง M5 |
| **Tags** | `infra`, `backend`, `frontend`, `qa`, `customer`, `blocker` |

นำเข้า: คัดลอกเป็น CSV / ใช้ ClickUp Import หรือสร้าง Template List แล้ว duplicate ต่อ milestone

---

## 1. วัตถุประสงค์และผลส่งมอบหลัก (Project charter)

### 1.1 วัตถุประสงค์

- ส่งมอบ **แอปพลิเคชัน PM (Plant Maintenance)** ตามชุดเอกสารลูกค้าใน `from customer/` (ล็อกแบบ B ตาม [`PROJECT_PLAN.md`](PROJECT_PLAN.md))
- รองรับ **นำเข้าข้อมูล SAP** (IW37N, Confirm WO, GI/GR ฯลฯ ตาม scope), **ใบงาน / ปฏิทิน / Confirm / KPI / RBAC** ตามที่ตกลงในแต่ละ sprint
- ติดตั้งและรันได้บน **โครงสร้างลูกค้า** (Drive D, Docker, พอร์ต 3000/5000/3307, Tailscale ตาม SOP)

### 1.2 ผลส่งมอบหลัก (Deliverables summary)

| ลำดับ | Deliverable | เกณฑ์สำเร็จเชิงโครงการ |
|-------|-------------|-------------------------|
| DLV-1 | เอกสารความต้องการล็อก + changelog scope | M0 exit |
| DLV-2 | สภาพแวดล้อม dev/pilot บนเครื่องลูกค้า | M1 exit |
| DLV-3 | แอปมี shell + auth + **workflow แนวตั้งหนึ่งเส้นทาง** E2E | M2 exit |
| DLV-4 | ฟีเจอร์ตาม Phase 4 ที่ตกลงใน backlog | M3 exit |
| DLV-5 | ชุดทดสอบ + regression + ไม่มี critical ค้าง | M4 exit |
| DLV-6 | UAT ลงนาม + pilot | M5 exit |
| DLV-7 | Go-live + runbook + backup drill + handover | M6 exit |

### 1.3 ขอบเขต (ในแผน)

- Backend `backend/`, DB `pepsi_pm`, migration, API ตาม [`api/openapi.yaml`](api/openapi.yaml)
- Frontend ตาม [`FRONTEND_STRUCTURE.md`](FRONTEND_STRUCTURE.md) (เมื่อเริ่ม scaffold)
- เอกสาร technical ใน `docs/` ที่อ้างใน PROJECT_PLAN

### 1.4 นอกขอบเขต (ยกเว้นมี change request)

- การเชื่อม SAP แบบ BAPI/MII แบบเต็ม production หากยังไม่ล็อกใน SOW
- ฟีเจอร์ที่ลูกค้ายังไม่ล็อกรูปแบบไฟล์ (เช่น FL import) จนกว่าจะมีตัวอย่างไฟล์

---

## 2. ผู้มีส่วนได้ส่วนเสียและบทบาท (RACI สรุป)

| บทบาท | รหัส | หน้าที่หลัก |
|--------|------|-------------|
| Product Owner / PM | PO | Scope, priority, acceptance, สื่อสารลูกค้า |
| Tech Lead | TL | สถาปัตยกรรม, review, compose/infra ร่วม IT |
| Backend | BE | API, import, normalize, worker, DB migration |
| Frontend | FE | React/Vite, routing, UI ตาม SRS ลูกค้า |
| QA | QA | Test plan, regression, evidence, traceability |
| IT ลูกค้า / โฮสต์ | IT | Docker, D:, firewall, Tailscale, backup |
| Plant / UAT | KEY | ข้อมูลทดสอบ, UAT sign-off ฝั่งโรงงาน |

---

## 3. Timeline — Milestone และวันที่เป้า

| Milestone | วันที่เป้า | Lead | Exit criteria (สั้น) |
|-----------|------------|------|----------------------|
| **M0** Kickoff | 2026-05-16 | PO, TL | SRS locked, RACI, repo rules |
| **M1** Infra | 2026-05-30 | IT, TL | Docker on D:, Tailnet, dev ตาม SOP |
| **M2** Vertical slice | 2026-06-07 | TL, BE, FE | Shell + E2E หนึ่งเส้นทาง |
| **M3** Feature complete | 2026-06-14 | TL, BE, FE | Phase 4 scope ตกลงครบ |
| **M4** QA sign-off | 2026-06-21 | QA | ไม่มี critical defect ค้าง |
| **M5** UAT pilot | 2026-06-26 | PO, KEY, IT | UAT signed, pilot |
| **M6** Go-live | 2026-06-30 | PO, IT, TL | Runbook, backup, handover |

**หมายเหตุ:** วันที่ปรับตามสัญญา/ทรัพยากรจริง — ใส่ใน ClickUp เป็น **Due date** ของ List หรือ Milestone field

---

## 4. Phase 0 — M0 Kickoff (งานละเอียด)

**เป้า:** ล็อกความต้องการและกติกาโครงการก่อนลงมือ infra เต็มรูปแบบ

| Task ID | ชื่องาน | Owner | รายละเอียด / เกณฑ์ปิดงาน |
|-----------|---------|-------|---------------------------|
| **P0-1** | Lock SRS ชุด PM Application Requirement* + scope changelog | PO | ระบุรุ่นไฟล์ล็อก; บันทึกข้อต่างจาก Pepsi SRS ถ้ามี |
| **P0-2** | RACI + ช่องทางสื่อสาร (ประชุมรอบ, กลุ่ม, email) | PO | ตาราง RACI อัปเดต; cadence ชัด |
| **P0-3** | Branch/PR rules + `.env.example` ราก / backend | TL | CONTRIBUTING หรือ README สั้น; ไม่ commit secret |
| **P0-4** | Backlog / board (ClickUp สอด milestone) | PO, TL | ทุก F01–F12 มีสถานะ scope (in / defer / cut) |

**เอกสารอ้างอิง:** หัว [`PROJECT_PLAN.md`](PROJECT_PLAN.md) ตารางเอกสารลูกค้า

---

## 5. Phase 1 — M1 Infra (งานละเอียด)

**เป้า:** เครื่องลูกค้าพร้อมรัน Docker + Tailscale + โฟลเดอร์ D: ตาม SOP

| Task ID | ชื่องาน | Owner | รายละเอียด / เกณฑ์ปิดงาน |
|-----------|---------|-------|---------------------------|
| **P1-1** | จัดโฟลเดอร์ Drive D ตาม SOP | IT | โครงสร้าง dev / deployment / backup |
| **P1-2** | Docker + data root บน D | IT | Docker Desktop หรือเทียบเท่า; volume path |
| **P1-3** | Tailnet, ACL, invites ทีม | IT | เฉพาะอีเมล/อุปกรณ์ที่อนุมัติ |
| **P1-4** | Firewall + bind ตามแผน | IT, TL | สอดคล้องนโยบายโรงงาน; ไม่เปิดเกินจำเป็น |
| **P1-5** | `docker compose` dev + README อัปเดต | TL, IT | `docker compose up` รัน DB + API (และ FE เมื่อมี) |

**เอกสารอ้างอิง:** [`INSTALL_SOP_TAILSCALE_DOCKER.md`](INSTALL_SOP_TAILSCALE_DOCKER.md), [`INFRASTRUCTURE.md`](INFRASTRUCTURE.md)

---

## 6. Phase 2 — M2 Vertical slice (งานละเอียด)

**เป้า:** มีกรอบแอป + auth + **use case หนึ่งเส้นทาง** จาก UI/API ถึง DB/log

| Task ID | ชื่องาน | Owner | รายละเอียด / เกณฑ์ปิดงาน |
|-----------|---------|-------|---------------------------|
| **P2-1** | Skeleton repo + CI baseline | TL | lint/test บน PR; pipeline ขั้นต่ำ |
| **P2-2** | Auth + roles ตาม SRS | BE, FE | JWT หรือตามแบบที่ล็อก; สิทธิ์ทดสอบขั้นต่ำ |
| **P2-3** | Shell + routing + พอร์ต 3000 (แผน FE) | FE | route หลัก + protected layout |
| **P2-4** | One use case: API + UI + log/audit ขั้นต่ำ | BE, FE | เลือกหนึ่ง flow (เช่น import batch หรือ login+list) ให้ครบ E2E |

**เอกสารอ้างอิง:** [`BACKEND_STRUCTURE.md`](BACKEND_STRUCTURE.md), [`FRONTEND_STRUCTURE.md`](FRONTEND_STRUCTURE.md), [`PROGRAM_FLOW.md`](PROGRAM_FLOW.md)

---

## 7. Phase 4 — M3 Feature development (F01–F12 + งานมาตรฐานต่อฟีเจอร์)

**เป้า:** checklist ฟีเจอร์ที่ตกลงใน backlog ครบก่อนเข้า QA เต็มรูปแบบ

**รหัสงานย่อย:** แต่ละบรรทัดใต้ Epic ใช้รูปแบบ **`Fxx-NNN`** (เช่น `F01-006`) — คัดลอกเป็นชื่อ Subtask ใน ClickUp ได้ตรง ๆ  
งานมาตรฐน **S1–S6** / **T1–T5** ยังใช้ร่วมได้: แมปว่า `Fxx-001`≈AC, กลาง ๆ ≈ implement/test, ท้าย ๆ ≈ review/release note และฝั่ง QA ใช้ `Fxx-T1`… จากหมวด 8

**กติกางานมาตรฐานต่อฟีเจอร์ (ใช้เป็น Subtask หรือ Checklist ใน ClickUp)**

| Sub ID | รายการ | Owner |
|--------|--------|-------|
| **S1** | Acceptance criteria จากชุดลูกค้า + cross-ref Pepsi (ถ้ามี) ลง ticket | PO |
| **S2** | Design / API contract (OpenAPI, sequence) | TL, BE |
| **S3** | Implement | BE / FE |
| **S4** | Unit / integration tests | BE / FE |
| **S5** | Code review + merge | TL |
| **S6** | User note / release note สั้น | PO / FE |

---

### 7.1 Epic F01 — IW37N import / process

| Field | Value |
|-------|-------|
| SRS cross-ref (Pepsi) | SRS-006, SRS-008, SRS-013 |
| Lead | BE |
| อ้างลูกค้า | Requirement.docx — Scheduling / SAP |

**Checklist รายบรรทัด (ใช้เป็น Subtask / Checklist ใน ClickUp — รหัส `F01-xxx`)**

- [ ] **F01-001** — PO: ลง acceptance criteria + ตัวอย่างไฟล์ IW37N ที่ล็อก (path/version ใน ticket)
- [ ] **F01-002** — BE+TL: ออกแบบ mapping หัวคอลัมน์ SAP → `stg_iw37n_row` อ้าง [`SAP_DATA_IMPORT_EXPORT_COLUMNS.md`](SAP_DATA_IMPORT_EXPORT_COLUMNS.md)
- [ ] **F01-003** — BE: ตรวจสอบ schema/migration `stg_iw37n_row`, `import_batches`, `import_errors` สอด [`V001`](../database/migrations/V001__initial_schema.sql) และแก้ถ้า AC เปลี่ยน
- [ ] **F01-004** — BE: Parser xlsx + TSV fallback (`spreadsheetParse`) ครอบคลุม encoding/แถวว่างตามตัวอย่างจริง
- [ ] **F01-005** — BE: `importRun` — transaction bulk insert staging + บันทึก `import_batches` + `import_errors` ต่อแถวผิด
- [ ] **F01-006** — BE: `POST /api/v1/imports` kind=`iw37n` — multipart, จำกัดขนาด, permission ตาม F10
- [ ] **F01-007** — BE: `GET` batches + errors (pagination/filter ตามที่ออกแบบ)
- [ ] **F01-008** — BE: `normalizeBatch` — staging IW37N → upsert `work_orders` (คีย์ `order_number` ฯลฯ ตาม DDL)
- [ ] **F01-009** — BE: Idempotency — `dedupeImport` / `source_sha256` + พฤติกรรมเมื่อซ้ำ (reject หรือตาม env)
- [ ] **F01-010** — BE: คิว `import_jobs` + worker (`npm run worker`) ถ้า normalize แบบ async — สอด [`PROGRAM_FLOW.md`](PROGRAM_FLOW.md)
- [ ] **F01-011** — BE: อัปเดต [`api/openapi.yaml`](api/openapi.yaml) + error JSON มาตรฐาน
- [ ] **F01-012** — BE: Unit tests — parser, map, validation หลัก
- [ ] **F01-013** — BE/QA: Integration test — อัปโหลดตัวอย่าง → batch success/partial + normalize
- [ ] **F01-014** — TL: Code review + merge
- [ ] **F01-015** — PO/BE: User note สั้น — ขั้นตอนอัปโหลด, ข้อจำกัดไฟล์, ความหมายสถานะ batch

---

### 7.2 Epic F02 — IW37N UI (search / filter / report / calendar)

| Field | Value |
|-------|-------|
| SRS cross-ref | SRS-001–005 |
| Lead | FE, BE |
| อ้างลูกค้า | Details + Rev.1 (ปฏิทิน, DnD, สี, Reason) |

**Checklist รายบรรทัด (`F02-xxx`)**

- [ ] **F02-001** — PO+FE: Wireframe / จับ AC ปฏิทิน, DnD, สีสถานะ, Reason — อ้าง Rev.1
- [ ] **F02-002** — BE: API list `work_orders` — filter, sort, pagination, field ที่ UI ต้องใช้
- [ ] **F02-003** — BE: API รองรับ filter ตาม plant/equipment/status ตามที่ล็อกใน AC
- [ ] **F02-004** — FE: หน้า `/work-orders` (หรือ route ที่ตกลง) — ตาราง + loading/error states
- [ ] **F02-005** — FE: ปฏิทินมุม Month/Week/Day — โครงตาม [`FRONTEND_STRUCTURE.md`](FRONTEND_STRUCTURE.md) `features/calendar/`
- [ ] **F02-006** — FE+BE: Drag&Drop เปลี่ยนวัน/ช่อง — persist ผ่าน API + validation ฝั่ง BE
- [ ] **F02-007** — FE: Reason code — dropdown อ่านจาก `reason_codes` (หรือแหล่งที่ล็อก)
- [ ] **F02-008** — FE: สีสถานะงานจาก design token (`tokens.css`) สอด Rev.1
- [ ] **F02-009** — BE+FE: Export (CSV/xlsx) ถ้าอยู่ใน scope — ไม่ทำถ้า PO defer
- [ ] **F02-010** — BE: ซ่อน/แสดงคอลัมน์หรือแอคชันตาม permission (เชื่อม F10)
- [ ] **F02-011** — FE: Tests ระดับ component หรือ E2E สำคัญ (อย่างน้อย list + filter)
- [ ] **F02-012** — BE: Tests API list/filter (integration)
- [ ] **F02-013** — TL: Review + merge
- [ ] **F02-014** — PO/FE: Release note สั้นสำหรับผู้ใช้

---

### 7.3 Epic F03 — Goods Issue (GI)

| Field | Value |
|-------|-------|
| SRS cross-ref | SRS-007 |
| Lead | BE |

**Checklist รายบรรทัด (`F03-xxx`)**

- [ ] **F03-001** — PO+BE: AC นำเข้า GI + ตัวอย่างไฟล์ `GI*.xls(x)` ล็อก
- [ ] **F03-002** — BE: Column map GI → `stg_mb51_row` + `movement_kind=gi` อ้าง SAP columns doc
- [ ] **F03-003** — BE: `POST /imports` kind=`gi` — multipart + validation
- [ ] **F03-004** — BE: Normalize GI → `goods_movements` + เชื่อม `work_orders` / `import_batch` ตามกฎที่ล็อก
- [ ] **F03-005** — BE: Idempotency / ลบแล้ว insert ใหม่ต่อ batch ถ้าเป็นกฎโครงการ
- [ ] **F03-006** — BE: `import_errors` สำหรับแถว GI ที่ map ไม่ได้
- [ ] **F03-007** — BE: OpenAPI อัปเดต
- [ ] **F03-008** — BE: Unit + integration tests ด้วยไฟล์ตัวอย่าง
- [ ] **F03-009** — TL: Review + merge
- [ ] **F03-010** — PO/BE: User note — ขั้นตอนอัปโหลด GI

---

### 7.4 Epic F04 — Goods Receipt (GR)

| Field | Value |
|-------|-------|
| SRS cross-ref | SRS-007 |
| Lead | BE |

**Checklist รายบรรทัด (`F04-xxx`)**

- [ ] **F04-001** — PO+BE: AC นำเข้า GR + ตัวอย่างไฟล์ `GR*.xls(x)` ล็อก
- [ ] **F04-002** — BE: Column map GR → `stg_mb51_row` + `movement_kind=gr`
- [ ] **F04-003** — BE: `POST /imports` kind=`gr`
- [ ] **F04-004** — BE: Normalize GR → `goods_movements` + กฎแยกจาก GI (รวมข้อเสริม Pepsi ถ้ามีใน AC)
- [ ] **F04-005** — BE: Idempotency / ความสัมพันธ์ batch เหมือนแนว GI
- [ ] **F04-006** — BE: `import_errors` สำหรับ GR
- [ ] **F04-007** — BE: OpenAPI
- [ ] **F04-008** — BE: Unit + integration tests
- [ ] **F04-009** — TL: Review + merge
- [ ] **F04-010** — PO/BE: User note — GR vs GI ในหน้า import

---

### 7.5 Epic F05 — Confirm WO

| Field | Value |
|-------|-------|
| SRS cross-ref | SRS-005, SRS-006, SRS-013 |
| Lead | BE, FE |

**Checklist รายบรรทัด (`F05-xxx`)**

- [ ] **F05-001** — PO: แยก AC **นำเข้าไฟล์ Confirm** กับ **ฟอร์มยืนยันในแอป** ให้ชัดใน ticket
- [ ] **F05-002** — BE: Column map Confirm WO → `stg_confirm_wo_row`
- [ ] **F05-003** — BE: `POST /imports` kind=`confirm_wo`
- [ ] **F05-004** — BE: Normalize → `order_confirmations` + `sap_line_key` unique (สอด V003) + dedupe behavior
- [ ] **F05-005** — BE: Audit fields (`confirmed_by`, timestamps) ตาม DDL/AC
- [ ] **F05-006** — FE: UI ยืนยัน WO บนแอป (ถ้าใน scope) — workflow + reason
- [ ] **F05-007** — FE: แสดงสถานะ sync / error ต่อใบงานตาม AC
- [ ] **F05-008** — BE: API รองรับ FE confirm + สิทธิ์
- [ ] **F05-009** — BE+QA: ทดสอบไฟล์ซ้ำบรรทัด / `sap_line_key` ชน
- [ ] **F05-010** — BE: OpenAPI
- [ ] **F05-011** — FE+BE: Tests ที่ครอบคลุม import + confirm UI ตาม scope
- [ ] **F05-012** — TL: Review + merge
- [ ] **F05-013** — PO/FE: User note — สองช่องทาง (import vs กดยืนยัน)

---

### 7.6 Epic F06 — Functional location & equipment

| Field | Value |
|-------|-------|
| SRS cross-ref | SRS-006, SRS-008 |
| Lead | BE |

**Checklist รายบรรทัด (`F06-xxx`)**

- [ ] **F06-001** — PO+SAP: ล็อก **รูปแบบไฟล์** FL/Equipment + ตัวอย่างจริง (ถ้ายังไม่มี → task blocker ระบุใน ClickUp)
- [ ] **F06-002** — BE: ออกแบบตาราง/เส้นทาง import หรือ sync สอด `equipments` / WO ใน [`ER_DIAGRAM.md`](ER_DIAGRAM.md)
- [ ] **F06-003** — BE: Parser + map ตามรูปแบบที่ล็อก
- [ ] **F06-004** — BE: API import (หรือ sync job) + permission
- [ ] **F06-005** — BE: ความสัมพันธ์ FL/Equipment ↔ `work_orders` ตาม AC
- [ ] **F06-006** — BE: Tests + OpenAPI
- [ ] **F06-007** — TL: Review + merge
- [ ] **F06-008** — PO/BE: User note

---

### 7.7 Epic F07 — Work center list

| Field | Value |
|-------|-------|
| SRS cross-ref | SRS-008 |
| Lead | BE, FE |

**Checklist รายบรรทัด (`F07-xxx`)**

- [ ] **F07-001** — PO: ยืนยน mode **read-only vs CRUD** + AC filter
- [ ] **F07-002** — BE: API list work centers (+ filter plant/code ตามที่ล็อก)
- [ ] **F07-003** — BE: ถ้า CRUD — API create/update/delete + validation
- [ ] **F07-004** — FE: หน้า `/work-centers` ตาราง + filter
- [ ] **F07-005** — FE: ฟอร์ม CRUD (ถ้าเปิด scope)
- [ ] **F07-006** — BE+FE: Permission ตาม F10
- [ ] **F07-007** — BE+FE: Tests
- [ ] **F07-008** — BE: OpenAPI
- [ ] **F07-009** — TL: Review + merge
- [ ] **F07-010** — PO/FE: User note

---

### 7.8 Epic F08 — SAP reports (IP19 / IW37N / MB51)

| Field | Value |
|-------|-------|
| SRS cross-ref | SRS-007, SRS-013 |
| Lead | BE, FE |

**Checklist รายบรรทัด (`F08-xxx`)**

- [ ] **F08-001** — PO: เลือก scope รายงานรอบนี้ (IP19 / IW37N / MB51) ตาม Feature 11 เสริม + ลูกค้า
- [ ] **F08-002** — BE: ออกแบบ endpoint export (หรือ generate file) ต่อ template ลูกค้า
- [ ] **F08-003** — BE: Implement export IW37N/MB51/IP19 ตามลำดับ priority ใน backlog
- [ ] **F08-004** — FE: หน้า `/sap-reports` — เลือกชนิดรายงาน + ปุ่มดาวน์โหลด ตาม [`FRONTEND_STRUCTURE.md`](FRONTEND_STRUCTURE.md)
- [ ] **F08-005** — BE: ทดสอบความตรงคอลัมน์กับ template ใน `from customer/` (evidence แนบ ticket)
- [ ] **F08-006** — BE: OpenAPI + error handling (timeout/ขนาดไฟล์)
- [ ] **F08-007** — FE+BE: Tests
- [ ] **F08-008** — TL: Review + merge
- [ ] **F08-009** — PO/FE: User note — วิธีดาวน์โหลดและข้อจำกัด

---

### 7.9 Epic F09 — Dashboard KPI

| Field | Value |
|-------|-------|
| SRS cross-ref | SRS-009, SRS-011, SRS-012 |
| Lead | FE, BE |

**Checklist รายบรรทัด (`F09-xxx`)**

- [ ] **F09-001** — PO: AC metrics ที่ต้องมีในรอบแรก (backlog, KPI หลัก, SLA ถ้ามี)
- [ ] **F09-002** — BE: แหล่งข้อมูล `kpi_daily_snapshots` / job `kpi_snapshot` สอด [`PROGRAM_FLOW.md`](PROGRAM_FLOW.md)
- [ ] **F09-003** — BE: API aggregate สำหรับ dashboard (รวม vs รายบุคคลตาม permission)
- [ ] **F09-004** — FE: หน้า `/dashboard` + แท็บหรือ `/dashboard/me` ตาม role
- [ ] **F09-005** — FE: กราฟ/ตาราง + loading/empty state
- [ ] **F09-006** — BE: ทดสอบความถูกต้องตัวเลขกับชุดข้อมูลทดสอบที่ KEY ให้
- [ ] **F09-007** — BE: OpenAPI
- [ ] **F09-008** — FE+BE: Tests
- [ ] **F09-009** — TL: Review + merge
- [ ] **F09-010** — PO/FE: User note — ความหมายตัวเลขแต่ละการ์ด

---

### 7.10 Epic F10 — RBAC

| Field | Value |
|-------|-------|
| SRS cross-ref | SRS-002, SRS-010 |
| Lead | BE, FE |

**Checklist รายบรรทัด (`F10-xxx`)**

- [ ] **F10-001** — PO: ตารางบทบาท ↔ permission ที่ต้องมีในรอบแรก (รหัส permission ตรงกับ DB)
- [ ] **F10-002** — BE: Seed/migration roles + permissions + `role_permissions` ตามที่ล็อก
- [ ] **F10-003** — BE: `requireAuth` / `requirePermission` ครอบ route ที่ต้องล็อก (`auth.ts`, `requirePermission.ts`)
- [ ] **F10-004** — BE: JWT + `userPermissions` โหลดสิทธิ์จาก DB — สอด [`BACKEND_STRUCTURE.md`](BACKEND_STRUCTURE.md)
- [ ] **F10-005** — BE: Dev path + production path (`SKIP_AUTH`, `dev-token`) มีเอกสารชัด
- [ ] **F10-006** — FE: ซ่อนเมนู/ปุ่มตาม permission (hook หรือ HOC)
- [ ] **F10-007** — FE: หน้า `/admin/users` (หรือ route ที่ตกลง) — มอบหมาย role ถ้าใน scope
- [ ] **F10-008** — QA: ตารางทดสอบ cross-role (อย่างน้อย admin vs user จำกัด)
- [ ] **F10-009** — BE+FE: Tests ครอบคลุม 403 เมื่อไม่มีสิทธิ์
- [ ] **F10-010** — BE: OpenAPI security scheme
- [ ] **F10-011** — TL: Review + merge
- [ ] **F10-012** — PO/FE: User note — บทบาทและสิ่งที่เห็นได้

---

### 7.11 Epic F11 — App remote / network

| Field | Value |
|-------|-------|
| SRS cross-ref | — (อ้าง INFRA + Pepsi ภาคผนวก ค) |
| Lead | TL, IT |

**Checklist รายบรรทัด (`F11-xxx`)**

- [ ] **F11-001** — TL+IT: สรุปภาพ endpoint ที่ต้องเข้าถึงจากภายนอก vs ภายใน (ไดอะแกรมสั้นใน ticket หรือ `INFRASTRUCTURE.md`)
- [ ] **F11-002** — IT: Tailscale ACL + กลุ่มผู้ใช้ที่อนุญาต — สอด [`INSTALL_SOP_TAILSCALE_DOCKER.md`](INSTALL_SOP_TAILSCALE_DOCKER.md)
- [ ] **F11-003** — IT: Firewall rules ที่โรงงาน — หลักฐานอนุมัติจาก IT ลูกค้า
- [ ] **F11-004** — TL: TLS/HTTPS สำหรับ production (ถ้าใช้ reverse proxy) — บันทึกใน runbook
- [ ] **F11-005** — TL: ตรวจ CORS `CORS_ORIGIN` สอด FE พอร์ต 3000
- [ ] **F11-006** — PO: ยืนยันนโยบายการ remote access กับลูกค้า
- [ ] **F11-007** — TL: Review เอกสาร + merge อัปเดต `INFRASTRUCTURE.md` ถ้ามี

---

### 7.12 Epic F12 — Port 3000 + container deploy

| Field | Value |
|-------|-------|
| SRS cross-ref | — (ภาคผนวก ค) |
| Lead | FE, IT |

**Checklist รายบรรทัด (`F12-xxx`)**

- [ ] **F12-001** — FE: `vite.config.ts` `server.port = 3000` + proxy API ถ้าใช้ใน dev
- [ ] **F12-002** — IT+TL: `Dockerfile` / compose สำหรับ FE build static + serve (หรือแยก nginx ตามแผน)
- [ ] **F12-003** — IT+TL: Compose stack เต็ม — FE + BE + MariaDB พอร์ต 3000/5000/3307
- [ ] **F12-004** — IT: Healthcheck + restart policy
- [ ] **F12-005** — TL: `.env` production template — ไม่ commit secret; เอกสารใน README
- [ ] **F12-006** — IT: ทดสอบ deploy บนเครื่องเป้าหมาย (pilot) + evidence
- [ ] **F12-007** — QA: smoke test หลัง deploy (login, import หนึ่งไฟล์ ถ้ามีบน pilot)
- [ ] **F12-008** — TL: Review + merge
- [ ] **F12-009** — PO/IT: Runbook ตอนขึ้น/ลงบริการ + contact

---

## 8. Phase 5 — QA / UAT (M4–M5)

### 8.1 งานกลาง (ก่อนรายฟีเจอร์)

| Task ID | ชื่องาน | Owner | เกณฑ์ปิดงาน |
|-----------|---------|-------|-------------|
| **Q0-1** | Test plan + traceability Req ID → test case | QA | ตาราง trace ครบ scope |
| **Q0-2** | Test data + reset env | KEY, IT | ชุดข้อมูล reproducible |
| **Q0-3** | Regression suite รันอัตโนมัติ + manual ตามแผน | QA | รอบ regression ผ่านตามเกณฑ์ |

### 8.2 Matrix ทดสอบต่อฟีเจอร์ (สร้างเป็น Task ย่อยหรือ Custom Field ใน ClickUp)

สำหรับแต่ละ `Fxx` สร้าง checklist 5 หัวข้อ:

| หัวข้อทดสอบ | คำอธิบายสั้น |
|-------------|----------------|
| Functional | happy path + edge ตาม AC |
| Roles | สิทธิ์ต่างบทบาท |
| Bad data | ไฟล์เพี้ยน, คอลัมน์ขาด, ซ้ำ |
| Perf | ขนาดไฟล์/จำนวนแถวตามที่ตกลง |
| UAT | สคริปต์ให้ KEY รัน |

**งานมาตรฐน QA ต่อฟีเจอร์**

| Sub | Task ID แบบ | รายการ | Owner |
|-----|--------------|--------|-------|
| T1 | `Fxx-T1` | Test case IDs + steps | QA |
| T2 | `Fxx-T2` | Run + evidence (แนบลิงก์/ไฟล์) | QA |
| T3 | `Fxx-T3` | Defects + regression | QA, BE/FE |
| T4 | `Fxx-T4` | KEY UAT sign-off | KEY, PO |
| T5 | `Fxx-T5` | Traceability Pass/Fail | QA |

---

## 9. Phase 6 — Deploy / Go-live (M6)

| Task ID | ชื่องาน | Owner | เกณฑ์ปิดงาน |
|-----------|---------|-------|-------------|
| **D1** | Deploy บน host ~300GB (ตามสเปกลูกค้า) | IT | บริการขึ้นตาม runbook |
| **D2** | Backup + restore drill | IT | มีหลักฐาน restore สำเร็จ |
| **D3** | Runbook + incident SOP | TL, IT | เอกสารอัปเดต + contact |
| **D4** | Training + handover | PO | ผู้ใช้ลงทะเบียนอบรม / ส่งมอบคู่มือ |

---

## 10. ความเสี่ยงและการบรรเทา (ลงเป็น Risk task ใน ClickUp)

| Risk ID | ความเสี่ยง | ผลกระทบ | การบรรเทา | Owner |
|---------|------------|----------|-----------|-------|
| R-01 | รูปแบบไฟล์ SAP เปลี่ยน | import พัง / delay | lock ตัวอย่าง + version ไฟล์; change request | PO, BE |
| R-02 | Firewall / Tailscale ไม่อนุมัติ | ไม่ถึง M1 | ประสาน IT ลูกค้าตั้งแต่ M0 | IT, PO |
| R-03 | ทรัพยากรคนทีมไม่พอ | M3 slip | ตัด scope ตามลำดับ PO; แจ้งลูกค้า | TL, PO |
| R-04 | UAT ช้า | M5/M6 slip | ล็อกวัน UAT ใน M0; เตรียมข้อมูล KEY ล่วงหน้า | PO, KEY |

---

## 11. Definition of Done (DoD) — ใช้ร่วมทุกฟีเจอร์

- AC จากลูกค้า (และ cross-ref ถ้ามี) **ครบใน ticket**
- Code **merged** หลัง review; tests **เขียว**ตามที่ทีมกำหนด
- OpenAPI / เอกสาร API **อัปเดต**ถ้ามีการเปลี่ยนสัญญา
- ไม่มี **critical/high** ค้างที่เกี่ยวกับฟีเจอร์นั้นก่อนปิดใน M3/M4

---

## 12. ลิงก์เอกสาร repo (แนบใน Description ของ Space หรือ Epic)

- [`PROJECT_PLAN.md`](PROJECT_PLAN.md) — แผนหลัก repo
- [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md)
- [`BACKEND_STRUCTURE.md`](BACKEND_STRUCTURE.md)
- [`FRONTEND_STRUCTURE.md`](FRONTEND_STRUCTURE.md)
- [`PROGRAM_FLOW.md`](PROGRAM_FLOW.md)
- [`ER_DIAGRAM.md`](ER_DIAGRAM.md)
- [`DATABASE_DESIGN_DRAFT.md`](DATABASE_DESIGN_DRAFT.md)
- [`api/openapi.yaml`](api/openapi.yaml)
- [`INSTALL_SOP_TAILSCALE_DOCKER.md`](INSTALL_SOP_TAILSCALE_DOCKER.md)
- [`SRS_TABLE_3_2.md`](SRS_TABLE_3_2.md)

---

## 13. เวอร์ชันเอกสารนี้

| เวอร์ชัน | วันที่ | หมายเหตุ |
|----------|--------|----------|
| 1.0 | 2026-05-04 | ฉบับสมบูรณ์สำหรับ ClickUp: milestone, phase, P/Q/D tasks, F01–F12 epic + S/T มาตรฐน, risk, DoD |
| 1.1 | 2026-05-04 | แตก F01–F12 เป็น checklist รายบรรทัด (`Fxx-NNN`) ใต้หมวด 7.1–7.12 |
