# สถานะเฟสการทำงาน (Phase status)

เอกสารนี้ใช้ **อัปเดตความคืบหน้าเป็นประจำ** ว่าทีมอยู่เฟสไหน งานไหนเสร็จหรือค้าง — **ไม่แทนที่**รายละเอียดแผนใน [`PROJECT_PLAN.md`](PROJECT_PLAN.md) แต่เป็นภาพ “ตอนนี้อยู่ตรงไหน” ที่อ่านเร็ว

| รายการ | ค่า |
|--------|-----|
| อัปเดตล่าสุด (เอกสารนี้) | 2026-05-06 |
| แผนอ้างอิง | [`PROJECT_PLAN.md`](PROJECT_PLAN.md) — milestone M0–M6, Phase 0–6, F01–F12 |
| ผู้แนะนำให้อัปเดต | PO / TL หลัง standup, merge สำคัญ, หรือเปลี่ยน scope |

---

## 1. วิธีใช้และค่าสถานะ

**วิธีอัปเดต**

1. **ติ๊กช่อง `[ ]` → `[x]`** ใน checklist ด้านล่าง (§2.1, §3.1, §4.1, §5.3, §6.1) เมื่องานนั้น **เสร็จและทีมรับรู้แล้ว** — ช่วยให้รู้ว่าถึงไหนและหยิบงานถัดไปได้เร็ว (แก้ `[ ]` เป็น `[x]` ใน editor; บางเครื่องมือรองรับคลิกติ๊กใน preview)  
2. แก้คอลัมน์ **สถานะ** ในตาราง (รวม **BE / FE / QA** ต่อฟีเจอร์) ให้สอดกับความเป็นจริง — **ควรสอดกับการติ๊ก checklist** (เช่น ติ๊ก M0 เมื่อ exit M0 จริง)  
3. คอลัมน์ **ClickUp** — หลังสร้าง Epic/Task แล้ว ให้ใส่ **Task ID** หรือ **ลิงก์เต็ม**; รหัสย่อย `Fxx-NNN` อยู่ใน [`PROJECT_PLAN_CLICKUP_FULL.md`](PROJECT_PLAN_CLICKUP_FULL.md)  
4. แก้ **§2 ตำแหน่งปัจจุบัน** + เติมรายการใน **§2.1** (งาน in-flight / next) ทุกรอบ standup  
5. ตั้ง **อัปเดตล่าสุด** ที่ตารางบนของไฟล์นี้ + เพิ่มแถวใน **§7 ประวัติการอัปเดตเอกสารนี้**  
6. ถ้าสถานะขัดกับ [`PROJECT_PLAN.md`](PROJECT_PLAN.md) — **แก้ PROJECT_PLAN หรืออธิบายใน Notes** อย่างใดอย่างหนึ่ง  
7. เมื่อ **ล็อก E2E / เลือก Epic ถัดไป / merge ฟีเจอร์สำคัญ** — **อัปเดตเอกสารนี้ทุกครั้ง** (อย่างน้อย §2, §5.2, §7 + เวอร์ชันท้ายไฟล์)

**ค่าที่ใช้ในคอลัมน์ “สถานะ”**

| ค่า | ความหมาย |
|-----|-----------|
| ยังไม่เริ่ม | ยังไม่มีงานจริง / ยังไม่ถึงรอบ |
| กำลังทำ | มีคนทำอยู่ หรือทำไปแล้วบางส่วน |
| เสร็จ | ผ่านเกณฑ์ออกของเฟสนั้น (หรือของ task นั้น) ตามที่ทีมนิยาม |
| บล็อก | รอปัจจัยภายนอก / รอลูกค้า / รอ infra |
| ตัด scope | ตกลงไม่ทำในรอบนี้ — บันทึกเหตุผลสั้น ๆ ในหมายเหตุ |

คอลัมน์ **BE / FE / QA** ใต้แต่ละ Fxx = สถานะ **lane นั้น ๆ** ของฟีเจอร์นั้น (ไม่ใช่ owner บุคคล) — ถ้าไม่มีงานใน lane นั้นให้ใส่ `—` หรือ `ไม่เกี่ยว`

**สัญลักษณ์ติ๊ก (Markdown)**

| รูปแบบ | ความหมาย |
|--------|-----------|
| `- [ ]` | ยังไม่เสร็จ / ยังไม่ถึงรอบ |
| `- [x]` | เสร็จแล้ว (หรือ `[X]` แล้วแต่เครื่องมือ) |

---

