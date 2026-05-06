import { errorRoute } from '../../config/routes';

/** รหัสที่หน้า `/error/:code` รองรับ */
export type ErrorCode =
  | '400'
  | '401'
  | '403'
  | '404'
  | '408'
  | '409'
  | '422'
  | '429'
  | '500'
  | '502'
  | '503'
  | '504'
  | 'network'
  | 'unknown';

const KNOWN = new Set<string>([
  '400',
  '401',
  '403',
  '404',
  '408',
  '409',
  '422',
  '429',
  '500',
  '502',
  '503',
  '504',
  'network',
  'unknown',
]);

export function normalizeErrorCode(raw: string | undefined): ErrorCode {
  if (!raw || typeof raw !== 'string') return 'unknown';
  const c = raw.trim().toLowerCase();
  if (KNOWN.has(c)) return c as ErrorCode;
  return 'unknown';
}

type Copy = {
  title: string;
  description: string;
  /** antd Result.status — ตัวเลข 403/404/500 ไม่ใช้สตริง */
  resultStatus: 'success' | 'error' | 'info' | 'warning' | 403 | 404 | 500;
};

const CATALOG: Record<ErrorCode, Copy> = {
  '400': {
    title: 'คำขอไม่ถูกต้อง',
    description: 'ข้อมูลที่ส่งไม่ครบหรือรูปแบบไม่ถูกต้อง (400)',
    resultStatus: 'warning',
  },
  '401': {
    title: 'ต้องเข้าสู่ระบบ',
    description: 'เซสชันหมดอายุหรือยังไม่ได้ยืนยันตัวตน (401)',
    resultStatus: 'warning',
  },
  '403': {
    title: 'ไม่มีสิทธิ์เข้าใช้',
    description: 'คุณไม่มีสิทธิ์เข้าถึงทรัพยากรนี้ (403)',
    resultStatus: 403,
  },
  '404': {
    title: 'ไม่พบหน้า',
    description: 'ไม่มีเส้นทางหรือข้อมูลที่ตรงกับที่ขอ (404)',
    resultStatus: 404,
  },
  '408': {
    title: 'คำขอหมดเวลา',
    description: 'เซิร์ฟเวอร์รอคำขอนานเกินไป (408)',
    resultStatus: 'warning',
  },
  '409': {
    title: 'ขัดแย้งข้อมูล',
    description: 'ข้อมูลชนกับสถานะปัจจุบัน (409)',
    resultStatus: 'warning',
  },
  '422': {
    title: 'ข้อมูลไม่ผ่านการตรวจ',
    description: 'ไม่ผ่านกฎความถูกต้องของข้อมูล (422)',
    resultStatus: 'warning',
  },
  '429': {
    title: 'เรียกใช้บ่อยเกินไป',
    description: 'ลดความถี่คำขอแล้วลองใหม่ (429)',
    resultStatus: 'warning',
  },
  '500': {
    title: 'ข้อผิดพลาดภายในเซิร์ฟเวอร์',
    description: 'เกิดข้อผิดพลาดที่ฝั่งระบบ (500)',
    resultStatus: 500,
  },
  '502': {
    title: 'เกตเวย์ผิดพลาด',
    description: 'ตัวกลางได้รับการตอบกลับที่ไม่ถูกต้อง (502)',
    resultStatus: 500,
  },
  '503': {
    title: 'บริการไม่พร้อม',
    description: 'เซิร์ฟเวอร์หรือฐานข้อมูลไม่พร้อมชั่วคราว (503)',
    resultStatus: 500,
  },
  '504': {
    title: 'เกตเวย์หมดเวลา',
    description: 'ตัวกลางรอต้นทางนานเกินไป (504)',
    resultStatus: 500,
  },
  network: {
    title: 'เชื่อมต่อไม่สำเร็จ',
    description: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ — ตรวจว่า backend รันและ URL ถูกต้อง',
    resultStatus: 'warning',
  },
  unknown: {
    title: 'เกิดข้อผิดพลาด',
    description: 'ไม่สามารถดำเนินการได้ — ลองใหม่ภายหลัง',
    resultStatus: 'error',
  },
};

export function getErrorCopy(code: ErrorCode): Copy {
  return CATALOG[code] ?? CATALOG.unknown;
}

/** แมป HTTP status จาก API → path `/error/:code` */
export function errorPathForHttpStatus(status: number): string {
  if (status === 400) return errorRoute('400');
  if (status === 401) return errorRoute('401');
  if (status === 403) return errorRoute('403');
  if (status === 404) return errorRoute('404');
  if (status === 408) return errorRoute('408');
  if (status === 409) return errorRoute('409');
  if (status === 422) return errorRoute('422');
  if (status === 429) return errorRoute('429');
  if (status === 500) return errorRoute('500');
  if (status === 502) return errorRoute('502');
  if (status === 503) return errorRoute('503');
  if (status === 504) return errorRoute('504');
  return errorRoute('unknown');
}
