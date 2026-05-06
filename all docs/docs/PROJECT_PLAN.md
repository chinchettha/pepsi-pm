# Project plan - Pepsi Cola PM Application

## แหล่ง SRS หลัก (ล็อก — แบบ B)

**ความต้องการจากลูกค้า (acceptance / scope รายละเอียด)** ยึดชุดเอกสารต่อไปนี้ในโฟลเดอร์ `from customer/` เป็นหลัก — หากข้อความขัดกับเอกสารอื่นใน repo **ให้ยึดชุดนี้** แล้วบันทึกความต่างใน changelog โครงการ

| # | เอกสาร (ลูกค้า) |
|---|------------------|
| 1 | [PM Application Requirement (Details).docx](../from%20customer/PM%20Application%20Requirement%20(Details).docx) |
| 2 | [PM Application Requirement (Details)Rev.1.docx](../from%20customer/PM%20Application%20Requirement%20(Details)Rev.1.docx) — รุ่นล่าสุดของรายละเอียด UI / ปฏิทิน / สถานะงาน / Reason code |
| 3 | [PM Application Requirement.docx](../from%20customer/PM%20Application%20Requirement.docx) |
| 4 | [requirement_13_02_63 (003).docx](../from%20customer/requirement_13_02_63%20(003).docx) |

**อ้างอิงเสริม (ฉบับรวมมาตรา / รหัส SRS-001–013 และ UC):** [`Software Requirement Specification Pepsi Cola PM Project.docx`](Software%20Requirement%20Specification%20Pepsi%20Cola%20PM%20Project.docx) ใน `docs/` — ใช้สำหรับจับคู่รหัส SRS–URS, มาตรา, และภาคผนวกเทคนิคเท่านั้น **ไม่แทนที่** ชุดลูกค้าด้านบนเมื่อเนื้อหาขัดกัน

| Field | Value |
|-------|-------|
| Project start | 2026-05-09 |
| Target end | 2026-06-30 |
| Plan owner | TBD - Product Owner / PM |
| Last updated | 2026-05-04 |

## 1. Owner roles

| Owner | Responsibility |
|-------|----------------|
| PO | Scope, priority, acceptance |
| TL | Architecture, code review |
| BE | Backend developer |
| FE | Frontend developer |
| QA | Test plan, regression, evidence |
| IT | Docker, Tailscale, firewall, deploy |
| KEY | Plant UAT, test data |

## 2. Milestones

| Milestone | Target | Leads | Exit criteria |
|-----------|--------|-------|----------------|
| M0 Kickoff | 2026-05-16 | PO, TL | SRS locked, repo/RACI |
| M1 Infra | 2026-05-30 | IT, TL | Docker on D:, Tailnet, dev port 3000 per [INSTALL_SOP_TAILSCALE_DOCKER.md](INSTALL_SOP_TAILSCALE_DOCKER.md) |
| M2 Vertical slice | 2026-06-07 | TL, BE, FE | Shell + one E2E workflow |
| M3 Feature complete | 2026-06-14 | TL, BE, FE | Phase 4 checklist done for agreed scope |
| M4 QA sign-off | 2026-06-21 | QA | No open critical defects |
| M5 UAT pilot | 2026-06-26 | PO, KEY, IT | UAT signed, pilot deploy |
| M6 Go-live | 2026-06-30 | PO, IT, TL | Runbook, backup, handover |

## 3. Phase tasks

### Phase 0 (M0)

| ID | Task | Owner |
|----|------|-------|
| P0-1 | Lock SRS (ชุด PM Application Requirement*) + scope changelog | PO |
| P0-2 | RACI + comms | PO |
| P0-3 | Branch/PR rules, .env.example | TL |
| P0-4 | Backlog / board | PO, TL |

### Phase 1-3 (M1)

| ID | Task | Owner |
|----|------|-------|
| P1-1 | D: folders per SOP | IT |
| P1-2 | Docker + data on D | IT |
| P1-3 | Tailnet, ACL, invites | IT |
| P1-4 | Firewall + bind 0.0.0.0 | IT, TL |
| P1-5 | docker compose dev + README | TL, IT |

### Phase 2 slice (M2)

| ID | Task | Owner |
|----|------|-------|
| P2-1 | Skeleton + CI baseline | TL |
| P2-2 | Auth/roles per SRS | BE, FE |
| P2-3 | Shell + routing + port 3000 | FE |
| P2-4 | One use case API+UI+log | BE, FE |

## 4. Phase 4 - Development (feature checklist + sub-tasks)

