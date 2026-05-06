import { normalizeHeaderKey } from './spreadsheetParse.js';

export function buildNormLookup(row: Record<string, string>): Map<string, string> {
  const m = new Map<string, string>();
  for (const [k, v] of Object.entries(row)) {
    m.set(normalizeHeaderKey(k), v ?? '');
  }
  return m;
}

export function pickField(m: Map<string, string>, aliases: string[]): string | null {
  for (const a of aliases) {
    const v = m.get(normalizeHeaderKey(a));
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return null;
}

/** IW37N / PC50-style order list — see docs/SAP_DATA_IMPORT_EXPORT_COLUMNS.md */
export function mapIw37nFromRow(m: Map<string, string>) {
  return {
    s_flag: pickField(m, ['S']),
    mnt_plan: pickField(m, ['MntPlan', 'Mnt Plan', 'Mnt. Plan']),
    order_no: pickField(m, ['Order']),
    type: pickField(m, ['Type']),
    mat: pickField(m, ['MAT', 'Mat']),
    bsc_start: pickField(m, ['Bsc start', 'Bsc Start']),
    act_finish: pickField(m, ['Act.finish', 'Act. finish']),
    system_status: pickField(m, ['System status', 'System Status']),
    op_ac: pickField(m, ['OpAc', 'Op Ac']),
    operation_short_text: pickField(m, ['Operation short text', 'Operation Short Text']),
    c_check: pickField(m, ['C']),
    op_work_ctr: pickField(m, ['Op.WorkCtr', 'Op WorkCtr', 'Op. Work Ctr']),
    work: pickField(m, ['Work']),
    act_work: pickField(m, ['Act. work', 'Act work']),
    un_val: pickField(m, ['Un.', 'Un']),
    description: pickField(m, ['Description']),
    equipment: pickField(m, ['Equipment']),
    equipment_descriptn: pickField(m, ['Equipment descriptn', 'Equipment descriptn.', 'Equipment Descriptn']),
    functional_location: pickField(m, [
      'Functional Location',
      'Functional Loc.',
      'Functional loc.',
      'Functional Location ',
    ]),
    funct_loc_descrip: pickField(m, ['FunctLocDescrip.', 'FunctLocDescrip', 'Funct Loc Descrip']),
  };
}

/** Confirm WO — duplicate Act.start / Act.finish columns: first pair preferred */
export function mapConfirmWoFromRow(m: Map<string, string>) {
  const actStart1 =
    pickField(m, ['Act.start', 'Act. start']) ??
    pickField(m, ['Act.start__1', 'Act. start__1']);
  const actFinish1 =
    pickField(m, ['Act.finish', 'Act. finish']) ??
    pickField(m, ['Act.finish__1', 'Act. finish__1']);
  return {
    confirm_no: pickField(m, ['Confirm.', 'Confirm']),
    counter: pickField(m, ['Counter']),
    ord_cat: pickField(m, ['OrdCat', 'Ord Cat']),
    order_no: pickField(m, ['Order']),
    posting_date: pickField(m, ['Postg date', 'Postg Date', 'Posting date']),
    equipment: pickField(m, ['Equipment']),
    wk_ctr_act: pickField(m, ['WkCtrAct', 'Wk Ctr Act']),
    act_work: pickField(m, ['Act. work', 'Act work']),
    un_wk_act: pickField(m, ['Un. WkAct', 'Un. Wk Act', 'Un WkAct']),
    pg: pickField(m, ['PG']),
    pt_ac: pickField(m, ['PtAc', 'Pt Ac']),
    created_on: pickField(m, ['Created On', 'Created on']),
    un_col: pickField(m, ['Un.', 'Un']),
    rem_work: pickField(m, ['Rem. Work', 'Rem Work']),
    act_start_1: actStart1,
    act_finish_1: actFinish1,
    act_start_2: pickField(m, ['Act.start__2', 'Act. start__2', 'Act. start_1']),
    act_finish_2: pickField(m, ['Act.finish__2', 'Act. finish__2', 'Act.finish_1']),
    ccld_conf: pickField(m, ['CcldConf', 'Ccld Conf']),
    wk_ctr_pln: pickField(m, ['WkCtrPln', 'Wk Ctr Pln']),
    sys_status: pickField(m, ['Sys.Status', 'Sys Status', 'Sys. Status']),
    functional_location: pickField(m, ['Functional Location', 'Functional loc.']),
  };
}

/** GI / GR / MB51-style movement */
export function mapMb51FromRow(m: Map<string, string>) {
  return {
    order_no: pickField(m, ['Order', '﻿Order']),
    mat_doc: pickField(m, ['Mat. Doc.', 'Mat Doc.', 'Mat Doc']),
    entry_date: pickField(m, ['Entry Date', 'Entry date']),
    po: pickField(m, ['PO']),
    pstng_date: pickField(m, ['Pstng Date', 'Pstng date']),
    doc_date: pickField(m, ['Doc. Date', 'Doc Date']),
    material_description: pickField(m, ['Material Description']),
    quantity_str: pickField(m, ['Quantity']),
    bun: pickField(m, ['BUn', 'Bun']),
    amount_in_lc_str: pickField(m, ['Amount in LC', 'Amount In LC']),
    crcy: pickField(m, ['Crcy', 'CRCY']),
    mvt: pickField(m, ['MvT', 'MVT', 'Mvt']),
    cost_ctr: pickField(m, ['Cost Ctr', 'CostCtr']),
    time_str: pickField(m, ['Time']),
    mat_yr: pickField(m, ['MatYr', 'Mat Yr']),
    material_no: pickField(m, ['Material']),
  };
}

export function rowHasAnyValue(row: Record<string, string>): boolean {
  return Object.values(row).some((v) => v && String(v).trim() !== '');
}

export function compactPayload(row: Record<string, string>): string | null {
  const entries = Object.entries(row)
    .filter(([, v]) => v && String(v).trim() !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return null;
  const obj = Object.fromEntries(entries);
  const s = JSON.stringify(obj);
  if (s.length > 60_000) return JSON.stringify({ _truncated: true, keys: Object.keys(obj) });
  return s;
}
