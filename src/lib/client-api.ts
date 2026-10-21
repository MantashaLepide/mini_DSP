import { toScanRecord } from './scan-types.ts';
import type { ScanRecord, UploadResult } from './scan-types.ts';

export class ClientApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ClientApiError';
    this.status = status;
  }
}

const FALLBACK_MESSAGE = 'Something went wrong. Try again.';

async function readError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      return body.error;
    }
  } catch {
    // Non-JSON error bodies fall through to the generic message.
  }
  return FALLBACK_MESSAGE;
}

async function requestJson(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, cache: 'no-store', credentials: 'same-origin' });
  } catch {
    throw new ClientApiError(0, 'Unable to reach the server. Check your connection.');
  }
  if (!response.ok) {
    throw new ClientApiError(response.status, await readError(response));
  }
  return response.json();
}

/** Resolves true when signed in, false when the server reports no session (401). */
export async function fetchSession(): Promise<boolean> {
  try {
    await requestJson('/api/auth/session');
    return true;
  } catch (error) {
    if (error instanceof ClientApiError && error.status === 401) return false;
    throw error;
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  await requestJson('/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function signOut(): Promise<void> {
  await requestJson('/api/auth/sign-out', { method: 'POST' });
}

export async function fetchScans(): Promise<ScanRecord[]> {
  const body = await requestJson('/api/scans');
  if (!body || typeof body !== 'object' || !('scans' in body) || !Array.isArray(body.scans)) {
    throw new ClientApiError(503, 'Unable to load scans.');
  }
  return body.scans.map(toScanRecord);
}

export async function uploadScan(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const body = await requestJson('/api/scans', { method: 'POST', body: form });
  return body as UploadResult;
}
