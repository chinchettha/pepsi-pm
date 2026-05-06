function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Base URL ของ backend (ไม่มี trailing slash) — ต้องรวม path `/api/v1` ตอนเรียก */
export const API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5000'
);

export const DEV_AUTH_SECRET_PREFILL = import.meta.env.VITE_DEV_AUTH_SECRET ?? '';
