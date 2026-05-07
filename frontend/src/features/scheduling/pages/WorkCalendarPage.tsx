import type { ChangeEvent, ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Calendar,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popover,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { CalendarProps } from 'antd';
import {
  BellOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  ClockCircleOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExclamationCircleFilled,
  FileAddOutlined,
  FlagOutlined,
  PictureOutlined,
  ProfileOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { apiFetch } from '../../../api/client';
import {
  WebpEncodeUnsupportedError,
  convertFileToWebp,
  webpBlobToFile,
} from '../../../lib/images/convertToWebp';
import { ROUTES } from '../../../config/routes';
import { PERMISSIONS, userHasAnyPermission } from '../../../config/permissions';
import { useAuth } from '../../auth/AuthContext';
import { postTaskLogAttachment, postTaskLogDocument } from '../../evidence/api';
import {
  createTaskLog,
  fetchCalendarFilterConfig,
  fetchOrderConfirmations,
  fetchStatusColorMappings,
  fetchTaskSheetBundle,
  fetchWorkOrdersForCalendarRange,
  putCalendarFilterConfig,
  postCloseWorkOrder,
  postRescheduleWorkOrder,
  postSavePlanning,
  type CalendarFilterConfig as ApiCalendarFilterConfig,
  type OrderConfirmationRow,
  type StatusColorMapping,
  type TaskSheetAttachmentRow,
  type WorkOrderRow,
} from '../../work-orders/api';

type CalendarViewMode = 'month' | 'week' | 'day';
type CalendarBlockTone = 'green' | 'red' | 'blue';
type StatusTone = 'green' | 'blue' | 'red' | 'default';
type StatusTheme = { bg: string; border: string; text: string };
type RescheduleFormValues = { reasonCode?: string; comment?: string };
type PlanningFormValues = {
  workCenterPlanned?: string;
  assignedPerson?: string;
  priority?: string;
  plannedStart?: Dayjs;
  plannedFinish?: Dayjs;
};
type CloseWoFormValues = {
  actualWorkers?: string[];
  actualStart?: Dayjs;
  actualFinish?: Dayjs;
  comment?: string;
};
type CalendarFilterConfig = {
  functionalLocations: string[];
  statuses: string[];
  assignedResources: string[];
  workOrderTypes: string[];
  priorities: string[];
};
type CalendarFilterState = {
  functionalLocations: string[];
  statuses: string[];
  assignedResources: string[];
  workOrderTypes: string[];
  priorities: string[];
};

const FALLBACK_SAP_STATUS_TONE: Record<string, StatusTone> = {
  // Green = technically/business closed
  TECO: 'green',
  CLSD: 'green',

  // Blue = released/in progress
  REL: 'blue',
  CNF: 'blue',

  // Red = not ready / waiting action
  CRTD: 'red',
  PCNF: 'red',
};

const TONE_PRIORITY: StatusTone[] = ['green', 'red', 'blue', 'default'];
const RESCHEDULE_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: '01', label: '01 รออะไหล่' },
  { value: '02', label: '02 แรงงานไม่พอ' },
  { value: '03', label: '03 มีการผลิต' },
  { value: '04', label: '04 ไม่สามารถหยุดเครื่องได้' },
  { value: '05', label: '05 อื่นๆ' },
];
type WorkerOption = { value: string; code: string; name: string };
const WORK_CENTER_OPTIONS: WorkerOption[] = [
  { value: 'PR0006 Komol', code: 'PR0006', name: 'Komol' },
  { value: 'PR0007 Sakorn', code: 'PR0007', name: 'Sakorn' },
  { value: 'PR0008 Jakkrit', code: 'PR0008', name: 'Jakkrit' },
  { value: 'PR0009 Aeknarin', code: 'PR0009', name: 'Aeknarin' },
  { value: 'PR0010 Sarnsurn', code: 'PR0010', name: 'Sarnsurn' },
  { value: 'PR0011 Tavatcha', code: 'PR0011', name: 'Tavatcha' },
  { value: 'PR0012 aaa', code: 'PR0012', name: 'aaa' },
  { value: 'PR0013 Ratchan', code: 'PR0013', name: 'Ratchan' },
  { value: 'PR0014 Somnuk', code: 'PR0014', name: 'Somnuk' },
  { value: 'PR0015 Jassadap', code: 'PR0015', name: 'Jassadap' },
  { value: 'PR0016 Yuttakan', code: 'PR0016', name: 'Yuttakan' },
  { value: 'PR0019 Kritsada', code: 'PR0019', name: 'Kritsada' },
];
const STATUS_CATEGORY_OPTIONS = ['Overdue', 'Completed', 'In Progress', 'Upcoming'] as const;

/** PM/CM calendar doc §5 — five filters, left to right. */
const WO_TYPE_FILTER_SEED = ['ZB01', 'ZB02', 'ZB05'] as const;
const PRIORITY_FILTER_SEED = ['High', 'Medium', 'Low', 'Not set'] as const;

const CALENDAR_FILTER_BAR: readonly {
  category: 'functional' | 'status' | 'resource' | 'type' | 'priority';
  title: string;
  titleTh: string;
  emptyPlaceholder: string;
  colSpan: { xs: number; md: number; xl: number };
  stateKey: keyof CalendarFilterState;
}[] = [
  {
    category: 'functional',
    title: 'Functional Location',
    titleTh: 'สถานที่',
    emptyPlaceholder: '- All Locations -',
    colSpan: { xs: 24, md: 12, xl: 5 },
    stateKey: 'functionalLocations',
  },
  {
    category: 'status',
    title: 'Work Order Status',
    titleTh: 'สถานะใบงาน',
    emptyPlaceholder: '- All Statuses -',
    colSpan: { xs: 24, md: 12, xl: 5 },
    stateKey: 'statuses',
  },
  {
    category: 'resource',
    title: 'Assigned Resources',
    titleTh: 'รายชื่อคนที่ถูกจ่ายงาน',
    emptyPlaceholder: '- All resources -',
    colSpan: { xs: 24, md: 12, xl: 5 },
    stateKey: 'assignedResources',
  },
  {
    category: 'type',
    title: 'Work Order Type',
    titleTh: 'ประเภทใบงาน',
    emptyPlaceholder: '- All types -',
    colSpan: { xs: 24, md: 12, xl: 5 },
    stateKey: 'workOrderTypes',
  },
  {
    category: 'priority',
    title: 'Priority',
    titleTh: 'ความเร่งด่วน',
    emptyPlaceholder: '- All priorities -',
    colSpan: { xs: 24, md: 12, xl: 4 },
    stateKey: 'priorities',
  },
];

function formatWorkOrderTypeFilterLabel(raw: string): string {
  const base = raw.trim() || 'Unspecified';
  const u = base.toUpperCase();
  const help: Record<string, string> = {
    ZB01: 'Breakdown',
    ZB02: 'Preventive Maintenance',
    ZB05: 'Corrective Maintenance',
  };
  const h = help[u];
  return h ? `${base} — ${h}` : base;
}

function sortWorkOrderTypeOptions(opts: string[]): string[] {
  const rank = (x: string) => {
    const i = WO_TYPE_FILTER_SEED.indexOf(x.toUpperCase() as (typeof WO_TYPE_FILTER_SEED)[number]);
    return i >= 0 ? i : 999;
  };
  return [...opts].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

function parseUiMeta(w: WorkOrderRow): Record<string, unknown> {
  const raw = w.ui_metadata_json;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (raw as Record<string, unknown>) ?? {};
}

function parseHoursValue(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(String(v).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Available hour ต่อทรัพยากร — ใส่จากการนำเข้าใน `ui_metadata_json` เช่น
 * `availableHoursByResource`, `availableHours`, `resourceAvailableHours`,
 * หรือภายใต้ `planning`: `availableHours`, `availableHoursByPerson`, `resourceAvailability`
 * (คีย์ให้ตรงกับ value ใน Assign resource เช่น `PR0016 Yuttakan` หรือรหัส `PR0016`)
 */
function availabilityHoursMapFromMeta(meta: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  const merge = (obj: unknown) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const key = k.trim();
      if (!key) continue;
      const h = parseHoursValue(v);
      if (h !== null) out[key] = h;
    }
  };
  merge(meta.availableHoursByResource);
  merge(meta.availableHours);
  merge(meta.resourceAvailableHours);
  const planning = meta.planning as Record<string, unknown> | undefined;
  if (planning) {
    merge(planning.availableHours);
    merge(planning.availableHoursByPerson);
    merge(planning.resourceAvailability);
  }
  return out;
}

function formatAvailHoursLabel(h: number): string {
  const rounded = Math.round(h * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function availableHoursForWorker(worker: WorkerOption, map: Record<string, number>): number | null {
  const candidates = [worker.value, worker.code, `${worker.code} ${worker.name}`];
  for (const c of candidates) {
    if (map[c] !== undefined) return map[c];
    const t = c.trim();
    if (t !== c && map[t] !== undefined) return map[t];
  }
  return null;
}

function confirmationRowHours(r: OrderConfirmationRow): number | null {
  const h = r.actual_work_hours;
  if (h === null || h === undefined) return null;
  const n = typeof h === 'string' ? Number(h) : Number(h);
  return Number.isFinite(n) ? n : null;
}

function formatCloseConfirmationLine(r: OrderConfirmationRow): string {
  const s = r.actual_start ? dayjs(r.actual_start) : null;
  const f = r.actual_finish ? dayjs(r.actual_finish) : null;
  const hrs = confirmationRowHours(r);
  const hStr = hrs != null ? `${formatAvailHoursLabel(hrs)} ชม.` : '—';
  if (s?.isValid() && f?.isValid()) {
    return `${s.format('DD-MMM-YY')} ${s.format('HH:mm')}–${f.format('HH:mm')} · ${hStr}`;
  }
  return hStr;
}

function parseActualWorkerLabelsFromWo(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))];
}

function normalizeActualWorkersSelection(labels: string[]): string[] {
  const allowed = new Set(WORK_CENTER_OPTIONS.map((o) => o.value));
  return labels.filter((x) => allowed.has(x));
}

function parseActualLabelFromConfirmationNotes(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  const first = notes.split('\n')[0]?.trim() ?? '';
  const m = first.match(/^Actual:\s*(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

function confirmationNotesUserComment(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  const lines = notes.split('\n');
  if (lines.length <= 1) return null;
  const rest = lines.slice(1).join('\n').trim();
  return rest || null;
}

function confirmationEditComment(notes: string | null | undefined): string {
  const user = confirmationNotesUserComment(notes);
  if (user) return user;
  if (!notes?.trim()) return '';
  if (parseActualLabelFromConfirmationNotes(notes)) return '';
  return notes.trim();
}

/** Display-only Close WO grid (DD.MM.YYYY + 12h like legacy UI). */
function formatCloseDisplayDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = dayjs(iso);
  return d.isValid() ? d.format('DD.MM.YYYY') : '—';
}

function formatCloseDisplayTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = dayjs(iso);
  return d.isValid() ? d.format('h:mm A') : '—';
}

function formatCloseConfirmationPrimaryLine(r: OrderConfirmationRow): string {
  const worker = parseActualLabelFromConfirmationNotes(r.notes);
  const timePart = formatCloseConfirmationLine(r);
  return worker ? `${worker} · ${timePart}` : timePart;
}

function getAssignedResource(w: WorkOrderRow): string {
  const meta = parseUiMeta(w);
  const planning = (meta.planning as Record<string, unknown> | undefined) ?? {};
  const assigned = planning.assignedPerson;
  if (typeof assigned === 'string' && assigned.trim()) return assigned.trim();
  if (w.work_center_planned?.trim()) return w.work_center_planned.trim();
  if (w.work_center_actual?.trim()) return w.work_center_actual.trim();
  return 'Unassigned';
}

function getPriorityLabel(w: WorkOrderRow): string {
  const meta = parseUiMeta(w);
  const planning = (meta.planning as Record<string, unknown> | undefined) ?? {};
  const priority = planning.priority ?? meta.priority;
  if (typeof priority === 'string' && priority.trim()) return priority.trim();
  return 'Not set';
}

function statusCategoryOf(w: WorkOrderRow, mappingByCode: Record<string, StatusTone>): string {
  const tone = inferStatusTone(w.system_status, mappingByCode);
  if (tone === 'green') return 'Completed';
  if (tone === 'blue') return 'In Progress';
  if (tone === 'red') return 'Overdue';
  return 'Upcoming';
}

function statusDotColor(status: string): string {
  if (status === 'Overdue') return '#ef4444';
  if (status === 'Completed') return '#22c55e';
  if (status === 'In Progress') return '#3b82f6';
  return '#f59e0b';
}

function renderStatusIcon(status: string): ReactNode {
  if (status === 'Overdue') return <ExclamationCircleFilled style={{ color: '#ef4444' }} />;
  if (status === 'Completed') return <CheckCircleFilled style={{ color: '#22c55e' }} />;
  if (status === 'In Progress') return <ClockCircleFilled style={{ color: '#3b82f6' }} />;
  return <ClockCircleFilled style={{ color: '#f59e0b' }} />;
}

function renderCategoryIcon(category: 'functional' | 'status' | 'resource' | 'type' | 'priority'): ReactNode {
  const common = {
    width: 18,
    height: 18,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
  } as const;
  if (category === 'functional') {
    return <span style={{ ...common, color: '#1d4ed8', background: '#dbeafe' }}><EnvironmentOutlined /></span>;
  }
  if (category === 'resource') {
    return <span style={{ ...common, color: '#0369a1', background: '#cffafe' }}><TeamOutlined /></span>;
  }
  if (category === 'type') {
    return <span style={{ ...common, color: '#6d28d9', background: '#ede9fe' }}><ProfileOutlined /></span>;
  }
  if (category === 'priority') {
    return <span style={{ ...common, color: '#c2410c', background: '#ffedd5' }}><FlagOutlined /></span>;
  }
  return <span style={{ ...common, color: '#334155', background: '#e2e8f0' }}><ProfileOutlined /></span>;
}

function renderFilterOption(
  category: 'functional' | 'status' | 'resource' | 'type' | 'priority',
  label: string
): ReactNode {
  const text = category === 'type' ? formatWorkOrderTypeFilterLabel(label) : label;
  if (category === 'status') {
    return (
      <Space size={8}>
        {renderCategoryIcon('status')}
        {renderStatusIcon(label)}
        <span style={{ fontWeight: 600 }}>{label}</span>
      </Space>
    );
  }
  return (
    <Space size={8}>
      {renderCategoryIcon(category)}
      <span>{text}</span>
    </Space>
  );
}

function prefixedFilterLabel(
  category: 'functional' | 'status' | 'resource' | 'type' | 'priority',
  label: string
): string {
  if (category === 'type') return formatWorkOrderTypeFilterLabel(label);
  return label;
}

function filterTagStyle(category: 'functional' | 'status' | 'resource' | 'type' | 'priority') {
  if (category === 'functional') return { bg: '#e8f1ff', border: '#9fc5ff', text: '#1d4ed8' };
  if (category === 'status') return { bg: '#eef2ff', border: '#b6c6ff', text: '#4338ca' };
  if (category === 'resource') return { bg: '#ecfeff', border: '#99f6ff', text: '#0369a1' };
  if (category === 'type') return { bg: '#f5f3ff', border: '#d8b4fe', text: '#6d28d9' };
  return { bg: '#fff7ed', border: '#fdba74', text: '#c2410c' };
}

function renderFilterTag(
  category: 'functional' | 'status' | 'resource' | 'type' | 'priority',
  props: { label: ReactNode; closable: boolean; onClose: (e: React.MouseEvent<HTMLElement>) => void }
) {
  const tone = filterTagStyle(category);
  return (
    <Tag
      closable={props.closable}
      onClose={props.onClose}
      style={{
        marginInlineEnd: 6,
        borderRadius: 999,
        background: tone.bg,
        borderColor: tone.border,
        color: tone.text,
        fontWeight: 600,
      }}
    >
      <Space size={6}>
        {renderCategoryIcon(category)}
        {category === 'status' ? (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background:
                typeof props.label === 'string' ? statusDotColor(props.label) : '#64748b',
              display: 'inline-block',
            }}
          />
        ) : null}
        <span>{props.label}</span>
      </Space>
    </Tag>
  );
}

