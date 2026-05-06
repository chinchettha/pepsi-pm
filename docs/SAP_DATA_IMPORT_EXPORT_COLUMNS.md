# SAP import / export — คอลัมน์จากตัวอย่างใน `from customer/SAP data`

ไฟล์ `.xls` หลายไฟล์เป็น **SAP ALV / list export แบบ tab-separated** (บันทึกนามสกุล `.xls`) ไม่ใช่ BIFF — สคริปต์ดึงแถวหัวตารางโดยประมาณจากแถวที่มีคีย์เวิร์ดคอลัมน์มากที่สุด
รูปแบบคอลัมน์ **อาจต่างกันระหว่างไฟล์/รุ่นรายงาน SAP** (เช่น IW37N หลายชุด) — ใช้ตารางด้านล่างเป็น baseline แล้วตรวจสอบกับไฟล์จริงที่นำเข้าในแต่ละ batch

- **นำเข้า (import จาก SAP / ไฟล์ที่ SAP ส่งออก):** คอลัมน์ด้านล่างคือสิ่งที่ปรากฏในตัวอย่าง — ใช้เป็น data dictionary ฝั่งแอป/staging
- **ส่งออกกลับ SAP (export):** โรงงานมักใช้ BAPI / LSMW / template ที่กำหนดใน SAP — ไฟล์ในโฟลเดอร์นี้ส่วนใหญ่เป็น **ตัวอย่างผลลัพธ์จาก SAP** มากกว่าเทมเพลตนำเข้า; การจับคู่กลับ SAP ต้องยืนยันกับทีม MM/PM อีกครั้ง

สร้าง/อัปเดตอัตโนมัติได้ด้วย `python scripts/extract_sap_data_columns.py`

อ้างอิงเพิ่ม: [`DATABASE_DESIGN_DRAFT.md`](DATABASE_DESIGN_DRAFT.md), [`CUSTOMER_FROM_FOLDER_MANIFEST.md`](CUSTOMER_FROM_FOLDER_MANIFEST.md)

## Confirm WO

### `from customer/SAP data/Data/Confirm WO.xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | Confirm. |
| 2 | Counter |
| 3 | OrdCat |
| 4 | Order |
| 5 | Postg date |
| 6 | Equipment |
| 7 | WkCtrAct |
| 8 | Act. work |
| 9 | Un. WkAct |
| 10 | PG |
| 11 | PtAc |
| 12 | Created On |
| 13 | Un. |
| 14 | Rem. Work |
| 15 | Act.start |
| 16 | Act.finish |
| 17 | Act. start |
| 18 | Act.finish |
| 19 | CcldConf |
| 20 | WkCtrPln |
| 21 | Sys.Status |
| 22 | Functional Location |

### `from customer/SAP data/Data/PC50 Y2018 Confirm.xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | Confirm. |
| 2 | Counter |
| 3 | OrdCat |
| 4 | Order |
| 5 | Postg date |
| 6 | Created On |
| 7 | Equipment |
| 8 | WkCtrAct |
| 9 | Act. work |
| 10 | Un. WkAct |
| 11 | PG |
| 12 | PtAc |
| 13 | Rem. Work |
| 14 | Un. |
| 15 | Act.start |
| 16 | Act.finish |
| 17 | Act. start |
| 18 | Act.finish |
| 19 | CcldConf |
| 20 | WkCtrPln |
| 21 | Sys.Status |
| 22 | Functional Location |

### `from customer/SAP data/Data/PC50 Y2018 Confirm.xlsx`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | Confirm. |
| 2 | Counter |
| 3 | OrdCat |
| 4 | Order |
| 5 | Postg date |
| 6 | Created On |
| 7 | Equipment |
| 8 | WkCtrAct |
| 9 | Act. work |
| 10 | Un. WkAct |
| 11 | PG |
| 12 | PtAc |
| 13 | Rem. Work |
| 14 | Un. |
| 15 | Act.start |
| 16 | Act.finish |
| 17 | Act. start |
| 18 | Act.finish |
| 19 | WkCtrPln |
| 20 | Sys.Status |
| 21 | Functional Location |

## Functional location & equipment

