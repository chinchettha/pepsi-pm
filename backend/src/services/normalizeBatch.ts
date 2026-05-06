import type { Pool, PoolConnection } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { parseSapDateTime, parseSapDecimal, truncateStr } from '../utils/sapParse.js';

function toSqlDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type NormalizeBatchResult = {
  batchId: number;
  sourceKind: string;
  workOrdersUpserted: number;
  goodsMovementsInserted: number;
  orderConfirmationsInserted: number;
  rowsSkipped: number;
  orderConfirmationRowsSkipped: number;
};

/** Cross-import dedupe: same SAP confirm line replaces previous row (unique sap_line_key). */
export function buildSapLineKey(
  workOrderId: number,
  confirmNo: string | null | undefined,
  counter: string | null | undefined,
  stgRowId: number
): string {
  const c = (confirmNo ?? '').trim();
  const k = (counter ?? '').trim();
  const base = c || k ? `${workOrderId}|${c}|${k}` : `${workOrderId}|row:${stgRowId}`;
  return base.length <= 192 ? base : base.slice(0, 192);
}

type BatchRow = {
  id: number;
  source_kind: string;
  status: string;
  row_count_accepted: number;
};

async function ensureEquipment(
  conn: PoolConnection,
  sapId: string | null,
  fl: string | null,
  desc: string | null
): Promise<number | null> {
  const sap = truncateStr(sapId, 64);
  if (!sap) return null;

  await conn.execute(
    `INSERT INTO equipments (equipment_id_sap, functional_location, description, plant, synced_at)
     VALUES (?, ?, ?, '', CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       functional_location = COALESCE(VALUES(functional_location), equipments.functional_location),
       description = COALESCE(VALUES(description), equipments.description),
       synced_at = CURRENT_TIMESTAMP(3)`,
    [sap, truncateStr(fl, 128), truncateStr(desc, 512)]
  );

  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM equipments WHERE equipment_id_sap = ? AND plant = '' LIMIT 1`,
    [sap]
  );
  return rows[0] ? Number((rows[0] as { id: number }).id) : null;
}

async function ensureMaterial(
  conn: PoolConnection,
  materialNo: string,
  description: string | null,
  bun: string | null
): Promise<number> {
  const num = truncateStr(materialNo, 64)!;
  await conn.execute(
    `INSERT INTO materials (material_number_sap, description, base_uom)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       description = COALESCE(VALUES(description), materials.description),
       base_uom = COALESCE(VALUES(base_uom), materials.base_uom)`,
    [num, truncateStr(description, 512), truncateStr(bun, 16)]
  );
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM materials WHERE material_number_sap = ? LIMIT 1`,
    [num]
  );
  return Number((rows[0] as { id: number }).id);
}

