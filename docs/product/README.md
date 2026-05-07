# ข้อกำหนดผลิตภัณฑ์ (ลูกค้า / โดเมน)

โฟลเดอร์นี้รวม **เอกสารอธิบายความหมายธุรกิจ** และ **ข้อจำกัดจาก SAP / Excel** แยกตามหมวด — ไม่ใช่คู่มือโค้ดโดยตรง (โครงสร้างโค้ดดู [`FRONTEND_STRUCTURE.md`](../FRONTEND_STRUCTURE.md) / [`BACKEND_STRUCTURE.md`](../BACKEND_STRUCTURE.md))

## โฟลเดอร์ย่อย

| โฟลเดอร์ | เนื้อหา |
|----------|---------|
| [`scheduling/`](scheduling/) | PM Scheduling, Sheet Scheduling, คอลัมน์ IW37N ที่เกี่ยวกับแผนงาน — โค้ด UI คู่ขนาน [`frontend/src/features/scheduling/`](../../frontend/src/features/scheduling/README.md) |
| *(เพิ่มตามข้อถัดไป)* | สร้างโฟลเดอร์ใหม่ เช่น `corrective/`, `reports/` แล้วใส่ README + spec ในนั้น |

## กติกาเพิ่มข้อใหม่

1. เลือกหมวด → สร้างโฟลเดอร์ถ้ายังไม่มี  
2. เพิ่มไฟล์ `.md` (หรือใช้แม่แบบ [`_SPEC_TEMPLATE.md`](_SPEC_TEMPLATE.md))  
3. ลงทะเบียนลิงก์สั้น ๆ ใน [`../README.md`](../README.md) ใต้หัวข้อ **ผลิตภัณฑ์ / โดเมนลูกค้า**  
4. ถ้ากระทบ schema หรือ API → อัปเดต [`DATABASE_DESIGN_DRAFT.md`](../DATABASE_DESIGN_DRAFT.md) และ/หรือ [`api/openapi.yaml`](../api/openapi.yaml)