ไฟล์ **Functional Location & Equipment.xls** เป็น **โครงสร้างลำดับชั้น** (location / equipment / คำอธิบาย) มากกว่าตารางแบน — ถ้าไม่มีแถวหัวที่อ่านได้ ให้ออกแบบ import แบบ tree หรือ flatten (เช่น `floc_id`, `parent_id`, `equipment_id`, `description`)

- `from customer/SAP data/Data/Functional Location & Equipment.xls` — *ไม่พบแถวหัวที่อ่านได้*

## GI

### `from customer/SAP data/Data/GI 1May-12Jun20.xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | Order |
| 2 | Mat. Doc. |
| 3 | Entry Date |
| 4 | PO |
| 5 | Pstng Date |
| 6 | Doc. Date |
| 7 | Material Description |
| 8 | Quantity |
| 9 | BUn |
| 10 | Amount in LC |
| 11 | Crcy |
| 12 | MvT |
| 13 | Cost Ctr |
| 14 | Time |
| 15 | MatYr |
| 16 | Material |

### `from customer/SAP data/Jul/GI 24Jul20.xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | ﻿Order |
| 2 | Mat. Doc. |
| 3 | Entry Date |
| 4 | PO |
| 5 | Pstng Date |
| 6 | Doc. Date |
| 7 | Material Description |
| 8 | Quantity |
| 9 | BUn |
| 10 | Amount in LC |
| 11 | Crcy |
| 12 | MvT |
| 13 | Cost Ctr |
| 14 | MatYr |
| 15 | Material |

## GR

### `from customer/SAP data/Data/GR 1May-12Jun20.xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | Order |
| 2 | Mat. Doc. |
| 3 | Entry Date |
| 4 | PO |
| 5 | Pstng Date |
| 6 | Doc. Date |
| 7 | Material Description |
| 8 | Quantity |
| 9 | BUn |
| 10 | Amount in LC |
| 11 | Crcy |
| 12 | MvT |
| 13 | Cost Ctr |
| 14 | Time |
| 15 | MatYr |

### `from customer/SAP data/Data/GR 1May-12Jun20.xls.xlsx`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | Order |
| 2 | Mat. Doc. |
| 3 | Entry Date |
| 4 | PO |
| 5 | Pstng Date |
| 6 | Doc. Date |
| 7 | Material Description |
| 8 | Quantity |
| 9 | BUn |
| 10 | Amount in LC |
| 11 | Crcy |
| 12 | MvT |
| 13 | Cost Ctr |
| 14 | Time |
| 15 | MatYr |
| 16 | Material |

### `from customer/SAP data/Jul/GR 24Jul20.xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | Order |
| 2 | Mat. Doc. |
| 3 | Entry Date |
| 4 | PO |
| 5 | Pstng Date |
| 6 | Doc. Date |
| 7 | Material Description |
| 8 | Quantity |
| 9 | BUn |
| 10 | Amount in LC |
| 11 | Crcy |
| 12 | MvT |
| 13 | Cost Ctr |
| 14 | MatYr |
| 15 | Material |

## IA17

- `from customer/SAP data/Data/IA17.xls` — *ไม่พบแถวหัวที่อ่านได้*

### `from customer/SAP data/Data/IA17.xls.xlsx`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | Task list |
| 2 | 450 |
| 3 | 1 |
| 4 | 6M - ME Flume Transfering Zone (P11) |

## IP19

### `from customer/SAP data/Data/IP19.xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | MntPlan |
| 2 | Maint. item text |
| 3 | MaintPlan dscrptn |
| 4 | Call No. |
| 5 | PlanDate |
| 6 | Due packg. |
| 7 | Call Status |
| 8 | Item |
| 9 | Functional Loc. |
| 10 | FunctLocDescrip. |
| 11 | Equipment |
| 12 | Equipment descriptn |
| 13 | Order |
| 14 | MC |
| 15 | Work |
| 16 | Un. |

## IW37N

### `from customer/SAP data/Data/IW37N (22Apr20).xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | S |
| 2 | MntPlan |
| 3 | Order |
| 4 | Type |
| 5 | MAT |
| 6 | Bsc start |
| 7 | Act.finish |
| 8 | System status |
| 9 | OpAc |
| 10 | Operation short text |
| 11 | C |
| 12 | Op.WorkCtr |
| 13 | Work |
| 14 | Act. work |
| 15 | Un. |
| 16 | Description |
| 17 | Equipment |
| 18 | Equipment descriptn |
| 19 | Functional Location |
| 20 | FunctLocDescrip. |

