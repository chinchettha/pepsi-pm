import { API_BASE_URL } from '../config/env';

const TOKEN_KEY = 'pepsi_pm_access_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export type ApiErrorBody = {
  error?: { code?: string; message?: string };
  requestId?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(status: number, message: string, code?: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** อ่าน body เป็น JSON หลัง fetch (เช่น multipart upload ที่ไม่ใช้ `apiJson`) */
export async function readJsonBody(res: Response): Promise<unknown> {
  return parseJsonSafe(res);
}

export function apiErrorFromResponse(res: Response, body: unknown): ApiError {
  const b = body as ApiErrorBody | null;
  return new ApiError(
    res.status,
    b?.error?.message ?? res.statusText,
    b?.error?.code,
    b?.requestId
  );
}

/**
 * เรียก backend โดยแนบ Bearer จาก localStorage (ถ้ามี)
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...init, headers });
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  const body = (await parseJsonSafe(res)) as ApiErrorBody | T | null;
  if (!res.ok) {
    const err = body as ApiErrorBody | null;
    const msg = err?.error?.message ?? res.statusText;
    const code = err?.error?.code;
    const requestId = err?.requestId;
    throw new ApiError(res.status, msg, code, requestId);
  }
  return body as T;
}
