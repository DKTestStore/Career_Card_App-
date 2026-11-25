// Local stand-in for Vercel: serves dist/ (SPA fallback), /api/portfolio and /p/:slug.
// Portfolios are written to PORTFOLIO_STORE_DIR (default .local-portfolios/) instead of Vercel Blob.
//   npm run build && npm run serve:local   → http://localhost:4174
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PORTFOLIO_STORE_DIR ||= path.join(root, '.local-portfolios');
delete process.env.BLOB_READ_WRITE_TOKEN;
const api = await import('../api/portfolio.js');
const pPage = await import('../api/p-page.js');
const dist = path.join(root, 'dist');
const PORT = Number(process.env.PORT || 4174);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

async function toRequest(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  return new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body });
}
async function send(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/portfolio') {
      const h = api[req.method];
      return h ? send(res, await h(await toRequest(req))) : (res.writeHead(405), res.end());
    }
    const m = /^\/p\/([^/]+)\/?$/.exec(url.pathname);
    if (m) {
      const r = await toRequest(req);
      return send(res, await pPage.GET(new Request(`http://${req.headers.host}/api/p-page?slug=${encodeURIComponent(m[1])}`, { headers: r.headers })));
    }
    let file = path.join(dist, decodeURIComponent(url.pathname));
    if (!file.startsWith(dist)) { res.writeHead(400); return res.end(); }
    let s = await stat(file).catch(() => null);
    if (!s || s.isDirectory()) { file = path.join(dist, 'index.html'); s = await stat(file); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end('error');
  }
}).listen(PORT, () => console.log(`Hire Ready local server on http://localhost:${PORT} (portfolios in ${process.env.PORTFOLIO_STORE_DIR})`));
