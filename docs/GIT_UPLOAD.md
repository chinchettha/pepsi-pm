# เอาโปรเจกต์ขึ้น Git (คู่มือละเอียด)

เอกสารนี้สำหรับโฟลเดอร์ราก repo **`2020`** (โมโนปรีโป้ frontend + backend + database + docs)

---

## 0. สถานะที่ตั้งค่าแล้วใน repo นี้ (สำหรับเครื่องที่ clone มาใหม่ไม่ต้องทำซ้ำ)

| รายการ | สถานะ |
|--------|--------|
| `git init` + สาขา **`main`** | ทำแล้ว |
| **Commit แรก** | มีแล้ว — ดู `git log -1` |
| **ตัวตน commit (author)** | ตั้งแบบ **เฉพาะ repo** เป็น placeholder `Your Name` / `you@example.com` — **ควรแก้:** `git config user.name "ชื่อจริง"` และ `git config user.email "อีเมลจริง"` (ไม่ใส่ `--global` ถ้าไม่ต้องการใช้ทั้งเครื่อง) |

**หมายเหตุโครงสร้างโฟลเดอร์:** อาจมีทั้ง **`all docs/`** (สำเนา) และ **`from customer/`** ที่ราก — เนื้อหาซ้อนกันได้; **`all docs.zip`** อยู่ใน commit แรก — ถ้า repo ใหญ่เกินไป ทีมอาจ `git rm --cached "all docs.zip"` แล้วเพิ่ม `*.zip` ใน `.gitignore` และ commit ใหม่

---

## 1. สิ่งที่เตรียมในเครื่องแล้วใน repo

| รายการ | ความหมาย |
|--------|-----------|
| **`.gitignore` ที่ราก** | ไม่ commit `node_modules/`, `dist/`, `.env`, log, `backend/data/attachments/` ฯลฯ — **อย่า commit `backend/.env`** (มีรหัสจริง) |
| **`git init`** | รันที่รากโปรเจกต์แล้ว (ถ้ายังไม่รัน ดู §3) |

---

## 2. สร้างที่ว่างบน Git hosting

เลือกอย่างใดอย่างหนึ่ง:

### GitHub

1. ล็อกอิน [github.com](https://github.com) → **New repository**
2. ตั้งชื่อ repo (เช่น `pepsi-pm`) — **อย่า**ติ๊ก “Add README” ถ้าจะ push จากเครื่องที่มี commit แล้ว (ลด conflict)
3. เลือก **Private** ถ้าเป็นโค้ดองค์กร
4. สร้างแล้ว — จะได้ URL เช่น  
   - HTTPS: `https://github.com/YOUR_ORG/pepsi-pm.git`  
   - SSH: `git@github.com:YOUR_ORG/pepsi-pm.git`

### GitLab / Azure DevOps / Gitea

หลักการเดียวกัน: สร้าง **empty project/repository** แล้วคัดลอก **clone URL** (HTTPS หรือ SSH)

---

## 3. เริ่ม Git ในเครื่อง (ถ้ายังไม่ได้ทำ)

ใน PowerShell ที่โฟลเดอร์โปรเจกต์ (`Desktop\2020`):

```powershell
cd C:\Users\Chinchettha\Desktop\2020
git init
git branch -M main
```

ตั้งชื่อผู้ commit (ครั้งแรกบนเครื่อง):

```powershell
git config user.name "ชื่อของคุณ"
git config user.email "email@example.com"
```

---

## 4. Commit แรก

```powershell
git status
git add .
git status
```

ตรวจว่า **ไม่มี** `backend/.env` ในรายการ staged (ถ้ามี ให้ตรวจ `.gitignore`)

```powershell
git commit -m "chore: initial import Pepsi PM monorepo"
```

---

## 5. ผูก remote และ push

แทนที่ URL ด้วยของ repo จริง:

### HTTPS (ใช้ PAT / token แทนรหัส GitHub)

```powershell
git remote add origin https://github.com/YOUR_ORG/YOUR_REPO.git
git push -u origin main
```

- **GitHub:** ตั้ง [Personal Access Token](https://github.com/settings/tokens) (สิทธิ์ `repo`) แทนรหัสผ่านตอน push  
- **GitLab:** ใช้ Personal Access Token / Deploy Token ตามที่โฮสต์กำหนด

### SSH (แนะนำถ้าตั้ง key แล้ว)

```powershell
git remote add origin git@github.com:YOUR_ORG/YOUR_REPO.git
git push -u origin main
```

ถ้า remote ซ้ำจากการทดลองก่อนหน้า:

```powershell
git remote remove origin
git remote add origin <URL>
```

---

## 6. สาขา (branch) แนะนำ

| สาขา | ใช้เมื่อ |
|------|----------|
| `main` | โค้ดหลักที่ deploy / release |
| `develop` | (ทางเลือก) รวมฟีเจอร์ก่อน merge เข้า `main` |
| `feature/...` | ฟีเจอร์ย่อย |

สร้างและ push สาขาใหม่:

```powershell
git checkout -b feature/f05-confirm-wo
git push -u origin feature/f05-confirm-wo
```

---

## 7. ขนาด repo & ไฟล์ใหญ่

- ถ้ามีไฟล์จำนวนมากหรือ binary ใหญ่ — พิจารณา [Git LFS](https://git-lfs.com/)  
- อย่า commit ไฟล์จาก `node_modules/` (ถูก ignore แล้ว)

---

## 8. Checklist ก่อน push ครั้งแรก

- [ ] ไม่มี `.env`, รหัสผ่าน, key จริงใน commit  
- [ ] มีแต่ `.env.example` เป็นตัวอย่าง  
- [ ] `npm install` ใช้ได้จาก teammate หลัง clone (มี `package-lock.json` ใน repo)  
- [ ] เอกสารอ้างอิง path ใน repo ไม่ผูกเฉพาะเครื่องเดียว (ถ้ามี แก้หรือใช้ตัวแปร)

---

## 9. Clone บนเครื่องอื่น

```powershell
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
# แก้ค่าใน .env แล้ว npm install ใน backend และ frontend
```

---

## ลิงก์ที่เกี่ยวข้องใน repo

- [`database/README.md`](../database/README.md) — migration / DB  
- [`backend/README.md`](../backend/README.md), [`frontend/README.md`](../frontend/README.md) — รัน dev  
