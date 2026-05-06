# คู่มือปฏิบัติ: Tailscale + Docker บนไดรฟ์ D: (ติดตั้งจนถึงใช้งาน)

คู่มือละเอียดสำหรับเครื่อง **dev** (รีโมท) และแนวทาง **deploy** โครงการ Pepsi Cola PM

- ภาพรวม: [INFRASTRUCTURE.md](INFRASTRUCTURE.md)
- เอกสารนี้อยู่ในโฟลเดอร์ `server` — ลิงก์กลับ: [`../docs/INFRASTRUCTURE.md`](../docs/INFRASTRUCTURE.md) และ [`../docs/INSTALL_SOP_TAILSCALE_DOCKER.md`](../docs/INSTALL_SOP_TAILSCALE_DOCKER.md) (สำเนาเนื้อหาเดียวกันใน docs)

---

## สารบัญ

1. [สิ่งที่ต้องเตรียม](#1-สิ่งที่ต้องเตรียม)
2. [เตรียมไดรฟ์ D:](#2-เตรียมไดรฟ์-d)
3. [Docker Desktop + ย้ายข้อมูลไป D:](#3-docker-desktop--ย้ายข้อมูลไป-d)
4. [Tailscale บนเครื่อง Dev](#4-tailscale-บนเครื่อง-dev)
5. [Tailscale บนเครื่องนักพัฒนา](#5-tailscale-บนเครื่องนักพัฒนา)
6. [Firewall + พอร์ต](#6-firewall--พอร์ต)
7. [รันโปรเจกต์ด้วย Docker](#7-รันโปรเจกต์ด้วย-docker)
8. [เครื่อง Deploy (300 GB)](#8-เครื่อง-deploy-300-gb)
9. [Checklist](#9-checklist)
10. [แก้ปัญหา](#10-แก้ปัญหา)

---

## 1. สิ่งที่ต้องเตรียม

| รายการ | รายละเอียด |
|--------|-------------|
| สิทธิ์ Administrator | เครื่อง dev และเครื่องนักพัฒนา (ติดตั้ง Docker / Tailscale / Firewall) |
| พื้นที่ D: | Dev ว่างอย่างน้อย **~50 GB**; Deploy **~300 GB** (รวม buffer อัปเดตภาพและ log) |
| บัญชี Tailscale | แอดมินสร้าง Tailnet + เชิญทีม |
| Windows | 10 รุ่น 22H2 ขึ้นไป หรือ 11 (แนะนำ WSL2 + Docker Desktop) |

---

## 2. เตรียมไดรฟ์ D:

1. เปิด File Explorer ไปที่ **D:**
2. คลิกขวา D: → **Properties** → ดู **Free space**
3. สร้างโฟลเดอร์ตัวอย่าง:
   - Dev: `D:\docker-dev`, `D:\docker-dev\pm-app` (root ของ git clone)
   - Deploy: `D:\docker-deploy`, `D:\docker-deploy\docker-data`, `D:\docker-deploy\backups`

รันตรวจสอบ (ไม่บังคับ):

```powershell
New-Item -ItemType Directory -Force -Path "D:\docker-dev\pm-app" | Out-Null
Get-PSDrive D
```

---

## 3. Docker Desktop + ย้ายข้อมูลไป D:

### 3.1 ดาวน์โหลดและติดตั้ง

1. เปิดเว็บ docs.docker.com ค้นหา **Docker Desktop Windows install**
2. ดาวน์โหลดตัวติดตั้ง Windows → รันติดตั้ง
3. ถ้ามีตัวเลือก ให้ใช้ **WSL 2** เป็น backend
4. **Restart** ตามที่ตัวติดตั้งขอ
5. เปิด **Docker Desktop** จนกว่าจะ **Running**

### 3.2 ย้าย Disk image ไป D:

1. หยุด container ที่รันอยู่ (ถ้ามี)
2. Docker Desktop → **Settings** → **Resources**
3. หา **Disk image location** หรือ **Data root** → **Browse**
4. เลือก เช่น `D:\docker-dev\docker-data` (สร้างโฟลเดอร์ล่วงหน้า)
5. **Apply & Restart**
6. เปิด Settings อีกครั้งเพื่อยืนยันว่าชี้ไป D: แล้ว

### 3.3 ทดสอบ Docker

```powershell
docker version
docker run --rm hello-world
```

---

## 4. Tailscale บนเครื่อง Dev

### 4.1 แอดมิน (ครั้งแรก)

1. ลงชื่อที่เว็บ Tailscale แล้วเข้า **Admin Console**
2. สร้างหรือเลือก **Tailnet** ของโครงการ
3. เปิด **MagicDNS** (เมนู DNS) — แนะนำ
4. ตั้ง **ACL** ว่าใครเข้าพอร์ต dev ได้ — ดูเอกสาร ACL บน tailscale.com
5. **Users** → **Invite users** → ส่งลิงก์ให้ทีม

### 4.2 ติดตั้งบน Windows (เครื่อง dev)

1. หน้า Download ของ Tailscale → เลือก Windows → ติดตั้ง MSI
2. เปิดแอป → **Sign in** เข้า Tailnet เดียวกับองค์กร
3. รอสถานะ **Connected**
4. คลิกไอคอนใน system tray → จด **ชื่อเครื่อง** และ **Tailscale IP** (เช่น 100.x.y.z)

### 4.3 ตั้งชื่อเครื่อง (ไม่บังคับ)

Admin → **Machines** → เลือกเครื่อง dev → เปลี่ยนชื่อเป็นเช่น `pm-dev-01`

### 4.4 ทดสอบ

```powershell
ping pm-dev-01
```

หรือ `ping <ชื่อ>.<tailnet>.ts.net` ตามที่ MagicDNS แสดง

---

## 5. Tailscale บนเครื่องนักพัฒนา

1. ติดตั้ง Tailscale for Windows (ขั้นตอนเดียวกับ 4.2)
2. Sign in เข้า **Tailnet เดียวกัน**
3. รอ **Connected**
4. ทดสอบ: `ping pm-dev-01` (หรือชื่อ/IP จริง)
5. เปิดเบราว์เซอร์ไปที่แอป ตัวอย่าง SRS พอร์ต **3000**:

`http://<ชื่อหรือ-IP-tailscale-ของ-dev>:3000`

(ใช้ `https` เฉพาะเมื่อแอปใน dev เปิด TLS)

---

## 6. Firewall + พอร์ต

1. **Windows Defender Firewall** → **Advanced settings**
2. **Inbound Rules** → **New Rule…**
3. **Port** → **TCP** → พอร์ตแอป (เช่น **3000**)
4. **Allow the connection** → เลือก Domain/Private/Public ตามนโยบาย IT
5. ตั้งชื่อกฎ เช่น `PM App Dev 3000`
6. ตรวจว่าแอปใน Docker **listen ที่ 0.0.0.0** ไม่ใช่แค่ 127.0.0.1

---

## 7. รันโปรเจกต์ด้วย Docker

```powershell
cd D:\docker-dev
git clone <URL-โปรเจกต์> pm-app
cd pm-app
# สร้าง .env จากตัวอย่างใน repo — ห้าม commit ความลับ
docker compose up -d --build
docker compose ps
```

หยุด:

```powershell
docker compose down
```

ตัวอย่าง bind mount ใน compose (dev):

```yaml
services:
  app:
    volumes:
      - D:/docker-dev/pm-app:/app
```

---

## 8. เครื่อง Deploy (300 GB)

1. ตั้ง disk image ที่ `D:\docker-deploy\docker-data`
2. ติดตั้ง Docker Desktop (Windows) หรือ Docker Engine (Linux)
3. ติดตั้ง Tailscale เฉพาะเมื่อต้องการรีโมทจัดการ — มิฉะนั้นใช้ VPN/เครือข่ายภายใน
4. สำรอง volumes ไป `D:\docker-deploy\backups`
5. จำกัดการเปิดพอร์ตสาธารณะ — ใช้ ACL หรือ reverse proxy ภายใน

---

## 9. Checklist

**เครื่อง Dev:** D: พอ (~50G) → โฟลเดอร์พร้อม → Docker + hello-world → disk บน D: → Tailscale → Firewall → แอป listen 0.0.0.0 → ทดสอบจากเครื่องอื่นใน Tailnet

**นักพัฒนา:** Tailnet เดียวกัน → เปิด URL dev ได้

**Deploy:** D: ~300G → Docker บน D: → แผนสำรอง

---

## 10. แก้ปัญหา

| อาการ | แนวทาง |
|--------|--------|
| Connected แต่ ping ไม่ถึง | ตรวจ ACL; เครื่องปลายทางออนไลน์ |
| Ping ได้ แต่เว็บไม่ขึ้น | Firewall, พอร์ตผิด, แอป bind localhost |
| ดิสก์ Docker เต็ม | ย้าย image ไป D:; `docker system prune` ระวังข้อมูล |

---

## อ้างอิง SRS

พอร์ต **3000** และเครือข่าย: **Software Requirement Specification Pepsi Cola PM Project** (บท 2 และภาคผนวก)