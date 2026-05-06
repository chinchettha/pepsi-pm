# Pepsi PM — Frontend

สแต็กหลัก: **React 18 · Vite 5 · TypeScript (strict) · Ant Design 5 · React Router 6 · TanStack Query**

| หมวด | แพ็กเกจ |
|------|---------|
| กราฟ | **Chart.js** + `react-chartjs-2` (แดชบอร์ด) · **Highcharts** + `highcharts-react-official` (รายงาน KPI) |
| โมชัน | **anime.js** — helper `src/lib/motion.ts` |
| Lint | **ESLint 9** (flat config) + `typescript-eslint` + `eslint-plugin-react-hooks` |

## คำสั่ง

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm run typecheck
npm run lint         # eslint .
npm run lint:fix
```

ตั้ง `VITE_API_BASE_URL` ตาม `frontend/.env.example`

## Route constants & สิทธิ์หน้าแอดมิน

- **`src/config/routes.ts`** — `ROUTES`, `ROUTE_SEGMENTS`, `evidenceWithWorkOrder(...)`
- **`src/config/permissions.ts`** — `PERMISSIONS`, `userHasAnyPermission`
- **`PermissionGate`** — ห่อหน้า `/admin/users`; ถ้าไม่มีสิทธิ์จะ redirect หน้าแรกพร้อม `state.accessDenied` — หน้าแรกแสดง Alert และซ่อนลิงก์ “จัดการผู้ใช้” ถ้าไม่มีสิทธิ์ (`canAccessAdminNav`)

## Prototype IA (route / เมนู)

เมนูครบทั้งหน้าแรก, ใบงาน, **ปฏิทินงาน**, นำเข้า SAP, **ติดตามงาน `/jobs`**, แดชบอร์ด, KPI, รายงาน SAP, หลักฐาน — และ **จัดการผู้ใช้** เมื่อ session มีสิทธิ์ `*` หรือ `admin.users`

บน viewport เล็ก (ต่ำกว่า `lg`) ใช้ **Drawer** + ปุ่มเมนูใน Header — ดู `src/components/layout/AppShellLayout.tsx`
