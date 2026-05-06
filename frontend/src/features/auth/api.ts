import { apiFetch, apiJson, setStoredToken } from '../../api/client';
import type { AuthUser } from './types';

export type MeResponse = {
  user: AuthUser;
  requestId?: string;
};

export async function fetchMe(): Promise<MeResponse | null> {
  const res = await apiFetch('/api/v1/auth/me', { method: 'GET' });
  if (res.status === 401) {
    setStoredToken(null);
    return null;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as MeResponse;
}

export type DevTokenResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
};

export async function fetchDevToken(gpid: string, devSecret: string): Promise<DevTokenResponse> {
  return apiJson<DevTokenResponse>('/api/v1/auth/dev-token', {
    method: 'POST',
    headers: { 'X-Dev-Auth-Secret': devSecret },
    body: JSON.stringify({ gpid }),
  });
}

export function persistToken(token: string | null): void {
  setStoredToken(token);
}