## 2. ตำแหน่งปัจจุบัน (สรุปหนึ่งประโยค)

**เราอยู่ที่:** **Phase 4** — ล็อก **เส้นทาง E2E สำหรับปิด M2** แล้ว (§2.2); **Epic ถัดไปที่เลือก = F05 Confirm WO** (§2.3). Milestone **M0–M1** ยังไม่ครบ (infra / docker-compose); **M2** = รอ **รันยืนยัน E2E ตาม §2.2 ครบหนึ่งรอบ** + PO/TL sign-off จึงจะถือว่า exit ตามนิยาม vertical slice

*(แก้ประโยคนี้ทุกครั้งที่สรุปสปรินต์ / รอบสถานะ)*

### 2.1 งานต่อเนื่อง — ติ๊กและเติมข้อความ (ทำต่อจากนี้ให้ชัด)

ใช้ส่วนนี้เป็น **รายการสั้น ๆ ที่อัปเดตทุก standup** — ไม่ต้องซ้ำรายละเอียดยาวในตาราง §5.2

**กำลังทำอยู่ตอนนี้ (in flight)**

- [x] ล็อกเส้นทาง **E2E ปิด M2** + เลือก Epic ถัดไป (**F05**) — อัปเดตเอกสาร 2026-05-06  
- [ ] **รัน E2E ตาม §2.2** ครบหนึ่งรอบ + บันทึกผล / sign-off (เกณฑ์ exit **M2**)  
- [ ] **F05** — UI/flow **Confirm WO** ในแอป (BE/import มี `order_confirmations` แล้ว — ดู §2.3)  

**ทำต่อถัดไป (เรียงลำดับที่จะหยิบ — next)**

- [ ] F02 — ปฏิทิน / ค้นหา / รายงาน WO ตาม Rev.1 (ถัดจาก slice หลัก)  
- [ ] F09 — แดชบอร์ด/KPI snapshot ให้นิ่งขึ้น + UX หัวหน้า  
- [ ] M1 — `docker-compose` dev + README (**P1-5**) เมื่อทีมยกเป็นคิว  

**พัก / บล็อก (optional — มีค่อยเติม)**

- [ ]  

*(เพิ่มหรือลบบรรทัด `- [ ]` ได้ตามทีม)*

### 2.2 เส้นทาง E2E ที่ล็อกสำหรับ milestone M2 (Vertical slice)

นิยามนี้ใช้ **ปิด P2-4 / exit M2** เมื่อทีมรันครบและลงนามว่าผ่าน — อ้างอิง flow ใน [`SYSTEM_FLOWS.md`](SYSTEM_FLOWS.md)

| ลำดับ | ขั้นตอน (ธุรกิจ) | ทางเทคใน repo (ย่อ) |
|------|-------------------|----------------------|
| 1 | เปิดสแต็ก dev | §A — MariaDB + migration, `backend` :5000, `frontend` :3000, (ทางเลือก) worker |
| 2 | เข้าสู่ระบบ | §B — `POST /api/v1/auth/dev-token` + `GET /api/v1/auth/me` หรือ `SKIP_AUTH=true` ตาม env |
| 3 | นำเข้า SAP + normalize | §C–D — อัปโหลด IW37N → batch → normalize (sync หรือ async job ตามที่ใช้ในทดสอบ) |
| 4 | ตรวจใบงานในระบบ | §E — `GET /api/v1/work-orders` + เปิดรายละเอียด `GET …/work-orders/:id` |
| 5 | แนบหลักฐานรูป | §F — สร้าง task log + อัปโหลดไฟล์แนบตาม flow ใบงาน |
| 6 | ดูภาพรวมตัวเลข | §G หรือ §H — แดชบอร์ดและ/หรือรายงาน KPI อ่านข้อมูลจาก API ได้จริงอย่างใดอย่างหนึ่ง |

**เกณฑ์ผ่าน (ขั้นต่ำ):** ทำครบ 1–6 บนข้อมูลทดสอบเดียวกันในเซสชันเดียว (หรือต่อเนื่องภายในวันเดียว) และมีหลักฐานสั้น ๆ (สคริปต์/สกรีนช็อต/บันทึกคิว job ถ้าใช้ async)

- [ ] **รันแล้ว / ลงนาม:** วันที่ _____ — ผู้รับรอง: _____  

### 2.3 Epic ถัดไปที่เลือก (หลังล็อก M2)