**SRS / ความต้องการ:** แถว F01–F12 จับกับงานใน repo (SAP data / Test) เป็นตัวยึดโครง — **ข้อความรับรองและรายละเอียด UI/กระบวนการ** ยึด **ชุด PM Application Requirement*** (ตารางด้านบน); คอลัมน์ **SRS-ID** เป็น **cross-ref** จาก Pepsi SRS บท 3.2 เพื่อ trace test / ฐานข้อมูล ถ้า scope แคบลงให้ตัดแถวหรือแตก ticket โดยอ้างชุดลูกค้าก่อน

### 4.1 Features

คอลัมน์ **SRS-ID (cross-ref Pepsi §3.2)** = รหัส **SRS-001 … SRS-013** จากตาราง URS↔SRS ใน Pepsi SRS (ไม่ใช่แหล่งหลักของข้อความความต้องการ) — แถวละเอียด 13 แถวอยู่ที่ **§4.1.1** / [`SRS_TABLE_3_2.md`](SRS_TABLE_3_2.md)

| ID | Feature | SRS-ID (cross-ref Pepsi §3.2) | ลูกค้า (หลัก) + Pepsi SRS (เสริม) | Lead | Sub-tasks |
|----|---------|--------------------------------|-----------------------------------|------|-----------|
| F01 | IW37N import/process | SRS-006, SRS-008, SRS-013 | **ลูกค้า:** Requirement.docx (คอลัมน์ Scheduling / SAP); **เสริม:** Pepsi บท 1 §1.2(4); บท 2 §2.1(1), §2.2 Feature 11; บท 3 §3.2; บท 5 [1] | BE | AC จากชุดลูกค้า + cross-ref; schema/import; parser; validation; error log; API |
| F02 | IW37N UI search/filter/report | SRS-001, SRS-002, SRS-003, SRS-004, SRS-005 | **ลูกค้า:** Details Rev.1, Details (ปฏิทิน, Drag&Drop, สีงาน, Reason code); **เสริม:** Pepsi บท 3 §3.1 URS-01–05; บท 4 §4.2.2 UC-09, UC-10 | FE, BE | Wireframes; pagination; export; visibility |
| F03 | Goods Issue GI | SRS-007 | **ลูกค้า:** Requirement.docx / ตัวอย่าง SAP data; **เสริม:** Pepsi บท 2 §2.2 Feature 6; บท 3 §3.1 URS-07 | BE | Column map; idempotent import; WO links if required |
| F04 | Goods Receipt GR | SRS-007 | **ลูกค้า:** Requirement.docx / ตัวอย่าง SAP data; **เสริม:** Pepsi บท 2 §2.2 Feature 6 (GI/GR); บท 3 §3.1 URS-07 | BE | Same as F03 for GR + กฎ Pepsi เสริม |
| F05 | Confirm WO | SRS-005, SRS-006, SRS-013 | **ลูกค้า:** Details Rev.1, Details, requirement_13_02_63 (หน้า Confirm / backlog); **เสริม:** Pepsi บท 3 §3.1 URS-05,06,13; บท 4 §4.2.3 UC-14 | BE, FE | Workflow; audit trail; errors per ลูกค้า + Pepsi |
| F06 | Functional location and equipment | SRS-006, SRS-008 | **ลูกค้า:** Requirement.docx; **เสริม:** Pepsi บท 1 §1.2(3); บท 2 §2.2 Feature 5 | BE | Import/sync; WO relation |
| F07 | Work center list | SRS-008 | **ลูกค้า:** Requirement.docx; **เสริม:** Pepsi บท 1 §1.2(3), §1.3 ข้อ 12 | BE, FE | CRUD or read-only; filters |
| F08 | SAP reports IP19 / IW37N / MB51 | SRS-007, SRS-013 | **ลูกค้า:** Requirement.docx; **เสริม:** Pepsi บท 1 §1.2(4); บท 2 §2.1(1), §2.2 Feature 11; บท 5 [1] (ไม่มี IA17 แยกใน Pepsi SRS) | BE, FE | Align exports with SAP templates; scope per Feature 11 |
| F09 | Dashboard KPI | SRS-009, SRS-011, SRS-012 | **ลูกค้า:** requirement_13_02_63 (งาน dashboard/backlog); **เสริม:** Pepsi บท 2 §2.2 Feature 10; บท 3 §3.1 URS-09,11,12; บท 4 §4.2.5 UC-17 | FE, BE | Metrics; performance vs SLA |
| F10 | RBAC | SRS-002, SRS-010 | **ลูกค้า:** Details / Rev.1 (สิทธิ์การใช้งานตามบริบท UI); **เสริม:** Pepsi บท 2 §2.2 Feature 2–3, §2.3; บท 4 §4.1.2, §4.2.1 UC-06 | BE, FE | Roles; middleware; cross-role tests |
| F11 | App remote/network | — (ไม่มี SRS-001–013) | **ลูกค้า:** (ไม่ระบุแยกใน 4 ไฟล์ — อ้างเอกสารโครงสร้าง); **เสริม:** Pepsi บท 1 §1.2(7), §1.3 ข้อ 16; บท 2 §2.4.1; **ภาคผนวก ค** | TL, IT | Endpoints; TLS; INFRASTRUCTURE.md |
| F12 | Port 3000 + container deploy | — (ไม่มี SRS-001–013) | **ลูกค้า:** (ไม่ระบุแยกใน 4 ไฟล์ — อ้างเอกสารโครงสร้าง); **เสริม:** Pepsi บท 2 §2.4; **ภาคผนวก ค** (Docker Ports 3000, 5000, 3307) | FE, IT | Compose; healthcheck; prod env |

