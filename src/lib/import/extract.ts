/**
 * Text extraction from uploaded résumé files. 100% client-side.
 * PDF → pdf.js (lazy chunk + worker), DOCX → fflate unzip + DOMParser, TXT → as-is.
 * Imported only via dynamic import() so none of this is in the main bundle.
 */
export interface Line { text: string; bullet?: boolean; bold?: boolean; size?: number; gapBefore?: boolean }
export interface Extracted { kind: 'pdf' | 'docx' | 'txt'; lines: Line[]; text: string; pages?: number }

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPT = '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

const BULLET_RX = /^\s*([•●▪■◦○◆◇►▶➢➤✓✔·*\u2022\u25CF\u25AA\uF0B7\uF0A7-]|–|—)\s+/;

export function fileKind(f: File): Extracted['kind'] | null {
  const n = f.name.toLowerCase();
  if (n.endsWith('.pdf') || f.type === 'application/pdf') return 'pdf';
  if (n.endsWith('.docx') || f.type.includes('wordprocessingml')) return 'docx';
  if (n.endsWith('.txt') || n.endsWith('.md') || f.type.startsWith('text/')) return 'txt';
  return null;
}

export async function extractFile(file: File): Promise<Extracted> {
  const kind = fileKind(file);
  if (!kind) throw new Error('Unsupported file. Upload a PDF, Word (.docx) or .txt file.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That file is larger than 8 MB.');
  const buf = new Uint8Array(await file.arrayBuffer());
  let out: Extracted;
  if (kind === 'pdf') out = await fromPdf(buf);
  else if (kind === 'docx') out = await fromDocx(buf);
  else out = fromText(new TextDecoder().decode(buf));
  if (out.text.replace(/\s/g, '').length < 20) {
    throw new Error(kind === 'pdf'
      ? 'No selectable text found in this PDF. It may be a scanned image; export a text PDF or upload the Word file instead.'
      : 'This file does not contain readable text.');
  }
  return out;
}

export function fromText(t: string): Extracted {
  const lines = t.replace(/\r\n?/g, '\n').split('\n').map(clean).map((raw): Line => (raw.trim() ? toLine(raw) : { text: '' }));
  return finish('txt', lines);
}

function clean(s: string): string {
  return s.replace(/[\u00A0\u2007\u202F]/g, ' ').replace(/\u00AD/g, '').replace(/\uFB01/g, 'fi').replace(/\uFB02/g, 'fl').replace(/[ \t]+/g, ' ').trimEnd();
}
function toLine(raw: string, extra: Partial<Line> = {}): Line {
  const m = BULLET_RX.exec(raw);
  if (m) return { text: raw.slice(m[0].length).trim(), bullet: true, ...extra };
  return { text: raw.trim(), ...extra };
}
function finish(kind: Extracted['kind'], raw: Line[], pages?: number): Extracted {
  // Collapse blank lines into a gapBefore flag on the next line.
  const lines: Line[] = [];
  let gap = false;
  for (const l of raw) {
    if (!l.text.trim()) { gap = true; continue; }
    lines.push(gap ? { ...l, gapBefore: true } : l);
    gap = false;
  }
  return { kind, lines, pages, text: lines.map((l) => (l.bullet ? '• ' : '') + l.text).join('\n') };
}

/* ---------- PDF ---------- */
interface PdfItem { str: string; transform: number[]; width: number; height: number; hasEOL?: boolean; fontName?: string }

async function fromPdf(data: Uint8Array): Promise<Extracted> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data, useSystemFonts: false });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error('Reading this PDF took too long. Try the Word (.docx) version.')), 30000); });
  const doc = await Promise.race([task.promise, timeout]).catch((e: unknown) => { void task.destroy(); throw e instanceof Error && /too long/.test(e.message) ? e : new Error('Could not read this PDF. It may be damaged or password-protected.'); }).finally(() => clearTimeout(timer));
  const out: Line[] = [];
  try {
    for (let p = 1; p <= Math.min(doc.numPages, 10); p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const styles = tc.styles as Record<string, { fontFamily?: string }>;
      const items = (tc.items as PdfItem[]).filter((it) => typeof it.str === 'string');
      out.push(...pdfLines(items, styles, page.view[2] ?? 600));
      if (p > 1) out.push({ text: '' });
    }
  } finally { void task.destroy(); }
  return finish('pdf', out, doc.numPages);
}

/** Group text runs into visual lines by baseline, detect column gaps, bullets and blank-line gaps. */
function pdfLines(items: PdfItem[], styles: Record<string, { fontFamily?: string }>, pageW: number): Line[] {
  type Run = { x: number; y: number; w: number; h: number; s: string; bold: boolean };
  const runs: Run[] = items.filter((i) => i.str.length).map((i) => ({
    x: i.transform[4], y: i.transform[5], w: i.width, h: Math.abs(i.transform[3]) || i.height || 10, s: i.str,
    bold: /bold|black|heavy|semibold/i.test(`${i.fontName ?? ''} ${styles[i.fontName ?? '']?.fontFamily ?? ''}`),
  }));
  // Two-column (sidebar) layout: if many runs start right of a vertical gutter, read left column then right.
  const cols = splitColumns(runs, pageW);
  const lines: Line[] = [];
  for (const col of cols) {
    col.sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: Run[][] = [];
    for (const r of col) {
      const row = rows[rows.length - 1];
      if (row && Math.abs(row[0].y - r.y) <= Math.max(2, r.h * 0.35)) row.push(r); else rows.push([r]);
    }
    let prevY: number | null = null, prevH = 10;
    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);
      let s = '';
      let lastEnd = -1;
      for (const r of row) {
        if (lastEnd >= 0) {
          const gap = r.x - lastEnd;
          if (gap > r.h * 1.5) s += '   '; // a tab-like gap (e.g. dates pushed right)
          else if (gap > r.h * 0.15 && !s.endsWith(' ') && !r.s.startsWith(' ')) s += ' ';
        }
        s += r.s;
        lastEnd = r.x + r.w;
      }
      const text = clean(s);
      if (!text.trim()) continue;
      const h = Math.max(...row.map((r) => r.h));
      const gapBefore = prevY !== null && prevY - row[0].y > Math.max(prevH, h) * 1.75;
      if (gapBefore) lines.push({ text: '' });
      const bold = row.filter((r) => r.s.trim()).every((r) => r.bold);
      lines.push(toLine(text, { bold, size: Math.round(h * 10) / 10 }));
      prevY = row[0].y; prevH = h;
    }
    lines.push({ text: '' });
  }
  return lines;
}

