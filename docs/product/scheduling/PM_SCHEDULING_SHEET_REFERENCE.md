# Preventive Maintenance Scheduling Application — คำจำกัดความ Sheet Scheduling

เอกสารนี้สรุป **วัตถุประสงค์** และ **ความหมายของแต่ละคอลัมน์** บน Sheet ทดลอง **Sheet 1 : Scheduling**, **Sheet 2 : Work Order Status**, และ **Sheet 3 : Confirmation** (อ้างอิงไฟล์ Excel ฝั่งลูกค้า / รูปแบบ *Dynamic List Display* ที่ส่งออกจาก SAP สำหรับ PM)

| อัปเดต | 2026-05-07 |
|--------|------------|

---

## วัตถุประสงค์

ใช้ Application ช่วยในการจัดการ **วางแผนงาน Preventive maintenance** ให้ง่ายขึ้น โดยใช้แอปร่วมกับข้อมูลจาก **SAP system** (นำเข้า / sync ตาม scope โครงการ)

---

## Sheet 1 — Scheduling

ตารางตัวอย่างประกอบด้วย **9 คอลัมน์** (เรียงจากซ้ายไปขวาตามที่ใช้อธิบายใน requirement)

| # | ชื่อคอลัมน์ (Excel) | ความหมาย |
|---|---------------------|-----------|
| 1 | **MntPlan** | **Maintenance plan** — เลขแผนงาน Preventive maintenance |
| 2 | **MaintPlan dscrptn** | **Maintenance Plan Description** — ชื่อแผนงาน Preventive Maintenance |
| 3 | **Call No.** | จำนวนครั้งในการ **Generate Work Order** |
| 4 | **PlanDate** | **วันที่ต้องทำงาน** ของงานนั้น — จะถูกระบุอยู่ใน Work Order |
| 5 | **Call Status** | สถานะของการ **scheduled** โดย SAP |
| 6 | **Functional Location** | **รหัสของสถานที่** |
| 7 | **FunctLocDescrip.** | **ชื่อสถานที่** |
| 8 | **Order** | หมายเลขใบงาน / **Work Order** — **ต้องไม่ซ้ำ** (ใช้เป็นเลขอ้างอิงหลักของใบงาน) |
| 9 | **Mn.wk.ctr** | **Main Work center** — รหัสของช่าง / ศูนย์งานหลักที่ผูกกับใบงาน |

---

## Sheet 2 — Work Order Status

รายงาน *Dynamic List Display* ฝั่ง SAP สำหรับ **สถานะใบงาน** — ใช้คู่กับ Sheet 1 เพื่อติดตามว่าใบงาน (**Order**) ที่ผูกกับแผนแล้ว อยู่ในสถานะใดในวันที่ดึงข้อมูล

ลำดับคอลัมน์ด้านล่างตามตัวอย่าง export (ชื่อหัวแถวในไฟล์จริงอาจสะกดต่างเล็กน้อย เช่น *Equipment descriptn* / *ActTotSum*)

| # | ชื่อคอลัมน์ (Excel / SAP list) | ความหมาย |
|---|----------------------------------|-----------|
| 1 | **Entered by** | GPID (รหัสพนักงาน) ของผู้ **ปล่อย (release)** ใบงานใน SAP |
| 2 | **Created on** | วันที่ใบงานถูกปล่อย / สร้างในระบบ SAP |
| 3 | **Order** | เลข **Work Order** — **ต้องไม่ซ้ำ** (คีย์อ้างอิงหลักเดียวกับ Sheet 1 คอลัมน์ **Order**) |
| 4 | **Type** | ประเภทใบงาน (เช่น `ZB02`) |
| 5 | **Bsc start** | วันที่วางแผนทำงาน PM — **ให้ถือว่าตรงกับ `PlanDate` ใน Sheet 1 : Scheduling** สำหรับคู่แผน–ใบงานเดียวกัน |
| 6 | **Description** | คำอธิบายหัวข้อแผนงาน / งานที่ทำ |
| 7 | **System status** | สถานะระบบของใบงาน **ณ วันที่ดึงข้อมูลจาก SAP** — ใช้เฉพาะ **4 ตัวอักษรแรกจากซ้าย** เป็นหลัก (ส่วนที่เหลือเป็นรหัสเสริม เช่น `PCNF NMAT PRC SETC`) |
| 8 | **Equipment descriptn** | ชื่อเครื่อง / โซนเครื่องจักร |
| 9 | **ActTotSum** / **ActToSum** | ต้นทุนจริงที่เกิดขึ้น (actual) |
| 10 | **SumTotPlan** / **SumToPlan** | ต้นทุนตามแผน (planned) |
| 11 | **Notifctn** | เลขที่ Notification ที่ผูกกับใบงาน |
| 12 | **FunctLocDescrip.** | ชื่อสถานที่ (Functional Location Description) |
| 13 | **Mn.wk.ctr** | รหัส Main Work Center ที่ผูกกับใบงาน |
| 14 | **Cost Ctr** | รหัส Cost Center / สายการผลิต |
| 15 | **Equipment** | รหัสอุปกรณ์ (Equipment number) |