### `from customer/SAP data/Data/IW37N 08Jul20.xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | MntPlan |
| 2 | Order |
| 3 | Type |
| 4 | MAT |
| 5 | Bsc start |
| 6 | Act.finish |
| 7 | System status |
| 8 | OpAc |
| 9 | Operation short text |
| 10 | Description |
| 11 | C |
| 12 | Op.WorkCtr |
| 13 | Work |
| 14 | Act. work |
| 15 | Un. |
| 16 | Equipment |
| 17 | Equipment descriptn |
| 18 | Functional Loc. |
| 19 | FunctLocDescrip. |

### `from customer/SAP data/Data/IW37N rev1.xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | S |
| 2 | MntPlan |
| 3 | Order |
| 4 | Bsc start |
| 5 | Act.finish |
| 6 | System status |
| 7 | OpAc |
| 8 | Type |
| 9 | Operation short text |
| 10 | C |
| 11 | Op.WorkCtr |
| 12 | Work |
| 13 | Un. |
| 14 | MAT |
| 15 | Description |
| 16 | FunctLocDescrip. |
| 17 | Description of technical object |
| 18 | No. |
| 19 | Act.finish |
| 20 | Pers.No. |

### `from customer/SAP data/Data/IW37N ล่าสุด.xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | S |
| 2 | MntPlan |
| 3 | Order |
| 4 | Type |
| 5 | MAT |
| 6 | Bsc start |
| 7 | Act.finish |
| 8 | System status |
| 9 | OpAc |
| 10 | Operation short text |
| 11 | Description |
| 12 | C |
| 13 | Op.WorkCtr |
| 14 | Work |
| 15 | Act. work |
| 16 | Un. |
| 17 | Equipment descriptn |
| 18 | FunctLocDescrip. |

- `from customer/SAP data/Data/IW37N ล่าสุด.xlsx` — *หัวตารางซ้ำกับไฟล์อื่นในกลุ่มนี้*

### `from customer/SAP data/Data/IW37N.xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | C |
| 2 | Order |
| 3 | Erl. start |
| 4 | System status |
| 5 | OpAc |
| 6 | Type |
| 7 | Operation short text |
| 8 | C |
| 9 | Op.WorkCtr |
| 10 | Work |
| 11 | Un. |
| 12 | MAT |
| 13 | Description |
| 14 | FunctLocDescrip. |
| 15 | Description of technical object |

### `from customer/SAP data/Jul/IW37N 24Jul20.xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | MntPlan |
| 2 | Order |
| 3 | Type |
| 4 | MAT |
| 5 | Bsc start |
| 6 | Act.finish |
| 7 | System status |
| 8 | OpAc |
| 9 | Operation short text |
| 10 | Description |
| 11 | C |
| 12 | Op.WorkCtr |
| 13 | Work |
| 14 | Act. work |
| 15 | Un. |
| 16 | Equipment |
| 17 | Equipment descriptn |
| 18 | Functional loc. |
| 19 | FunctLocDescrip. |

- `from customer/SAP data/Jul/IW37N May-Jun.xls` — *หัวตารางซ้ำกับไฟล์อื่นในกลุ่มนี้*

## PC50

### `from customer/SAP data/Data/PC50 Y2018 Status.xlsx`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | Entered by |
| 2 | Created on |
| 3 | Order |
| 4 | Type |
| 5 | Bsc start |
| 6 | Description |
| 7 | System status |
| 8 | Equipment descriptn |
| 9 | ActTotSum |
| 10 | SumTotPlan |
| 11 | Notifctn |
| 12 | FunctLocDescrip. |
| 13 | Mn.wk.ctr |
| 14 | Cost Ctr |
| 15 | Equipment |

### `from customer/SAP data/Data/PC50 Y2018.xlsx`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | MntPlan |
| 2 | MaintPlan dscrptn |
| 3 | Call No. |
| 4 | PlanDate |
| 5 | Call Status |
| 6 | Functional Location |
| 7 | FunctLocDescrip. |
| 8 | Order |
| 9 | Mn.wk.ctr |
| 10 | Status |