| เลือก | เหตุผลสั้น ๆ |
|--------|----------------|
| **F05 — Confirm WO** | สายนำเข้า → ใบงานมีอยู่แล้ว; ตาราง/เส้นทาง `order_confirmations` ในแผน BE มี — **ยังขาด UI/flow ในแอปตาม requirement (1)(2)(4)** จึงต่อยอดชัดและใกล้ลูกค้า |

ถ้า PO เปลี่ยนลำดับความสำคัญ (เช่น โฟกัส F02 ปฏิทินก่อน) ให้แก้แถวนี้ + §2.1 + ตาราง §5.2 ให้สอดคล้อง

---

## 3. Milestone (M0–M6) — snapshot

เป้าหมายวันที่และ exit criteria ยึด [`PROJECT_PLAN.md`](PROJECT_PLAN.md) §2 — ตารางนี้เติมแค่ **สถานะปัจจุบัน**

| Milestone | เป้าหมายวันที่ (แผน) | สถานะ | หมายเหตุสั้น ๆ |
|-----------|----------------------|--------|----------------|
| M0 Kickoff | 2026-05-16 | กำลังทำ | repo + เอกสาร technical flow มี; ตรวจ RACI / changelog ตามทีม |
| M1 Infra | 2026-05-30 | ยังไม่เริ่ม | มี SOP ใน docs; ยังไม่มี `docker-compose` ที่ราก repo ณ การสำรวจล่าสุด |
| M2 Vertical slice | 2026-06-07 | กำลังทำ | **E2E ล็อกแล้ว** (§2.2) — รอรันยืนยันครบ + sign-off เพื่อ exit |
| M3 Feature complete | 2026-06-14 | ยังไม่เริ่ม | ผูกกับ F01–F12 ที่ตกลง scope |
| M4 QA sign-off | 2026-06-21 | ยังไม่เริ่ม | |
| M5 UAT pilot | 2026-06-26 | ยังไม่เริ่ม | |
| M6 Go-live | 2026-06-30 | ยังไม่เริ่ม | |

### 3.1 ติ๊กเมื่อ milestone ผ่าน exit criteria (สอด [`PROJECT_PLAN.md`](PROJECT_PLAN.md) §2)

- [ ] **M0** Kickoff — SRS ล็อก + repo / RACI ตามที่ทีมนิยาม  
- [ ] **M1** Infra — Docker บน D:, Tailnet, dev port 3000 ตาม SOP  
- [ ] **M2** Vertical slice — shell + E2E workflow หนึ่งเส้นทางเต็มที่รับรองได้  
- [ ] **M3** Feature complete — Phase 4 ตาม scope ที่ตกลง  
- [ ] **M4** QA sign-off — ไม่มี critical ค้าง  
- [ ] **M5** UAT pilot — UAT signed, pilot deploy  
- [ ] **M6** Go-live — runbook, backup, handover  

---

## 4. Phase 0–3 — งานตามแผน + สถานะ

### Phase 0 (M0)

| ID | Task | Owner | สถานะ | หมายเหตุ |
|----|------|-------|--------|----------|
| P0-1 | Lock SRS + scope changelog | PO | กำลังทำ | ยึด `from customer/` ตาม PROJECT_PLAN |
| P0-2 | RACI + comms | PO | ยังไม่เริ่ม | |
| P0-3 | Branch/PR rules, .env.example | TL | กำลังทำ | มี `.env.example` ฝั่ง backend/frontend — กฎ branch ตามทีม |
| P0-4 | Backlog / board | PO, TL | ยังไม่เริ่ม | อาจใช้ ClickUp: [`PROJECT_PLAN_CLICKUP_FULL.md`](PROJECT_PLAN_CLICKUP_FULL.md) |

### Phase 1–3 (M1)

| ID | Task | Owner | สถานะ | หมายเหตุ |
|----|------|-------|--------|----------|
| P1-1 | D: folders per SOP | IT | ยังไม่เริ่ม | |
| P1-2 | Docker + data on D | IT | ยังไม่เริ่ม | |
| P1-3 | Tailnet, ACL, invites | IT | ยังไม่เริ่ม | |
| P1-4 | Firewall + bind 0.0.0.0 | IT, TL | ยังไม่เริ่ม | |
| P1-5 | docker compose dev + README | TL, IT | ยังไม่เริ่ม | |

### Phase 2 slice (M2)

