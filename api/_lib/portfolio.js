// Shared server helpers for portfolio publishing (Vercel Node functions, plain ESM JS).
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const scrypt = promisify(scryptCb);

export const MAX_BYTES = 2 * 1024 * 1024; // portfolio JSON incl. images
export const MAX_REQUEST_BYTES = MAX_BYTES + 64 * 1024;
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;
const RESERVED = new Set(['api', 'admin', 'app', 'www', 'p', 'new', 'edit', 'login', 'logout', 'signup', 'settings', 'portfolio', 'hireready', 'hire-ready', 'help', 'support', 'about', 'static', 'assets', 'null', 'undefined']);
export const THEMES = ['minimal', 'developer', 'creative', 'academic', 'editorial', 'midnight', 'brutalist', 'pastel'];
export const VISIBILITY = ['public', 'private', 'password'];

export function checkSlug(s) {
  if (typeof s !== 'string') return 'Slug is required.';
  if (!SLUG_RE.test(s) || s.includes('--')) return 'Use 3–40 lowercase letters, numbers or single hyphens.';
  if (RESERVED.has(s)) return 'That address is reserved.';
  return null;
}

/* ---------- responses ---------- */
export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers },
  });
}

/* ---------- tiny in-memory rate limit (per function instance; best effort) ---------- */
const buckets = new Map();
export function clientKey(request) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'local';
  // Only a short hash is kept in memory; raw IPs are never stored.
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}
export function rateLimited(request, kind, limit, windowMs) {
  const k = `${kind}:${clientKey(request)}`;
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || now - b.start > windowMs) { buckets.set(k, { start: now, n: 1 }); return false; }
  b.n += 1;
  if (buckets.size > 5000) buckets.clear();
  return b.n > limit;
}

/* ---------- hashing ---------- */
export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
export function sameHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
export async function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(pw, salt, 32)).toString('hex');
  return { salt, hash };
}
export async function checkPassword(pw, rec) {
  if (!rec || typeof pw !== 'string' || !pw) return false;
  const hash = (await scrypt(pw, rec.salt, 32)).toString('hex');
  return sameHash(hash, rec.hash);
}

/* ---------- sanitising: plain text only, safe URLs, image data URLs ---------- */
const URL_KEYS = /^(url|website|github|demo|linkedin|twitter|link|href)$/i;
const IMG_KEYS = /^(photo|cover|src|image)$/i;
const IMG_RE = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function cleanText(s, max = 4000) {
  return String(s).replace(CTRL, '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').slice(0, max);
}
export function cleanUrl(s) {
  const v = cleanText(s, 500).trim();
  if (!v) return '';
  if (/^mailto:[^\s]+$/i.test(v)) return v;
  const withProto = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    return u.protocol === 'https:' || u.protocol === 'http:' ? v : '';
  } catch { return ''; }
}
export function sanitize(value, key = '', depth = 0) {
  if (depth > 8) return null;
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    if (IMG_KEYS.test(key)) return IMG_RE.test(value) ? value : '';
    if (URL_KEYS.test(key)) return cleanUrl(value);
    return cleanText(value);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 60).map((v) => sanitize(v, key === 'gallery' ? 'src' : key, depth + 1)).filter((v) => v !== null && v !== '');
  }
  if (typeof value === 'object') {
    const out = {};
    let n = 0;
    for (const [k, v] of Object.entries(value)) {
      if (n++ > 80) break;
      if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(k)) continue;
      const s = sanitize(v, k, depth + 1);
      if (s !== null) out[k] = s;
    }
    return out;
  }
  return null;
}

export function stripPhone(data, resume) {
  if (data?.about) delete data.about.phone;
  if (data?.contact) delete data.contact.phone;
  if (resume?.content?.basics) resume.content.basics.phone = '';
}

/* ---------- storage: Vercel Blob (private) in production, a local folder for dev/tests ---------- */
const keyFor = (slug) => `portfolios/${slug}.json`;

function localDir() {
  return process.env.PORTFOLIO_STORE_DIR || '';
}
export function storeConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || localDir());
}

export async function readRecord(slug) {
  const dir = localDir();
  if (!process.env.BLOB_READ_WRITE_TOKEN && dir) {
    try { return JSON.parse(await readFile(path.join(dir, `${slug}.json`), 'utf8')); } catch { return null; }
  }
  const { get } = await import('@vercel/blob');
  const res = await get(keyFor(slug), { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return null;
  const text = await new Response(res.stream).text();
  try { return JSON.parse(text); } catch { return null; }
}

export async function writeRecord(slug, record) {
  const body = JSON.stringify(record);
  const dir = localDir();
  if (!process.env.BLOB_READ_WRITE_TOKEN && dir) {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${slug}.json`), body);
    return;
  }
  const { put } = await import('@vercel/blob');
  await put(keyFor(slug), body, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
}

export async function deleteRecord(slug) {
  const dir = localDir();
  if (!process.env.BLOB_READ_WRITE_TOKEN && dir) {
    await rm(path.join(dir, `${slug}.json`), { force: true });
    return;
  }
  const { del } = await import('@vercel/blob');
  await del(keyFor(slug));
}

/** What a visitor receives: never includes owner hash or password data. */
export function publicView(rec) {
  return { slug: rec.slug, theme: rec.theme, accent: rec.accent, data: rec.data, resume: rec.resume || null, updatedAt: rec.updatedAt, publishedAt: rec.publishedAt };
}
