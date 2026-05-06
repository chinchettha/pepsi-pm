# ตารางบท 3.2 — URS ↔ SRS (จาก Word)

**หมายเหตุแหล่งอ้างอิง:** ความต้องการจากลูกค้าที่ล็อกไว้เป็นหลักคือชุด **PM Application Requirement*** ใน `from customer/` (ดู [`PROJECT_PLAN.md`](PROJECT_PLAN.md)) — ไฟล์นี้เป็น **ตาราง cross-ref** จาก Pepsi SRS บท 3.2 เท่านั้น

แสดง**ขึ้นบรรทัดในเซลล์**ตาม [Software Requirement Specification Pepsi Cola PM Project.docx](Software%20Requirement%20Specification%20Pepsi%20Cola%20PM%20Project.docx) โดยใช้ HTML `<br>` ในตารางด้านล่าง (เปิดดูใน Markdown preview ที่รองรับ HTML)

<table>
<thead><tr><th>URS</th><th>SRS-ID</th><th>Fxx (แผน)</th><th>รายละเอียดความต้องการทางซอฟต์แวร์</th></tr></thead>
<tbody>
<tr><td>URS-01</td><td>SRS-001</td><td>F02</td><td>ระบบต้องพัฒนาด้วย React.js เพื่อแสดงผลปฏิทินแบบ Interactive ที่รองรับการสลับมุมมอง Month/Week/Day ได้อย่างรวดเร็ว</td></tr>
<tr><td>URS-02</td><td>SRS-002</td><td>F02, F10</td><td>ระบบต้องมี API (Node.js) สำหรับจัดการ Logic การ Drag &amp; Drop และตรวจสอบสถานะงาน หากเป็นงานสีแดง (Overdue) ต้องบังคับให้ Client ส่งค่า Reason Code มาพร้อมกับคำขอ Update ข้อมูล</td></tr>
<tr><td>URS-03</td><td>SRS-003</td><td>F02</td><td>ระบบต้องมีฟังก์ชันคำนวณ Available Hour ของช่างแต่ละคนในฐานข้อมูล MariaDB เพื่อแจ้งเตือน Planner หากมีการมอบหมายงานเกินเวลาปฏิบัติงานปกติ</td></tr>
<tr><td>URS-04</td><td>SRS-004</td><td>F02</td><td>ระบบต้องรองรับการถอดรหัส QR Code ผ่านกล้องของอุปกรณ์พกพา และทำการ Query ข้อมูล Work Order จากฐานข้อมูลมาแสดงผลภายในเวลาไม่เกิน 2 วินาที</td></tr>
<tr><td>URS-05</td><td>SRS-005</td><td>F02, F05</td><td>ระบบต้องมีโมดูล File Upload เพื่อจัดเก็บรูปภาพและเอกสารในพื้นที่ Drive D ที่จัดสรรไว้ และเก็บ Path ของไฟล์ลงใน MariaDB</td></tr>
<tr><td>URS-06</td><td>SRS-006</td><td>F01, F05, F06</td><td>ระบบต้องสร้าง Dynamic Form ตามรายการ Task List ที่ดึงมาจาก SAP เพื่อให้ช่างบันทึกค่าพารามิเตอร์ตามประเภทเครื่องจักรได้ถูกต้อง</td></tr>
<tr><td>URS-07</td><td>SRS-007</td><td>F03, F04, F08</td><td>ระบบต้องเชื่อมต่อกับโมดูล Inventory เพื่อตรวจสอบรหัสพัสดุ (Material Number) ผ่านการสแกน Barcode และทำการตัดยอดชั่วคราวในระบบ PM App</td></tr>
<tr><td>URS-08</td><td>SRS-008</td><td>F01, F06, F07</td><td>ระบบต้องมีฟังก์ชันการเชื่อมโยงข้อมูล (Data Mapping) ระหว่าง Work Order กับรายการอะไหล่ (BOM) เพื่อแสดงความต้องการใช้อะไหล่ล่วงหน้า</td></tr>
<tr><td>URS-09</td><td>SRS-009</td><td>F09</td><td>ระบบต้องเชื่อมต่อกับ Telegram Bot API เพื่อส่งข้อความแจ้งเตือนอัตโนมัติเมื่อมีการสร้างใบงานใหม่ หรือมีงานค้างเกิน 30 วัน</td></tr>
<tr><td>URS-10</td><td>SRS-010</td><td>F10</td><td>ระบบต้องมีบริการ Web Socket (เช่น Socket.io) เพื่อรองรับการรับ-ส่งข้อความในกลุ่มแชทแบบ Real-time</td></tr>
<tr><td>URS-11</td><td>SRS-011</td><td>F09</td><td>ระบบต้องประมวลผลข้อมูลผ่าน Dashboard โดยใช้ Aggregate Query เพื่อแสดงจำนวนงานแยกตามสถานะ (Running, Idle, Down) และประเภทงาน (ZB01, 02, 05)</td></tr>
<tr><td>URS-12</td><td>SRS-012</td><td>F09</td><td>ระบบต้องมี Algorithm สำหรับคำนวณค่า %Utilization โดยใช้สูตร (Actual Work / Planned Work) * 100 และแสดงผลเป็นกราฟเปรียบเทียบ<br></td></tr>
<tr><td>URS-13</td><td>SRS-013</td><td>F01, F05, F08</td><td>ระบบต้องมี Library สำหรับ Generate ไฟล์ CSV  และ PDF (เช่น ExcelJS, PDFKit) เพื่อส่งออกรายงาน Confirmation และ Backlog ตามมาตรฐานที่โรงงานกำหนด (รูปแบบ CSV ต้องสอดคล้องกับเทมเพลตการนำเข้า SAP ของโรงงาน)</td></tr>
</tbody></table>