function StyledFilterSelect({
  category,
  placeholder,
  filterTitle,
  value,
  options,
  onChange,
}: {
  category: 'functional' | 'status' | 'resource' | 'type' | 'priority';
  placeholder: string;
  /** Popup header (defaults to placeholder). */
  filterTitle?: string;
  value: string[];
  options: string[];
  onChange: (next: string[]) => void;
}) {
  const headerText = filterTitle ?? placeholder;
  return (
    <Select
      mode="multiple"
      allowClear
      maxTagCount="responsive"
      value={value}
      placeholder={placeholder}
      options={options.map((x) => ({ value: x, label: prefixedFilterLabel(category, x) }))}
      tagRender={(tagProps) => renderFilterTag(category, tagProps)}
      onChange={onChange}
      style={{ width: '100%' }}
      popupRender={() => (
        <div style={{ maxHeight: 280, overflowY: 'auto', padding: 6 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
              padding: '6px 8px',
              borderRadius: 8,
              background: '#f8fbff',
              border: '1px solid #dbe7f7',
            }}
          >
            {renderCategoryIcon(category)}
            {category === 'status' ? (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#64748b',
                  display: 'inline-block',
                }}
              />
            ) : null}
            <span style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>{headerText}</span>
          </div>
          {options.map((opt) => {
            const active = value.includes(opt);
            return (
              <div
                key={opt}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (active) onChange(value.filter((x) => x !== opt));
                  else onChange([...value, opt]);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 8,
                  padding: '6px 8px',
                  cursor: 'pointer',
                  background: active ? 'rgba(59,130,246,0.10)' : 'transparent',
                  border: active ? '1px solid rgba(59,130,246,0.35)' : '1px solid transparent',
                  marginBottom: 4,
                }}
              >
                {renderFilterOption(category, opt)}
                <span style={{ color: active ? '#2563eb' : '#94a3b8', fontSize: 12 }}>{active ? '✓' : ''}</span>
              </div>
            );
          })}
          {options.length === 0 ? (
            <div style={{ padding: '6px 8px', color: '#94a3b8', fontSize: 12 }}>No options</div>
          ) : null}
        </div>
      )}
    />
  );
}

/** Confirmed / actual working time overlapping a calendar day (same overlap rules as planned span). */
function computeOverlapHoursForActualDay(w: WorkOrderRow, day: Dayjs): number {
  const dayStartMs = day.startOf('day').valueOf();
  const dayEndMs = day.endOf('day').valueOf();
  const s = w.actual_start ? dayjs(w.actual_start) : null;
  const f = w.actual_finish ? dayjs(w.actual_finish) : null;

  if (s && f && s.isValid() && f.isValid()) {
    const startMs = s.valueOf();
    const finishMs = f.valueOf();
    if (finishMs <= startMs) return 0;
    const overlapStart = Math.max(startMs, dayStartMs);
    const overlapEnd = Math.min(finishMs, dayEndMs);
    if (overlapEnd <= overlapStart) return 0;
    return (overlapEnd - overlapStart) / 3_600_000;
  }

  const hoursNum = parseHoursValue(w.actual_work_hours);
  if (hoursNum != null && hoursNum > 0) {
    if (s && s.isValid() && s.format('YYYY-MM-DD') === day.format('YYYY-MM-DD')) return hoursNum;
    if (f && f.isValid() && f.format('YYYY-MM-DD') === day.format('YYYY-MM-DD')) return hoursNum;
  }

  if (s && s.isValid() && s.format('YYYY-MM-DD') === day.format('YYYY-MM-DD')) return 1;
  if (f && f.isValid() && f.format('YYYY-MM-DD') === day.format('YYYY-MM-DD')) return 1;
  return 0;
}

/** Work orders shown on a day: planned window overlaps the day, or confirmed (actual) time overlaps the day. */
function itemsForDay(items: WorkOrderRow[], day: Dayjs): WorkOrderRow[] {
  const key = day.format('YYYY-MM-DD');
  const byId = new Map<string, WorkOrderRow>();
  for (const w of items) {
    const s = w.planned_start ? dayjs(w.planned_start).format('YYYY-MM-DD') : null;
    const pf = w.planned_finish ? dayjs(w.planned_finish).format('YYYY-MM-DD') : null;
    let plannedHit = false;
    if (s && pf) plannedHit = key >= s && key <= pf;
    else if (s) plannedHit = key === s;
    else if (pf) plannedHit = key === pf;
    if (plannedHit) byId.set(String(w.id), w);
  }
  for (const w of items) {
    if (computeOverlapHoursForActualDay(w, day) > 0) byId.set(String(w.id), w);
  }
  return [...byId.values()];
}

function rangeByMode(anchorDate: Dayjs, mode: CalendarViewMode): { from: string; to: string } {
  if (mode === 'day') {
    return {
      from: anchorDate.startOf('day').format('YYYY-MM-DD'),
      to: anchorDate.endOf('day').format('YYYY-MM-DD'),
    };
  }
  if (mode === 'week') {
    return {
      from: anchorDate.startOf('week').format('YYYY-MM-DD'),
      to: anchorDate.endOf('week').format('YYYY-MM-DD'),
    };
  }
  return {
    from: anchorDate.startOf('month').format('YYYY-MM-DD'),
    to: anchorDate.endOf('month').format('YYYY-MM-DD'),
  };
}

function shiftAnchor(anchorDate: Dayjs, mode: CalendarViewMode, dir: -1 | 1): Dayjs {
  if (mode === 'day') return anchorDate.add(dir, 'day');
  if (mode === 'week') return anchorDate.add(dir, 'week');
  return anchorDate.add(dir, 'month');
}

function modeLabel(mode: CalendarViewMode): string {
  if (mode === 'day') return 'Day';
  if (mode === 'week') return 'Week';
  return 'Month';
}

function tokenizeStatusCodes(status: string | null): string[] {
  if (!status) return [];
  return status
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** TECO ใน SAP แต่ยังไม่มีการบันทึก Close WO (confirmation ล่าสุดไม่มี confirmed_by_user_id ในระบบนี้) */
function showTecoPendingOperatorConfirmBell(w: WorkOrderRow): boolean {
  if (!tokenizeStatusCodes(w.system_status).includes('TECO')) return false;
  const v = w.latest_confirmation_confirmed_by_user_id;
  if (v === null || v === undefined) return true;
  const n = typeof v === 'string' ? Number(v) : Number(v);
  return !Number.isFinite(n) || n <= 0;
}

function inferStatusTone(status: string | null, mappingByCode: Record<string, StatusTone>): StatusTone {
  const codes = tokenizeStatusCodes(status);
  if (codes.length) {
    const tones = codes
      .map((c) => mappingByCode[c])
      .filter((t): t is StatusTone => Boolean(t));
    for (const p of TONE_PRIORITY) {
      if (tones.includes(p)) return p;
    }
  }
  // fallback for non-standard text statuses from SAP/export
  const s = (status ?? '').toLowerCase();
  if (s.includes('teco') || s.includes('clsd') || s.includes('close') || s.includes('done')) return 'green';
  if (s.includes('crtd') || s.includes('wait') || s.includes('delay') || s.includes('hold')) return 'red';
  if (s.includes('rel') || s.includes('cnf') || s.includes('release') || s.includes('start')) return 'blue';
  return 'default';
}

function hasSapWorkOrderNumber(w: WorkOrderRow): boolean {
  const meta = parseUiMeta(w);
  if (meta.isEstimate === true || meta.noSapWorkOrder === true || meta.placeholderWorkOrder === true) return false;
  const n = w.order_number?.trim();
  if (!n) return false;
  const lower = n.toLowerCase();
  if (lower === '-' || lower === 'n/a' || lower === 'tbd' || lower === '—') return false;
  return true;
}

/** สีปฏิทินตาม `docs/product/scheduling/PM_CALENDAR_REQUIREMENTS.md` — เขียว = TECO/CLSD; แดง = มี WO แต่ยังไม่ปิด; ฟ้า = ยังไม่มีเลข WO */
function isClosedSapSystemStatus(systemStatus: string | null): boolean {
  const codes = tokenizeStatusCodes(systemStatus);
  if (codes.includes('TECO') || codes.includes('CLSD')) return true;
  const head = (systemStatus ?? '').trim().slice(0, 4).toUpperCase();
  return head === 'TECO' || head === 'CLSD';
}

function calendarBlockTone(w: WorkOrderRow): CalendarBlockTone {
  if (!hasSapWorkOrderNumber(w)) return 'blue';
  if (isClosedSapSystemStatus(w.system_status)) return 'green';
  return 'red';
}

/** เลข Call / Call ID ใน ui_metadata_json — สีฟ้าไม่มี SAP WO แต่ยังย้ายแผนได้ถ้ามี Call no. */
function hasCallNumberInMeta(w: WorkOrderRow): boolean {
  const meta = parseUiMeta(w);
  const keys = ['callNo', 'call_no', 'callNumber', 'call_number', 'callNoSap', 'sapCallNo', 'call_id', 'callId'];
  for (const k of keys) {
    const v = meta[k];
    if (typeof v === 'string' && v.trim()) return true;
    if (typeof v === 'number' && Number.isFinite(v)) return true;
  }
  return false;
}

/** ลากย้ายบนปฏิทิน: แดง หรือฟ้าที่มี Call no. — เขียวไม่ได้ — ฟ้าไม่มี Call no. ไม่ได้ */
function canCalendarDragReschedule(w: WorkOrderRow, _mappingByCode: Record<string, StatusTone>): boolean {
  const tone = calendarBlockTone(w);
  if (tone === 'green') return false;
  if (tone === 'blue' && !hasCallNumberInMeta(w)) return false;
  return true;
}

function blockTitle(w: WorkOrderRow): string {
  const meta = parseUiMeta(w);
  const candidates = [
    meta.calendarTitle,
    meta.functionDescription,
    meta.equipmentDescription,
    meta.headerDescription,
    meta.description,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return w.order_number?.trim() || String(w.id);
}

function statusColor(status: string | null, mappingByCode: Record<string, StatusTone>): string {
  const tone = inferStatusTone(status, mappingByCode);
  if (tone === 'green') return 'green';
  if (tone === 'blue') return 'blue';
  if (tone === 'red') return 'red';
  return 'default';
}

function statusBlockThemeFromCalendarTone(tone: CalendarBlockTone): StatusTheme {
  if (tone === 'green') {
    return {
      bg: 'linear-gradient(135deg, #16a34a 0%, #22c55e 65%, #86efac 100%)',
      border: '#0f8a3d',
      text: '#ecfff2',
    };
  }
  if (tone === 'red') {
    return {
      bg: 'linear-gradient(135deg, #dc2626 0%, #ef4444 68%, #fca5a5 100%)',
      border: '#be123c',
      text: '#fff1f1',
    };
  }
  return {
    bg: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 68%, #93c5fd 100%)',
    border: '#1d4ed8',
    text: '#eef5ff',
  };
}

function formatPlannedRange(w: WorkOrderRow): string {
  const start = w.planned_start ? dayjs(w.planned_start).format('DD MMM YYYY HH:mm') : '—';
  const finish = w.planned_finish ? dayjs(w.planned_finish).format('DD MMM YYYY HH:mm') : '—';
  return `${start} - ${finish}`;
}

function computeOverlapHoursForDay(w: WorkOrderRow, day: Dayjs): number {
  const dayStartMs = day.startOf('day').valueOf();
  const dayEndMs = day.endOf('day').valueOf();
  const s = w.planned_start ? dayjs(w.planned_start) : null;
  const f = w.planned_finish ? dayjs(w.planned_finish) : null;

  if (s && f && s.isValid() && f.isValid()) {
    const startMs = s.valueOf();
    const finishMs = f.valueOf();
    if (finishMs <= startMs) return 0;
    const overlapStart = Math.max(startMs, dayStartMs);
    const overlapEnd = Math.min(finishMs, dayEndMs);
    if (overlapEnd <= overlapStart) return 0;
    return (overlapEnd - overlapStart) / 3_600_000;
  }

  // fallback for incomplete time range: count 1 hour on known endpoint day
  if (s && s.isValid() && s.format('YYYY-MM-DD') === day.format('YYYY-MM-DD')) return 1;
  if (f && f.isValid() && f.format('YYYY-MM-DD') === day.format('YYYY-MM-DD')) return 1;
  return 0;
}

/** Day header: "N WO X Hr(s)" — matches legacy calendar summary (planned + confirmed total). */
function formatWoDaySummaryLabel(workOrderCount: number, totalHours: number): string {
  const h = Math.max(0, Math.round(totalHours * 100) / 100);
  const display = Number.isInteger(h) ? String(h) : h.toFixed(1);
  const unit = Math.abs(h - 1) < 1e-9 ? 'Hr' : 'Hrs';
  return `${workOrderCount} WO ${display} ${unit}`;
}

function diffHours(start?: Dayjs, finish?: Dayjs): number {
  if (!start || !finish) return 0;
  const ms = finish.valueOf() - start.valueOf();
  if (ms <= 0) return 0;
  return Math.round((ms / 3_600_000) * 100) / 100;
}

function PopupRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '108px 1fr',
        gap: 8,
        alignItems: 'start',
        fontSize: 11.5,
        lineHeight: 1.3,
      }}
    >
      <Typography.Text style={{ color: '#5f6b7a', fontWeight: 500, fontSize: 11.5 }}>{label}</Typography.Text>
      <Typography.Text style={{ color: '#1b63d0', fontWeight: 700, fontSize: 12 }}>{value || '-'}</Typography.Text>
    </div>
  );
}