### สถานะระบบ (4 ตัวอักษรแรกของ System status)

| ค่า | ความหมาย |
|-----|-----------|
| **CRTD** | สร้างใบงานแล้วโดยระบบ แต่ยัง **ไม่ถูกปล่อย** โดย Planner |
| **REL** | Planner **ปล่อยใบงาน**แล้ว |
| **TECO** | ปิดงานทางเทคนิค (Technically Complete) — ถือว่าใบงานจบทางวิศวกรรม |
| **CLSD** | ปิดใบงาน (Closed) — ความหมายใช้งานใกล้เคียง **TECO** ในบริบทการติดตาม |

ตัวอย่างสตริงเต็มจาก SAP: `CRTD MANC NMAT PRC`, `REL NMAT PRC SETC`, `TECO PCNF NMAT PRC SETC`, `CLSD PCNF NMAT PRC SETC` — โค้ดฝั่งแอปควร parse เฉพาะ prefix 4 ตัวเพื่อแสดงสถานะและกรอง

---

## Sheet 3 — Confirmation

รายงาน *Dynamic List Display* สำหรับ **การยืนยันการทำงาน (confirmation)** ของใบงาน — หนึ่ง **Order** อาจมีหลายแถว confirmation (เลข **Confirm.** + **Counter** ไม่ซ้ำในระบบ SAP)

รูปแบบวันที่ในไฟล์ตัวอย่าง: **วัน.เดือน.ปี** (`DD.MM.YYYY`) — เวลา: **`HH:MM:SS`**

### คอลัมน์หลัก (ตามสเปก requirement — 16 ฟิลด์)

| # | ชื่อคอลัมน์ (Excel / SAP list) | ความหมาย |
|---|----------------------------------|-----------|
| 1 | **Confirm.** | เลข **ลำดับการ Confirm** ใน SAP (Confirmation document number) |
| 2 | **Counter** | ลำดับ/จำนวนครั้งของการ Confirm **ภายใต้ Work Order** เดียวกัน |
| 3 | **OrdCat** | **Order category** — ประเภทใบงาน; ในตัวอย่าง **`ZB02`** = Preventive maintenance |
| 4 | **Order** | เลข **Work Order** — ผูกกับ Sheet 1–2 ผ่านคอลัมน์ **Order** |
| 5 | **Postg date** | **Posting date** — วันที่บันทึก confirmation นี้ใน SAP |
| 6 | **Equipment** | รหัสเครื่องจักร / อุปกรณ์ |
| 7 | **WkCtrAct** | **Work Center Actual** — รหัสศูนย์งาน/พนักงานที่ **ทำงานจริง** |
| 8 | **Act. work** | **Actual work** — ปริมาณเวลางานจริง (ค่าตัวเลข) |
| 9 | **Un. WkAct** | **Unit — Work Actual** — หน่วยของค่าใน Col.8 (เช่น `MIN` = นาที) |
| 10 | **PG** | **Planner Group** — รหัสกลุ่ม Planner |
| 11 | **PtAc** | รหัส **Plant** — ในไฟล์ตัวอย่าง เช่น **7151** (โรงงานลำพูน) |
| 12 | **Act.start** *(เวลา)* | เวลาเริ่มทำงานจริง — ใช้คู่กับ Col.14 (วันที่) เพื่อได้ timestamp เต็ม |
| 13 | **Act.finish** *(เวลา)* | เวลาจบงานจริง — ใช้คู่กับ Col.15 (วันที่) |
| 14 | **Act. Start** *(วันที่)* | วันที่เริ่มทำงานจริง (`DD.MM.YYYY`) |
| 15 | **Act.finish** *(วันที่)* | วันที่จบงานจริง (`DD.MM.YYYY`) — *ใน export SAP อาจใช้ชื่อหัวแถวซ้ำกับ Col.13; แยกจากบริบทว่าเป็นคอลัมน์วันที่หรือเวลา* |
| 16 | **WkCtrPln** | **Work Center Planned** — รหัสศูนย์งาน/พนักงานที่ **วางแผนไว้** (สะกดในเอกสารลูกค้าเป็น *Plane* = *Planned*) |

