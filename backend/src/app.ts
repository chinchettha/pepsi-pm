import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { createApiV1Router } from './routes/index.js';
import { requestId } from './middleware/requestId.js';
import { httpLogger } from './middleware/logger.js';
import { optionalAuth } from './middleware/auth.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';

function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * เบราว์เซอร์ถือว่า `http://localhost:3000` กับ `http://127.0.0.1:3000` เป็นคนละ origin
 * ถ้าใน .env ใส่แค่ข้างหนึ่ง จะเพิ่มอีก hostname ที่พอร์ตเดียวกันให้อัตโนมัติ
 */
function addLoopbackAliases(origins: string[]): string[] {
  const out = new Set(origins);
  for (const o of origins) {
    const m = o.match(/^(https?:\/\/)(127\.0\.0\.1|localhost)(:\d+)?$/i);
    if (!m) continue;
    const [, proto, host, port = ''] = m;
    const twinHost = host.toLowerCase() === 'localhost' ? '127.0.0.1' : 'localhost';
    out.add(`${proto}${twinHost}${port}`);
  }
  return [...out];
}

/** รายการ origin ที่ CORS อนุญาตจริง (ใช้ log ตอนบูต) */
export function resolveCorsAllowedOrigins(raw: string): string[] {
  return addLoopbackAliases(parseCorsOrigins(raw));
}

export function createApp(): express.Application {
  const app = express();

  const allowedOrigins = resolveCorsAllowedOrigins(env.CORS_ORIGIN);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (allowedOrigins.includes(origin)) {
          callback(null, origin);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestId);
  app.use(httpLogger);
  app.use(optionalAuth);

  app.use(healthRouter);
  app.use(createApiV1Router());

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
