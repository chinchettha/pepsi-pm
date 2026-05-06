import { createHash } from 'crypto';
import type { Pool, PoolConnection } from 'mysql2/promise';
import type { ResultSetHeader } from 'mysql2';
import { env } from '../config/env.js';
import { findExistingBatchByFileSha } from './dedupeImport.js';
import { parseSpreadsheetToRows, assertRowLimit } from './spreadsheetParse.js';
import {
  buildNormLookup,
  mapIw37nFromRow,
  mapConfirmWoFromRow,
  mapMb51FromRow,
  rowHasAnyValue,
  compactPayload,
} from './importMaps.js';

export type ImportKind = 'iw37n' | 'confirm_wo' | 'gi' | 'gr';

export type ImportRunResult = {
  batchId: number;
  rowCountAccepted: number;
  rowCountRejected: number;
  status: 'success' | 'failed';
};

const CHUNK = 250;

function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

async function flushIw37n(
  conn: PoolConnection,
  batchId: number,
  acc: {
    rowNum: number;
    vals: (string | null)[];
    payload: string | null;
  }[]
) {
  if (!acc.length) return;
  const sql = `INSERT INTO stg_iw37n_row (
    import_batch_id, source_row_number, s_flag, mnt_plan, order_no, type, mat,
    bsc_start, act_finish, system_status, op_ac, operation_short_text, c_check, op_work_ctr,
    work, act_work, un_val, description, equipment, equipment_descriptn, functional_location,
    funct_loc_descrip, row_payload
  ) VALUES `;
  const placeholders = acc
    .map(
      () =>
        '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )
    .join(',');
  const flat = acc.flatMap((r) => [batchId, r.rowNum, ...r.vals, r.payload]);
  await conn.query(sql + placeholders, flat);
}

async function flushConfirm(
  conn: PoolConnection,
  batchId: number,
  acc: { rowNum: number; vals: (string | null)[]; payload: string | null }[]
) {
  if (!acc.length) return;
  const sql = `INSERT INTO stg_confirm_wo_row (
    import_batch_id, source_row_number, confirm_no, counter, ord_cat, order_no, posting_date,
    equipment, wk_ctr_act, act_work, un_wk_act, pg, pt_ac, created_on, un_col, rem_work,
    act_start_1, act_finish_1, act_start_2, act_finish_2, ccld_conf, wk_ctr_pln, sys_status,
    functional_location, row_payload
  ) VALUES `;
  const placeholders = acc.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
  const flat = acc.flatMap((r) => [batchId, r.rowNum, ...r.vals, r.payload]);
  await conn.query(sql + placeholders, flat);
}

async function flushMb51(
  conn: PoolConnection,
  batchId: number,
  acc: { rowNum: number; vals: (string | null)[]; payload: string | null }[]
) {
  if (!acc.length) return;
  const sql = `INSERT INTO stg_mb51_row (
    import_batch_id, source_row_number, order_no, mat_doc, entry_date, po, pstng_date, doc_date,
    material_description, quantity_str, bun, amount_in_lc_str, crcy, mvt, cost_ctr, time_str,
    mat_yr, material_no, row_payload
  ) VALUES `;
  const placeholders = acc.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
  const flat = acc.flatMap((r) => [batchId, r.rowNum, ...r.vals, r.payload]);
  await conn.query(sql + placeholders, flat);
}

export async function runSapFileImport(
  pool: Pool,
  input: { kind: ImportKind; buffer: Buffer; fileName: string; userId: number | null }
): Promise<ImportRunResult> {
  const sourceRows = parseSpreadsheetToRows(input.buffer);
  assertRowLimit(sourceRows.length);

  const sha = sha256Hex(input.buffer);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (env.DEDUPE_REJECT_DUPLICATE_FILE_SHA) {
      const existingId = await findExistingBatchByFileSha(conn, sha, input.kind);
      if (existingId !== null) {
        const err = new Error('DUPLICATE_FILE_SHA');
        (err as Error & { existingBatchId: number }).existingBatchId = existingId;
        throw err;
      }
    }

    const [ins] = await conn.execute<ResultSetHeader>(
      `INSERT INTO import_batches (
        source_kind, source_file_name, source_sha256, imported_by_user_id,
        status, row_count_accepted, row_count_rejected
      ) VALUES (?, ?, ?, ?, 'pending', 0, 0)`,
      [input.kind, input.fileName, sha, input.userId]
    );
    const batchId = Number(ins.insertId);
    if (!Number.isFinite(batchId)) {
      throw new Error('BATCH_INSERT_FAILED');
    }

    let accepted = 0;
    let buf: { rowNum: number; vals: (string | null)[]; payload: string | null }[] = [];

    const pushChunk = async () => {
      if (!buf.length) return;
      if (input.kind === 'iw37n') await flushIw37n(conn, batchId, buf);
      else if (input.kind === 'confirm_wo') await flushConfirm(conn, batchId, buf);
      else await flushMb51(conn, batchId, buf);
      buf = [];
    };

    for (let i = 0; i < sourceRows.length; i++) {
      const row = sourceRows[i];
      const excelRow = i + 2;
      if (!rowHasAnyValue(row)) {
        continue;
      }

      const m = buildNormLookup(row);
      const payload = compactPayload(row);

      if (input.kind === 'iw37n') {
        const o = mapIw37nFromRow(m);
        buf.push({
          rowNum: excelRow,
          vals: [
            o.s_flag,
            o.mnt_plan,
            o.order_no,
            o.type,
            o.mat,
            o.bsc_start,
            o.act_finish,
            o.system_status,
            o.op_ac,
            o.operation_short_text,
            o.c_check,
            o.op_work_ctr,
            o.work,
            o.act_work,
            o.un_val,
            o.description,
            o.equipment,
            o.equipment_descriptn,
            o.functional_location,
            o.funct_loc_descrip,
          ],
          payload,
        });
      } else if (input.kind === 'confirm_wo') {
        const o = mapConfirmWoFromRow(m);
        buf.push({
          rowNum: excelRow,
          vals: [
            o.confirm_no,
            o.counter,
            o.ord_cat,
            o.order_no,
            o.posting_date,
            o.equipment,
            o.wk_ctr_act,
            o.act_work,
            o.un_wk_act,
            o.pg,
            o.pt_ac,
            o.created_on,
            o.un_col,
            o.rem_work,
            o.act_start_1,
            o.act_finish_1,
            o.act_start_2,
            o.act_finish_2,
            o.ccld_conf,
            o.wk_ctr_pln,
            o.sys_status,
            o.functional_location,
          ],
          payload,
        });
      } else {
        const o = mapMb51FromRow(m);
        buf.push({
          rowNum: excelRow,
          vals: [
            o.order_no,
            o.mat_doc,
            o.entry_date,
            o.po,
            o.pstng_date,
            o.doc_date,
            o.material_description,
            o.quantity_str,
            o.bun,
            o.amount_in_lc_str,
            o.crcy,
            o.mvt,
            o.cost_ctr,
            o.time_str,
            o.mat_yr,
            o.material_no,
          ],
          payload,
        });
      }

      accepted += 1;
      if (buf.length >= CHUNK) await pushChunk();
    }

    await pushChunk();

    const nonEmptyRows = sourceRows.filter(rowHasAnyValue).length;
    const emptySkipped = sourceRows.length - nonEmptyRows;
    const status: ImportRunResult['status'] = accepted > 0 ? 'success' : 'failed';

    await conn.query(
      `UPDATE import_batches SET
        finished_at = CURRENT_TIMESTAMP(3),
        status = ?,
        row_count_accepted = ?,
        row_count_rejected = ?,
        notes = NULL
      WHERE id = ?`,
      [status, accepted, emptySkipped, batchId]
    );

    await conn.commit();
    return { batchId, rowCountAccepted: accepted, rowCountRejected: emptySkipped, status };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