### 4.1.1 ตารางบท 3.2 — URS ↔ SRS (13 แถว) + คอลัมน์ Fxx (cross-ref Pepsi)

คอลัมน์ **Fxx** คือการจับคู่เข้ากับแถวใน §4.1 (ปรับได้ตาม sprint) — **ตารางฉบับเต็ม** (รวมขึ้นบรรทัดในเซลล์) อยู่ที่ [`SRS_TABLE_3_2.md`](SRS_TABLE_3_2.md) ดึงจาก Pepsi SRS บท **3.2** เพื่อรหัส **SRS-001…013** และ URS เท่านั้น — **รายละเอียดการยอมรับงาน** ยังยึดชุด **PM Application Requirement*** ด้านหัวเอกสาร

### 4.2 Standard sub-tasks per feature

| Sub | Item | Owner |
|-----|------|-------|
| S1 | AC จากชุดลูกค้า (+ cross-ref Pepsi) ลง ticket | PO |
| S2 | Design / API contract | TL, BE |
| S3 | Implement | BE / FE |
| S4 | Unit/integration tests | BE / FE |
| S5 | Review + merge | TL |
| S6 | User/release note | PO / FE |

## 5. Phase 5 - QA / UAT

| ID | Task | Owner |
|----|------|-------|
| Q0-1 | Test plan + traceability Req ID to test case | QA |
| Q0-2 | Test data + env reset | KEY, IT |
| Q0-3 | Regression suite | QA |

### 5.2 Feature QA matrix F01-F12

| ID | Functional | Roles | Bad data | Perf | UAT | Lead |
|----|------------|-------|----------|------|-----|------|
| F01 | [ ] | [ ] | [ ] | [ ] | [ ] | QA |
| F02 | [ ] | [ ] | [ ] | [ ] | [ ] | QA |
| F03 | [ ] | [ ] | [ ] | [ ] | [ ] | QA |
| F04 | [ ] | [ ] | [ ] | [ ] | [ ] | QA |
| F05 | [ ] | [ ] | [ ] | [ ] | [ ] | QA |
| F06 | [ ] | [ ] | [ ] | [ ] | [ ] | QA |
| F07 | [ ] | [ ] | [ ] | [ ] | [ ] | QA |
| F08 | [ ] | [ ] | [ ] | [ ] | [ ] | QA |
| F09 | [ ] | [ ] | [ ] | [ ] | [ ] | QA |
| F10 | [ ] | [ ] | [ ] | [ ] | [ ] | QA |
| F11 | [ ] | [ ] | [ ] | [ ] | [ ] | QA |
| F12 | [ ] | [ ] | [ ] | [ ] | [ ] | QA |

### 5.3 QA sub-tasks per feature

| Sub | Item | Owner |
|-----|------|-------|
| T1 | Test case IDs and steps | QA |
| T2 | Run + evidence | QA |
| T3 | Defects + regression | QA, BE/FE |
| T4 | KEY UAT sign-off | KEY, PO |
| T5 | Traceability Pass/Fail | QA |

## 6. Phase 6 - Deploy

| ID | Task | Owner |
|----|------|-------|
| D1 | Deploy on ~300GB host | IT |
| D2 | Backup + restore drill | IT |
| D3 | Runbook + incident SOP | TL, IT |
| D4 | Training + handover | PO |

## 7. Map เอกสารอ้างอิง (ล็อกแบบ B)

**หลัก (ลูกค้า):** ชุดสี่ไฟล์ใน `from customer/` — ดูตารางด้านบนหัวเอกสาร