async function findWorkOrderId(conn: PoolConnection, orderNumber: string): Promise<number | null> {
  const ord = truncateStr(orderNumber, 64);
  if (!ord) return null;
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM work_orders WHERE order_number = ? LIMIT 1`,
    [ord]
  );
  return rows[0] ? Number((rows[0] as { id: number }).id) : null;
}

async function upsertWorkOrder(
  conn: PoolConnection,
  p: {
    orderNumber: string;
    orderType: string | null;
    equipmentId: number | null;
    workCenterPlanned: string | null;
    workCenterActual: string | null;
    systemStatus: string | null;
    basicStart: Date | null;
    basicFinish: Date | null;
    plannedStart: Date | null;
    plannedFinish: Date | null;
    lastBatchId: number;
  }
): Promise<void> {
  const on = truncateStr(p.orderNumber, 64);
  if (!on) return;

  await conn.execute(
    `INSERT INTO work_orders (
       order_number, order_type, equipment_id,
       work_center_planned, work_center_actual, system_status,
       planned_start, planned_finish, basic_start, basic_finish,
       last_import_batch_id
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       order_type = COALESCE(VALUES(order_type), work_orders.order_type),
       equipment_id = COALESCE(VALUES(equipment_id), work_orders.equipment_id),
       work_center_planned = COALESCE(VALUES(work_center_planned), work_orders.work_center_planned),
       work_center_actual = COALESCE(VALUES(work_center_actual), work_orders.work_center_actual),
       system_status = COALESCE(VALUES(system_status), work_orders.system_status),
       planned_start = COALESCE(VALUES(planned_start), work_orders.planned_start),
       planned_finish = COALESCE(VALUES(planned_finish), work_orders.planned_finish),
       basic_start = COALESCE(VALUES(basic_start), work_orders.basic_start),
       basic_finish = COALESCE(VALUES(basic_finish), work_orders.basic_finish),
       last_import_batch_id = VALUES(last_import_batch_id),
       updated_at = CURRENT_TIMESTAMP(3)`,
    [
      on,
      truncateStr(p.orderType, 16),
      p.equipmentId,
      truncateStr(p.workCenterPlanned, 64),
      truncateStr(p.workCenterActual, 64),
      truncateStr(p.systemStatus, 64),
      p.plannedStart,
      p.plannedFinish,
      p.basicStart,
      p.basicFinish,
      p.lastBatchId,
    ]
  );
}

async function normalizeIw37n(conn: PoolConnection, batchId: number): Promise<{ wo: number; skipped: number }> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT source_row_number, order_no, type, system_status, op_work_ctr,
            bsc_start, act_finish, equipment, equipment_descriptn, functional_location
     FROM stg_iw37n_row WHERE import_batch_id = ? ORDER BY id`,
    [batchId]
  );

  let wo = 0;
  let skipped = 0;
  for (const r of rows) {
    const orderNo = truncateStr((r as { order_no: string | null }).order_no, 64);
    if (!orderNo) {
      skipped += 1;
      continue;
    }

    const equipmentId = await ensureEquipment(
      conn,
      (r as { equipment: string | null }).equipment,
      (r as { functional_location: string | null }).functional_location,
      (r as { equipment_descriptn: string | null }).equipment_descriptn
    );

    const basicStart = parseSapDateTime((r as { bsc_start: string | null }).bsc_start);
    const basicFinish = parseSapDateTime((r as { act_finish: string | null }).act_finish);

    await upsertWorkOrder(conn, {
      orderNumber: orderNo,
      orderType: truncateStr((r as { type: string | null }).type, 16),
      equipmentId,
      workCenterPlanned: truncateStr((r as { op_work_ctr: string | null }).op_work_ctr, 64),
      workCenterActual: null,
      systemStatus: truncateStr((r as { system_status: string | null }).system_status, 64),
      basicStart,
      basicFinish,
      plannedStart: basicStart,
      plannedFinish: basicFinish,
      lastBatchId: batchId,
    });
    wo += 1;
  }
  return { wo, skipped };
}

type ConfirmStg = {
  id: number;
  source_row_number: number | null;
  order_no: string | null;
  confirm_no: string | null;
  counter: string | null;
  wk_ctr_act: string | null;
  wk_ctr_pln: string | null;
  sys_status: string | null;
  equipment: string | null;
  functional_location: string | null;
  posting_date: string | null;
  act_work: string | null;
  act_start_1: string | null;
  act_finish_1: string | null;
  act_start_2: string | null;
  act_finish_2: string | null;
  ccld_conf: string | null;
  rem_work: string | null;
  pg: string | null;
  pt_ac: string | null;
};