function splitColumns<T extends { x: number; w: number }>(runs: T[], pageW: number): T[][] {
  if (runs.length < 30) return [runs];
  // Look for an x position (30%–70% of width) that no run crosses and with plenty of text on both sides.
  const step = pageW / 60;
  let best: { x: number; score: number } | null = null;
  for (let x = pageW * 0.25; x <= pageW * 0.72; x += step) {
    const crossing = runs.filter((r) => r.x < x - 2 && r.x + r.w > x + 2).length;
    if (crossing > runs.length * 0.02) continue;
    const left = runs.filter((r) => r.x + r.w <= x).length, right = runs.length - left;
    if (left < runs.length * 0.15 || right < runs.length * 0.15) continue;
    const score = Math.min(left, right);
    if (!best || score > best.score) best = { x, score };
  }
  if (!best) return [runs];
  return [runs.filter((r) => r.x + r.w <= best!.x), runs.filter((r) => r.x + r.w > best!.x)];
}

/* ---------- DOCX ---------- */
async function fromDocx(data: Uint8Array): Promise<Extracted> {
  const { unzipSync, strFromU8 } = await import('fflate');
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(data, { filter: (f) => f.name === 'word/document.xml' }); } catch { throw new Error('Could not open this Word file. Is it a .docx (not the older .doc)?'); }
  const xml = files['word/document.xml'];
  if (!xml) throw new Error('This .docx has no document body.');
  const dom = new DOMParser().parseFromString(strFromU8(xml), 'application/xml');
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const out: Line[] = [];
  const body = dom.getElementsByTagNameNS(W, 'body')[0];
  if (!body) throw new Error('This .docx has no document body.');
  const walk = (el: Element) => {
    for (const ch of Array.from(el.children)) {
      if (ch.namespaceURI === W && ch.localName === 'p') para(ch);
      else if (ch.namespaceURI === W && ch.localName === 'tbl') {
        for (const tr of Array.from(ch.getElementsByTagNameNS(W, 'tr'))) {
          const cells = Array.from(tr.getElementsByTagNameNS(W, 'tc')).map((tc) => Array.from(tc.getElementsByTagNameNS(W, 'p')).map(pText).filter(Boolean));
          // One-row-per-line for simple tables; multi-paragraph cells are emitted cell by cell.
          if (cells.every((c) => c.length <= 1)) { const t = cells.map((c) => c[0] ?? '').filter(Boolean).join('   '); if (t) out.push(toLine(clean(t))); }
          else for (const tc of Array.from(tr.getElementsByTagNameNS(W, 'tc'))) walk(tc);
        }
        out.push({ text: '' });
      } else if (ch.namespaceURI === W && (ch.localName === 'sdt' || ch.localName === 'sdtContent' || ch.localName === 'customXml')) walk(ch);
    }
  };
  const pText = (p: Element): string => {
    let s = '';
    const rec = (n: Element) => {
      for (const c of Array.from(n.children)) {
        if (c.namespaceURI !== W) { if (c.localName === 'AlternateContent') continue; rec(c); continue; }
        if (c.localName === 't') s += c.textContent ?? '';
        else if (c.localName === 'tab') s += '   ';
        else if (c.localName === 'br' || c.localName === 'cr') s += '\n';
        else if (c.localName === 'pPr' || c.localName === 'rPr' || c.localName === 'instrText' || c.localName === 'delText') continue;
        else rec(c);
      }
    };
    rec(p);
    return s;
  };
  const para = (p: Element) => {
    const text = pText(p);
    const pPr = p.getElementsByTagNameNS(W, 'pPr')[0];
    const isList = !!pPr?.getElementsByTagNameNS(W, 'numPr')[0] || /List/i.test(pPr?.getElementsByTagNameNS(W, 'pStyle')[0]?.getAttributeNS(W, 'val') ?? '');
    const style = pPr?.getElementsByTagNameNS(W, 'pStyle')[0]?.getAttributeNS(W, 'val') ?? '';
    const runs = Array.from(p.getElementsByTagNameNS(W, 'r')).filter((r) => (r.textContent ?? '').trim());
    const bold = runs.length > 0 && runs.every((r) => !!r.getElementsByTagNameNS(W, 'b')[0]) || /Heading|Title/i.test(style);
    if (!text.trim()) { out.push({ text: '' }); return; }
    text.split('\n').forEach((t, i) => {
      const c = clean(t);
      if (!c.trim()) return;
      const l = toLine(c, { bold });
      out.push(isList && i === 0 ? { ...l, bullet: true } : l);
    });
  };
  walk(body);
  return finish('docx', out);
}
