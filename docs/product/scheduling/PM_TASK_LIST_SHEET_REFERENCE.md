# PM Task List (ชีต Excel ลูกค้า)

| อัปเดต | 2026-05-07 |
|--------|------------|

เอกสารนี้อธิบายความสัมพันธ์ระหว่างชีต **`PM Task List`** ในไฟล์ Excel ฝั่งลูกค้า กับฟิลด์ **PM Task detail** ในแอป (แท็บ **Task** ของหน้าต่างรายละเอียดจากปฏิทิน — ดับเบิลคลิกแท่งงาน)

---

## บทบาทในระบบ

- ชีต **PM Task List** เป็นต้นทางข้อมูล **รายละเอียดงาน PM** (หัวข้อ / โซน / รายการขั้นตอนหรือคำอธิบาย) ที่แสดงในแท็บ **Task** คู่กับ **Maintenance Plan** (เลขอ้างอิงแผน / ใบงานตามที่ normalize ในระบบ)
- ข้อมูลนี้ไม่จำเป็นต้องมาจาก SAP IW37N โดยตรง — มักผูกเข้ากับใบงานผ่าน **การนำเข้า** หรือ enrichment ลง **`work_orders.ui_metadata_json`**

---

## การแมปเข้า `ui_metadata_json` (แนะนำ)

| ความหมาย (ตาม UI) | คีย์ JSON ที่รองรับในแอป | รูปแบบ |
|--------------------|-------------------------|--------|
| บรรทัดหัวข้อ PM / โซน (เช่น `2W - ME Potato Washing Zone (P13)`) | `pmZone`, `pmTaskZone`, `zoneTitle`, `maintenanceZone`, `pmZoneTitle`, `headerDescription`, **`pmTaskDetail`** | `string` |
| รายการรายละเอียดงาน / bullet จากชีต PM Task List | **`pmTaskList`**, `taskList`, `pm_tasks` | `string[]` |

ถ้าไม่มีคีย์ข้างต้น แอปจะแสดงข้อมูลสำรองจาก `order_type`, `order_number` และข้อความแจ้งว่ายังไม่มีรายการจาก PM Task List

---

## อ้างอิง

- ปฏิทินและ Modal: [`PM_CALENDAR_REQUIREMENTS.md`](PM_CALENDAR_REQUIREMENTS.md) § หน้าต่างรายละเอียด (Task / Planning)
- ชีต Scheduling / WO / Confirm: [`PM_SCHEDULING_SHEET_REFERENCE.md`](PM_SCHEDULING_SHEET_REFERENCE.md)
