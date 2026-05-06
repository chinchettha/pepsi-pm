# โครงสร้างพื้นฐานและการเข้าถึงแบบรีโมท

เอกสารนี้อธิบายแนวทางที่โครงการ **Pepsi Cola PM / PM Application** ใช้สำหรับให้ทีมพัฒนาเข้าถึงสภาพแวดล้อมพัฒนา (dev) จากระยะไกล และการจัดเก็บ Docker บนไดรฟ์ **D:** เพื่อไม่ให้ไดรฟ์ **C:** เต็ม

## Tailscale (รีโมทเข้า dev)

- ใช้ **Tailscale** เป็น VPN แบบ mesh เพื่อให้สมาชิกทีมพัฒนาเชื่อมต่อเข้าเครื่อง/เซิร์ฟเวอร์ dev ได้โดยไม่ต้องเปิดพอร์ตพิเศษไปที่ Firewall ของโรงงานโดยตรง (ตามแนวทางใน SRS)
- แต่ละคนในโครงการต้องได้รับเชิญเข้า **Tailnet** เดียวกัน และลงแอป Tailscale บนเครื่องที่ใช้พัฒนา
- หลังเชื่อมต่อแล้ว ใช้ IP หรือ MagicDNS ของเครื่อง dev เพื่อเข้าถึงบริการ (เช่น `https://<hostname>:3000` สำหรับ frontend ตามที่กำหนดในโครงการ)

คู่มือปฏิบัติทีละขั้น (ติดตั้งจนถึงใช้งาน): [`INSTALL_SOP_TAILSCALE_DOCKER.md`](INSTALL_SOP_TAILSCALE_DOCKER.md) — สำเนาเดียวกันในโฟลเดอร์ server: [`../server/DOCKER_AND_TAILSCALE.md`](../server/DOCKER_AND_TAILSCALE.md)

## สรุปการจัดสรรไดรฟ์

| พื้นที่ | ขนาด | วัตถุประสงค์ |
|---------|------|----------------|
| **D:** (dev) | **50 GB** | โค้ด, volumes ของ Docker สำหรับพัฒนา, cache ของ build |
| **D:** (deploy) | **300 GB** | ภาพ container, volumes ข้อมูล runtime, ไฟล์สำรอง/artifact ที่เกี่ยวข้อง |

ไดรฟ์ **C:** ใช้สำหรับระบบปฏิบัติการและโปรแกรมทั่วไปเท่าที่จำเป็น ลดการเติบโตของ Docker data บน C:

## เอกสารที่เกี่ยวข้อง

- รายการไฟล์จากลูกค้าใต้ `from customer/`: [`CUSTOMER_FROM_FOLDER_MANIFEST.md`](CUSTOMER_FROM_FOLDER_MANIFEST.md) — รวม **ล็อก SRS หลัก** (ชุด PM Application Requirement* สี่ไฟล์)
- แผนโครงการ (milestone, owner, ล็อกแหล่ง SRS แบบ B): [`PROJECT_PLAN.md`](PROJECT_PLAN.md)
- **SRS หลัก (ลูกค้า):** `from customer/PM Application Requirement (Details).docx`, `(Details)Rev.1.docx`, `PM Application Requirement.docx`, `requirement_13_02_63 (003).docx` — รายละเอียดลิงก์ใน manifest / แผนงาน
- **SRS เสริม (Pepsi, มาตรา/รหัส SRS-001–013 / UC / ภาคผนวก):** [`Software Requirement Specification Pepsi Cola PM Project.docx`](Software%20Requirement%20Specification%20Pepsi%20Cola%20PM%20Project.docx) — เครือข่าย/พอร์ต: บท 2 (เช่น §2.4), **ภาคผนวก ค**
- ออกแบบฐานข้อมูล (ร่าง): [`DATABASE_DESIGN_DRAFT.md`](DATABASE_DESIGN_DRAFT.md) — **ชื่อฐานล็อก:** `pepsi_pm` (รัน migration ครั้งเดียวได้ทั้ง DB + schema: [`database/README.md`](../database/README.md))
- Backend API (Express, พอร์ต **5000**): [`BACKEND_STRUCTURE.md`](BACKEND_STRUCTURE.md), [`../backend/README.md`](../backend/README.md), [`api/openapi.yaml`](api/openapi.yaml), [`PROGRAM_FLOW.md`](PROGRAM_FLOW.md), [`ER_DIAGRAM.md`](ER_DIAGRAM.md)
- คอลัมน์ตัวอย่าง SAP (`from customer/SAP data`): [`SAP_DATA_IMPORT_EXPORT_COLUMNS.md`](SAP_DATA_IMPORT_EXPORT_COLUMNS.md)
- คู่มือปฏิบัติ: [`INSTALL_SOP_TAILSCALE_DOCKER.md`](INSTALL_SOP_TAILSCALE_DOCKER.md) / [`../server/DOCKER_AND_TAILSCALE.md`](../server/DOCKER_AND_TAILSCALE.md)
