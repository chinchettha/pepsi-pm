# นโยบายรูปภาพหลักฐาน (Before / After และรูปผู้ใช้อัปโหลด) — แปลงเป็น WebP ก่อนบันทึกถาวร

**เป้า:** ลดการใช้พื้นที่ **ดิสก์ (Drive D)** และขนาด **backup** — รูปถ่ายหน้างาน / before–after / แนบใน task log **ต้องเป็น WebP** ก่อนส่งเข้าระบบจัดเก็บ

**สอด DDL:** [`task_log_attachments`](../database/migrations/V001__initial_schema.sql) — ฐานข้อมูลเก็บ **metadata** (`storage_path`, `mime_type`, `byte_size`) ไฟล์จริงอยู่ **บนดิสก์** ตาม `storage_path` (ไม่เก็บ binary ใหญ่ใน MariaDB ตามออกแบบปัจจุบัน)

---

## 1. ขอบเขตที่ใช้นโยบายนี้

| ใช้ WebP | ไม่ใช้นโยบายนี้ |
|----------|------------------|
| รูปถ่ายหลักฐานใบงาน (before / after, หลักฐานซ่อม) | ไฟล์นำเข้า SAP (`.xls` / `.xlsx`) — เป็น spreadsheet ไม่ใช่รูป |
| รูปแนบใน `task_logs` / `task_log_attachments` | เอกสาร PDF (ถ้ามีในอนาคต — แยกนโยบายบีบอัด) |
| รูปจากมือถือ/แท็บเล็ตที่ผู้ใช้อัปโหลดในแอป PM | ไอคอน / asset สถิตใน bundle frontend |

---

## 2. กฎทางเทคนิค

1. **ก่อนบันทึกถาวร** (ก่อน API รับแล้วเขียนไฟล์ + `INSERT task_log_attachments`): แปลง raster เป็น **WebP**
2. **`mime_type` ใน DB:** `image/webp`
3. **นามสกุลไฟล์ใน `storage_path`:** `.webp`
4. **คุณภาพเริ่มต้น:** quality ประมาณ **0.80–0.85** (ปรับตาม UAT เรื่องความคมชัด vs ขนาด)
5. **ขนาดยาวด้านใหญ่สุด (แนะนำ):** resize ไม่เกิน **2048 px** ตามด้านยาว (คงสัดส่วน) — ลดขนาดบนมือถือที่ถ่ายความละเอียดสูง
6. **รูปแบบต้นทางที่รองรับจากกล้อง:** อย่างน้อย JPEG / PNG; รูปแบบอื่น (เช่น HEIC) ให้แปลงบน client หรือ server ก่อนเข้าขั้นตอน WebP

---

## 3. แนวทาง implement

### 3.1 Frontend (แนะนำเป็นหลัก)

- หลังผู้ใช้เลือกไฟล์ แต่ก่อน `FormData` / `fetch`: แปลงด้วย **Canvas** (`drawImage` + `canvas.toBlob('image/webp', quality)`) หรือไลบรารีที่ทีมเลือก
- วางโค้ดร่วมใน `src/lib/images/convertToWebp.ts` (ดู [`FRONTEND_STRUCTURE.md`](FRONTEND_STRUCTURE.md))
- ตรวจว่าเบราว์เซอร์เป้าหมายรองรับการ **encode** WebP (Chrome/Edge/Android รองรับดี; Safari รุ่นใหม่รองรับ — ถ้าไม่รองรับให้ fallback: อัปโหลด JPEG คุณภาพจำกัด **หรือ** บังคับให้ backend แปลง)

### 3.2 Backend (ทางเลือก — ความน่าเชื่อถือ)

- รับ multipart แล้วถ้าเป็น `image/jpeg` / `image/png` ให้แปลงเป็น WebP ด้วย **`sharp`** (หรือเทียบเท่า) ก่อนเขียนลงดิสก์
- ใช้เมื่อต้องการ **บังคับ** นโยบายแม้ client แก้ไม่ได้ หรือรับไฟล์จากระบบอื่น

### 3.3 API ใน repo

- `POST /api/v1/task-logs/{taskLogId}/attachments` — multipart `file`; ดู [`api/openapi.yaml`](api/openapi.yaml) และ [`../backend/README.md`](../backend/README.md)

---

## 4. การบันทึกใน DB

- อัปเดต `byte_size` เป็นขนาดไฟล์ **หลัง** แปลง WebP
- ไม่เก็บไฟล์ต้นฉบับหลังแปลงสำเร็จ **ยกเว้น** PO กำหนดให้เก็บ audit (ถ้าเก็บ ให้แยกโฟลเดอร์ + นโยบาม retention)

---

## 5. ลิงก์ที่เกี่ยวข้อง

- [`DATABASE_DESIGN_DRAFT.md`](DATABASE_DESIGN_DRAFT.md) — `task_log_attachments`
- [`FRONTEND_STRUCTURE.md`](FRONTEND_STRUCTURE.md) — โครง `lib/images/`
- [`SOFTWARE_DESIGN_DOCUMENT.md`](SOFTWARE_DESIGN_DOCUMENT.md) — นโยบายสื่อ

| เวอร์ชัน | วันที่ | หมายเหตุ |
|----------|--------|----------|
| 1.0 | 2026-05-04 | ร่างแรก: WebP ก่อน persist, scope, FE/BE, DB metadata |
| 1.1 | 2026-05-04 | อัปเดต §3.3: endpoint + `frontend/src/lib/images/convertToWebp.ts` |
