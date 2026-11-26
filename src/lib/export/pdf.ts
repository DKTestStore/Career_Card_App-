/**
 * True, text-selectable PDF export with jsPDF (lazy-loaded). Uses the PDF base-14
 * fonts (Helvetica / Times / Courier) so text stays searchable and parseable by
 * ATS software. Single-column templates export single-column; sidebar templates
 * keep their sidebar (skills / education / certifications), drawn as real text.
 */
import type { jsPDF as JsPDF } from 'jspdf';
import type { Resume } from '../types';
import { buildModel, fileName, saveBlob, SIDE_KEYS, type DocEntry, type DocModel, type DocSection } from './model';

const PAGE_W = 595.28, PAGE_H = 841.89;

/** Base-14 fonts only cover WinAnsi; map the common extras and drop the rest. */
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.split(''));
export function pdfSafe(s: string): string {
  return s.replace(/₹\s?/g, 'Rs. ').replace(/[→⇒➜➔]/g, '->').replace(/[←]/g, '<-').replace(/[✓✔]/g, '+').replace(/[★☆]/g, '*')
    .replace(/[\u2010\u2011\u2012]/g, '-').replace(/\u2212/g, '-').replace(/[\u2032]/g, "'").replace(/[\u2033]/g, '"').replace(/\u2026/g, '...')
    .replace(/[\u00A0\u2007\u202F\u2009\u200A]/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '')
    .normalize('NFC').split('').map((ch) => (ch.charCodeAt(0) < 256 || WIN_ANSI_EXTRA.has(ch) ? ch : ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\xFF]/g, '') || '?')).join('');
}

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => { const h = hex.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const INK: Rgb = [28, 26, 38], BODY: Rgb = [55, 52, 66], MUTED: Rgb = [110, 106, 124], WHITE: Rgb = [255, 255, 255];

interface Col { x: number; w: number; y: number; page: number; dark: boolean }

export async function resumePdfBlob(r: Pick<Resume, 'name' | 'template' | 'accent' | 'customColor' | 'font' | 'content'>): Promise<{ blob: Blob; name: string; pages: number }> {
  const { jsPDF } = await import('jspdf');
  const m = buildModel(r);
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const pages = render(doc, m);
  doc.setProperties({ title: `${m.name} — Résumé`, author: m.name, subject: m.label || 'Résumé', keywords: 'resume, cv', creator: 'Hire Ready' });
  return { blob: doc.output('blob'), name: fileName(m, 'pdf'), pages };
}

export async function downloadResumePdf(r: Parameters<typeof resumePdfBlob>[0]) {
  const { blob, name } = await resumePdfBlob(r);
  saveBlob(name, blob);
  return name;
}

function render(doc: JsPDF, m: DocModel): number {
  const s = m.style;
  const accent = rgb(s.accent), soft = rgb(s.soft), sidebar = rgb(s.sidebar);
  const family = s.font === 'sans' ? 'helvetica' : s.font === 'mono' ? 'courier' : 'times';
  const headFamily = s.headFont === 'mono' ? 'courier' : s.headFont === 'sans' ? 'helvetica' : 'times';
  const scale = s.compact ? 0.94 : 1;
  const FS = { body: 9.6 * scale, small: 8.6 * scale, title: 10.4 * scale, head: 10.6 * scale, name: 24, label: 10.5 };
  const LH = s.compact ? 1.28 : s.airy ? 1.42 : 1.34;
  const M = s.compact ? 36 : s.airy ? 50 : 42; // page margin
  const gap = s.compact ? 8 : s.airy ? 15 : 11;
  const side = s.side;
  const sideW = side ? 170 : 0;
  const sideX = side ? (side.at === 'left' ? 0 : PAGE_W - sideW) : 0;
  const mainX = side ? (side.at === 'left' ? sideW + 24 : M) : M;
  const mainW = side ? PAGE_W - sideW - 24 - M : PAGE_W - 2 * M;
  let pageCount = 1;

  const decor = () => {
    if (side) {
      doc.setFillColor(...(side.dark ? sidebar : soft));
      doc.rect(sideX, 0, sideW, PAGE_H, 'F');
    }
  };
  const gotoPage = (n: number) => {
    while (pageCount < n) { doc.addPage(); pageCount++; decor(); }
    doc.setPage(n);
  };
  const ensure = (c: Col, h: number) => {
    if (c.y + h > PAGE_H - M) { c.page++; gotoPage(c.page); c.y = M; } else gotoPage(c.page);
  };
  const set = (fam: string, style: 'normal' | 'bold' | 'italic' | 'bolditalic', size: number, color: Rgb) => {
    doc.setFont(fam, style); doc.setFontSize(size); doc.setTextColor(...color);
  };
  const lines = (t: string, w: number) => doc.splitTextToSize(pdfSafe(t), w) as string[];
  const para = (c: Col, t: string, size = FS.body, color: Rgb = BODY, style: 'normal' | 'italic' | 'bold' = 'normal', fam = family, indent = 0) => {
    set(fam, style, size, c.dark ? WHITE : color);
    for (const ln of lines(t, c.w - indent)) { ensure(c, size * LH); doc.text(ln, c.x + indent, c.y + size); c.y += size * LH; }
  };

  decor();
  // ---------- header ----------
  const main: Col = { x: mainX, w: mainW, y: M, page: 1, dark: false };
  if (s.stripe) { doc.setFillColor(...accent); doc.rect(0, 0, PAGE_W, 8, 'F'); main.y += 4; }
  const sideCol: Col = { x: sideX + 18, w: sideW - 36, y: M, page: 1, dark: !!side?.dark };
  const headerInSide = !!side?.dark;
  const contactText = m.contacts.map(pdfSafe).join('   ·   ');
  if (headerInSide) {
    set(headFamily, 'bold', 19, WHITE);
    for (const ln of lines(m.name, sideCol.w)) { doc.text(ln, sideCol.x, sideCol.y + 19); sideCol.y += 23; }
    if (m.label) { para(sideCol, m.label.toUpperCase(), 8.4, WHITE, 'bold', 'helvetica'); }
    sideCol.y += 8;
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5); doc.line(sideCol.x, sideCol.y, sideCol.x + sideCol.w, sideCol.y); sideCol.y += 12;
    sideHeading(sideCol, 'Contact');
    for (const ct of m.contacts) para(sideCol, ct, FS.small, WHITE);
    sideCol.y += gap;
  } else if (s.band) {
    const bandH = 30 + 30 + (m.label ? 16 : 0) + Math.max(1, lines(contactText, PAGE_W - 2 * M).length) * 12;
    doc.setFillColor(...sidebar); doc.rect(0, 0, PAGE_W, bandH, 'F');
    let y = 30;
    set(headFamily, 'bold', 26, WHITE); doc.text(pdfSafe(m.name), M, y + 22); y += 32;
    if (m.label) { set('helvetica', 'bold', FS.label, WHITE); doc.text(pdfSafe(m.label.toUpperCase()), M, y + 8); y += 18; }
    set('helvetica', 'normal', 8.8, WHITE);
    for (const ln of lines(contactText, PAGE_W - 2 * M)) { doc.text(ln, M, y + 9); y += 12; }
    main.y = bandH + 20; sideCol.y = bandH + 20;
    if (side) { main.x = mainX; }
  } else {
    const fullX = side && !side.dark ? M : main.x, fullW = side && !side.dark ? PAGE_W - 2 * M : main.w;
    const cx = s.align === 'center' ? fullX + fullW / 2 : fullX;
    const opt = s.align === 'center' ? { align: 'center' as const } : undefined;
    set(headFamily, 'bold', FS.name, accent);
    if (s.split) {
      doc.text(pdfSafe(m.name), fullX, main.y + FS.name);
      set('helvetica', 'normal', 8.6, MUTED);
      m.contacts.slice(0, 5).forEach((ct, i) => doc.text(pdfSafe(ct), fullX + fullW, main.y + 8 + i * 11, { align: 'right' }));
      let y = main.y + FS.name + 8;
      if (m.label) { set('helvetica', 'bold', FS.label, BODY); doc.text(pdfSafe(m.label.toUpperCase()), fullX, y + 8); y += 16; }
      y = Math.max(y, main.y + 8 + Math.min(5, m.contacts.length) * 11) + 6;
      doc.setDrawColor(...accent); doc.setLineWidth(1.6); doc.line(fullX, y, fullX + fullW, y);
      main.y = y + 16;
    } else {
      doc.text(pdfSafe(m.name), cx, main.y + FS.name, opt); main.y += FS.name + 8;
      if (m.label) { set('helvetica', 'bold', FS.label, BODY); doc.text(pdfSafe(m.label.toUpperCase()), cx, main.y + 8, opt); main.y += 17; }
      set('helvetica', 'normal', 8.8, MUTED);
      for (const ln of lines(contactText, fullW)) { doc.text(ln, cx, main.y + 9, opt); main.y += 12; }
      main.y += 10;
    }
    if (side && !side.dark) {
      doc.setDrawColor(225, 222, 232); doc.setLineWidth(0.6); doc.line(M, main.y - 4, PAGE_W - M, main.y - 4);
      // Tinted sidebar only below the header on page 1.
      doc.setFillColor(255, 255, 255); doc.rect(sideX, 0, sideW, main.y - 5, 'F');
      sideCol.y = main.y + 6; main.y += 6;
    }
  }

  // ---------- headings ----------
  function sideHeading(c: Col, title: string) {
    ensure(c, 22);
    set('helvetica', 'bold', 8.6, c.dark ? WHITE : accent);
    doc.text(pdfSafe(title.toUpperCase()), c.x, c.y + 9);
    c.y += 16;
  }
  function heading(c: Col, title: string) {
    ensure(c, 40);
    const size = FS.head, y = c.y;
    const t = pdfSafe(title);
    switch (s.head) {
      case 'box': {
        doc.setFillColor(...accent); doc.rect(c.x, y, c.w, size + 8, 'F');
        set(headFamily, 'bold', size - 0.6, WHITE); doc.text(t.toUpperCase(), c.x + 6, y + size + 2.5);
        c.y += size + 15; return;
      }
      case 'pill': {
        set('helvetica', 'bold', size - 1.2, accent);
        const w = doc.getTextWidth(t.toUpperCase()) + 18;
        doc.setFillColor(...soft); doc.roundedRect(c.x, y, w, size + 8, (size + 8) / 2, (size + 8) / 2, 'F');
        doc.text(t.toUpperCase(), c.x + 9, y + size + 2); c.y += size + 15; return;
      }
      case 'bar': {
        doc.setFillColor(...accent); doc.rect(c.x, y + 1, 3, size + 3, 'F');
        set(headFamily, 'bold', size + 0.6, accent); doc.text(t, c.x + 9, y + size + 1); c.y += size + 12; return;
      }
      case 'double': {
        doc.setDrawColor(...INK); doc.setLineWidth(0.7); doc.line(c.x, y, c.x + c.w, y); doc.line(c.x, y + size + 7, c.x + c.w, y + size + 7);
        set(headFamily, 'bold', size - 0.8, INK); doc.text(t.toUpperCase(), c.x + c.w / 2, y + size + 1.5, { align: 'center' }); c.y += size + 15; return;
      }
      case 'underline': {
        set(headFamily, 'bold', size + 0.6, accent); doc.text(t, c.x, y + size);
        doc.setDrawColor(...accent); doc.setLineWidth(2.2); doc.line(c.x, y + size + 4, c.x + doc.getTextWidth(t), y + size + 4); c.y += size + 13; return;
      }
      case 'mono': {
        set('courier', 'bold', size + 0.4, accent); doc.text(`// ${t}`, c.x, y + size); c.y += size + 9; return;
      }
      case 'slab': {
        doc.setFillColor(...soft); doc.rect(c.x, y, c.w, size + 8, 'F');
        set(headFamily, 'bold', size - 0.6, accent); doc.text(t.toUpperCase(), c.x + 6, y + size + 2.5); c.y += size + 15; return;
      }
      case 'leader': {
        set(headFamily, 'bold', size - 0.6, accent); doc.text(t.toUpperCase(), c.x, y + size);
        const tw = doc.getTextWidth(t.toUpperCase()) + 8;
        doc.setDrawColor(...soft.map((v) => Math.max(0, v - 40)) as Rgb); doc.setLineWidth(0.8); doc.line(c.x + tw, y + size - 3, c.x + c.w, y + size - 3); c.y += size + 9; return;
      }
      case 'caps': case 'plain': {
        set(headFamily, 'bold', size - 0.8, accent); doc.text(t.toUpperCase(), s.align === 'center' && !side ? c.x + c.w / 2 : c.x, y + size, { ...(s.align === 'center' && !side ? { align: 'center' as const } : {}) }); c.y += size + 9; return;
      }
      default: { // rule
        set(headFamily, 'bold', size + 0.4, accent); doc.text(s.head === 'rule' && s.align === 'center' ? t.toUpperCase() : t, c.x, y + size, undefined);
        doc.setDrawColor(...accent); doc.setLineWidth(0.7); doc.line(c.x, y + size + 4, c.x + c.w, y + size + 4); c.y += size + 12;
      }
    }
  }

  // ---------- content ----------
  const entry = (c: Col, e: DocEntry, compact: boolean) => {
    const datesW = e.dates && !compact ? (set(family, 'normal', FS.small, MUTED), doc.getTextWidth(pdfSafe(e.dates)) + 10) : 0;
    set(family, 'bold', compact ? FS.body : FS.title, c.dark ? WHITE : INK);
    const tl = lines(e.title || '', c.w - datesW);
    ensure(c, (tl.length + (e.sub ? 1 : 0) + Math.min(2, e.bullets.length)) * FS.body * LH);
    tl.forEach((ln, i) => {
      ensure(c, FS.title * LH);
      set(family, 'bold', compact ? FS.body : FS.title, c.dark ? WHITE : INK);
      doc.text(ln, c.x, c.y + FS.title);
      if (i === 0 && datesW) { set(family, 'normal', FS.small, MUTED); doc.text(pdfSafe(e.dates!), c.x + c.w, c.y + FS.title, { align: 'right' }); }
      c.y += (compact ? FS.body : FS.title) * LH;
    });
    if (e.sub) para(c, e.sub, FS.small + 0.4, s.mono ? BODY : accent, 'italic');
    if (compact && e.dates) para(c, e.dates, FS.small, MUTED);
    if (e.para) para(c, e.para);
    for (const b of e.bullets) {
      set(family, 'normal', FS.body, c.dark ? WHITE : BODY);
      const bl = lines(b, c.w - 11);
      bl.forEach((ln, i) => {
        ensure(c, FS.body * LH);
        if (i === 0) { set(family, 'bold', FS.body, c.dark ? WHITE : accent); doc.text('\u2022', c.x + 1, c.y + FS.body); }
        set(family, 'normal', FS.body, c.dark ? WHITE : BODY);
        doc.text(ln, c.x + 11, c.y + FS.body); c.y += FS.body * LH;
      });
    }
    for (const mt of e.meta ?? []) para(c, mt, FS.small, MUTED);
    c.y += compact ? 5 : gap * 0.55;
  };
  const section = (c: Col, sec: DocSection, compact = false) => {
    if (compact) sideHeading(c, sec.title); else heading(c, sec.title);
    if (sec.text) para(c, sec.text);
    for (const e of sec.entries ?? []) entry(c, e, compact);
    for (const p of sec.pairs ?? []) {
      if (compact) {
        if (p.label) para(c, p.label, FS.small + 0.4, INK, 'bold');
        if (p.text) para(c, p.text, FS.small, BODY);
        c.y += 3;
      } else {
        set(family, 'bold', FS.body, INK);
        const label = p.label ? `${pdfSafe(p.label)}: ` : '';
        const lw = label ? doc.getTextWidth(label) : 0;
        if (lw && lw < c.w * 0.4) {
          ensure(c, FS.body * LH);
          doc.text(label, c.x, c.y + FS.body);
          set(family, 'normal', FS.body, BODY);
          const first = lines(p.text, c.w - lw);
          doc.text(first[0] ?? '', c.x + lw, c.y + FS.body); c.y += FS.body * LH;
          const rest = first.slice(1).join(' ');
          if (rest) para(c, rest);
        } else para(c, `${label}${p.text}`);
      }
    }
    c.y += gap;
  };

  const sideSecs = side ? m.sections.filter((x) => SIDE_KEYS.includes(x.key)) : [];
  for (const sec of m.sections) if (!sideSecs.includes(sec)) section(main, sec);
  if (side) {
    if (!headerInSide && !s.band) { sideHeading(sideCol, 'Contact'); for (const ct of m.contacts) para(sideCol, ct, FS.small, BODY); sideCol.y += gap; }
    for (const sec of sideSecs) section(sideCol, sec, true);
  }
  return pageCount;
}