| ID | Task | Owner | สถานะ | หมายเหตุ |
|----|------|-------|--------|----------|
| P2-1 | Skeleton + CI baseline | TL | กำลังทำ | โครง FE/BE/DB มี; CI ใน repo ยังไม่ยืนยัน |
| P2-2 | Auth/roles per SRS | BE, FE | กำลังทำ | JWT + `/me` + `requirePermission`; F10: **`GET/PATCH /api/v1/admin/users`** + หน้า **`/admin/users`** + หน้า **`/error/*`** |
| P2-3 | Shell + routing + port 3000 | FE | เสร็จ | Vite dev :3000 |
| P2-4 | One use case API+UI+log | BE, FE | กำลังทำ | **นิยาม E2E แล้ว** — ดู **§2.2**; ปิด P2-4 / exit M2 เมื่อติ๊ก sign-off ใน §2.2 |

### 4.1 ติ๊กงาน Phase 0–3 (สอดแถวในตารางด้านบน)

**Phase 0 (M0)**

- [ ] **P0-1** — Lock SRS + scope changelog  
- [ ] **P0-2** — RACI + comms  
- [ ] **P0-3** — Branch/PR rules + `.env.example`  
- [ ] **P0-4** — Backlog / board (ClickUp ฯลฯ)  

**Phase 1–3 (M1)**

- [ ] **P1-1** — D: folders per SOP  
- [ ] **P1-2** — Docker + data on D  
- [ ] **P1-3** — Tailnet, ACL, invites  
- [ ] **P1-4** — Firewall + bind 0.0.0.0  
- [ ] **P1-5** — docker compose dev + README  

**Phase 2 slice (M2)**

- [ ] **P2-1** — Skeleton + CI baseline  
- [ ] **P2-2** — Auth/roles per SRS  
- [ ] **P2-3** — Shell + routing + port 3000  
- [ ] **P2-4** — One use case API+UI+log (E2E ที่นิยาม)  

---

## 5. Phase 4 — ฟีเจอร์ F01–F12 (lane BE / FE / QA + ClickUp)

### 5.0 เอกสาร requirement จากลูกค้า (แหล่งหลัก — แบบ B)

ไฟล์ด้านล่างอยู่ในโฟลเดอร์ [`from customer/`](../from%20customer/) — ยึดเป็นความจริงของ requirement ตาม [`PROJECT_PLAN.md`](PROJECT_PLAN.md)

| # | ไฟล์ |
|---|------|
| 1 | [PM Application Requirement (Details).docx](../from%20customer/PM%20Application%20Requirement%20(Details).docx) |
| 2 | [PM Application Requirement (Details)Rev.1.docx](../from%20customer/PM%20Application%20Requirement%20(Details)Rev.1.docx) |
| 3 | [PM Application Requirement.docx](../from%20customer/PM%20Application%20Requirement.docx) |
| 4 | [requirement_13_02_63 (003).docx](../from%20customer/requirement_13_02_63%20(003).docx) |

**จับคู่ฟีเจอร์ ↔ เอกสารลูกค้า (สรุปจากแผน — ปรับได้ถ้า PO ล็อกรุ่นไฟล์ใหม่)**

| Fxx | เอกสารลูกค้าที่อ้างหลัก |
|-----|-------------------------|
| F01 | (3) Requirement + รายละเอียดคอลัมน์ scheduling / SAP |
| F02 | (1)(2) Details + **Rev.1** (ปฏิทิน, DnD, สี, Reason code) |
| F03–F04 | (3) + ตัวอย่าง SAP data |
| F05 | (1)(2)(4) Confirm / backlog |
| F06–F07 | (3) |
| F08 | (3) |
| F09 | (4) dashboard / backlog |
| F10 | (1)(2) สิทธิ์ตามบริบท UI |
| F11–F12 | โครงสร้าง / ภาคผนวกในเอกสารโครงการ + Pepsi SRS เสริม — ดู [`PROJECT_PLAN.md`](PROJECT_PLAN.md) แถว F11–F12 |

### 5.1 Sync กับ ClickUp

- **ชื่อ Epic แนะนำใน ClickUp:** `F01` … `F12` (หรือ prefix เดียวกับคอลัมน์ **ID** ด้านล่าง)  
- **งานย่อย (Subtask / checklist):** ใช้รหัส **`Fxx-NNN`** ตาม [`PROJECT_PLAN_CLICKUP_FULL.md`](PROJECT_PLAN_CLICKUP_FULL.md) §7 — เวลา sync ใส่ **Custom ID** ใน ClickUp ให้ตรง `F01-006` ฯลฯ จะค้นหาข้าม repo ↔ board ได้ง่าย  
- **คอลัมน์ `ClickUp` ในตารางด้านล่าง:** ใส่ **Task ID** (เช่น `869abc123`) จาก URL `https://app.clickup.com/t/869abc123` หรือวาง **ลิงก์เต็ม** — ถ้ายังไม่สร้างงานใน workspace ให้ใส่ `—` แล้วมาเติมภายหลัง