/** วัน+เวลาใน Modal ปฏิทิน — เลือกวันที่จากปฏิทินและเวลาจากแผงในป๊อปอัป; ไอคอนนาฬิกา (PM_CALENDAR_REQUIREMENTS §7) */
function CalendarModalDateTimePicker(
  props: Omit<ComponentProps<typeof DatePicker>, 'showTime' | 'format' | 'suffixIcon'>
) {
  return (
    <DatePicker
      showTime={{ format: 'HH:mm' }}
      format="YYYY-MM-DD HH:mm"
      suffixIcon={<ClockCircleOutlined style={{ color: '#1d5aa4' }} />}
      style={{ minWidth: 212, ...props.style }}
      {...props}
    />
  );
}

function WorkOrderHoverCard({
  w,
  compact = false,
  mappingByCode,
  draggableEnabled = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
  onOpenDetails,
}: {
  w: WorkOrderRow;
  compact?: boolean;
  mappingByCode: Record<string, StatusTone>;
  draggableEnabled?: boolean;
  onDragStart?: (workOrderId: string | number) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  onOpenDetails?: (workOrder: WorkOrderRow) => void;
}) {
  const plannedDate = w.planned_start ? dayjs(w.planned_start).format('DD MMM YYYY') : '—';
  const movedTo = w.planned_finish ? dayjs(w.planned_finish).format('DD MMM YYYY') : '-';
  const resource = getAssignedResource(w);
  const functionalLoc = w.equipment_id || '-';
  const status = w.system_status || '—';
  const blockTone = calendarBlockTone(w);
  const theme = statusBlockThemeFromCalendarTone(blockTone);
  const headerTitle = blockTitle(w);
  const showBell = showTecoPendingOperatorConfirmBell(w);
  const compactSubtitle =
    compact && headerTitle.trim() !== (w.order_number?.trim() || '') ? headerTitle : '';

  return (
    <Popover
      trigger="hover"
      placement="rightTop"
      mouseEnterDelay={0.12}
      align={{ offset: [12, 2] }}
      overlayStyle={{ maxWidth: 420 }}
      overlayInnerStyle={{
        borderRadius: 12,
        padding: 0,
        overflow: 'hidden',
        boxShadow: '0 16px 36px rgba(15, 34, 68, 0.18)',
      }}
      content={
        <div style={{ width: 360, background: '#fff' }}>
          {showBell ? (
            <div
              style={{
                padding: '8px 12px',
                background: '#fff7ed',
                borderBottom: '1px solid #fed7aa',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <BellOutlined style={{ color: '#ef4444', fontSize: 16, marginTop: 2 }} />
              <Typography.Text style={{ fontSize: 12, color: '#9a3412', lineHeight: 1.45 }}>
                สถานะ <Typography.Text strong>TECO</Typography.Text> จาก SAP แล้ว — ยังไม่บันทึกเวลาผู้ปฏิบัติงานในระบบนี้
                (แท็บ Close Work Order)
              </Typography.Text>
            </div>
          ) : null}
          <div
            style={{
              background: 'linear-gradient(180deg, #e8f1ff 0%, #f5f9ff 100%)',
              borderBottom: '1px solid #d8e7ff',
              padding: '10px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography.Text
              style={{ fontSize: 16, fontWeight: 700, color: '#205fb8', maxWidth: 240 }}
              ellipsis={{ tooltip: headerTitle }}
            >
              {headerTitle}
            </Typography.Text>
            <Tag
              color={statusColor(w.system_status, mappingByCode)}
              style={{ borderRadius: 999, marginInlineEnd: 0, fontWeight: 600 }}
            >
              {status}
            </Tag>
          </div>
          <div
            style={{
              padding: '10px 12px 8px',
              display: 'grid',
              gap: 6,
            }}
          >
            <PopupRow label="Work Order" value={w.order_number?.trim() || String(w.id)} />
            <PopupRow label="Type" value={w.order_type || '—'} />
            <PopupRow label="Status" value={status} />
            <PopupRow label="Resources" value={resource} />
            <PopupRow label="Function Desc." value={functionalLoc} />
            <PopupRow label="Plan date" value={plannedDate} />
            <PopupRow label="Moved to" value={movedTo} />
            <PopupRow label="Reason" value={w.user_status || '-'} />
          </div>
          <div
            style={{
              marginTop: 2,
              padding: '8px 12px 10px',
              borderTop: '1px solid #edf2fb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fafcff',
            }}
          >
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {formatPlannedRange(w)}
            </Typography.Text>
            <Link to={ROUTES.workOrders.detail(w.id)} style={{ fontWeight: 600 }}>
              ดูรายละเอียด
            </Link>
          </div>
        </div>
      }
    >
      <div
        draggable={draggableEnabled}
        onDragStart={() => onDragStart?.(w.id)}
        onDragEnd={() => onDragEnd?.()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpenDetails?.(w);
        }}
        style={{
          cursor: 'pointer',
          borderRadius: 8,
          padding: compact ? '3px 8px' : '5px 9px',
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          overflow: 'hidden',
          fontWeight: 700,
          fontSize: compact ? 11 : 12,
          color: theme.text,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
          transition: 'transform 120ms ease, box-shadow 120ms ease, filter 120ms ease, opacity 120ms ease',
          transform: isDragging ? 'scale(1.04) rotate(-1deg)' : 'scale(1)',
          filter: isDragging ? 'saturate(1.18) brightness(1.04)' : 'none',
          opacity: isDragging ? 0.78 : 1,
          userSelect: 'none',
        }}
        title={
          compact
            ? `${w.order_number ?? ''} — ${headerTitle} · ดับเบิลคลิกเปิดหน้าต่างรายละเอียด`
            : 'ดับเบิลคลิกเปิดหน้าต่างรายละเอียด'
        }
      >
        <div
          style={{
            display: 'flex',
            alignItems: compact ? 'flex-start' : 'center',
            gap: compact ? 4 : 6,
            width: '100%',
            minWidth: 0,
          }}
        >
          {showBell ? (
            <Tooltip title="TECO ใน SAP แล้ว — ยังไม่บันทึกเวลาผู้ปฏิบัติงานในระบบนี้">
              <BellOutlined
                style={{
                  color: '#ef4444',
                  fontSize: compact ? 11 : 13,
                  flexShrink: 0,
                  marginTop: compact ? 1 : 0,
                }}
              />
            </Tooltip>
          ) : null}
          <div style={{ minWidth: 0, flex: 1 }}>
            {compact ? (
              <>
                <div
                  style={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {w.order_number || '—'}
                </div>
                {compactSubtitle ? (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      opacity: 0.92,
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {compactSubtitle}
                  </div>
                ) : null}
              </>
            ) : (
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {w.order_number}
              </span>
            )}
          </div>
        </div>
      </div>
    </Popover>
  );
}

type GanttInterval = { start: number; end: number; w: WorkOrderRow };

function intervalsForDay(items: WorkOrderRow[], day: Dayjs): GanttInterval[] {
  const dayStart = day.startOf('day');
  const dayEnd = day.endOf('day');
  const out: GanttInterval[] = [];
  for (const w of items) {
    let s = w.planned_start ? dayjs(w.planned_start) : null;
    let f = w.planned_finish ? dayjs(w.planned_finish) : null;
    let startMs: number | undefined;
    let endMs: number | undefined;
    if (s?.isValid() && f?.isValid()) {
      startMs = Math.max(s.valueOf(), dayStart.valueOf());
      endMs = Math.min(f.valueOf(), dayEnd.valueOf());
    } else if (s?.isValid()) {
      startMs = Math.max(s.valueOf(), dayStart.valueOf());
      endMs = Math.min(startMs + 3_600_000, dayEnd.valueOf());
    } else if (f?.isValid()) {
      endMs = Math.min(f.valueOf(), dayEnd.valueOf());
      startMs = Math.max(endMs - 3_600_000, dayStart.valueOf());
    }

    if ((startMs === undefined || endMs === undefined || endMs <= startMs) && computeOverlapHoursForActualDay(w, day) > 0) {
      const as = w.actual_start ? dayjs(w.actual_start) : null;
      const af = w.actual_finish ? dayjs(w.actual_finish) : null;
      if (as?.isValid() && af?.isValid()) {
        startMs = Math.max(as.valueOf(), dayStart.valueOf());
        endMs = Math.min(af.valueOf(), dayEnd.valueOf());
      } else if (as?.isValid()) {
        startMs = Math.max(as.valueOf(), dayStart.valueOf());
        endMs = Math.min(startMs + 3_600_000, dayEnd.valueOf());
      } else if (af?.isValid()) {
        endMs = Math.min(af.valueOf(), dayEnd.valueOf());
        startMs = Math.max(endMs - 3_600_000, dayStart.valueOf());
      }
    }

    if (startMs === undefined || endMs === undefined || endMs <= startMs) continue;
    const startH = (startMs - dayStart.valueOf()) / 3_600_000;
    const endH = (endMs - dayStart.valueOf()) / 3_600_000;
    const minSlice = 1 / 24;
    out.push({ start: startH, end: Math.max(endH, startH + minSlice), w });
  }
  return out;
}

function assignGanttLanes(ivs: GanttInterval[]): Array<GanttInterval & { lane: number }> {
  const sorted = [...ivs].sort((a, b) => a.start - b.start || a.end - b.end);
  const laneEnds: number[] = [];
  const out: Array<GanttInterval & { lane: number }> = [];
  for (const iv of sorted) {
    let lane = 0;
    while (lane < laneEnds.length && laneEnds[lane] > iv.start + 1e-4) lane += 1;
    if (lane === laneEnds.length) laneEnds.push(iv.end);
    else laneEnds[lane] = iv.end;
    out.push({ ...iv, lane });
  }
  return out;
}

const GANTT_ROW_H = 28;

function DayHourGantt({
  day,
  items,
  mappingByCode,
  draggingWorkOrderId,
  onDragStart,
  onDragEnd,
  onOpenDetails,
}: {
  day: Dayjs;
  items: WorkOrderRow[];
  mappingByCode: Record<string, StatusTone>;
  draggingWorkOrderId: string | number | null;
  onDragStart: (workOrderId: string | number) => void;
  onDragEnd: () => void;
  onOpenDetails: (w: WorkOrderRow) => void;
}) {
  const packed = useMemo(() => assignGanttLanes(intervalsForDay(items, day)), [items, day]);
  const lanes = packed.length ? Math.max(...packed.map((p) => p.lane)) + 1 : 1;
  const chartH = Math.max(140, lanes * GANTT_ROW_H + 24);

  return (
    <div
      style={{
        border: '1px solid #dbe7f7',
        borderRadius: 10,
        overflowX: 'auto',
        background: '#fafcff',
      }}
    >
      <div style={{ display: 'flex', minWidth: 640 }}>
        <div style={{ width: 46, flexShrink: 0, position: 'relative', height: chartH }}>
          {[0, 6, 12, 18, 24].map((h) => (
            <Typography.Text
              key={h}
              type="secondary"
              style={{
                position: 'absolute',
                top: `${12 + (h / 24) * (chartH - 28)}px`,
                right: 6,
                fontSize: 10,
                transform: 'translateY(-50%)',
                whiteSpace: 'nowrap',
              }}
            >
              {String(h).padStart(2, '0')}:00
            </Typography.Text>
          ))}
        </div>
        <div style={{ flex: 1, position: 'relative', height: chartH, minWidth: 560 }}>
          <div style={{ display: 'flex', height: chartH, position: 'absolute', inset: 0 }}>
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                style={{
                  flex: 1,
                  borderRight: h === 23 ? undefined : '1px solid #eef2f7',
                  boxSizing: 'border-box',
                }}
              />
            ))}
          </div>
          {packed.map((p) => {
            const leftPct = (p.start / 24) * 100;
            const widthPct = Math.max((100 / 24) * 0.2, ((p.end - p.start) / 24) * 100);
            return (
              <div
                key={`${String(p.w.id)}-${p.lane}-${p.start}`}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  top: 10 + p.lane * GANTT_ROW_H,
                  height: GANTT_ROW_H - 6,
                  minWidth: 4,
                  zIndex: 1,
                }}
              >
                <WorkOrderHoverCard
                  w={p.w}
                  compact
                  mappingByCode={mappingByCode}
                  draggableEnabled={false}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  isDragging={draggingWorkOrderId !== null && String(draggingWorkOrderId) === String(p.w.id)}
                  onOpenDetails={onOpenDetails}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function renderWorkOrderList(
  items: WorkOrderRow[],
  mappingByCode: Record<string, StatusTone>,
  onDragStart?: (workOrderId: string | number) => void,
  onDragEnd?: () => void,
  draggingWorkOrderId?: string | number | null,
  onOpenDetails?: (workOrder: WorkOrderRow) => void
) {
  if (!items.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีใบงานในช่วงนี้" />;
  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      {items.map((w) => (
        <Card key={w.id} size="small">
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <WorkOrderHoverCard
              w={w}
              mappingByCode={mappingByCode}
              draggableEnabled={canCalendarDragReschedule(w, mappingByCode)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={draggingWorkOrderId !== null && String(draggingWorkOrderId) === String(w.id)}
              onOpenDetails={onOpenDetails}
            />
            <Space size={6} wrap>
              <Tag>{w.order_type || '—'}</Tag>
              <Tag color={statusColor(w.system_status, mappingByCode)}>{w.system_status || 'no status'}</Tag>
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Planned: {formatPlannedRange(w)}
            </Typography.Text>
          </Space>
        </Card>
      ))}
    </Space>
  );
}

function TaskSheetAttachmentThumb({
  taskLogId,
  attachment,
}: {
  taskLogId: string;
  attachment: TaskSheetAttachmentRow;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!attachment.mimeType?.startsWith('image/')) return;
    let cancelled = false;
    let objectUrl = '';
    void (async () => {
      const res = await apiFetch(`/api/v1/task-logs/${taskLogId}/attachments/${attachment.id}/file`);
      if (!res.ok || cancelled) return;
      const blob = await res.blob();
      objectUrl = URL.createObjectURL(blob);
      if (!cancelled) setSrc(objectUrl);
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [taskLogId, attachment.id, attachment.mimeType]);

  if (!attachment.mimeType?.startsWith('image/')) return null;
  return src ? (
    <Tooltip title="เปิดรูป">
      <a href={src} target="_blank" rel="noreferrer">
        <img
          alt=""
          src={src}
          style={{
            width: 64,
            height: 64,
            objectFit: 'cover',
            borderRadius: 8,
            border: '1px solid #9fc5ff',
            display: 'block',
          }}
        />
      </a>
    </Tooltip>
  ) : (
    <Spin size="small" />
  );
}

async function downloadTaskSheetAttachment(taskLogId: string, attachmentId: string): Promise<void> {
  const res = await apiFetch(`/api/v1/task-logs/${taskLogId}/attachments/${attachmentId}/file`);
  if (!res.ok) throw new Error('ดาวน์โหลดไม่สำเร็จ');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attachment-${attachmentId}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function WorkCalendarPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<CalendarViewMode>('month');
  const [anchorDate, setAnchorDate] = useState<Dayjs>(() => dayjs());
  const [draggingWorkOrderId, setDraggingWorkOrderId] = useState<string | number | null>(null);
  const [pendingDropDate, setPendingDropDate] = useState<string | null>(null);
  const [pendingDropWorkOrder, setPendingDropWorkOrder] = useState<WorkOrderRow | null>(null);
  const [recentDropDate, setRecentDropDate] = useState<string | null>(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderRow | null>(null);
  const [customizeFilterOpen, setCustomizeFilterOpen] = useState(false);
  const [filters, setFilters] = useState<CalendarFilterState>({
    functionalLocations: [],
    statuses: [],
    assignedResources: [],
    workOrderTypes: [],
    priorities: [],
  });
  const [customFilterConfig, setCustomFilterConfig] = useState<CalendarFilterConfig>({
    functionalLocations: [],
    statuses: [],
    assignedResources: [],
    workOrderTypes: [],
    priorities: [],
  });
  const [rescheduleForm] = Form.useForm<RescheduleFormValues>();
  const [planningForm] = Form.useForm<PlanningFormValues>();
  const [closeWoForm] = Form.useForm<CloseWoFormValues>();

  const pendingRescheduleTone = useMemo(
    () => (pendingDropWorkOrder ? calendarBlockTone(pendingDropWorkOrder) : null),
    [pendingDropWorkOrder]
  );

  const { from, to } = useMemo(() => rangeByMode(anchorDate, mode), [anchorDate, mode]);

  const q = useQuery({
    queryKey: ['work-orders-calendar', mode, from, to],
    queryFn: () => fetchWorkOrdersForCalendarRange(from, to),
  });

  const items = q.data?.items ?? [];
  const colorMapQ = useQuery({
    queryKey: ['status-color-mappings'],
    queryFn: () => fetchStatusColorMappings(),
    staleTime: 5 * 60_000,
  });

  const mappingByCode = useMemo(() => {
    const dynamicRows = (colorMapQ.data?.items ?? [])
      .filter((x: StatusColorMapping) => x.isActive)
      .sort((a, b) => a.priority - b.priority);
    const dynamicMap: Record<string, StatusTone> = {};
    for (const row of dynamicRows) {
      dynamicMap[row.code.toUpperCase()] = row.tone;
    }
    return Object.keys(dynamicMap).length ? dynamicMap : FALLBACK_SAP_STATUS_TONE;
  }, [colorMapQ.data?.items]);
  const canCustomizeFilterMenu = userHasAnyPermission(user, [
    PERMISSIONS.ADMIN_USERS,
    PERMISSIONS.WORK_ORDER_EDIT,
  ]);
  const filterConfigRoleKey: ApiCalendarFilterConfig['role'] = userHasAnyPermission(user, [PERMISSIONS.ADMIN_USERS])
    ? 'admin'
    : 'planner';
  const filterConfigQ = useQuery({
    queryKey: ['calendar-filter-config', filterConfigRoleKey],
    queryFn: () => fetchCalendarFilterConfig(filterConfigRoleKey),
    enabled: canCustomizeFilterMenu,
  });
  const saveFilterConfigMut = useMutation({
    mutationFn: (body: ApiCalendarFilterConfig) => putCalendarFilterConfig(body),
    onSuccess: (data) => {
      const item = data.item;
      setCustomFilterConfig({
        functionalLocations: item.functionalLocations ?? [],
        statuses: item.statuses ?? [],
        assignedResources: item.assignedResources ?? [],
        workOrderTypes: item.workOrderTypes ?? [],
        priorities: item.priorities ?? [],
      });
      message.success('Saved filter menu options');
      setCustomizeFilterOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['calendar-filter-config', filterConfigRoleKey] });
    },
    onError: (e: unknown) => message.error(e instanceof Error ? e.message : 'Save filter config failed'),
  });

  useEffect(() => {
    if (!filterConfigQ.data?.item) return;
    const item = filterConfigQ.data.item;
    setCustomFilterConfig({
      functionalLocations: item.functionalLocations ?? [],
      statuses: item.statuses ?? [],
      assignedResources: item.assignedResources ?? [],
      workOrderTypes: item.workOrderTypes ?? [],
      priorities: item.priorities ?? [],
    });
  }, [filterConfigQ.data?.item]);

  const filterOptions = useMemo(() => {
    const mergeUnique = (base: string[], custom: string[]) =>
      [...new Set([...base, ...custom].map((x) => x.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    const fromData = {
      functionalLocations: [...new Set(items.map((x) => x.equipment_id?.trim() || 'Unspecified'))],
      statuses: [...new Set(items.map((x) => statusCategoryOf(x, mappingByCode)))],
      assignedResources: [...new Set(items.map((x) => getAssignedResource(x)))],
      workOrderTypes: [...new Set(items.map((x) => x.order_type?.trim() || 'Unspecified'))],
      priorities: [...new Set(items.map((x) => getPriorityLabel(x)))],
    };
    return {
      functionalLocations: mergeUnique(fromData.functionalLocations, customFilterConfig.functionalLocations),
      statuses: mergeUnique(
        mergeUnique(fromData.statuses, [...STATUS_CATEGORY_OPTIONS]),
        customFilterConfig.statuses
      ),
      assignedResources: mergeUnique(fromData.assignedResources, customFilterConfig.assignedResources),
      workOrderTypes: sortWorkOrderTypeOptions(
        mergeUnique(
          mergeUnique(fromData.workOrderTypes, [...WO_TYPE_FILTER_SEED]),
          customFilterConfig.workOrderTypes
        )
      ),
      priorities: mergeUnique(
        mergeUnique(fromData.priorities, [...PRIORITY_FILTER_SEED]),
        customFilterConfig.priorities
      ),
    };
  }, [customFilterConfig, items, mappingByCode]);

  const filteredItems = useMemo(() => {
    return items.filter((w) => {
      const functionalLocation = w.equipment_id?.trim() || 'Unspecified';
      const statusCategory = statusCategoryOf(w, mappingByCode);
      const assignedResource = getAssignedResource(w);
      const workOrderType = w.order_type?.trim() || 'Unspecified';
      const priority = getPriorityLabel(w);
      if (filters.functionalLocations.length && !filters.functionalLocations.includes(functionalLocation)) return false;
      if (filters.statuses.length && !filters.statuses.includes(statusCategory)) return false;
      if (filters.assignedResources.length && !filters.assignedResources.includes(assignedResource)) return false;
      if (filters.workOrderTypes.length && !filters.workOrderTypes.includes(workOrderType)) return false;
      if (filters.priorities.length && !filters.priorities.includes(priority)) return false;
      return true;
    });
  }, [filters, items, mappingByCode]);
  const workOrderById = useMemo(() => {
    const m = new Map<string, WorkOrderRow>();
    for (const w of filteredItems) m.set(String(w.id), w);
    return m;
  }, [filteredItems]);

  const rescheduleMut = useMutation({
    mutationFn: (vars: {
      workOrderId: number;
      targetDate: string;
      reasonCode?: string | null;
      comment?: string | null;
    }) =>
      postRescheduleWorkOrder(vars.workOrderId, {
        targetDate: vars.targetDate,
        reasonCode: vars.reasonCode ?? null,
        comment: vars.comment ?? null,
      }),
    onSuccess: () => {
      if (pendingDropDate) {
        setRecentDropDate(pendingDropDate);
        setTimeout(() => setRecentDropDate((curr) => (curr === pendingDropDate ? null : curr)), 650);
      }
      message.success('ย้ายแผนงานแล้ว');
      setPendingDropDate(null);
      setPendingDropWorkOrder(null);
      rescheduleForm.resetFields();
      void queryClient.invalidateQueries({ queryKey: ['work-orders-calendar'] });
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
    onError: (e: unknown) => {
      message.error(e instanceof Error ? e.message : 'ย้ายแผนงานไม่สำเร็จ');
    },
  });
  const planningMut = useMutation({
    mutationFn: (vars: { workOrderId: number; body: Parameters<typeof postSavePlanning>[1] }) =>
      postSavePlanning(vars.workOrderId, vars.body),
    onSuccess: () => {
      message.success('บันทึก Planning แล้ว');
      void queryClient.invalidateQueries({ queryKey: ['work-orders-calendar'] });
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
    onError: (e: unknown) => message.error(e instanceof Error ? e.message : 'บันทึก Planning ไม่สำเร็จ'),
  });
  const closeWoMut = useMutation({
    mutationFn: (vars: { workOrderId: number; body: Parameters<typeof postCloseWorkOrder>[1] }) =>
      postCloseWorkOrder(vars.workOrderId, vars.body),
    onSuccess: (data, vars) => {
      const n = data.item.confirmationRowsCreated ?? 1;
      message.success(n > 1 ? `บันทึก Close WO แล้ว (${n} คน)` : 'บันทึก Close WO แล้ว');
      void queryClient.invalidateQueries({ queryKey: ['work-orders-calendar'] });
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['order-confirmations', vars.workOrderId] });
    },
    onError: (e: unknown) => message.error(e instanceof Error ? e.message : 'บันทึก Close WO ไม่สำเร็จ'),
  });

  const plannedDailyHoursMap = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const w of filteredItems) {
      const s = w.planned_start ? dayjs(w.planned_start) : null;
      const f = w.planned_finish ? dayjs(w.planned_finish) : null;
      let startDay: Dayjs | null = null;
      let endDay: Dayjs | null = null;
      if (s && s.isValid() && f && f.isValid()) {
        startDay = s.startOf('day');
        endDay = f.startOf('day');
      } else if (s && s.isValid()) {
        startDay = s.startOf('day');
        endDay = startDay;
      } else if (f && f.isValid()) {
        startDay = f.startOf('day');
        endDay = startDay;
      }
      if (!startDay || !endDay) continue;

      const span = Math.max(0, endDay.diff(startDay, 'day'));
      for (let i = 0; i <= span; i += 1) {
        const d = startDay.add(i, 'day');
        const key = d.format('YYYY-MM-DD');
        const h = computeOverlapHoursForDay(w, d);
        if (h <= 0) continue;
        acc[key] = (acc[key] ?? 0) + h;
      }
    }
    return acc;
  }, [filteredItems]);

  const confirmedDailyHoursMap = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const w of filteredItems) {
      const s = w.actual_start ? dayjs(w.actual_start) : null;
      const f = w.actual_finish ? dayjs(w.actual_finish) : null;
      let startDay: Dayjs | null = null;
      let endDay: Dayjs | null = null;
      if (s && s.isValid() && f && f.isValid()) {
        startDay = s.startOf('day');
        endDay = f.startOf('day');
      } else if (s && s.isValid()) {
        startDay = s.startOf('day');
        endDay = startDay;
      } else if (f && f.isValid()) {
        startDay = f.startOf('day');
        endDay = startDay;
      } else {
        continue;
      }

      const span = Math.max(0, endDay.diff(startDay, 'day'));
      for (let i = 0; i <= span; i += 1) {
        const d = startDay.add(i, 'day');
        const key = d.format('YYYY-MM-DD');
        const h = computeOverlapHoursForActualDay(w, d);
        if (h <= 0) continue;
        acc[key] = (acc[key] ?? 0) + h;
      }
    }
    return acc;
  }, [filteredItems]);

  /** Planned + confirmed hours per calendar day (requirement 4.2). */
  const dailyHoursMap = useMemo(() => {
    const keys = new Set([...Object.keys(plannedDailyHoursMap), ...Object.keys(confirmedDailyHoursMap)]);
    const out: Record<string, number> = {};
    for (const k of keys) {
      out[k] = (plannedDailyHoursMap[k] ?? 0) + (confirmedDailyHoursMap[k] ?? 0);
    }
    return out;
  }, [plannedDailyHoursMap, confirmedDailyHoursMap]);

  const handleCardDragStart = useCallback(
    (workOrderId: string | number) => {
      const row = workOrderById.get(String(workOrderId));
      if (!row) return;
      if (!canCalendarDragReschedule(row, mappingByCode)) {
        const tone = calendarBlockTone(row);
        if (tone === 'green') {
          message.warning('แผนงานสีเขียว (ปิดใน SAP แล้ว) ไม่สามารถเลื่อนได้');
        } else {
          message.warning(
            'ย้ายแผนได้เฉพาะงานสีแดง หรือสีฟ้าที่มีเลข Call no. ในการนำเข้า — สีฟ้าไม่มีเลข Call (ประมาณการอย่างเดียว) ย้ายไม่ได้'
          );
        }
        return;
      }
      setDraggingWorkOrderId(workOrderId);
    },
    [workOrderById, mappingByCode, message]
  );
  const handleCardDragEnd = useCallback(() => setDraggingWorkOrderId(null), []);

  const openRescheduleFlow = useCallback(
    (targetDay: Dayjs) => {
      if (draggingWorkOrderId === null) return;
      const row = workOrderById.get(String(draggingWorkOrderId));
      if (!row) return;
      if (!canCalendarDragReschedule(row, mappingByCode)) {
        const tone = calendarBlockTone(row);
        if (tone === 'green') {
          message.warning('แผนงานสีเขียว (ปิดใน SAP แล้ว) ไม่สามารถเลื่อนได้');
        } else {
          message.warning(
            'ย้ายแผนได้เฉพาะงานสีแดง หรือสีฟ้าที่มีเลข Call no. — สีฟ้าไม่มีเลข Call ย้ายไม่ได้'
          );
        }
        setDraggingWorkOrderId(null);
        return;
      }
      setPendingDropWorkOrder(row);
      setPendingDropDate(targetDay.format('YYYY-MM-DD'));
      rescheduleForm.setFieldsValue({ reasonCode: undefined, comment: '' });
      setDraggingWorkOrderId(null);
    },
    [draggingWorkOrderId, workOrderById, mappingByCode, message, rescheduleForm]
  );

  const pmTaskList = useMemo(() => {
    const raw = selectedWorkOrder?.ui_metadata_json as
      | { pmTaskList?: string[]; taskList?: string[]; pm_tasks?: string[]; maintenancePlan?: string }
      | undefined;
    const list = raw?.pmTaskList ?? raw?.taskList ?? raw?.pm_tasks ?? [];
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string' && x.trim()) : [];
  }, [selectedWorkOrder]);

  const woDetailId = useMemo(
    () => (selectedWorkOrder ? Number(selectedWorkOrder.id) : 0),
    [selectedWorkOrder]
  );

  const taskSheetQ = useQuery({
    queryKey: ['work-order-task-sheet', woDetailId],
    queryFn: () => fetchTaskSheetBundle(woDetailId),
    enabled: woDetailId > 0,
  });

  const closeConfirmationsQ = useQuery({
    queryKey: ['order-confirmations', woDetailId],
    queryFn: () => fetchOrderConfirmations(woDetailId),
    enabled: woDetailId > 0 && !!selectedWorkOrder,
  });

  const closeConfirmationItems = useMemo(() => {
    const items = closeConfirmationsQ.data?.items ?? [];
    return [...items].sort((a, b) => {
      const ta = a.created_at ? dayjs(a.created_at).valueOf() : 0;
      const tb = b.created_at ? dayjs(b.created_at).valueOf() : 0;
      return tb - ta;
    });
  }, [closeConfirmationsQ.data]);

  const taskSheetImageInputRef = useRef<HTMLInputElement>(null);
  const taskSheetDocInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTaskSheetFile, setUploadingTaskSheetFile] = useState(false);

  const canEditTaskAttachments = userHasAnyPermission(user, [PERMISSIONS.WORK_ORDER_EDIT]);
  const canEditPlanningAndClose = userHasAnyPermission(user, [PERMISSIONS.WORK_ORDER_EDIT]);

  const pmZoneLine = useMemo(() => {
    if (!selectedWorkOrder) return '';
    const meta = parseUiMeta(selectedWorkOrder);
    const keys = [
      'pmTaskDetail',
      'pmZone',
      'pmTaskZone',
      'zoneTitle',
      'maintenanceZone',
      'pmZoneTitle',
      'headerDescription',
    ];
    for (const k of keys) {
      const v = meta[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
  }, [selectedWorkOrder]);

  const planningAvailabilityMap = useMemo(() => {
    if (!selectedWorkOrder) return {} as Record<string, number>;
    return availabilityHoursMapFromMeta(parseUiMeta(selectedWorkOrder));
  }, [selectedWorkOrder]);

  const invalidateTaskSheetBundle = useCallback(() => {
    if (woDetailId > 0) void queryClient.invalidateQueries({ queryKey: ['work-order-task-sheet', woDetailId] });
  }, [queryClient, woDetailId]);

  const ensureTaskSheetLogId = useCallback(async (): Promise<string> => {
    const bundle = await fetchTaskSheetBundle(woDetailId);
    if (bundle.taskLogId) return bundle.taskLogId;
    const created = await createTaskLog(woDetailId, 'task_sheet');
    invalidateTaskSheetBundle();
    return created.id;
  }, [woDetailId, invalidateTaskSheetBundle]);

  const onTaskSheetPickImage = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !canEditTaskAttachments || woDetailId <= 0) return;
      try {
        setUploadingTaskSheetFile(true);
        const tid = await ensureTaskSheetLogId();
        let toSend = file;
        try {
          const blob = await convertFileToWebp(file);
          toSend = webpBlobToFile(blob, file.name);
        } catch (err) {
          if (!(err instanceof WebpEncodeUnsupportedError)) throw err;
        }
        await postTaskLogAttachment(Number(tid), toSend);
        message.success('อัปโหลดรูปแล้ว');
        invalidateTaskSheetBundle();
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ');
      } finally {
        setUploadingTaskSheetFile(false);
      }
    },
    [canEditTaskAttachments, woDetailId, ensureTaskSheetLogId, message, invalidateTaskSheetBundle]
  );

  const onTaskSheetPickDocument = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !canEditTaskAttachments || woDetailId <= 0) return;
      try {
        setUploadingTaskSheetFile(true);
        const tid = await ensureTaskSheetLogId();
        await postTaskLogDocument(Number(tid), file);
        message.success('แนบไฟล์แล้ว');
        invalidateTaskSheetBundle();
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'แนบไฟล์ไม่สำเร็จ');
      } finally {
        setUploadingTaskSheetFile(false);
      }
    },
    [canEditTaskAttachments, woDetailId, ensureTaskSheetLogId, message, invalidateTaskSheetBundle]
  );

  useEffect(() => {
    if (!selectedWorkOrder) return;
    const raw = selectedWorkOrder.ui_metadata_json as
      | { planning?: { priority?: string | null; assignedPerson?: string | null } }
      | undefined;
    planningForm.setFieldsValue({
      workCenterPlanned: selectedWorkOrder.work_center_planned ?? undefined,
      assignedPerson: raw?.planning?.assignedPerson ?? undefined,
      priority: raw?.planning?.priority ?? undefined,
      plannedStart: selectedWorkOrder.planned_start ? dayjs(selectedWorkOrder.planned_start) : undefined,
      plannedFinish: selectedWorkOrder.planned_finish ? dayjs(selectedWorkOrder.planned_finish) : undefined,
    });
    closeWoForm.setFieldsValue({
      actualWorkers: normalizeActualWorkersSelection(
        parseActualWorkerLabelsFromWo(selectedWorkOrder.work_center_actual)
      ),
      actualStart: selectedWorkOrder.actual_start ? dayjs(selectedWorkOrder.actual_start) : undefined,
      actualFinish: selectedWorkOrder.actual_finish ? dayjs(selectedWorkOrder.actual_finish) : undefined,
      comment: '',
    });
  }, [closeWoForm, planningForm, selectedWorkOrder]);

  const planningStart = Form.useWatch('plannedStart', planningForm) as Dayjs | undefined;
  const planningFinish = Form.useWatch('plannedFinish', planningForm) as Dayjs | undefined;
  const planningTotalHours = diffHours(planningStart, planningFinish);
  const closeStart = Form.useWatch('actualStart', closeWoForm) as Dayjs | undefined;
  const closeFinish = Form.useWatch('actualFinish', closeWoForm) as Dayjs | undefined;
  const closeTotalHours = diffHours(closeStart, closeFinish);
  const selectedPlanningAssignee = Form.useWatch('assignedPerson', planningForm) as string | undefined;
  const selectedActualWorkers = Form.useWatch('actualWorkers', closeWoForm) as string[] | undefined;

  const cellRender: CalendarProps<Dayjs>['cellRender'] = useMemo(() => {
    return (current: Dayjs, info) => {
      if (info.type !== 'date') return info.originNode;
      const list = itemsForDay(filteredItems, current);
      return (
        <div
          style={{
            minHeight: 64,
            borderRadius: 6,
            background: (() => {
              const key = current.format('YYYY-MM-DD');
              if (recentDropDate === key) {
                return 'linear-gradient(180deg, rgba(82,196,26,0.20) 0%, rgba(82,196,26,0.05) 100%)';
              }
              if (draggingWorkOrderId !== null) {
                return 'linear-gradient(180deg, rgba(24,144,255,0.05) 0%, rgba(24,144,255,0.01) 100%)';
              }
              return undefined;
            })(),
            outline:
              recentDropDate === current.format('YYYY-MM-DD')
                ? '1px solid rgba(82,196,26,0.55)'
                : draggingWorkOrderId !== null
                  ? '1px dashed rgba(24,144,255,0.35)'
                  : undefined,
            boxShadow:
              recentDropDate === current.format('YYYY-MM-DD')
                ? '0 0 0 2px rgba(82,196,26,0.16) inset'
                : undefined,
            transition: 'background 220ms ease, outline-color 220ms ease, box-shadow 220ms ease',
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            openRescheduleFlow(current);
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 6,
              marginLeft: -2,
              marginRight: -2,
              padding: '5px 8px',
              borderRadius: 6,
              background: 'linear-gradient(180deg, #d9e9fb 0%, #c9dff4 100%)',
              border: '1px solid #98b5d9',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
            }}
          >
            <Typography.Text
              style={{
                fontSize: 11,
                color: '#1e3a5f',
                fontWeight: 700,
                lineHeight: 1.2,
                flex: 1,
                minWidth: 0,
              }}
            >
              {formatWoDaySummaryLabel(list.length, dailyHoursMap[current.format('YYYY-MM-DD')] ?? 0)}
            </Typography.Text>
          </div>
          {/* PM_CALENDAR_REQUIREMENTS.md §4 — Month cell: stack WO blocks vertically; no intra-day time axis on each block */}
          {list.length > 0 ? (
            <ul
              style={{
                margin: '4px 0 0',
                padding: 0,
                listStyle: 'none',
                fontSize: 11,
                lineHeight: 1.35,
                maxHeight: 120,
                overflowY: 'auto',
              }}
            >
              {list.map((w) => (
                <li key={w.id} style={{ marginBottom: 3 }}>
                  <div onClick={(e) => e.stopPropagation()}>
                    <WorkOrderHoverCard
                      w={w}
                      compact
                      mappingByCode={mappingByCode}
                      draggableEnabled={canCalendarDragReschedule(w, mappingByCode)}
                      onDragStart={handleCardDragStart}
                      onDragEnd={handleCardDragEnd}
                      isDragging={draggingWorkOrderId !== null && String(draggingWorkOrderId) === String(w.id)}
                      onOpenDetails={setSelectedWorkOrder}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    };
  }, [
    dailyHoursMap,
    draggingWorkOrderId,
    filteredItems,
    mappingByCode,
    recentDropDate,
    handleCardDragStart,
    handleCardDragEnd,
    openRescheduleFlow,
  ]);

  const title = useMemo(() => {
    if (mode === 'day') return anchorDate.format('D MMMM YYYY');
    if (mode === 'week') {
      const s = anchorDate.startOf('week');
      const e = anchorDate.endOf('week');
      return `${s.format('D MMM')} - ${e.format('D MMM YYYY')}`;
    }
    return anchorDate.format('MMMM YYYY');
  }, [anchorDate, mode]);

  const weekDays = useMemo(() => {
    const start = anchorDate.startOf('week');
    return Array.from({ length: 7 }).map((_, i) => start.add(i, 'day'));
  }, [anchorDate]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="ปฏิทินงาน (F02)">
        <Row gutter={[10, 10]} style={{ marginBottom: 12 }}>
          {CALENDAR_FILTER_BAR.map((field) => (
            <Col key={field.stateKey} xs={field.colSpan.xs} md={field.colSpan.md} xl={field.colSpan.xl}>
              <Typography.Text
                style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: '#1e293b' }}
              >
                {field.title}{' '}
                <Typography.Text type="secondary" style={{ fontSize: 11, fontWeight: 500 }}>
                  ({field.titleTh})
                </Typography.Text>
              </Typography.Text>
              <StyledFilterSelect
                category={field.category}
                placeholder={field.emptyPlaceholder}
                filterTitle={`${field.title} (${field.titleTh})`}
                value={filters[field.stateKey]}
                onChange={(v) => setFilters((prev) => ({ ...prev, [field.stateKey]: v }))}
                options={filterOptions[field.stateKey]}
              />
            </Col>
          ))}
          {canCustomizeFilterMenu ? (
            <Col xs={24}>
              <Space>
                <Button size="small" onClick={() => setCustomizeFilterOpen(true)}>
                  Customize filter menus
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    setFilters({
                      functionalLocations: [],
                      statuses: [],
                      assignedResources: [],
                      workOrderTypes: [],
                      priorities: [],
                    })
                  }
                >
                  Clear filters
                </Button>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Visible work orders: {filteredItems.length} / {items.length}
                </Typography.Text>
              </Space>
            </Col>
          ) : null}
        </Row>
        <Space style={{ marginBottom: 12 }} wrap>
          <Segmented<CalendarViewMode>
            value={mode}
            options={[
              { value: 'month', label: 'Month' },
              { value: 'week', label: 'Week' },
              { value: 'day', label: 'Day' },
            ]}
            onChange={(v) => setMode(v)}
          />
          <Button onClick={() => setAnchorDate((d) => shiftAnchor(d, mode, -1))}>{'<'}</Button>
          <Typography.Title level={4} style={{ margin: 0, minWidth: 220, textAlign: 'center' }}>
            {title}
          </Typography.Title>
          <Button onClick={() => setAnchorDate((d) => shiftAnchor(d, mode, 1))}>{'>'}</Button>
          <Button onClick={() => setAnchorDate(dayjs())}>วันนี้</Button>
          <Tag color="blue">{modeLabel(mode)} view</Tag>
          <Tag color="geekblue">Planned time (hours)</Tag>
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          <strong>สีจาก System Status (SAP):</strong> เขียว = TECO / CLSD (ปิดงานแล้ว); แดง = มีเลข WO แต่ยังไม่ปิด (เช่น REL,
          CRTD); ฟ้า = แผนที่ยังไม่มีเลข Work Order — สเปกอ้างอิง <code>docs/product/scheduling/PM_CALENDAR_REQUIREMENTS.md</code>
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary" style={{ marginTop: -8, marginBottom: 8 }}>
          <strong>รายละเอียดแผนงาน:</strong> <strong>ดับเบิลคลิก</strong> ที่แท่งงานเพื่อเปิดหน้าต่างป๊อปอัป — hover เพื่อดูสรุปใน Popover
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary">
          ปฏิทินสำหรับวางแผนงาน <strong>PM/CM ประเภท ZB01, ZB02, ZB05</strong> — ดูได้แบบ Month / Week / Day; โหลดใบงานที่ช่วง{' '}
          <strong>planned start / finish</strong> ทับซ้อนกับช่วงที่เลือก ({modeLabel(mode)}) จาก{' '}
          <code>GET /api/v1/work-orders?from=&amp;to=</code>
          {mode === 'month'
            ? ' — มุมมองเดือนแสดงหลายแผนในแต่ละวันเป็นรายการเรียงลงมา โดยไม่แสดงช่วงเวลา (นาที/ชั่วโมง) บนตัวบล็อก'
            : null}
          {mode === 'week' ? ' — มุมมองสัปดาห์แสดงรายการพร้อมสรุป Planned' : null}
          {mode === 'day' ? ' — มุมมองวันใช้แกนชั่วโมง (Gantt) ตามช่วงเวลา' : null}
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
          Drag & Drop (Week / Month): ย้ายได้เฉพาะสี<strong>แดง</strong> และสี<strong>ฟ้า</strong>ที่มีเลข{' '}
          <Typography.Text strong>Call no.</Typography.Text> ในการนำเข้า (<code>ui_metadata_json</code>) — สีฟ้าไม่มีเลข Call
          (ประมาณการอย่างเดียว) ย้ายไม่ได้ — ก่อน Drop มีหน้าต่าง Reason / Comment: สี<strong>แดง</strong> ต้องเลือก Reason Code
          จึง Save ได้ · สี<strong>ฟ้า</strong> Reason Code ไม่บังคับ — สี<strong>เขียว</strong> ไม่สามารถย้าย
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary" style={{ marginTop: -10 }}>
          <BellOutlined style={{ color: '#ef4444', marginRight: 6 }} />
          สัญลักษณ์ระฆังสีแดง = สถานะ <Typography.Text strong>TECO</Typography.Text> จาก SAP แล้ว แต่ยังไม่บันทึกเวลาผู้ปฏิบัติงานในระบบนี้ (แท็บ Close Work Order)
        </Typography.Paragraph>
        {q.isError ? (
          <Alert type="error" message={(q.error as Error).message} style={{ marginBottom: 16 }} />
        ) : null}
        {q.data?.truncated ? (
          <Alert
            type="warning"
            showIcon
            message="โหลดครบ 500 ใบแรกในเดือนนี้ — ถ้าข้อมูลเยอะ ให้ใช้รายการใบงานหรือกรองเพิ่มในรอบถัดไป"
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Spin spinning={q.isLoading}>
          {mode === 'month' ? (
            <Calendar
              value={anchorDate}
              onPanelChange={(d) => setAnchorDate(d)}
              onChange={(d) => setAnchorDate(d)}
              cellRender={cellRender}
              fullscreen
            />
          ) : null}

          {mode === 'week' ? (
            <Row gutter={[12, 12]}>
              {weekDays.map((d) => {
                const dayItems = itemsForDay(filteredItems, d);
                return (
                  <Col key={d.format('YYYY-MM-DD')} xs={24} md={12} xl={8}>
                    <Card
                      size="small"
                      title={d.format('ddd D MMM')}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        openRescheduleFlow(d);
                      }}
                    >
                      <Typography.Text type="secondary" style={{ fontSize: 11, fontWeight: 700 }}>
                        {formatWoDaySummaryLabel(dayItems.length, dailyHoursMap[d.format('YYYY-MM-DD')] ?? 0)}
                      </Typography.Text>
                      {renderWorkOrderList(
                        dayItems,
                        mappingByCode,
                        handleCardDragStart,
                        handleCardDragEnd,
                        draggingWorkOrderId,
                        setSelectedWorkOrder
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>
          ) : null}

          {mode === 'day' ? (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                {formatWoDaySummaryLabel(
                  itemsForDay(filteredItems, anchorDate).length,
                  dailyHoursMap[anchorDate.format('YYYY-MM-DD')] ?? 0
                )}{' '}
                (แผน + ยืนยันแล้ว)
              </Typography.Text>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                มุมมอง Day แสดงแผนเป็นช่วงชั่วโมง (Gantt) — hover แท่งงานเห็นสรุป; ดับเบิลคลิกเปิดหน้าต่างรายละเอียด (เหมือน Week/Month)
              </Typography.Paragraph>
              <Typography.Paragraph type="secondary" style={{ marginTop: -4 }}>
                การลากย้ายไป<strong>วันอื่น</strong>ให้ใช้มุมมอง Week หรือ Month (ลากจากบล็อกไปวางบนวันปลายทาง)
              </Typography.Paragraph>
              <DayHourGantt
                day={anchorDate}
                items={itemsForDay(filteredItems, anchorDate)}
                mappingByCode={mappingByCode}
                draggingWorkOrderId={draggingWorkOrderId}
                onDragStart={handleCardDragStart}
                onDragEnd={handleCardDragEnd}
                onOpenDetails={setSelectedWorkOrder}
              />
            </Space>
          ) : null}
        </Spin>
      </Card>

      <Modal
        title={`Customize Filter Menus (${filterConfigRoleKey})`}
        open={customizeFilterOpen}
        onCancel={() => setCustomizeFilterOpen(false)}
        onOk={() =>
          saveFilterConfigMut.mutate({
            role: filterConfigRoleKey,
            functionalLocations: customFilterConfig.functionalLocations,
            statuses: customFilterConfig.statuses,
            assignedResources: customFilterConfig.assignedResources,
            workOrderTypes: customFilterConfig.workOrderTypes,
            priorities: customFilterConfig.priorities,
          })
        }
        confirmLoading={saveFilterConfigMut.isPending}
        okText="Save"
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Last updated:{' '}
          <Typography.Text>
            {filterConfigQ.data?.item?.updatedAt
              ? dayjs(filterConfigQ.data.item.updatedAt).format('YYYY-MM-DD HH:mm:ss')
              : '-'}
          </Typography.Text>{' '}
          by <Typography.Text>{filterConfigQ.data?.item?.updatedBy ?? '-'}</Typography.Text>
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary">
          Add custom options for admin/planner dropdown menus (role-specific).
        </Typography.Paragraph>
        <Form layout="vertical">
          {CALENDAR_FILTER_BAR.map((field) => (
            <Form.Item key={field.stateKey} label={`${field.title} (${field.titleTh})`}>
              <Select
                mode="tags"
                value={customFilterConfig[field.stateKey]}
                onChange={(v) =>
                  setCustomFilterConfig((prev) => ({ ...prev, [field.stateKey]: v }))
                }
                placeholder="Type and press Enter"
              />
            </Form.Item>
          ))}
        </Form>
      </Modal>

      <Modal
        title="ย้ายแผนงาน"
        open={!!pendingDropWorkOrder && !!pendingDropDate}
        onCancel={() => {
          setPendingDropDate(null);
          setPendingDropWorkOrder(null);
        }}
        confirmLoading={rescheduleMut.isPending}
        onOk={() => rescheduleForm.submit()}
        okText="Save"
      >
        {pendingDropWorkOrder && pendingDropDate ? (
          <Form<RescheduleFormValues>
            form={rescheduleForm}
            layout="vertical"
            onFinish={(values) => {
              if (pendingRescheduleTone === 'red' && !values.reasonCode) {
                message.error('แผนงานสีแดง — ต้องเลือก Reason Code จากรายการมาตรฐานก่อน Save');
                return;
              }
              if (values.reasonCode === '05' && (!values.comment || values.comment.trim().length < 10)) {
                message.error('เลือก "05 อื่นๆ" ต้องกรอก Comment อย่างน้อย 10 ตัวอักษร');
                return;
              }
              rescheduleMut.mutate({
                workOrderId: Number(pendingDropWorkOrder.id),
                targetDate: pendingDropDate,
                reasonCode: values.reasonCode?.trim() || null,
                comment: values.comment?.trim() || undefined,
              });
            }}
          >
            <Typography.Paragraph>
              Work Order: <Typography.Text strong>{pendingDropWorkOrder.order_number}</Typography.Text>
              <br />
              Move to: <Typography.Text strong>{pendingDropDate}</Typography.Text>
            </Typography.Paragraph>
            {pendingRescheduleTone === 'red' ? (
              <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
                แผนงานสี<strong>แดง</strong> — ต้องเลือก Reason Code จึงจะ Save ได้
              </Typography.Paragraph>
            ) : (
              <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
                แผนงานสี<strong>ฟ้า</strong> — Reason Code ไม่บังคับ (เลือกหรือเว้นว่างได้)
              </Typography.Paragraph>
            )}
            <Form.Item
              label="Reason Code"
              name="reasonCode"
              extra={
                pendingRescheduleTone === 'red'
                  ? 'มาตรฐาน 01–05 — บังคับสำหรับแผนงานสีแดง'
                  : 'มาตรฐาน 01–05 — ไม่บังคับสำหรับแผนงานสีฟ้า (เลือกได้ถ้าต้องการระบุสาเหตุ)'
              }
              rules={pendingRescheduleTone === 'red' ? [{ required: true, message: 'ต้องเลือก Reason Code' }] : []}
            >
              <Select allowClear options={RESCHEDULE_REASON_OPTIONS} />
            </Form.Item>
            <Form.Item
              label="Comment"
              name="comment"
              rules={[
                {
                  validator: async (_, value) => {
                    const reason = rescheduleForm.getFieldValue('reasonCode');
                    if (reason === '05' && (!value || String(value).trim().length < 10)) {
                      throw new Error('เลือก "05 อื่นๆ" ต้องกรอกอย่างน้อย 10 ตัวอักษร');
                    }
                  },
                },
              ]}
            >
              <Input.TextArea rows={3} placeholder="หมายเหตุเพิ่มเติม (optional)" maxLength={500} />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>

      <Modal
        title="รายละเอียดงาน"
        open={!!selectedWorkOrder}
        onCancel={() => setSelectedWorkOrder(null)}
        footer={null}
        width={860}
        destroyOnHidden
        styles={{ body: { padding: 14 } }}
      >
        {selectedWorkOrder ? (
          <div className="legacy-wo-skin">
            <style>
              {`
                .legacy-wo-skin .ant-tabs-nav {
                  margin-bottom: 6px;
                }
                .legacy-wo-skin .ant-tabs-tab {
                  margin: 0 4px 0 0 !important;
                  padding: 0 !important;
                  border: 0 !important;
                  background: transparent !important;
                }
                .legacy-wo-skin .ant-tabs-tab-btn {
                  min-width: 116px;
                  min-height: 40px;
                  padding: 9px 20px 8px;
                  border-radius: 8px 8px 0 0;
                  border: 1px solid #98b5d9;
                  border-bottom: 0;
                  background: linear-gradient(180deg, #fbfdff 0%, #d9e9fb 54%, #c9ddf4 100%);
                  box-shadow: inset 0 1px 0 rgba(255,255,255,0.96), inset 0 -1px 0 rgba(149,176,205,0.35), 0 1px 0 rgba(112,148,187,0.2);
                  color: #2f567f;
                  font-weight: 700;
                  font-size: 13px;
                  line-height: 1.08;
                  letter-spacing: 0.1px;
                }
                .legacy-wo-skin .ant-tabs-tab-active .ant-tabs-tab-btn {
                  background: linear-gradient(180deg, #c9ddf8 0%, #b5d0ef 52%, #a6c3e7 100%);
                  color: #1f3f66;
                  border-color: #7ea6d6;
                  box-shadow: inset 0 1px 0 rgba(255,255,255,0.78), inset 0 -1px 0 rgba(98,133,172,0.45), 0 1px 0 rgba(83,126,171,0.28);
                }
                .legacy-wo-skin .ant-form-item-label > label {
                  font-size: 13px;
                  line-height: 1.25;
                }
                .legacy-wo-skin .ant-typography {
                  line-height: 1.3;
                }
                .legacy-wo-skin .ant-tabs-ink-bar {
                  display: none !important;
                }
              `}
            </style>
          <Tabs
            items={[
              {
                key: 'task',
                label: 'Task',
                children: (
                  <div
                    style={{
                      position: 'relative',
                      background: '#cfe3ff',
                      borderRadius: 6,
                      padding: '16px 16px 52px',
                      minHeight: 220,
                    }}
                  >
                    <Typography.Paragraph style={{ marginBottom: 6 }}>
                      <Typography.Text strong>Maintenance Plan :</Typography.Text>{' '}
                      {selectedWorkOrder.order_number}
                    </Typography.Paragraph>
                    <Typography.Paragraph style={{ marginBottom: 4 }}>
                      <Typography.Text strong>PM Task detail :</Typography.Text>
                    </Typography.Paragraph>
                    <Typography.Paragraph type="secondary" style={{ marginTop: -6, marginBottom: 8, fontSize: 11 }}>
                      อ้างอิงชีต Excel <Typography.Text strong>PM Task List</Typography.Text> — เก็บใน{' '}
                      <Typography.Text code>ui_metadata_json</Typography.Text> ตามสเปก{' '}
                      <Typography.Text code>docs/product/scheduling/PM_TASK_LIST_SHEET_REFERENCE.md</Typography.Text>
                    </Typography.Paragraph>
                    {pmZoneLine ? (
                      <Typography.Paragraph style={{ marginBottom: 10, marginTop: 0 }}>
                        <Typography.Text strong>{pmZoneLine}</Typography.Text>
                      </Typography.Paragraph>
                    ) : null}
                    {pmTaskList.length ? (
                      <ol style={{ margin: '0 0 12px', paddingLeft: 20 }}>
                        {pmTaskList.map((t, idx) => (
                          <li key={`${idx}-${t}`}>
                            <Typography.Text>{t}</Typography.Text>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <Space direction="vertical" size={2} style={{ marginBottom: 12 }}>
                        <Typography.Text>
                          {selectedWorkOrder.order_type || '-'} - {selectedWorkOrder.order_number}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          ยังไม่มีรายการจากชีต PM Task List ในการนำเข้า — ตั้งค่า `pmTaskList` / `taskList` / `pm_tasks` และบรรทัดหัวข้อ
                          `pmTaskDetail` / `pmZone` ใน <Typography.Text code>ui_metadata_json</Typography.Text>
                        </Typography.Text>
                      </Space>
                    )}

                    <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                      รูป / ไฟล์แนบ (Tab Task)
                    </Typography.Text>
                    <Spin spinning={taskSheetQ.isLoading}>
                      {taskSheetQ.data?.taskLogId ? (
                        <Space wrap size={[10, 10]} style={{ marginBottom: 8 }}>
                          {(taskSheetQ.data.attachments ?? []).map((att) =>
                            att.mimeType?.startsWith('image/') ? (
                              <TaskSheetAttachmentThumb
                                key={att.id}
                                taskLogId={taskSheetQ.data!.taskLogId!}
                                attachment={att}
                              />
                            ) : (
                              <Tag
                                key={att.id}
                                color="blue"
                                style={{ cursor: 'pointer', padding: '6px 10px' }}
                                onClick={() => {
                                  void downloadTaskSheetAttachment(taskSheetQ.data!.taskLogId!, att.id).catch((err) =>
                                    message.error(err instanceof Error ? err.message : 'ดาวน์โหลดไม่สำเร็จ')
                                  );
                                }}
                              >
                                <FileAddOutlined /> {att.mimeType ?? 'ไฟล์'} #{att.id}
                              </Tag>
                            )
                          )}
                        </Space>
                      ) : (
                        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                          {canEditTaskAttachments
                            ? 'ยังไม่มีไฟล์ — ใช้ปุ่มมุมขวาล่างเพื่อแนบรูปหรือเอกสาร'
                            : 'ยังไม่มีไฟล์แนบ'}
                        </Typography.Paragraph>
                      )}
                    </Spin>

                    <input
                      ref={taskSheetImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: 'none' }}
                      onChange={onTaskSheetPickImage}
                    />
                    <input
                      ref={taskSheetDocInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      style={{ display: 'none' }}
                      onChange={onTaskSheetPickDocument}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: 14,
                        bottom: 12,
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Tooltip title="แนบรูป (แปลง WebP ตามนโยบายระบบ)">
                        <Button
                          type="default"
                          shape="circle"
                          icon={<PictureOutlined />}
                          disabled={!canEditTaskAttachments || uploadingTaskSheetFile}
                          loading={uploadingTaskSheetFile}
                          onClick={() => taskSheetImageInputRef.current?.click()}
                        />
                      </Tooltip>
                      <Tooltip title="แนบไฟล์ (PDF, Word, Excel)">
                        <Button
                          type="default"
                          shape="circle"
                          icon={<FileAddOutlined />}
                          disabled={!canEditTaskAttachments || uploadingTaskSheetFile}
                          loading={uploadingTaskSheetFile}
                          onClick={() => taskSheetDocInputRef.current?.click()}
                        />
                      </Tooltip>
                    </div>
                  </div>
                ),
              },
              {
                key: 'planning',
                label: 'Planning',
                children: (
                  <div
                    style={{
                      background: 'linear-gradient(180deg, #d9e9ff 0%, #c9dff9 100%)',
                      borderRadius: 8,
                      padding: 16,
                      border: '1px solid #b0cdef',
                    }}
                  >
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 12 }}>
                      เลือก <Typography.Text strong>ผู้ปฏิบัติงาน / Plan work center</Typography.Text> และกำหนด{' '}
                      <Typography.Text strong>เวลาทำงานตามแผน</Typography.Text> (เริ่ม–สิ้นสุด) แล้วกด Save — ข้อมูลบันทึกเป็น{' '}
                      <Typography.Text code>planned_start</Typography.Text> / <Typography.Text code>planned_finish</Typography.Text>
                    </Typography.Paragraph>
                    <Form<PlanningFormValues>
                      form={planningForm}
                      layout="vertical"
                      disabled={!canEditPlanningAndClose}
                      onFinish={(values) => {
                        if (!values.plannedStart || !values.plannedFinish) {
                          message.error('กรุณาเลือกเวลาเริ่มและเวลาสิ้นสุด');
                          return;
                        }
                        planningMut.mutate({
                          workOrderId: Number(selectedWorkOrder.id),
                          body: {
                            workCenterPlanned: values.workCenterPlanned || null,
                            assignedPerson: values.assignedPerson || null,
                            priority: values.priority || null,
                            plannedStart: values.plannedStart.toISOString(),
                            plannedFinish: values.plannedFinish.toISOString(),
                          },
                        });
                      }}
                    >
                      {!canEditPlanningAndClose ? (
                        <Alert
                          type="info"
                          showIcon
                          style={{ marginBottom: 12 }}
                          message="แสดงผลอย่างเดียว"
                          description="คุณไม่มีสิทธิ์แก้ไข Planning — ดูข้อมูลได้เท่านั้น"
                        />
                      ) : null}
                      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                        มอบหมายงาน
                      </Typography.Text>
                      <Form.Item name="assignedPerson" hidden>
                        <Input />
                      </Form.Item>
                      <Form.Item label="Assign resource" name="workCenterPlanned">
                        <Select
                          allowClear
                          options={WORK_CENTER_OPTIONS.map((x) => ({ value: x.value, label: x.value }))}
                          placeholder="เลือกทรัพยากร / Plan Work center"
                        />
                      </Form.Item>
                      <div
                        style={{
                          background: 'rgba(255,255,255,0.72)',
                          border: '1px solid #adc2de',
                          borderRadius: 6,
                          padding: 9,
                          marginBottom: 10,
                        }}
                      >
                        <Typography.Text style={{ fontSize: 12, color: '#355a8a', fontWeight: 700 }}>
                          เลือกผู้ปฏิบัติงาน (Assigned Worker)
                        </Typography.Text>
                        <Typography.Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 11 }}>
                          Available hour แสดงต่อช่องด้านล่าง — ใส่จากการนำเข้าใน{' '}
                          <Typography.Text code>ui_metadata_json</Typography.Text> เช่น{' '}
                          <Typography.Text code>availableHoursByResource</Typography.Text>,{' '}
                          <Typography.Text code>planning.availableHoursByPerson</Typography.Text> (คีย์ตรงกับรหัสหรือข้อความใน
                          Assign resource)
                        </Typography.Paragraph>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                            gap: 6,
                            marginTop: 8,
                          }}
                        >
                          {WORK_CENTER_OPTIONS.map((worker) => {
                            const active = selectedPlanningAssignee === worker.value;
                            const avail = availableHoursForWorker(worker, planningAvailabilityMap);
                            const availLabel =
                              avail != null ? `${formatAvailHoursLabel(avail)} ชม.` : 'ไม่มีข้อมูลชม.ว่าง';
                            return (
                              <Tooltip key={worker.value} title={`Available hour: ${availLabel}`}>
                                <Button
                                  type="default"
                                  disabled={!canEditPlanningAndClose}
                                  onClick={() => planningForm.setFieldValue('assignedPerson', worker.value)}
                                  style={{
                                    minHeight: 62,
                                    height: 'auto',
                                    padding: '6px 8px',
                                    borderRadius: 2,
                                    border: active ? '1px solid #6a93c3' : '1px solid #b9c1cb',
                                    background: active
                                      ? 'linear-gradient(180deg, #deeeff 0%, #bfd8f3 56%, #afcaea 100%)'
                                      : 'linear-gradient(180deg, #fefefe 0%, #eaedf1 55%, #dde2e8 100%)',
                                    boxShadow: active
                                      ? 'inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -1px 0 rgba(92,128,167,0.52)'
                                      : 'inset 0 1px 0 rgba(255,255,255,0.97), inset 0 -1px 0 rgba(182,190,200,0.82)',
                                    color: '#2f3b4d',
                                  }}
                                >
                                  <div style={{ display: 'grid', lineHeight: 1.15, gap: 2 }}>
                                    <span style={{ fontWeight: 700 }}>{worker.code}</span>
                                    <span style={{ fontSize: 11 }}>{worker.name}</span>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: avail != null ? '#166534' : '#64748b',
                                      }}
                                    >
                                      Avail: {avail != null ? `${formatAvailHoursLabel(avail)} h` : '—'}
                                    </span>
                                  </div>
                                </Button>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                      <Form.Item label="Priority" name="priority">
                        <Select
                          allowClear
                          options={[
                            { value: 'High', label: 'High' },
                            { value: 'Medium', label: 'Medium' },
                            { value: 'Low', label: 'Low' },
                          ]}
                          placeholder="เลือกความสำคัญ"
                        />
                      </Form.Item>
                      <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>
                        Plan time
                      </Typography.Text>
                      <Typography.Paragraph type="secondary" style={{ fontSize: 11, marginBottom: 8 }}>
                        คลิกช่องเพื่อเลือกวันที่ (ปฏิทิน) และเวลา — ใช้ไอคอนนาฬิกาเพื่อเน้นการเลือกเวลา
                      </Typography.Paragraph>
                      <Space wrap align="end" style={{ width: '100%' }}>
                        <Form.Item
                          label="เวลาเริ่ม (Plan start)"
                          name="plannedStart"
                          rules={[{ required: true, message: 'ระบุเวลาเริ่ม' }]}
                        >
                          <CalendarModalDateTimePicker />
                        </Form.Item>
                        <Form.Item
                          label="เวลาเสร็จ (Plan finish)"
                          name="plannedFinish"
                          rules={[{ required: true, message: 'ระบุเวลาเสร็จ' }]}
                        >
                          <CalendarModalDateTimePicker />
                        </Form.Item>
                        <Form.Item label="เวลาทั้งหมด (ชั่วโมง)">
                          <InputNumber value={planningTotalHours} readOnly addonAfter="ชม." />
                        </Form.Item>
                      </Space>
                      <Space>
                        {canEditPlanningAndClose ? (
                          <>
                            <Button type="primary" htmlType="submit" loading={planningMut.isPending}>
                              Save
                            </Button>
                            <Button onClick={() => planningForm.resetFields()}>Don't save</Button>
                          </>
                        ) : null}
                        <Button onClick={() => setSelectedWorkOrder(null)}>Cancel</Button>
                      </Space>
                    </Form>
                  </div>
                ),
              },
              {
                key: 'close-wo',
                label: 'Close Work Order',
                children: (
                  <div
                    style={{
                      background: 'linear-gradient(180deg, #d9e9ff 0%, #c9dff9 100%)',
                      borderRadius: 8,
                      padding: 16,
                      border: '1px solid #b0cdef',
                    }}
                  >
                    {!canEditPlanningAndClose ? (
                      <>
                        <Alert
                          type="info"
                          showIcon
                          style={{ marginBottom: 12 }}
                          message="แสดงผลอย่างเดียว"
                          description="คุณไม่มีสิทธิ์แก้ไข Close WO — ดูข้อมูลได้เท่านั้น"
                        />
                        <Spin spinning={closeConfirmationsQ.isFetching}>
                          <Table<OrderConfirmationRow>
                            size="small"
                            pagination={false}
                            locale={{
                              emptyText: (
                                <Typography.Text type="secondary">ยังไม่มีรายการบันทึกเวลาปิดงาน</Typography.Text>
                              ),
                            }}
                            rowKey={(r) => String(r.id)}
                            dataSource={closeConfirmationItems}
                            scroll={{ x: true }}
                            columns={[
                              {
                                title: 'Actual Work center',
                                key: 'worker',
                                ellipsis: true,
                                render: (_, r) =>
                                  parseActualLabelFromConfirmationNotes(r.notes) ?? '—',
                              },
                              {
                                title: 'Start date',
                                width: 108,
                                render: (_, r) => formatCloseDisplayDate(r.actual_start),
                              },
                              {
                                title: 'Finished date',
                                width: 108,
                                render: (_, r) => formatCloseDisplayDate(r.actual_finish),
                              },
                              {
                                title: 'Start Time',
                                width: 100,
                                render: (_, r) => formatCloseDisplayTime(r.actual_start),
                              },
                              {
                                title: 'Finished Time',
                                width: 100,
                                render: (_, r) => formatCloseDisplayTime(r.actual_finish),
                              },
                              {
                                title: 'Actual time',
                                width: 96,
                                align: 'right',
                                render: (_, r) => {
                                  const h = confirmationRowHours(r);
                                  return h != null ? `${formatAvailHoursLabel(h)} H` : '—';
                                },
                              },
                            ]}
                          />
                        </Spin>
                        <Space style={{ marginTop: 12 }}>
                          <Button onClick={() => setSelectedWorkOrder(null)}>Cancel</Button>
                        </Space>
                      </>
                    ) : null}
                    {canEditPlanningAndClose ? (
                    <Form<CloseWoFormValues>
                      form={closeWoForm}
                      layout="vertical"
                      onFinish={(values) => {
                        if (!values.actualStart || !values.actualFinish) {
                          message.error('กรุณาเลือกเวลาเริ่มและเวลาสิ้นสุด');
                          return;
                        }
                        const workers = (values.actualWorkers ?? []).filter(Boolean);
                        if (workers.length === 0) {
                          message.error('เลือกอย่างน้อย 1 คนปฏิบัติงาน');
                          return;
                        }
                        const hours = diffHours(values.actualStart, values.actualFinish);
                        if (hours <= 0) {
                          message.error('เวลาเสร็จต้องหลังเวลาเริ่ม');
                          return;
                        }
                        closeWoMut.mutate({
                          workOrderId: Number(selectedWorkOrder.id),
                          body: {
                            workCentersActual: workers,
                            actualStart: values.actualStart.toISOString(),
                            actualFinish: values.actualFinish.toISOString(),
                            actualWorkHours: hours,
                            comment: values.comment || null,
                          },
                        });
                      }}
                    >
                      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                        ปิดงาน — เลือกผู้ปฏิบัติจริงและเวลาทำงาน
                      </Typography.Text>
                      <Typography.Paragraph type="secondary" style={{ fontSize: 11, marginBottom: 10 }}>
                        จากปฏิทิน: ดับเบิลคลิกแท่งงานแล้วมาที่แท็บนี้ — เลือก<strong>วันที่และเวลา</strong>เริ่ม/เสร็จในช่องด้านล่าง
                        (คลิกไอคอนนาฬิกาเพื่อระบุเวลา)
                      </Typography.Paragraph>
                      <Form.Item
                        label="Actual resource (เลือกได้หลายคน)"
                        name="actualWorkers"
                        rules={[
                          { required: true, message: 'เลือกอย่างน้อย 1 คน' },
                          { type: 'array', min: 1, message: 'เลือกอย่างน้อย 1 คน' },
                        ]}
                      >
                        <Select
                          mode="multiple"
                          allowClear
                          placeholder="เลือกทรัพยากรจริง / พิมพ์ค้นหา"
                          options={WORK_CENTER_OPTIONS.map((x) => ({ value: x.value, label: x.value }))}
                        />
                      </Form.Item>
                      <div
                        style={{
                          background: 'rgba(255,255,255,0.72)',
                          border: '1px solid #adc2de',
                          borderRadius: 6,
                          padding: 9,
                          marginBottom: 12,
                        }}
                      >
                        <Typography.Text style={{ fontSize: 12, color: '#355a8a', fontWeight: 700 }}>
                          คนปฏิบัติงาน (Actual Work center)
                        </Typography.Text>
                        <Typography.Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 11 }}>
                          คลิกช่องเพื่อเลือก/ยกเลิกหลายคน — ทุกคนที่เลือกจะได้เวลาและชั่วโมงชุดเดียวกัน (บันทึกเป็นหลายแถวในประวัติ)
                        </Typography.Paragraph>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                            gap: 6,
                            marginTop: 8,
                          }}
                        >
                          {WORK_CENTER_OPTIONS.map((worker) => {
                            const active = (selectedActualWorkers ?? []).includes(worker.value);
                            return (
                              <Button
                                key={worker.value}
                                type="default"
                                onClick={() => {
                                  const cur = (closeWoForm.getFieldValue('actualWorkers') as string[] | undefined) ?? [];
                                  const next = new Set(cur);
                                  if (next.has(worker.value)) next.delete(worker.value);
                                  else next.add(worker.value);
                                  closeWoForm.setFieldValue('actualWorkers', [...next]);
                                }}
                                style={{
                                  minHeight: 62,
                                  height: 'auto',
                                  padding: '6px 8px',
                                  borderRadius: 2,
                                  border: active ? '1px solid #6a93c3' : '1px solid #b9c1cb',
                                  background: active
                                    ? 'linear-gradient(180deg, #deeeff 0%, #bfd8f3 56%, #afcaea 100%)'
                                    : 'linear-gradient(180deg, #fefefe 0%, #eaedf1 55%, #dde2e8 100%)',
                                  boxShadow: active
                                    ? 'inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -1px 0 rgba(92,128,167,0.52)'
                                    : 'inset 0 1px 0 rgba(255,255,255,0.97), inset 0 -1px 0 rgba(182,190,200,0.82)',
                                  color: '#2f3b4d',
                                }}
                              >
                                <div style={{ display: 'grid', lineHeight: 1.15, gap: 2 }}>
                                  <span style={{ fontWeight: 700 }}>{worker.code}</span>
                                  <span style={{ fontSize: 11 }}>{worker.name}</span>
                                </div>
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      <Space wrap align="end" style={{ width: '100%' }}>
                        <Form.Item
                          label="เวลาเริ่ม"
                          name="actualStart"
                          rules={[{ required: true, message: 'ระบุเวลาเริ่ม' }]}
                        >
                          <CalendarModalDateTimePicker />
                        </Form.Item>
                        <Form.Item
                          label="เวลาเสร็จ"
                          name="actualFinish"
                          rules={[{ required: true, message: 'ระบุเวลาเสร็จ' }]}
                        >
                          <CalendarModalDateTimePicker />
                        </Form.Item>
                        <Form.Item label="เวลาทั้งหมด">
                          <InputNumber value={closeTotalHours} readOnly addonAfter="ชม." />
                        </Form.Item>
                      </Space>
                      <Form.Item label="หมายเหตุ" name="comment">
                        <Input.TextArea rows={3} maxLength={500} />
                      </Form.Item>
                      <Typography.Text style={{ fontSize: 12, color: '#355a8a', fontWeight: 700 }}>
                        ประวัติการบันทึกเวลา
                      </Typography.Text>
                      <Spin spinning={closeConfirmationsQ.isFetching}>
                        <div style={{ marginTop: 8, marginBottom: 14, maxHeight: 220, overflowY: 'auto' }}>
                          {closeConfirmationItems.length === 0 ? (
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              ยังไม่มีรายการบันทึกเวลาปิดงาน
                            </Typography.Text>
                          ) : (
                            closeConfirmationItems.map((r) => (
                              <div
                                key={String(r.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  justifyContent: 'space-between',
                                  gap: 8,
                                  padding: '8px 10px',
                                  marginBottom: 6,
                                  background: 'rgba(255,255,255,0.55)',
                                  border: '1px solid #adc2de',
                                  borderRadius: 6,
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <Typography.Text strong style={{ display: 'block', fontSize: 12 }}>
                                    {formatCloseConfirmationPrimaryLine(r)}
                                  </Typography.Text>
                                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                    {[r.confirmed_by_name, confirmationNotesUserComment(r.notes)]
                                      .filter(Boolean)
                                      .join(' · ') || '—'}
                                  </Typography.Text>
                                </div>
                                <Button
                                  size="small"
                                  type="default"
                                  icon={<EditOutlined />}
                                  onClick={() => {
                                    const label = parseActualLabelFromConfirmationNotes(r.notes);
                                    const oneWorker =
                                      label && WORK_CENTER_OPTIONS.some((o) => o.value === label) ? [label] : [];
                                    closeWoForm.setFieldsValue({
                                      actualWorkers: oneWorker,
                                      actualStart: r.actual_start ? dayjs(r.actual_start) : undefined,
                                      actualFinish: r.actual_finish ? dayjs(r.actual_finish) : undefined,
                                      comment: confirmationEditComment(r.notes),
                                    });
                                  }}
                                >
                                  แก้ไข
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </Spin>
                      <Space>
                        <Button type="primary" htmlType="submit" loading={closeWoMut.isPending}>
                          Save
                        </Button>
                        <Button onClick={() => closeWoForm.resetFields()}>Don't save</Button>
                        <Button onClick={() => setSelectedWorkOrder(null)}>Cancel</Button>
                      </Space>
                    </Form>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
          </div>
        ) : null}
      </Modal>
    </Space>
  );
}