async function normalizeConfirmWo(
  conn: PoolConnection,
  batchId: number
): Promise<{ wo: number; skipped: number; oc: number; ocSkipped: number }> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id, source_row_number, order_no, confirm_no, counter, wk_ctr_act, wk_ctr_pln, sys_status,
            equipment, functional_location, posting_date, act_work,
            act_start_1, act_finish_1, act_start_2, act_finish_2, ccld_conf, rem_work, pg, pt_ac
     FROM stg_confirm_wo_row WHERE import_batch_id = ? ORDER BY id`,
    [batchId]
  );

  let wo = 0;
  let skipped = 0;
  for (const raw of rows) {
    const r = raw as ConfirmStg;
    const orderNo = truncateStr(r.order_no, 64);
    if (!orderNo) {
      skipped += 1;
      continue;
    }

    const equipmentId = await ensureEquipment(conn, r.equipment, r.functional_location, null);

    const posting = parseSapDateTime(r.posting_date);

    await upsertWorkOrder(conn, {
      orderNumber: orderNo,
      orderType: null,
      equipmentId,
      workCenterPlanned: truncateStr(r.wk_ctr_pln, 64),
      workCenterActual: truncateStr(r.wk_ctr_act, 64),
      systemStatus: truncateStr(r.sys_status, 64),
      basicStart: null,
      basicFinish: null,
      plannedStart: posting,
      plannedFinish: posting,
      lastBatchId: batchId,
    });
    wo += 1;
  }

  let oc = 0;
  let ocSkipped = 0;
  for (const raw of rows) {
    const r = raw as ConfirmStg;
    const orderNo = truncateStr(r.order_no, 64);
    if (!orderNo) {
      ocSkipped += 1;
      continue;
    }

    const woId = await findWorkOrderId(conn, orderNo);
    if (!woId) {
      ocSkipped += 1;
      continue;
    }

    const stgId = Number(r.id);
    const confirmNo = truncateStr(r.confirm_no, 64);
    const counter = truncateStr(r.counter, 32);
    const sapLineKey = buildSapLineKey(woId, confirmNo, counter, stgId);

    await conn.execute(`DELETE FROM order_confirmations WHERE sap_line_key = ?`, [sapLineKey]);

    const actualStart = parseSapDateTime(r.act_start_1) ?? parseSapDateTime(r.act_start_2);
    const actualFinish = parseSapDateTime(r.act_finish_1) ?? parseSapDateTime(r.act_finish_2);
    const hours = parseSapDecimal(r.act_work);

    const noteParts = [
      confirmNo ? `Confirm ${confirmNo}` : null,
      counter ? `Counter ${counter}` : null,
      truncateStr(r.ccld_conf, 128),
      truncateStr(r.rem_work, 256),
      truncateStr(r.pg, 32),
      truncateStr(r.pt_ac, 32),
    ].filter(Boolean) as string[];
    let notes = noteParts.join(' · ');
    if (notes.length > 16000) {
      notes = notes.slice(0, 16000);
    }

    await conn.execute(
      `INSERT INTO order_confirmations (
         work_order_id, import_batch_id, stg_confirm_row_id, sap_confirm_no, sap_counter, sap_line_key,
         actual_start, actual_finish, actual_work_hours, notes, sync_to_sap_status
       ) VALUES (?,?,?,?,?,?,?,?,?,?, 'not_applicable')`,
      [
        woId,
        batchId,
        stgId,
        confirmNo,
        counter,
        sapLineKey,
        actualStart,
        actualFinish,
        hours,
        notes || null,
      ]
    );
    oc += 1;
  }

  return { wo, skipped, oc, ocSkipped };
}

async function normalizeMb51(
  conn: PoolConnection,
  batchId: number,
  movementKind: 'GI' | 'GR'
): Promise<{ gm: number; skipped: number }> {
  await conn.execute(`DELETE FROM goods_movements WHERE import_batch_id = ?`, [batchId]);

  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT source_row_number, order_no, mat_doc, entry_date, po, pstng_date, doc_date,
            material_description, quantity_str, bun, amount_in_lc_str, crcy, mvt, cost_ctr,
            time_str, mat_yr, material_no
     FROM stg_mb51_row WHERE import_batch_id = ? ORDER BY id`,
    [batchId]
  );

  let gm = 0;
  let skipped = 0;
  for (const r of rows) {
    const materialNo = truncateStr((r as { material_no: string | null }).material_no, 64);
    if (!materialNo) {
      skipped += 1;
      continue;
    }

    const qty = parseSapDecimal((r as { quantity_str: string | null }).quantity_str) ?? 0;

    const materialId = await ensureMaterial(
      conn,
      materialNo,
      (r as { material_description: string | null }).material_description,
      (r as { bun: string | null }).bun
    );

    const orderNo = truncateStr((r as { order_no: string | null }).order_no, 64);
    const workOrderId = orderNo ? await findWorkOrderId(conn, orderNo) : null;

    const postingDate = parseSapDateTime((r as { pstng_date: string | null }).pstng_date);
    const entryDate = parseSapDateTime((r as { entry_date: string | null }).entry_date);
    const docDate = parseSapDateTime((r as { doc_date: string | null }).doc_date);
    const amountLc = parseSapDecimal((r as { amount_in_lc_str: string | null }).amount_in_lc_str);
    const matDoc = truncateStr((r as { mat_doc: string | null }).mat_doc, 64);

    await conn.execute(
      `INSERT INTO goods_movements (
         movement_kind, work_order_id, material_id, quantity, posting_date, plant,
         sap_document_reference, mat_doc, mvt, material_description, bun, amount_in_lc, crcy,
         cost_ctr, entry_date, po_number, doc_date, import_batch_id
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        movementKind,
        workOrderId,
        materialId,
        qty,
        postingDate ? toSqlDate(postingDate) : null,
        '',
        matDoc,
        matDoc,
        truncateStr((r as { mvt: string | null }).mvt, 16),
        truncateStr((r as { material_description: string | null }).material_description, 512),
        truncateStr((r as { bun: string | null }).bun, 16),
        amountLc,
        truncateStr((r as { crcy: string | null }).crcy, 8),
        truncateStr((r as { cost_ctr: string | null }).cost_ctr, 32),
        entryDate ? toSqlDate(entryDate) : null,
        truncateStr((r as { po: string | null }).po, 64),
        docDate ? toSqlDate(docDate) : null,
        batchId,
      ]
    );
    gm += 1;
  }
  return { gm, skipped };
}

export async function normalizeImportBatch(pool: Pool, batchId: number): Promise<NormalizeBatchResult> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [batchRows] = await conn.query<RowDataPacket[]>(
      `SELECT id, source_kind, status, row_count_accepted FROM import_batches WHERE id = ? LIMIT 1`,
      [batchId]
    );
    const batch = batchRows[0] as BatchRow | undefined;
    if (!batch) {
      throw new Error('BATCH_NOT_FOUND');
    }
    if (batch.row_count_accepted === 0) {
      throw new Error('BATCH_EMPTY');
    }

    let workOrdersUpserted = 0;
    let goodsMovementsInserted = 0;
    let orderConfirmationsInserted = 0;
    let rowsSkipped = 0;
    let orderConfirmationRowsSkipped = 0;

    if (batch.source_kind === 'iw37n') {
      const r = await normalizeIw37n(conn, batchId);
      workOrdersUpserted = r.wo;
      rowsSkipped += r.skipped;
    } else if (batch.source_kind === 'confirm_wo') {
      const r = await normalizeConfirmWo(conn, batchId);
      workOrdersUpserted = r.wo;
      rowsSkipped += r.skipped;
      orderConfirmationsInserted = r.oc;
      orderConfirmationRowsSkipped = r.ocSkipped;
    } else if (batch.source_kind === 'gi' || batch.source_kind === 'gr') {
      const kind = batch.source_kind === 'gi' ? 'GI' : 'GR';
      const r = await normalizeMb51(conn, batchId, kind);
      goodsMovementsInserted = r.gm;
      rowsSkipped += r.skipped;
    } else {
      throw new Error('BATCH_KIND_UNSUPPORTED');
    }

    const note = `normalize: WO=${workOrdersUpserted}, GM=${goodsMovementsInserted}, OC=${orderConfirmationsInserted}, skip=${rowsSkipped}, ocSkip=${orderConfirmationRowsSkipped}`;
    await conn.execute(`UPDATE import_batches SET notes = ? WHERE id = ?`, [
      note.slice(0, 1024),
      batchId,
    ]);

    await conn.commit();

    return {
      batchId,
      sourceKind: batch.source_kind,
      workOrdersUpserted,
      goodsMovementsInserted,
      orderConfirmationsInserted,
      rowsSkipped,
      orderConfirmationRowsSkipped,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
