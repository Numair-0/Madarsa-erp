export class ApiError extends Error { constructor(public status: number, message: string, public code?: string, public details?: unknown) { super(message); } }
export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`/api${path}`, { ...rest, credentials: 'same-origin', headers: { ...(json ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(json ? { body: JSON.stringify(json) } : {}) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error?.message ?? `Request failed (${res.status})`, body?.error?.code, body?.error?.details);
  return body.data as T;
}
