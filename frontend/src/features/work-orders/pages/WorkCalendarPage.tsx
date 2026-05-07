import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Calendar, Card, Col, DatePicker, Empty, Form, Input, InputNumber, Modal, Popover, Row, Segmented, Select, Space, Spin, Tabs, Tag, Typography } from 'antd';
import type { CalendarProps } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleFilled,
  EnvironmentOutlined,
  ExclamationCircleFilled,
  FlagOutlined,
  ProfileOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { ROUTES } from '../../../config/routes';
import { PERMISSIONS, userHasAnyPermission } from '../../../config/permissions';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchCalendarFilterConfig,
  fetchStatusColorMappings,
  fetchWorkOrdersForCalendarRange,
  putCalendarFilterConfig,
  postCloseWorkOrder,
  postRescheduleWorkOrder,
  postSavePlanning,
  type CalendarFilterConfig as ApiCalendarFilterConfig,
  type StatusColorMapping,
  type WorkOrderRow,
} from '../api';

type CalendarViewMode = 'month' | 'week' | 'day';
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
  workCenterActual?: string;
  actualStart?: Dayjs;
  actualFinish?: Dayjs;
  actualWorkHours?: number;
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
      <span>{label}</span>
    </Space>
  );
}

function prefixedFilterLabel(
  _category: 'functional' | 'status' | 'resource' | 'type' | 'priority',
  label: string
): string {
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
  value,
  options,
  onChange,
}: {
  category: 'functional' | 'status' | 'resource' | 'type' | 'priority';
  placeholder: string;
  value: string[];
  options: string[];
  onChange: (next: string[]) => void;
}) {
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
            <span style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>{placeholder}</span>
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

function itemsForDay(items: WorkOrderRow[], day: Dayjs): WorkOrderRow[] {
  const key = day.format('YYYY-MM-DD');
  return items.filter((w) => {
    const s = w.planned_start ? dayjs(w.planned_start).format('YYYY-MM-DD') : null;
    const f = w.planned_finish ? dayjs(w.planned_finish).format('YYYY-MM-DD') : null;
    if (s && f) return key >= s && key <= f;
    if (s) return key === s;
    if (f) return key === f;
    return false;
  });
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

function statusColor(status: string | null, mappingByCode: Record<string, StatusTone>): string {
  const tone = inferStatusTone(status, mappingByCode);
  if (tone === 'green') return 'green';
  if (tone === 'blue') return 'blue';
  if (tone === 'red') return 'red';
  return 'default';
}

function statusBlockTheme(status: string | null, mappingByCode: Record<string, StatusTone>): StatusTheme {
  const tone = inferStatusTone(status, mappingByCode);
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

function formatHourLabel(hours: number): string {
  // Legacy behavior: show planned time in 0.5-hour steps.
  const stepped = Math.max(0, Math.round(hours * 2) / 2);
  const display = Number.isInteger(stepped) ? String(stepped) : stepped.toFixed(1);
  return `${display} ${stepped === 1 ? 'Hour' : 'Hours'}`;
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
  const resource = w.work_center_actual || '-';
  const functionalLoc = w.equipment_id || '-';
  const status = w.system_status || '—';
  const theme = statusBlockTheme(w.system_status, mappingByCode);

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
            <Typography.Text style={{ fontSize: 16, fontWeight: 700, color: '#205fb8' }}>
              {w.order_number}
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
            <PopupRow label="Work Order" value={String(w.id)} />
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
        onClick={() => onOpenDetails?.(w)}
        style={{
          cursor: 'pointer',
          borderRadius: 8,
          padding: compact ? '2px 8px' : '5px 9px',
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontWeight: 700,
          fontSize: compact ? 11 : 12,
          color: theme.text,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
          transition: 'transform 120ms ease, box-shadow 120ms ease, filter 120ms ease, opacity 120ms ease',
          transform: isDragging ? 'scale(1.04) rotate(-1deg)' : 'scale(1)',
          filter: isDragging ? 'saturate(1.18) brightness(1.04)' : 'none',
          opacity: isDragging ? 0.78 : 1,
        }}
      >
        {w.order_number}
      </div>
    </Popover>
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
              draggableEnabled={inferStatusTone(w.system_status, mappingByCode) !== 'green'}
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
      workOrderTypes: mergeUnique(fromData.workOrderTypes, customFilterConfig.workOrderTypes),
      priorities: mergeUnique(fromData.priorities, customFilterConfig.priorities),
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
    mutationFn: (vars: { workOrderId: number; targetDate: string; reasonCode?: string; comment?: string }) =>
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
    onSuccess: () => {
      message.success('บันทึก Close WO แล้ว');
      void queryClient.invalidateQueries({ queryKey: ['work-orders-calendar'] });
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] });
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

  const dailyHoursMap = plannedDailyHoursMap;

  const handleCardDragStart = (workOrderId: string | number) => {
    const row = workOrderById.get(String(workOrderId));
    if (!row) return;
    const tone = inferStatusTone(row.system_status, mappingByCode);
    if (tone === 'green') {
      message.warning('แผนงานสีเขียว (งานเสร็จ/ปิด) ไม่สามารถเลื่อนได้');
      return;
    }
    setDraggingWorkOrderId(workOrderId);
  };
  const handleCardDragEnd = () => setDraggingWorkOrderId(null);

  const openRescheduleFlow = (targetDay: Dayjs) => {
    if (!draggingWorkOrderId) return;
    const row = workOrderById.get(String(draggingWorkOrderId));
    if (!row) return;
    const tone = inferStatusTone(row.system_status, mappingByCode);
    if (tone === 'green') {
      message.warning('แผนงานสีเขียว (งานเสร็จ/ปิด) ไม่สามารถเลื่อนได้');
      return;
    }
    setPendingDropWorkOrder(row);
    setPendingDropDate(targetDay.format('YYYY-MM-DD'));
    rescheduleForm.setFieldsValue({ reasonCode: undefined, comment: '' });
    setDraggingWorkOrderId(null);
  };

  const pmTaskList = useMemo(() => {
    const raw = selectedWorkOrder?.ui_metadata_json as
      | { pmTaskList?: string[]; taskList?: string[]; pm_tasks?: string[]; maintenancePlan?: string }
      | undefined;
    const list = raw?.pmTaskList ?? raw?.taskList ?? raw?.pm_tasks ?? [];
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string' && x.trim()) : [];
  }, [selectedWorkOrder]);

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
      workCenterActual: selectedWorkOrder.work_center_actual ?? undefined,
      actualStart: selectedWorkOrder.actual_start ? dayjs(selectedWorkOrder.actual_start) : undefined,
      actualFinish: selectedWorkOrder.actual_finish ? dayjs(selectedWorkOrder.actual_finish) : undefined,
      actualWorkHours:
        selectedWorkOrder.actual_work_hours != null ? Number(selectedWorkOrder.actual_work_hours) : undefined,
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
  const selectedActualWorkCenter = Form.useWatch('workCenterActual', closeWoForm) as string | undefined;

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
          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
            {formatHourLabel(dailyHoursMap[current.format('YYYY-MM-DD')] ?? 0)}
          </div>
          {list.length > 0 ? (
            <ul
              style={{
                margin: '4px 0 0',
                padding: 0,
                listStyle: 'none',
                fontSize: 11,
                lineHeight: 1.35,
              }}
            >
              {list.slice(0, 4).map((w) => (
                <li key={w.id}>
                  <div onClick={(e) => e.stopPropagation()}>
                    <WorkOrderHoverCard
                      w={w}
                      compact
                      mappingByCode={mappingByCode}
                      draggableEnabled={inferStatusTone(w.system_status, mappingByCode) !== 'green'}
                      onDragStart={handleCardDragStart}
                      onDragEnd={handleCardDragEnd}
                      isDragging={draggingWorkOrderId !== null && String(draggingWorkOrderId) === String(w.id)}
                      onOpenDetails={setSelectedWorkOrder}
                    />
                  </div>
                </li>
              ))}
              {list.length > 4 ? (
                <li style={{ color: 'var(--ant-color-text-secondary)' }}>+{list.length - 4} ใบ</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      );
    };
  }, [dailyHoursMap, draggingWorkOrderId, filteredItems, mappingByCode, workOrderById]);

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
          <Col xs={24} md={12} xl={5}>
            <StyledFilterSelect
              category="functional"
              placeholder="Functional Location"
              value={filters.functionalLocations}
              onChange={(v) => setFilters((prev) => ({ ...prev, functionalLocations: v }))}
              options={filterOptions.functionalLocations}
            />
          </Col>
          <Col xs={24} md={12} xl={5}>
            <StyledFilterSelect
              category="status"
              placeholder="Work Order Status"
              value={filters.statuses}
              onChange={(v) => setFilters((prev) => ({ ...prev, statuses: v }))}
              options={filterOptions.statuses}
            />
          </Col>
          <Col xs={24} md={12} xl={5}>
            <StyledFilterSelect
              category="resource"
              placeholder="Assigned Resources"
              value={filters.assignedResources}
              onChange={(v) => setFilters((prev) => ({ ...prev, assignedResources: v }))}
              options={filterOptions.assignedResources}
            />
          </Col>
          <Col xs={24} md={12} xl={5}>
            <StyledFilterSelect
              category="type"
              placeholder="Work Order Type"
              value={filters.workOrderTypes}
              onChange={(v) => setFilters((prev) => ({ ...prev, workOrderTypes: v }))}
              options={filterOptions.workOrderTypes}
            />
          </Col>
          <Col xs={24} md={12} xl={4}>
            <StyledFilterSelect
              category="priority"
              placeholder="Priority"
              value={filters.priorities}
              onChange={(v) => setFilters((prev) => ({ ...prev, priorities: v }))}
              options={filterOptions.priorities}
            />
          </Col>
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
        <Typography.Paragraph type="secondary">
          แสดงใบงานตามช่วง <strong>planned start / finish</strong> ที่ทับซ้อนกับช่วงที่เลือก ({modeLabel(mode)}) —
          ข้อมูลจาก{' '}
          <code>GET /api/v1/work-orders?from=&amp;to=</code>
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
          Drag & Drop: สีแดงต้องเลือก Reason Code ก่อนบันทึก, สีฟ้าใส่หรือไม่ใส่ก็ได้, สีเขียวไม่สามารถย้ายได้
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
                      <Typography.Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                        {formatHourLabel(dailyHoursMap[d.format('YYYY-MM-DD')] ?? 0)}
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
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                {formatHourLabel(dailyHoursMap[anchorDate.format('YYYY-MM-DD')] ?? 0)}
              </Typography.Text>
              {renderWorkOrderList(
                itemsForDay(filteredItems, anchorDate),
                mappingByCode,
                handleCardDragStart,
                handleCardDragEnd,
                draggingWorkOrderId,
                setSelectedWorkOrder
              )}
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
          <Form.Item label="Functional Location">
            <Select
              mode="tags"
              value={customFilterConfig.functionalLocations}
              onChange={(v) => setCustomFilterConfig((prev) => ({ ...prev, functionalLocations: v }))}
              placeholder="Type and press Enter"
            />
          </Form.Item>
          <Form.Item label="Work Order Status">
            <Select
              mode="tags"
              value={customFilterConfig.statuses}
              onChange={(v) => setCustomFilterConfig((prev) => ({ ...prev, statuses: v }))}
              placeholder="Type and press Enter"
            />
          </Form.Item>
          <Form.Item label="Assigned Resources">
            <Select
              mode="tags"
              value={customFilterConfig.assignedResources}
              onChange={(v) => setCustomFilterConfig((prev) => ({ ...prev, assignedResources: v }))}
              placeholder="Type and press Enter"
            />
          </Form.Item>
          <Form.Item label="Work Order Type">
            <Select
              mode="tags"
              value={customFilterConfig.workOrderTypes}
              onChange={(v) => setCustomFilterConfig((prev) => ({ ...prev, workOrderTypes: v }))}
              placeholder="Type and press Enter"
            />
          </Form.Item>
          <Form.Item label="Priority">
            <Select
              mode="tags"
              value={customFilterConfig.priorities}
              onChange={(v) => setCustomFilterConfig((prev) => ({ ...prev, priorities: v }))}
              placeholder="Type and press Enter"
            />
          </Form.Item>
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
              const tone = inferStatusTone(pendingDropWorkOrder.system_status, mappingByCode);
              if (tone === 'red' && !values.reasonCode) {
                message.error('แผนงานสีแดงต้องระบุ Reason Code');
                return;
              }
              if (values.reasonCode === '05' && (!values.comment || values.comment.trim().length < 10)) {
                message.error('เลือก "05 อื่นๆ" ต้องกรอก Comment อย่างน้อย 10 ตัวอักษร');
                return;
              }
              rescheduleMut.mutate({
                workOrderId: Number(pendingDropWorkOrder.id),
                targetDate: pendingDropDate,
                reasonCode: values.reasonCode,
                comment: values.comment?.trim() || undefined,
              });
            }}
          >
            <Typography.Paragraph>
              Work Order: <Typography.Text strong>{pendingDropWorkOrder.order_number}</Typography.Text>
              <br />
              Move to: <Typography.Text strong>{pendingDropDate}</Typography.Text>
            </Typography.Paragraph>
            <Form.Item
              label="Reason Code"
              name="reasonCode"
              rules={
                inferStatusTone(pendingDropWorkOrder.system_status, mappingByCode) === 'red'
                  ? [{ required: true, message: 'แผนงานสีแดงต้องเลือก Reason Code' }]
                  : undefined
              }
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
                  <div style={{ background: '#cfe3ff', borderRadius: 6, padding: 16 }}>
                    <Typography.Paragraph style={{ marginBottom: 6 }}>
                      <Typography.Text strong>Maintenance Plan :</Typography.Text>{' '}
                      {selectedWorkOrder.order_number}
                    </Typography.Paragraph>
                    <Typography.Paragraph style={{ marginBottom: 6 }}>
                      <Typography.Text strong>PM Task detail :</Typography.Text>
                    </Typography.Paragraph>
                    {pmTaskList.length ? (
                      <ol style={{ margin: 0, paddingLeft: 20 }}>
                        {pmTaskList.map((t, idx) => (
                          <li key={`${idx}-${t}`}>
                            <Typography.Text>{t}</Typography.Text>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <Space direction="vertical" size={2}>
                        <Typography.Text>{selectedWorkOrder.order_type || '-'} - {selectedWorkOrder.order_number}</Typography.Text>
                        <Typography.Text type="secondary">
                          ยังไม่มี PM task list ในข้อมูลนำเข้า (รองรับจาก `ui_metadata_json.pmTaskList`/`taskList`)
                        </Typography.Text>
                      </Space>
                    )}
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
                    <Form<PlanningFormValues>
                      form={planningForm}
                      layout="vertical"
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
                      <Form.Item label="Assign Job / Plan Work Center" name="workCenterPlanned">
                        <Select
                          allowClear
                          options={WORK_CENTER_OPTIONS.map((x) => ({ value: x.value, label: x.value }))}
                          placeholder="Plan Work center"
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
                          Assigned Worker
                        </Typography.Text>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                            gap: 6,
                            marginTop: 7,
                          }}
                        >
                          {WORK_CENTER_OPTIONS.map((worker) => {
                            const active = selectedPlanningAssignee === worker.value;
                            return (
                              <Button
                                key={worker.value}
                                type="default"
                                onClick={() => planningForm.setFieldValue('assignedPerson', worker.value)}
                                style={{
                                  height: 54,
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
                                <div style={{ display: 'grid', lineHeight: 1.2 }}>
                                  <span>{worker.code}</span>
                                  <span style={{ fontSize: 12 }}>{worker.name}</span>
                                </div>
                              </Button>
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
                          placeholder="Select priority"
                        />
                      </Form.Item>
                      <Space wrap align="end" style={{ width: '100%' }}>
                        <Form.Item
                          label="Start Time"
                          name="plannedStart"
                          rules={[{ required: true, message: 'Start time is required' }]}
                        >
                          <DatePicker showTime format="YYYY-MM-DD HH:mm" />
                        </Form.Item>
                        <Form.Item
                          label="Finish Time"
                          name="plannedFinish"
                          rules={[{ required: true, message: 'Finish time is required' }]}
                        >
                          <DatePicker showTime format="YYYY-MM-DD HH:mm" />
                        </Form.Item>
                        <Form.Item label="Total Hours">
                          <InputNumber value={planningTotalHours} readOnly />
                        </Form.Item>
                      </Space>
                      <Space>
                        <Button type="primary" htmlType="submit" loading={planningMut.isPending}>
                          Save
                        </Button>
                        <Button onClick={() => planningForm.resetFields()}>Don't save</Button>
                        <Button onClick={() => setSelectedWorkOrder(null)}>Cancel</Button>
                      </Space>
                    </Form>
                  </div>
                ),
              },
              {
                key: 'close-wo',
                label: 'Close WO',
                children: (
                  <div
                    style={{
                      background: 'linear-gradient(180deg, #d9e9ff 0%, #c9dff9 100%)',
                      borderRadius: 8,
                      padding: 16,
                      border: '1px solid #b0cdef',
                    }}
                  >
                    <Form<CloseWoFormValues>
                      form={closeWoForm}
                      layout="vertical"
                      onFinish={(values) => {
                        if (!values.actualStart || !values.actualFinish) {
                          message.error('กรุณาเลือกเวลาเริ่มและเวลาสิ้นสุด');
                          return;
                        }
                        closeWoMut.mutate({
                          workOrderId: Number(selectedWorkOrder.id),
                          body: {
                            workCenterActual: values.workCenterActual || null,
                            actualStart: values.actualStart.toISOString(),
                            actualFinish: values.actualFinish.toISOString(),
                            actualWorkHours: values.actualWorkHours ?? closeTotalHours,
                            comment: values.comment || null,
                          },
                        });
                      }}
                    >
                      <Form.Item label="Close Work Order / Actual Work Center" name="workCenterActual">
                        <Select
                          allowClear
                          options={WORK_CENTER_OPTIONS.map((x) => ({ value: x.value, label: x.value }))}
                          placeholder="Actual Work center"
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
                          Actual Worker
                        </Typography.Text>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                            gap: 6,
                            marginTop: 7,
                          }}
                        >
                          {WORK_CENTER_OPTIONS.map((worker) => {
                            const active = selectedActualWorkCenter === worker.value;
                            return (
                              <Button
                                key={worker.value}
                                type="default"
                                onClick={() => closeWoForm.setFieldValue('workCenterActual', worker.value)}
                                style={{
                                  height: 54,
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
                                <div style={{ display: 'grid', lineHeight: 1.2 }}>
                                  <span>{worker.code}</span>
                                  <span style={{ fontSize: 12 }}>{worker.name}</span>
                                </div>
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      <Space wrap align="end" style={{ width: '100%' }}>
                        <Form.Item
                          label="Started Time"
                          name="actualStart"
                          rules={[{ required: true, message: 'Start time is required' }]}
                        >
                          <DatePicker showTime format="YYYY-MM-DD HH:mm" />
                        </Form.Item>
                        <Form.Item
                          label="Finished Time"
                          name="actualFinish"
                          rules={[{ required: true, message: 'Finish time is required' }]}
                        >
                          <DatePicker showTime format="YYYY-MM-DD HH:mm" />
                        </Form.Item>
                        <Form.Item label="Total Hours" name="actualWorkHours">
                          <InputNumber min={0} step={0.25} placeholder={String(closeTotalHours)} />
                        </Form.Item>
                      </Space>
                      <Form.Item label="Comment" name="comment">
                        <Input.TextArea rows={3} maxLength={500} />
                      </Form.Item>
                      <Space>
                        <Button type="primary" htmlType="submit" loading={closeWoMut.isPending}>
                          Save
                        </Button>
                        <Button onClick={() => closeWoForm.resetFields()}>Don't save</Button>
                        <Button onClick={() => setSelectedWorkOrder(null)}>Cancel</Button>
                      </Space>
                    </Form>
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

