/**
 * One-shot: verify MariaDB (from .env) + optional HTTP health when backend is running.
 * Usage from backend/: `npx tsx scripts/check-connections.mts`
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

async function checkDb(): Promise<boolean> {
  const host = process.env.DATABASE_HOST ?? '127.0.0.1';
  const port = Number(process.env.DATABASE_PORT ?? 3307);
  const user = process.env.DATABASE_USER ?? 'root';
  const password = process.env.DATABASE_PASSWORD ?? '';
  const database = process.env.DATABASE_NAME ?? 'pepsi_pm';

  console.log(`[DB] ${host}:${port} user=${user} database=${database}`);

  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    connectionLimit: 1,
  });

  try {
    const [rows] = await pool.query<{ ok: number; db: string }[]>(
      'SELECT 1 AS ok, DATABASE() AS db'
    );
    console.log('[DB] OK', rows[0]);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[DB] FAIL', msg);
    if (msg.includes('auth_gssapi_client')) {
      console.error(
        '[DB] mysql2 ยังไม่รองรับ plugin auth_gssapi_client — สร้าง user สำหรับแอปที่ใช้รหัสผ่านแบบมาตรฐาน (เช่น mysql_native_password / ed25519) หรือปรับ default authentication plugin บน MariaDB'
      );
    } else if (msg.includes('ECONNREFUSED')) {
      console.error(
        '[DB] ไม่มี listener บนพอร์ตนี้ — ตรง DATABASE_PORT กับ MariaDB จริง (มัก 3306) และเปิดบริการ'
      );
    }
    return false;
  } finally {
    await pool.end();
  }
}

async function checkHttpHealth(): Promise<void> {
  const port = Number(process.env.PORT ?? 5000);
  const base = `http://127.0.0.1:${port}`;
  for (const path of ['/health', '/api/v1/health'] as const) {
    const url = `${base}${path}`;
    console.log(`[HTTP] GET ${url}`);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      const text = await res.text();
      console.log('[HTTP]', res.status, text.slice(0, 200));
    } catch (e) {
      console.warn(
        '[HTTP] unreachable:',
        e instanceof Error ? e.message : e,
        '(start backend: npm run dev)'
      );
    }
  }
  console.log(
    '[FE] ตั้ง VITE_API_BASE_URL ให้เท่ากับ origin นี้ (ไม่มี /api) — ตัวอย่าง: http://127.0.0.1:5000'
  );
}

async function main(): Promise<void> {
  const okDb = await checkDb();
  await checkHttpHealth();
  if (!okDb) {
    process.exitCode = 1;
  }
}

await main();
