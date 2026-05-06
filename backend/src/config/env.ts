import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const boolish = z.preprocess(
  (v) => v === true || v === 'true' || v === '1' || v === 1,
  z.boolean()
);

const schema = z
  .object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number().default(5000),
    DATABASE_HOST: z.string().default('127.0.0.1'),
    DATABASE_PORT: z.coerce.number().default(3307),
    DATABASE_USER: z.string().default('root'),
    DATABASE_PASSWORD: z.string().default(''),
    DATABASE_NAME: z.string().default('pepsi_pm'),
    /** คั่นด้วย comma — รองรับทั้ง `http://localhost:3000` และ `http://127.0.0.1:3000` (เบราว์เซอร์ถือว่า origin คนละตัว) */
    CORS_ORIGIN: z
      .string()
      .default('http://127.0.0.1:3000,http://localhost:3000'),
    SKIP_AUTH: z
      .preprocess((v) => v === true || v === 'true' || v === '1' || v === 1, z.boolean())
      .default(false),
    JWT_SECRET: z.string().optional(),
    JWT_EXPIRES_IN: z.string().default('8h'),
    DEV_AUTH_SECRET: z.string().optional(),
    /** If true, reject upload when same file SHA already imported for that source_kind */
    DEDUPE_REJECT_DUPLICATE_FILE_SHA: z
      .preprocess((v) => v === true || v === 'true' || v === '1' || v === 1, z.boolean())
      .default(false),
    /** Worker idle sleep (ms); only used by `npm run worker` */
    WORKER_POLL_MS: z.coerce.number().min(200).default(2000),
    /** โฟลเดอร์เก็บไฟล์แนบ (relative ต่อ cwd ของ process) */
    ATTACHMENTS_DIR: z.string().default('data/attachments'),
    ATTACHMENTS_MAX_FILE_BYTES: z.coerce.number().min(1_000_000).default(15 * 1024 * 1024),
    /** false = รับเฉพาะ image/webp จาก client (ไม่เรียก sharp) */
    ATTACHMENTS_USE_SHARP: boolish.default(true),
  })
  .superRefine((data, ctx) => {
    if (!data.SKIP_AUTH) {
      if (!data.JWT_SECRET || data.JWT_SECRET.length < 16) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'JWT_SECRET (min 16 characters) is required when SKIP_AUTH is false',
          path: ['JWT_SECRET'],
        });
      }
    }
  });

type ParsedEnv = z.infer<typeof schema>;

export type Env = ParsedEnv & { ATTACHMENTS_ROOT_ABS: string };

const parsed: ParsedEnv = schema.parse(process.env);

export const env: Env = {
  ...parsed,
  ATTACHMENTS_ROOT_ABS: path.resolve(process.cwd(), parsed.ATTACHMENTS_DIR),
};
