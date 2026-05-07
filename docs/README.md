# เอกสารโปรเจกต์ Pepsi PM — ดัชนีหลัก

เริ่มที่ **`APPLICATION_STRUCTURE.md`** เพื่อเข้าใจ **ชั้นข้อมูล** (ลูกค้า → product specs → engineering → โค้ด)

| อัปเดต | 2026-05-07 |
|--------|------------|

---

## เริ่มที่นี่

| เอกสาร | ใช้เมื่อ |
|---------|----------|
| [**APPLICATION_STRUCTURE.md**](APPLICATION_STRUCTURE.md) | ต้องการภาพรวมโครงสร้างแอป + กติกาเพิ่มข้อ requirement |
| [**PROJECT_STRUCTURE.md**](PROJECT_STRUCTURE.md) | ต้องการ tree โฟลเดอร์ repo + ชั้น DB |
| [**SYSTEM_FLOWS_SIMPLE.md**](SYSTEM_FLOWS_SIMPLE.md) | Flow ตามบทบาทผู้ใช้ (ไทย / EN) |
| [**SYSTEM_FLOWS.md**](SYSTEM_FLOWS.md) | Flow ละเอียด + Mermaid (ทีมพัฒนา) |

---

## ผลิตภัณฑ์ / โดเมนลูกค้า (`docs/product/`)

ข้อกำหนดที่แยกตาม **หัวข้อธุรกิจ** — เพิ่มข้อใหม่ให้ใส่ใต้โฟลเดอร์นี้

| พื้นที่ | ลิงก์ |
|---------|--------|
| **Scheduling / PM / Sheet Scheduling** | [`product/scheduling/PM_SCHEDULING_SHEET_REFERENCE.md`](product/scheduling/PM_SCHEDULING_SHEET_REFERENCE.md) |
| แม่แบบ spec | [`product/_SPEC_TEMPLATE.md`](product/_SPEC_TEMPLATE.md) |
| ดัชนี `product/` | [`product/README.md`](product/README.md) |

---

## วิศวกรรมและโค้ด

| หมวด | เอกสาร |
|-------|---------|
| Frontend | [`FRONTEND_STRUCTURE.md`](FRONTEND_STRUCTURE.md) |
| Backend | [`BACKEND_STRUCTURE.md`](BACKEND_STRUCTURE.md) |
| Program flow (technical) | [`PROGRAM_FLOW.md`](PROGRAM_FLOW.md) |
| ER / DB | [`ER_DIAGRAM.md`](ER_DIAGRAM.md), [`DATABASE_DESIGN_DRAFT.md`](DATABASE_DESIGN_DRAFT.md) |
| คอลัมน์ไฟล์ SAP | [`SAP_DATA_IMPORT_EXPORT_COLUMNS.md`](SAP_DATA_IMPORT_EXPORT_COLUMNS.md) |
| OpenAPI ร่าง | [`api/openapi.yaml`](api/openapi.yaml) |
| SDD | [`SOFTWARE_DESIGN_DOCUMENT.md`](SOFTWARE_DESIGN_DOCUMENT.md) |

---

## โครงการและสถานะ

| เอกสาร | ใช้เมื่อ |
|---------|----------|
| [`PROJECT_PLAN.md`](PROJECT_PLAN.md) | Epic / Feature map |
| [`PROJECT_PLAN_CLICKUP_FULL.md`](PROJECT_PLAN_CLICKUP_FULL.md) | Backlog แบบยาว |
| [`PHASE_STATUS.md`](PHASE_STATUS.md) | Snapshot ความคืบหน้า |

---

## การติดตั้งและโครงสร้างพื้นฐาน

[`INFRASTRUCTURE.md`](INFRASTRUCTURE.md) · [`INSTALL_SOP_TAILSCALE_DOCKER.md`](INSTALL_SOP_TAILSCALE_DOCKER.md) · [`database/README.md`](../database/README.md)

---

## แหล่งลูกค้า (ไม่ใช่สเปกที่เราเขียนใหม่)

[`from customer/`](../from%20customer/) — manifest: [`CUSTOMER_FROM_FOLDER_MANIFEST.md`](CUSTOMER_FROM_FOLDER_MANIFEST.md)
