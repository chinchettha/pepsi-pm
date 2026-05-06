import type { PoolConnection } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

export async function findExistingBatchByFileSha(
  conn: PoolConnection,
  sourceSha256: string,
  sourceKind: string
): Promise<number | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM import_batches
     WHERE source_sha256 = ? AND source_kind = ? AND source_sha256 IS NOT NULL
     ORDER BY id DESC LIMIT 1`,
    [sourceSha256, sourceKind]
  );
  const id = (rows[0] as { id: number } | undefined)?.id;
  return id !== undefined ? Number(id) : null;
}
