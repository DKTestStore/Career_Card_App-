import type { PublicPortfolio, Visibility } from './types';

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: string; body?: Record<string, unknown> };

async function call<T>(init: RequestInit & { query?: string }): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api/portfolio${init.query ?? ''}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
    let body: Record<string, unknown> = {};
    try { body = await res.json(); } catch { /* non-JSON */ }
    if (res.ok) return { ok: true, status: res.status, data: body as T };
    return { ok: false, status: res.status, error: String(body.error ?? `Request failed (${res.status})`), body };
  } catch {
    return { ok: false, status: 0, error: 'You appear to be offline. Try again when you are connected.' };
  }
}
const post = <T>(body: unknown) => call<T>({ method: 'POST', body: JSON.stringify(body) });

export const fetchPortfolio = (slug: string) => call<PublicPortfolio>({ method: 'GET', query: `?slug=${encodeURIComponent(slug)}` });
export const viewWithPassword = (slug: string, password: string) => post<PublicPortfolio>({ action: 'view', slug, password });
export const checkSlug = (slug: string, token: string) => post<{ available: boolean; mine: boolean; reason?: string }>({ action: 'check', slug, token });
export const unpublish = (slug: string, token: string) => post<{ ok: boolean; deleted: boolean }>({ action: 'unpublish', slug, token });
export function publish(args: {
  slug: string; previousSlug?: string; token: string; visibility: Visibility; password?: string; hidePhone: boolean;
  theme: string; accent: string; data: unknown; resume: unknown;
}) {
  return post<{ ok: boolean; slug: string; visibility: Visibility; size: number; publishedAt: string; updatedAt: string }>({ action: 'publish', ...args });
}
