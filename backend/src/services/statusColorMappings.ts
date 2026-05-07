import type { Pool, RowDataPacket } from 'mysql2/promise';

export type StatusTone = 'green' | 'blue' | 'red' | 'default';

export type StatusColorMappingRow = {
  code: string;
  tone: StatusTone;
  label: string | null;
  priority: number;
  isActive: boolean;
};

const FALLBACK_STATUS_TONE: Record<string, StatusTone> = {
  TECO: 'green',
  CLSD: 'green',
  REL: 'blue',
  CNF: 'blue',
  CRTD: 'red',
  PCNF: 'red',
};

const DEFAULT_MAPPINGS: Array<Omit<StatusColorMappingRow, 'isActive'> & { isActive: true }> = [
  { code: 'TECO', tone: 'green', label: 'Technical Complete', priority: 10, isActive: true },
  { code: 'CLSD', tone: 'green', label: 'Closed', priority: 20, isActive: true },
  { code: 'REL', tone: 'blue', label: 'Released', priority: 30, isActive: true },
  { code: 'CNF', tone: 'blue', label: 'Confirmed', priority: 40, isActive: true },
  { code: 'CRTD', tone: 'red', label: 'Created', priority: 50, isActive: true },
  { code: 'PCNF', tone: 'red', label: 'Partially Confirmed', priority: 60, isActive: true },
];

export async function ensureStatusColorMappingsTable(pool: Pool): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS status_color_mappings (
       code VARCHAR(32) NOT NULL,
       tone VARCHAR(16) NOT NULL COMMENT 'green|blue|red|default',
       label VARCHAR(255) NULL,
       priority INT NOT NULL DEFAULT 100,
       is_active TINYINT(1) NOT NULL DEFAULT 1,
       created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
       updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
       PRIMARY KEY (code),
       KEY idx_scm_active_priority (is_active, priority, code)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

export async function seedDefaultStatusColorMappings(pool: Pool): Promise<void> {
  for (const d of DEFAULT_MAPPINGS) {
    await pool.query(
      `INSERT INTO status_color_mappings (code, tone, label, priority, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tone = VALUES(tone),
         label = COALESCE(status_color_mappings.label, VALUES(label)),
         priority = LEAST(status_color_mappings.priority, VALUES(priority)),
         is_active = status_color_mappings.is_active`,
      [d.code, d.tone, d.label, d.priority, d.isActive ? 1 : 0]
    );
  }
}

export async function listStatusColorMappings(pool: Pool): Promise<StatusColorMappingRow[]> {
  await ensureStatusColorMappingsTable(pool);
  await seedDefaultStatusColorMappings(pool);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT code, tone, label, priority, is_active
     FROM status_color_mappings
     ORDER BY priority ASC, code ASC`
  );
  return (rows as Array<{ code: string; tone: string; label: string | null; priority: number; is_active: number }>).map(
    (r) => ({
      code: r.code,
      tone: (r.tone as StatusTone) || 'default',
      label: r.label,
      priority: Number(r.priority),
      isActive: Boolean(Number(r.is_active)),
    })
  );
}

function tokenizeStatusCodes(status: string | null): string[] {
  if (!status) return [];
  return status
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function inferStatusTone(status: string | null, mappings: StatusColorMappingRow[]): StatusTone {
  const mappingByCode: Record<string, StatusTone> = {};
  const activeMappings = mappings.filter((m) => m.isActive).sort((a, b) => a.priority - b.priority);
  for (const m of activeMappings) {
    mappingByCode[m.code.toUpperCase()] = m.tone;
  }
  const sourceMap = Object.keys(mappingByCode).length ? mappingByCode : FALLBACK_STATUS_TONE;
  const codes = tokenizeStatusCodes(status);
  const tones = codes.map((c) => sourceMap[c]).filter((x): x is StatusTone => Boolean(x));
  if (tones.includes('green')) return 'green';
  if (tones.includes('red')) return 'red';
  if (tones.includes('blue')) return 'blue';
  return 'default';
}