**เสริม (Pepsi SRS ใน `docs/`):** [`Software Requirement Specification Pepsi Cola PM Project.docx`](Software%20Requirement%20Specification%20Pepsi%20Cola%20PM%20Project.docx)

1. ใช้ชุด **PM Application Requirement*** สำหรับ acceptance และรายละเอียด UI/กระบวนการ  
2. ใช้ตาราง **บท 3.2** ใน Pepsi SRS / [`SRS_TABLE_3_2.md`](SRS_TABLE_3_2.md) เพื่อผูก **รหัส SRS-001…013** กับ test case (Q0-1) และ traceability เทคนิค  
3. ใช้ **บท 4** (UC-xx) ใน Pepsi SRS เป็นเสริมเมื่อยังไม่มีข้อความเทียบเท่าในชุดลูกค้า  
4. ปรับแถว Fxx ให้ตรง scope sprint และบันทึกเมื่อลูกค้าอัปเดตไฟล์ใดเป็นรุ่นล่าสุด

## 8. Links

- [PROJECT_PLAN_CLICKUP_FULL.md](PROJECT_PLAN_CLICKUP_FULL.md) — **แผนฉบับสมบูรณ์สำหรับ ClickUp** (milestone, task ID, F01–F12, QA matrix, risk)
- [SOFTWARE_DESIGN_DOCUMENT.md](SOFTWARE_DESIGN_DOCUMENT.md) — **SDD ฉบับละเอียด** (สถาปัตยกรรม, ข้อมูล, API, ความปลอดภัย, flow)
- [database/README.md](../database/README.md) — **ชื่อฐานล็อก `pepsi_pm`** + คำสั่งรัน migration MariaDB
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) — **tree view** โฟลเดอร์ repo + โครงสร้างตาราง/คอลัมน์ `pepsi_pm`
- [FRONTEND_STRUCTURE.md](FRONTEND_STRUCTURE.md) — **tree view** React/Vite (`frontend/`, พอร์ต 3000) — รัน: `cd frontend && npm run dev` + `VITE_API_BASE_URL`
- [BACKEND_STRUCTURE.md](BACKEND_STRUCTURE.md) — **Node/Express** (`backend/`, พอร์ต 5000, middleware, OpenAPI)
- [api/openapi.yaml](api/openapi.yaml) — สัญญา REST ร่าง
- [PROGRAM_FLOW.md](PROGRAM_FLOW.md) — program flow (Mermaid)
- [ER_DIAGRAM.md](ER_DIAGRAM.md) — ER diagram ตาม DDL
- [MEDIA_WEBP_POLICY.md](MEDIA_WEBP_POLICY.md) — รูปหลักฐาน (before/after) แปลงเป็น WebP ก่อนบันทึก
- [CUSTOMER_FROM_FOLDER_MANIFEST.md](CUSTOMER_FROM_FOLDER_MANIFEST.md) — รายการไฟล์ `from customer/` รวมล็อก SRS หลัก
- [SRS_PEPSI_DOCX_REVISION_GUIDE.md](SRS_PEPSI_DOCX_REVISION_GUIDE.md) — คู่มือปรับแก้ Pepsi SRS `.docx` ให้ตรงลูกค้า (รายการละเอียดคัดลอกไป Word ได้)
- [INFRASTRUCTURE.md](INFRASTRUCTURE.md)
- [INSTALL_SOP_TAILSCALE_DOCKER.md](INSTALL_SOP_TAILSCALE_DOCKER.md)

## 9. Thai summary (สรุปภาษาไทย)

- วันเริ่ม–วันจบแผน: 2026-05-09 ถึง 2026-06-30 (ปรับตามสัญญา/SRS จริง)
- Milestone: M0 เริ่มโครงการ → M1 โครงสร้างพื้นฐาน → M2 ต้นแบบแนวตั้ง → M3 พัฒนาครบ scope → M4 QA → M5 UAT/นำร่อง deploy → M6 go-live
- Owner ต่องาน: ใช้บทบาท PO, TL, BE, FE, QA, IT, KEY ในตารางด้านบน
- เฟส 4–5: F01–F12 อ้าง **ชุด PM Application Requirement*** เป็นหลัก; คอลัมน์ **SRS-ID** และตาราง **§4.1.1** / [`SRS_TABLE_3_2.md`](SRS_TABLE_3_2.md) เป็น cross-ref จาก Pepsi SRS (URS-01…URS-13 คู่ SRS-001…SRS-013)
- Infra: ดู INSTALL_SOP_TAILSCALE_DOCKER.md และ INFRASTRUCTURE.md
