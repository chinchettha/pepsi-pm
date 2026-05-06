/** Best-effort parse for SAP list-export date/time strings */
export function parseSapDateTime(input: string | null | undefined): Date | null {
  if (input === null || input === undefined) return null;
  const t = String(input).trim();
  if (!t) return null;

  const isoTry = new Date(t);
  if (!Number.isNaN(isoTry.getTime())) return isoTry;

  const dmY = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/.exec(t);
  if (dmY) {
    const d = Number(dmY[1]);
    const mo = Number(dmY[2]) - 1;
    const y = Number(dmY[3]);
    const hh = dmY[4] ? Number(dmY[4]) : 0;
    const mm = dmY[5] ? Number(dmY[5]) : 0;
    const ss = dmY[6] ? Number(dmY[6]) : 0;
    const dt = new Date(y, mo, d, hh, mm, ss);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
  if (slash) {
    const dt = new Date(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  return null;
}

export function parseSapDecimal(input: string | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const t = String(input).trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function truncateStr(input: string | null | undefined, maxLen: number): string | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  if (!s) return null;
  return s.length <= maxLen ? s : s.slice(0, maxLen);
}