### `from customer/SAP data/Data/PC50.xlsx`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | MntPlan |
| 2 | Maint. item text |
| 3 | MaintPlan dscrptn |
| 4 | PlanDate |
| 5 | Task |
| 6 | Call Status |
| 7 | Functional Location |
| 8 | FunctLocDescrip. |
| 9 | Equipment |
| 10 | Equipment descriptn |
| 11 | Order |
| 12 | Mn.wk.ctr |

## PM / WO supporting

### `from customer/SAP data/Data/PM Database.xlsx`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | MntPlan |
| 2 | MaintPlan dscrptn |
| 3 | Call No. |
| 4 | PlanDate |
| 5 | Call Status |
| 6 | Functional Location |
| 7 | FunctLocDescrip. |
| 8 | Order |
| 9 | Mn.wk.ctr |

- `from customer/SAP data/Data/Proposal.xlsx` — *ไม่พบแถวหัวที่อ่านได้*

### `from customer/SAP data/Data/Status WO.xlsx`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | Entered by |
| 2 | Created on |
| 3 | Order |
| 4 | Type |
| 5 | Bsc start |
| 6 | Description |
| 7 | System status |
| 8 | Equipment descriptn |
| 9 | ActTotSum |
| 10 | SumTotPlan |
| 11 | Notifctn |
| 12 | FunctLocDescrip. |
| 13 | Mn.wk.ctr |
| 14 | Cost Ctr |
| 15 | Equipment |

## Task list

### `from customer/SAP data/Data/Gen task list.xlsx`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | Task list |
| 2 | Mainteanance Plan |
| 3 | Operation |

- `from customer/SAP data/Data/General task list.xlsx` — *หัวตารางซ้ำกับไฟล์อื่นในกลุ่มนี้*

### `from customer/SAP data/Data/Task list หน้าตาในระบบ SAP.xlsx`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | หน้าจอในระบบ SAP |

### `from customer/SAP data/Data/Task list.xlsx`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | S |
| 2 | Type |
| 3 | Group |
| 4 | GrC |
| 5 | Task list description |
| 6 | Line |

## Work center list

### `from customer/SAP data/Data/Work Center list.xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | WorkCntr |
| 2 | Plnt |
| 3 | Cat |
| 4 | Resp. |
| 5 | Description |
| 6 | Strg Loc |

## Other

### `from customer/SAP data/Data/Jul'18.xlsx`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | MntPlan |
| 2 | Maint. item text |
| 3 | FunctLocDescrip. |
| 4 | MaintPlan dscrptn |
| 5 | Call No. |
| 6 | PlanDate |
| 7 | Task |
| 8 | Call Status |
| 9 | Item |
| 10 | Functional Location |
| 11 | Equipment |
| 12 | Description of technical object |
| 13 | Order |
| 14 | MC |

### `from customer/SAP data/Data/Work Order data.xlsx`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | 1 |
| 2 | 2 |
| 3 | 3 |
| 4 | 4 |
| 5 | 5 |
| 6 | 6 |
| 7 | 7 |
| 8 | 8 |
| 9 | 9 |
| 10 | 10 |
| 11 | 11 |
| 12 | 12 |
| 13 | 13 |
| 14 | 14 |
| 15 | 15 |
| 16 | 16 |
| 17 | 17 |
| 18 | 18 |

### `from customer/SAP data/Data/ข้อมูลเวลาตั้งแต่ มกราคม.xls`

| # | Column (as in file) |
|:-:|----------------------|
| 1 | Confirm. |
| 2 | Counter |
| 3 | OrdCat |
| 4 | Order |
| 5 | Postg date |
| 6 | Equipment |
| 7 | WkCtrAct |
| 8 | Act. work |
| 9 | Un. WkAct |
| 10 | PG |
| 11 | PtAc |
| 12 | Created On |
| 13 | Un. |
| 14 | Rem. Work |
| 15 | Act.start |
| 16 | Act.finish |
| 17 | Act. start |
| 18 | Act.finish |
| 19 | CcldConf |
| 20 | WkCtrPln |
| 21 | Sys.Status |
| 22 | Functional Location |