### คอลัมน์เสริมที่มักปรากฏในรายงานเดียวกัน

| ชื่อคอลัมน์ (ตัวอย่าง) | ความหมายสั้น |
|-------------------------|----------------|
| **Created On** | วันที่สร้าง/บันทึกแถว (มักสอด Posting / วันที่ประมวลผลใน SAP) |
| **Rem. Work** | งานที่เหลือ (remaining work) |
| **Un.** | หน่วยของ Rem. Work (เช่น `MIN`) |
| **Sys.Status** | สถานะระบบของบรรทัด confirmation (เช่น `PCNF TECO`) — แยกจาก Sheet 2 ที่เป็นสถานะระดับใบงาน |
| **Functional Location** | รหัสตำแหน่งฟังก์ชันแบบลำดับชั้น (hierarchy string) |

---

## หมายเหตุใช้ในระบบนี้ (repo)

- **คีย์ใบงานในแอป:** มักอิง **`Order`** → เก็บเป็น `work_orders.order_number` (ต้องไม่ซ้ำในระบบหลัง normalize)
- **สถานที่:** **`Functional Location`** → map กับฟิลด์ใบงานที่เก็บรหัสสถานที่ / อุปกรณ์ (เช่น `equipment_id` หลังนำเข้า — ตาม pipeline F01)
- **ทรัพยากรหลัก:** **`Mn.wk.ctr`** → ใช้ประกอบการมอบหมาย / แผน (`work_center_planned` / metadata planning)
- **วันที่วางแผน:** **`PlanDate`** และช่วงเวลาจาก SAP → ใช้ประกอบ **`planned_start` / `planned_finish`** บนปฏิทิน F02
- **Sheet 2:** **`Order`** ผูกกับ **`work_orders.order_number`**; **`Bsc start`** สอด **`PlanDate`** (Sheet 1); **`System status`** เก็บ/แสดงจาก **4 ตัวอักษรแรก** แล้ว map กับฟิลด์สถานะใน DB/API ตาม [`../../DATABASE_DESIGN_DRAFT.md`](../../DATABASE_DESIGN_DRAFT.md) (`system_status` ฯลฯ)
- **Sheet 3:** ไฟล์นำเข้า **Confirm WO** — คีย์หลักมักเป็น **`Confirm.`** + context **`Order`** / **`Counter`**; รายละเอียดคอลัมน์ต่อไฟล์ใน [`../../SAP_DATA_IMPORT_EXPORT_COLUMNS.md`](../../SAP_DATA_IMPORT_EXPORT_COLUMNS.md) §Confirm WO; แท็บนำเข้าในแอปอยู่ **`frontend/src/features/data-import/`** — การยืนยันใบงานบนหน้ารายละเอียดใช้ **`frontend/src/features/work-orders/components/WorkOrderConfirmPanel.tsx`** (F05) แยกจาก scheduling แต่ข้อมูลสอดใบงานเดียวกัน
- ความหมายคอลัมน์ในไฟล์จริง **อาจสลับลำดับหรือชื่อหัวแถวต่างชุด** — ดูรายการจับคู่ตามไฟล์ที่นำเข้าใน [`../../SAP_DATA_IMPORT_EXPORT_COLUMNS.md`](../../SAP_DATA_IMPORT_EXPORT_COLUMNS.md)

---

## อ้างอิงเพิ่มเติม

- ไฟล์ต้นฉบับลูกค้า: `from customer/PM Application Requirement.docx` และชุด export IW37N ใน `from customer/SAP data/` (manifest: [`../../CUSTOMER_FROM_FOLDER_MANIFEST.md`](../../CUSTOMER_FROM_FOLDER_MANIFEST.md))
- Flow ผู้ใช้งานตามบทบาท: [`../../SYSTEM_FLOWS_SIMPLE.md`](../../SYSTEM_FLOWS_SIMPLE.md)
