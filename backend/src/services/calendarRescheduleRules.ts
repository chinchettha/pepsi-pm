export type CalendarBlockTone = 'green' | 'red' | 'blue';

function parseMeta(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return {};
}

/** ZB / SAP WO present vs estimate slot without WO number (see F02 customer doc). */
export function hasSapWorkOrderNumber(orderNumber: string | null, uiMetaRaw: unknown): boolean {
  const meta = parseMeta(uiMetaRaw);
  if (meta.isEstimate === true || meta.noSapWorkOrder === true || meta.placeholderWorkOrder === true) return false;
  const n = orderNumber?.trim();
  if (!n) return false;
  const lower = n.toLowerCase();
  if (lower === '-' || lower === 'n/a' || lower === 'tbd' || lower === '—') return false;
  return true;
}

/** Call no. / Call ID in metadata — blue blocks without SAP WO may still be schedulable (F02). */
export function hasCallNumber(uiMetaRaw: unknown): boolean {
  const meta = parseMeta(uiMetaRaw);
  const keys = ['callNo', 'call_no', 'callNumber', 'call_number', 'callNoSap', 'sapCallNo', 'call_id', 'callId'];
  for (const k of keys) {
    const v = meta[k];
    if (typeof v === 'string' && v.trim()) return true;
    if (typeof v === 'number' && Number.isFinite(v)) return true;
  }
  return false;
}

function tokenizeStatusCodes(status: string | null): string[] {
  if (!status) return [];
  return status
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Align with docs/product/scheduling/PM_CALENDAR_REQUIREMENTS.md — closed = TECO or CLSD only. */
function isClosedSapSystemStatus(systemStatus: string | null): boolean {
  const codes = tokenizeStatusCodes(systemStatus);
  if (codes.includes('TECO') || codes.includes('CLSD')) return true;
  const head = (systemStatus ?? '').trim().slice(0, 4).toUpperCase();
  return head === 'TECO' || head === 'CLSD';
}

/**
 * Calendar block colors: blue = no WO# yet; green = TECO/CLSD; red = WO exists but not closed.
 */
export function calendarBlockTone(wo: {
  system_status: string | null;
  order_number: string | null;
  ui_metadata_json?: unknown;
}): CalendarBlockTone {
  if (!hasSapWorkOrderNumber(wo.order_number, wo.ui_metadata_json)) return 'blue';
  if (isClosedSapSystemStatus(wo.system_status)) return 'green';
  return 'red';
}

/** Drag/reschedule on calendar: red, or blue only when Call no. exists in metadata. */
export function canRescheduleWorkOrderOnCalendar(wo: {
  system_status: string | null;
  order_number: string | null;
  ui_metadata_json?: unknown;
}): boolean {
  const tone = calendarBlockTone(wo);
  if (tone === 'green') return false;
  if (tone === 'blue' && !hasCallNumber(wo.ui_metadata_json)) return false;
  return true;
}

/** Standard Reason Code required only for red WO; blue may reschedule with dialog but reason is optional (PM_CALENDAR_REQUIREMENTS §6). */
export function rescheduleRequiresReasonCode(tone: CalendarBlockTone, _uiMetaRaw?: unknown): boolean {
  return tone === 'red';
}
