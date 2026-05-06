import type { ErrorRequestHandler } from 'express';
import multer from 'multer';

/** mysql2 cannot complete handshake when MariaDB switches to unsupported plugins (e.g. auth_gssapi_client). */
function dbAuthPluginFailure(err: unknown): { status: number; code: string; message: string } | null {
  if (!(err instanceof Error)) return null;
  const anyErr = err as Error & { code?: string };
  const msg = err.message ?? '';
  if (
    anyErr.code === 'AUTH_SWITCH_PLUGIN_ERROR' ||
    msg.includes('auth_gssapi_client') ||
    (msg.includes('unknown plugin') && msg.includes('authentication'))
  ) {
    return {
      status: 503,
      code: 'DATABASE_AUTH_PLUGIN_UNSUPPORTED',
      message:
        'MariaDB ใช้ authentication plugin ที่ mysql2 (Node) ไม่รองรับ (เช่น auth_gssapi_client). ' +
        'สร้าง user สำหรับแอปด้วยรหัสผ่านแบบมาตรฐาน แล้วตั้ง DATABASE_USER / DATABASE_PASSWORD ใน backend/.env — ดู database/README.md หัวข้อ « mysql2 »',
    };
  }
  return null;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const authPlugin = dbAuthPluginFailure(err);
  if (authPlugin) {
    console.error('[error]', req.requestId, err);
    res.status(authPlugin.status).json({
      error: { code: authPlugin.code, message: authPlugin.message },
      requestId: req.requestId,
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    res.status(status).json({
      error: { code: err.code, message: err.message },
      requestId: req.requestId,
    });
    return;
  }

  const status =
    typeof err === 'object' && err && 'status' in err && typeof (err as { status: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 500;
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  if (status >= 500) {
    console.error('[error]', req.requestId, err);
  }
  res.status(status).json({
    error: { code: 'INTERNAL_ERROR', message },
    requestId: req.requestId,
  });
};
