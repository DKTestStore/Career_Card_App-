// Portfolio publishing API.
//   GET  /api/portfolio?slug=x                  → public view (401 if password, 403 if private, 404 if none)
//   POST /api/portfolio {action:'check', slug, token?}       → { available, mine }
//   POST /api/portfolio {action:'publish', slug, token, ...}  → upsert (token must match the slug owner)
//   POST /api/portfolio {action:'view', slug, password}       → view of a password-protected portfolio
//   POST /api/portfolio {action:'unpublish', slug, token}     → delete
import {
  MAX_BYTES, MAX_REQUEST_BYTES, THEMES, VISIBILITY, checkPassword, checkSlug, deleteRecord, hashPassword, json,
  publicView, rateLimited, readRecord, sameHash, sanitize, sha256, storeConfigured, stripPhone, writeRecord,
} from './_lib/portfolio.js';

const HEX = /^#[0-9a-f]{6}$/i;
const notConfigured = () => json(503, { error: 'Publishing is not configured on this server.' });

export async function GET(request) {
  if (!storeConfigured()) return notConfigured();
  if (rateLimited(request, 'get', 240, 60_000)) return json(429, { error: 'Too many requests. Try again in a minute.' });
  const slug = new URL(request.url).searchParams.get('slug') || '';
  if (checkSlug(slug)) return json(404, { error: 'Not found' });
  const rec = await readRecord(slug);
  if (rec?.visibility === 'private') return json(403, { error: 'This portfolio is private.', private: true });
  if (!rec || !rec.data) return json(404, { error: 'Not found' });
  if (rec.visibility === 'password') return json(401, { error: 'Password required.', needsPassword: true, name: rec.data?.about?.name || '' });
  return json(200, publicView(rec));
}

async function readBody(request) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_REQUEST_BYTES) return { tooBig: true };
  const text = await request.text();
  if (text.length > MAX_REQUEST_BYTES) return { tooBig: true };
  try { return { body: JSON.parse(text) }; } catch { return { body: null }; }
}

export async function POST(request) {
  if (!storeConfigured()) return notConfigured();
  const { body, tooBig } = await readBody(request);
  if (tooBig) return json(413, { error: 'Portfolio is larger than 2 MB. Remove or shrink some images.' });
  if (!body || typeof body !== 'object') return json(400, { error: 'Invalid JSON.' });
  const { action } = body;
  const slug = String(body.slug || '');
  const slugErr = checkSlug(slug);

  if (action === 'check') {
    if (rateLimited(request, 'check', 120, 60_000)) return json(429, { error: 'Too many requests.' });
    if (slugErr) return json(200, { available: false, mine: false, reason: slugErr });
    const rec = await readRecord(slug);
    const mine = Boolean(rec && typeof body.token === 'string' && sameHash(sha256(body.token), rec.ownerHash));
    return json(200, { available: !rec || mine, mine });
  }

  if (action === 'view') {
    if (rateLimited(request, 'pw', 20, 10 * 60_000)) return json(429, { error: 'Too many attempts. Try again later.' });
    if (slugErr) return json(404, { error: 'Not found' });
    const rec = await readRecord(slug);
    if (rec?.visibility === 'private') return json(403, { error: 'This portfolio is private.', private: true });
    if (!rec || !rec.data) return json(404, { error: 'Not found' });
    if (rec.visibility === 'password' && !(await checkPassword(body.password, rec.password))) {
      return json(401, { error: 'Wrong password.', needsPassword: true, wrong: true });
    }
    return json(200, publicView(rec));
  }

  if (action === 'publish') {
    if (rateLimited(request, 'publish', 30, 10 * 60_000)) return json(429, { error: 'Too many publishes. Wait a few minutes.' });
    if (slugErr) return json(400, { error: slugErr });
    if (typeof body.token !== 'string' || body.token.length < 32 || body.token.length > 200) return json(400, { error: 'Missing edit key.' });
    const ownerHash = sha256(body.token);
    const existing = await readRecord(slug);
    if (existing && !sameHash(ownerHash, existing.ownerHash)) return json(409, { error: 'That address is already taken.' });

    const visibility = VISIBILITY.includes(body.visibility) ? body.visibility : 'public';
    const theme = THEMES.includes(body.theme) ? body.theme : 'minimal';
    const accent = HEX.test(body.accent || '') ? body.accent : '#5B3DF5';
    const data = sanitize(body.data || {}, 'data');
    const resume = body.resume ? sanitize(body.resume, 'resume') : null;
    if (body.hidePhone) stripPhone(data, resume);

    let password = existing?.password || null;
    if (visibility === 'password') {
      if (typeof body.password === 'string' && body.password) {
        if (body.password.length < 4 || body.password.length > 128) return json(400, { error: 'Password must be 4–128 characters.' });
        password = await hashPassword(body.password);
      }
      if (!password) return json(400, { error: 'Set a password for a password-protected portfolio.' });
    } else {
      password = null;
    }

    const now = new Date().toISOString();
    // Private: keep only the address reservation — the content is not stored on the server.
    const record = {
      v: 1, slug, ownerHash, visibility, theme, accent, hidePhone: Boolean(body.hidePhone),
      password, data: visibility === 'private' ? null : data, resume: visibility === 'private' ? null : resume,
      publishedAt: existing?.publishedAt || now, updatedAt: now,
    };
    const size = Buffer.byteLength(JSON.stringify(record));
    if (size > MAX_BYTES) return json(413, { error: 'Portfolio is larger than 2 MB. Remove or shrink some images.' });
    await writeRecord(slug, record);
    // A renamed address: drop the old one if this owner holds it.
    if (typeof body.previousSlug === 'string' && body.previousSlug !== slug && !checkSlug(body.previousSlug)) {
      const old = await readRecord(body.previousSlug);
      if (old && sameHash(ownerHash, old.ownerHash)) await deleteRecord(body.previousSlug);
    }
    return json(200, { ok: true, slug, visibility, size, publishedAt: record.publishedAt, updatedAt: now });
  }

  if (action === 'unpublish') {
    if (rateLimited(request, 'publish', 30, 10 * 60_000)) return json(429, { error: 'Too many requests.' });
    if (slugErr) return json(400, { error: slugErr });
    const rec = await readRecord(slug);
    if (!rec) return json(200, { ok: true, deleted: false });
    if (typeof body.token !== 'string' || !sameHash(sha256(body.token), rec.ownerHash)) return json(403, { error: 'Only the owner can unpublish this portfolio.' });
    await deleteRecord(slug);
    return json(200, { ok: true, deleted: true });
  }

  return json(400, { error: 'Unknown action.' });
}
