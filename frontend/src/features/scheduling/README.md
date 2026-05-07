# Scheduling (F02 — UI)

โฟลเดอร์นี้จับคู่แบบ **1:1** กับ [`docs/product/scheduling/`](../../../../docs/product/scheduling/) — เพิ่มไฟล์ spec ในเอกสารเมื่อมีข้อกำหนดใหม่ และวางหน้าจอ/hook ที่สอดคล้องภายใต้ `scheduling/` ตามชื่อไฟล์หรือหัวข้อใน spec

| เอกสาร `docs/product/scheduling/` | โค้ดในโฟลเดอร์นี้ |
|-------------------------------------|---------------------|
| `PM_SCHEDULING_SHEET_REFERENCE.md` (Sheet 1–3) | `pages/WorkCalendarPage.tsx`, `pages/DailyAssignmentReportPage.tsx` — Sheet 2–3 อ้างอิงใบงาน/confirmation; นำเข้า Confirm WO (Sheet 3) ผ่าน `features/data-import/`; แผงยืนยัน WO ใน `features/work-orders/components/WorkOrderConfirmPanel.tsx` (F05) |
| `PM_CALENDAR_REQUIREMENTS.md` | สเปกปฏิทิน + Modal Task / Planning / Close WO (วัน–เวลา + ไอคอนนาฬิกา §7) — `WorkCalendarPage.tsx` + BE reschedule |
| `PM_TASK_LIST_SHEET_REFERENCE.md` | PM Task detail อ้างชีต **PM Task List** — คีย์ `ui_metadata_json` ใน Task tab |

**สัญญา API:** ใช้ร่วม [`../work-orders/api.ts`](../work-orders/api.ts) — scheduling เป็นมุมมอง Planning/รายงานบนข้อมูลใบงานเดียวกับ `work-orders/`

**Routes:** `ROUTES.workOrders.calendar`, `ROUTES.workOrders.dailyAssignment` (ลงทะเบียนใน `App.tsx`)
