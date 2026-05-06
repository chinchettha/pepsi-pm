export type ImportKind = 'iw37n' | 'confirm_wo' | 'gi' | 'gr';

export type ImportBatchRow = {
  id: number;
  source_kind: string;
  source_file_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  row_count_accepted: number | null;
  row_count_rejected: number | null;
};

export type ImportErrorRow = {
  id: number;
  import_batch_id: number;
  source_row_number: number | null;
  error_code: string | null;
  error_message: string | null;
};