### 5.2 ตารางสถานะ F01–F12 (อัปเดตทุกรอบ)

ค่า **BE / FE / QA** = สถานะ lane ตาม §1 — **สถานะรวม** = สรุปเร็วสำหรับ PO (ไม่แทนที่สัญญา acceptance)

| ID | Feature | BE | FE | QA | ClickUp (Epic ID หรือ URL) | สถานะรวม | หมายเหตุ (technical / repo) |
|----|---------|----|----|-----|-----------------------------|-----------|------------------------------|
| F01 | IW37N import/process | กำลังทำ | กำลังทำ | ยังไม่เริ่ม | — | กำลังทำ | [`SYSTEM_FLOWS.md`](SYSTEM_FLOWS.md) §C–D; checklist `F01-xxx` ใน ClickUp doc |
| F02 | IW37N UI search/filter/report | กำลังทำ | กำลังทำ | ยังไม่เริ่ม | — | กำลังทำ | มี list/detail WO; ปฏิทิน / DnD / export ตาม (1)(2) ยังไม่ครบ |
| F03 | Goods Issue GI | กำลังทำ | กำลังทำ | ยังไม่เริ่ม | — | กำลังทำ | `gi` → staging → `goods_movements` |
| F04 | Goods Receipt GR | กำลังทำ | กำลังทำ | ยังไม่เริ่ม | — | กำลังทำ | `gr` — เส้นทางเดียวกับ MB51-style |
| F05 | Confirm WO | กำลังทำ | ยังไม่เริ่ม | ยังไม่เริ่ม | — | กำลังทำ | **Epic ถัดไปที่เลือก (§2.3)** — Import + normalize → `order_confirmations`; UI/flow ในแอปตาม (1)(2)(4) |
| F06 | Functional location & equipment | กำลังทำ | กำลังทำ | ยังไม่เริ่ม | — | กำลังทำ | ผ่าน normalize / WO; หน้า master FL/equipment แยกยังไม่ชัด |
| F07 | Work center list | กำลังทำ | กำลังทำ | ยังไม่เริ่ม | — | กำลังทำ | WC บน WO; CRUD WC แยกยังไม่ชัด |
| F08 | SAP reports export | ยังไม่เริ่ม | ยังไม่เริ่ม | ยังไม่เริ่ม | — | ยังไม่เริ่ม | [`SYSTEM_FLOWS.md`](SYSTEM_FLOWS.md) §J placeholder |
| F09 | Dashboard KPI | กำลังทำ | กำลังทำ | ยังไม่เริ่ม | — | กำลังทำ | §G–H; snapshot + worker |
| F10 | RBAC | กำลังทำ | กำลังทำ | ยังไม่เริ่ม | — | กำลังทำ | §L — **`/admin/users`** + API **`GET/PATCH /admin/users`**, **`GET /admin/roles`**; ยังไม่มี POST สร้าง user / audit log ตามแผนขยาย |
| F11 | App remote/network | กำลังทำ | — | ยังไม่เริ่ม | — | กำลังทำ | CORS + docs; TLS/prod = IT — lane FE ใส่ `—` ถ้าไม่มี UI แยก |
| F12 | Port 3000 + container deploy | กำลังทำ | เสร็จ | ยังไม่เริ่ม | — | กำลังทำ | FE :3000; compose บน repo / prod = P1-5 |

### 5.3 ติ๊ก Epic F01–F12 เมื่อ “รับรองครบตาม scope รอบนี้”

ใช้เป็น **เกณฑ์กว้างต่อ Epic** (ไม่ใช่ทุก subtask ใน ClickUp doc) — ติ๊กเมื่อ PO/TL รับว่าฟีเจอร์นั้นพร้อมสำหรับ milestone ที่เกี่ยว (มักใกล้ M3)

- [ ] **F01** — IW37N import/process  
- [ ] **F02** — IW37N UI search/filter/report (รวมปฏิทิน/DnD ถ้าอยู่ใน scope รอบนี้)  
- [ ] **F03** — Goods Issue GI  
- [ ] **F04** — Goods Receipt GR  
- [ ] **F05** — Confirm WO  
- [ ] **F06** — Functional location & equipment  
- [ ] **F07** — Work center list  
- [ ] **F08** — SAP reports export  
- [ ] **F09** — Dashboard KPI  
- [ ] **F10** — RBAC  
- [ ] **F11** — App remote/network  
- [ ] **F12** — Port 3000 + container deploy  

