import * as XLSX from 'xlsx';

const MAX_ROWS = 100_000;

/** Strip BOM / normalize for header matching */
export function normalizeHeaderKey(s: string): string {
  return s
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function bufferToText(buf: Buffer): string {
  const utf8 = buf.toString('utf8');
  if (!utf8.includes('\uFFFD')) return utf8;
  return buf.toString('latin1');
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function tryParseTsv(buffer: Buffer): Record<string, string>[] | null {
  const text = bufferToText(buffer);
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return null;
  const sample = lines.slice(0, Math.min(8, lines.length));
  const tabbed = sample.filter((l) => (l.match(/\t/g) || []).length >= 2);
  if (tabbed.length < 2) return null;

  const headerCells = lines[0].split('\t').map((c) => c.replace(/^\uFEFF/, '').trim());
  if (headerCells.length < 2) return null;

  const data: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const row: Record<string, string> = {};
    for (let j = 0; j < headerCells.length; j++) {
      const key = headerCells[j];
      if (!key) continue;
      row[key] = (cells[j] ?? '').trim();
    }
    data.push(row);
  }
  return data;
}

/**
 * Reads first sheet via SheetJS, or falls back to tab-separated text (common SAP ".xls" export).
 */
export function parseSpreadsheetToRows(buffer: Buffer): Record<string, string>[] {
  if (!buffer.length) {
    throw new Error('EMPTY_FILE');
  }

  try {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
    const name = wb.SheetNames[0];
    if (name) {
      const sheet = wb.Sheets[name];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        blankrows: false,
        raw: false,
      });
      if (rows.length > 0) {
        return rows.map((r) => {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(r)) {
            out[k] = cellToString(v);
          }
          return out;
        });
      }
    }
  } catch {
    // fall through to TSV
  }

  const tsv = tryParseTsv(buffer);
  if (tsv && tsv.length > 0) return tsv;

  throw new Error('UNREADABLE_FILE');
}

export function assertRowLimit(rows: number): void {
  if (rows > MAX_ROWS) {
    throw new Error(`TOO_MANY_ROWS:${MAX_ROWS}`);
  }
}
