// Serves /p/:slug — the SPA shell with portfolio title, description and Open Graph tags filled in
// for public portfolios (link previews, search). Private / password portfolios get generic tags.
import { checkSlug, readRecord, storeConfigured } from './_lib/portfolio.js';

let shell = null;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function getShell(origin) {
  if (shell) return shell;
  const res = await fetch(`${origin}/index.html`);
  const text = await res.text();
  if (res.ok && process.env.VERCEL) shell = text; // cache per deployment on Vercel only
  return text;
}

export async function GET(request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || url.pathname.split('/').filter(Boolean).pop() || '';
  const origin = `${url.protocol}//${request.headers.get('x-forwarded-host') || url.host}`;
  let html = await getShell(origin);
  let title = 'Portfolio · Hire Ready';
  let desc = 'A portfolio made with Hire Ready.';
  let robots = 'noindex';
  if (storeConfigured() && !checkSlug(slug)) {
    try {
      const rec = await readRecord(slug);
      if (rec && rec.data && rec.visibility === 'public') {
        const a = rec.data.about || {};
        title = `${a.name || slug}${a.headline ? ` — ${a.headline}` : ''}`;
        desc = (a.bio || a.headline || desc).slice(0, 200);
        robots = 'index, follow';
      }
    } catch { /* fall back to generic tags */ }
  }
  const canonical = `${origin}/p/${esc(slug)}`;
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:type" content="profile" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${origin}/icons/icon-512.png" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join('\n    ');
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', `    ${tags}\n  </head>`);
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=30' },
  });
}