---

## 6. Phase 5–6 (QA / Deploy) — snapshot

| Phase | สถานะรวม | หมายเหตุ |
|-------|-----------|----------|
| Phase 5 QA / UAT | ยังไม่เริ่ม | ใช้ matrix ใน [`PROJECT_PLAN.md`](PROJECT_PLAN.md) §5 เมื่อเข้ารอบ |
| Phase 6 Deploy | ยังไม่เริ่ม | Runbook / D1–D4 ตามแผน |

### 6.1 ติ๊ก Phase 5–6 (ประตูหลัก)

- [ ] **Phase 5** — แผนทดสอบ + regression + UAT ตาม [`PROJECT_PLAN.md`](PROJECT_PLAN.md) §5  
- [ ] **Phase 6** — Deploy production + runbook + handover (D1–D4)  

---

## 7. ประวัติการอัปเดตเอกสารนี้

| วันที่ | ผู้บันทึก (ทีม) | สรุปการเปลี่ยน |
|--------|------------------|----------------|
| 2026-05-06 | — | สร้างไฟล์ครั้งแรก + snapshot สถานะจาก repo/docs |
| 2026-05-06 | — | F01–F12: คอลัมน์ BE/FE/QA + ClickUp + ลิงก์ requirement ลูกค้า 4 ไฟล์ |
| 2026-05-06 | — | เพิ่ม checklist ติ๊ก: §2.1 in-flight/next, §3.1 milestone, §4.1 P0–P2, §5.3 F01–F12, §6.1 |
| 2026-05-06 | — | FE: routes.ts + PermissionGate + UX หลัง forbidden (หน้าแรก Alert / ซ่อนลิงก์แอดมินเมื่อไม่มีสิทธิ์) |
| 2026-05-06 | — | **M2:** ล็อก E2E ใน §2.2 + เลือก Epic ถัดไป **F05** (§2.3); อัปเดต F10 / P2-2 / P2-4 / milestone M2; เติม §2.1 |

---

## 8. ลิงก์ที่เกี่ยวข้อง

- [`PROJECT_PLAN.md`](PROJECT_PLAN.md) — แหล่ง milestone และราย task เต็ม  
- [`PROJECT_PLAN_CLICKUP_FULL.md`](PROJECT_PLAN_CLICKUP_FULL.md) — แผน ClickUp / checklist ละเอียด (`Fxx-NNN`)  
- **Requirement ลูกค้า (docx):** [Details](../from%20customer/PM%20Application%20Requirement%20(Details).docx) · [Details Rev.1](../from%20customer/PM%20Application%20Requirement%20(Details)Rev.1.docx) · [Requirement](../from%20customer/PM%20Application%20Requirement.docx) · [requirement_13_02_63 (003)](../from%20customer/requirement_13_02_63%20(003).docx)  
- [`SYSTEM_FLOWS.md`](SYSTEM_FLOWS.md) / [`SYSTEM_FLOWS_SIMPLE.md`](SYSTEM_FLOWS_SIMPLE.md) — flow ใช้งานและเทคนิค  
- [`backend/README.md`](../backend/README.md) / [`database/README.md`](../database/README.md) — รันระบบ dev  
- [`GIT_UPLOAD.md`](GIT_UPLOAD.md) — เอา repo ขึ้น Git / remote / push  

| เวอร์ชัน | หมายเหตุ |
|----------|----------|
| 1.0 | 2026-05-06 — ฉบับแรก: milestone + phase 0–6 + F01–F12 snapshot |
| 1.1 | 2026-05-06 — F01–F12 แยก BE/FE/QA + คอลัมน์ ClickUp + §5.0 เอกสารลูกค้า |
| 1.2 | 2026-05-06 — checklist `[ ]`/`[x]` ทั่ว milestone / phase / Fxx + §2.1 งานต่อเนื่อง |
| 1.3 | 2026-05-06 — บันทึกความคืบหน้า FE (guard + UX หลัง access denied) |
| 1.4 | 2026-05-06 — **M2 E2E ล็อก (§2.2)** + **Epic ถัดไป F05 (§2.3)**; snapshot F10/RBAC; §2.1 in-flight/next |

