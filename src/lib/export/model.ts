/**
 * Format-neutral document model used by the PDF and Word exporters, so both
 * follow the chosen template's section order, labels, colours and header style.
 */
import type { Resume, ResumeContent } from '../types';
import { resolveAccent } from '../themes';
import { fmtMonth, fmtRange } from '../util';
import { templateById, type GenericConfig, type SectionKey } from '../../templates/registry';

export interface DocEntry { title: string; sub?: string; dates?: string; para?: string; bullets: string[]; meta?: string[] }
export interface DocSection { key: SectionKey; title: string; text?: string; entries?: DocEntry[]; pairs?: { label: string; text: string }[] }
export interface DocStyle {
  accent: string; soft: string; sidebar: string; font: 'sans' | 'serif' | 'mono'; headFont: 'sans' | 'serif' | 'mono';
  align: 'left' | 'center' | 'right'; head: GenericConfig['head']; header: GenericConfig['header']; band: boolean; stripe: boolean; split: boolean; compact: boolean; airy: boolean; mono: boolean;
  side?: { at: 'left' | 'right'; dark: boolean };
}
export interface DocModel { fileBase: string; name: string; label: string; contacts: string[]; sections: DocSection[]; style: DocStyle; templateName: string }

const DEFAULT_ORDER: SectionKey[] = ['summary', 'work', 'projects', 'education', 'skills', 'certificates', 'awards'];
const TITLES: Record<SectionKey, string> = { summary: 'Summary', work: 'Experience', projects: 'Projects', education: 'Education', skills: 'Skills', certificates: 'Certifications', awards: 'Achievements' };
export const SIDE_KEYS: SectionKey[] = ['skills', 'education', 'certificates'];

/** Bespoke templates expressed in GenericConfig terms for export. */
const BESPOKE: Record<string, GenericConfig> = {
  executive: { layout: 'sidebar', side: 'left', sideStyle: 'dark', header: 'left', head: 'rule', font: 'serif', density: 'normal', skills: 'list' },
  elegant: { layout: 'sidebar', side: 'left', sideStyle: 'tint', header: 'center', head: 'caps', font: 'serif', density: 'normal', skills: 'list' },
  modern: { layout: 'single', header: 'left', head: 'rule', font: 'sans', density: 'normal', skills: 'inline' },
};

export function contactsOf(c: ResumeContent): string[] {
  const b = c.basics;
  const loc = [b.location.city, b.location.region, b.location.countryCode].filter(Boolean).join(', ');
  return [loc, b.email, b.phone, b.url, ...b.profiles.map((p) => p.url || [p.network, p.username].filter(Boolean).join(': '))].filter(Boolean);
}

export function buildModel(r: Pick<Resume, 'name' | 'template' | 'accent' | 'customColor' | 'font' | 'content'>): DocModel {
  const def = templateById(r.template);
  const cfg = def.config ?? BESPOKE[def.id] ?? BESPOKE.modern;
  const a = resolveAccent(r);
  const c = r.content;
  const labels = { ...TITLES, ...(def.id === 'executive' || def.id === 'elegant' || def.id === 'modern' ? { summary: 'Professional Summary' } : {}), ...cfg.labels };
  const sections: DocSection[] = [];
  for (const k of cfg.order ?? DEFAULT_ORDER) {
    const title = labels[k];
    switch (k) {
      case 'summary': if (c.basics.summary.trim()) sections.push({ key: k, title, text: c.basics.summary.trim() }); break;
      case 'work': if (c.work.length) sections.push({ key: k, title, entries: c.work.map((w) => ({
        title: w.position || w.name, sub: [w.position ? w.name : '', w.location].filter(Boolean).join(', '), dates: fmtRange(w.startDate, w.endDate),
        para: w.summary?.trim(), bullets: w.highlights.filter((h) => h.trim()) })) }); break;
      case 'projects': if (c.projects.length) sections.push({ key: k, title, entries: c.projects.map((p) => ({
        title: p.name, sub: p.url, dates: fmtRange(p.startDate, p.endDate, false), para: p.description?.trim(), bullets: p.highlights.filter((h) => h.trim()),
        meta: p.keywords.length ? [p.keywords.join(' · ')] : [] })) }); break;
      case 'education': if (c.education.length) sections.push({ key: k, title, entries: c.education.map((e) => ({
        title: [e.studyType, e.area].filter(Boolean).join(', ') || e.institution, sub: [e.studyType || e.area ? e.institution : ''].filter(Boolean).join(''),
        dates: fmtRange(e.startDate, e.endDate, false), bullets: [], meta: [e.score, e.courses.length ? `Coursework: ${e.courses.join(', ')}` : ''].filter(Boolean) })) }); break;
      case 'skills': if (c.skills.length) sections.push({ key: k, title, pairs: c.skills.map((s) => ({ label: s.name, text: (s.keywords.length ? s.keywords : []).join(', ') + (s.level && !s.keywords.length ? s.level : '') })) }); break;
      case 'certificates': if (c.certificates.length) sections.push({ key: k, title, entries: c.certificates.map((x) => ({ title: x.name, sub: x.issuer, dates: fmtMonth(x.date), bullets: [] })) }); break;
      case 'awards': if (c.awards.length) sections.push({ key: k, title, entries: c.awards.map((x) => ({ title: x.title, sub: x.awarder, dates: fmtMonth(x.date), para: x.summary?.trim(), bullets: [] })) }); break;
    }
  }
  const font = cfg.font === 'mono' ? 'mono' : cfg.font === 'sans' ? 'sans' : 'serif';
  const userFont = r.font && r.font !== 'auto' ? (r.font === 'sans' ? 'sans' : 'serif') : null;
  return {
    fileBase: (c.basics.name || r.name || 'resume').trim(),
    name: c.basics.name || 'Your Name', label: c.basics.label, contacts: contactsOf(c), sections, templateName: def.name,
    style: {
      accent: cfg.mono ? '#1F1F1F' : a.theme, soft: cfg.mono ? '#ECECEC' : a.soft, sidebar: cfg.mono ? '#1F1F1F' : a.sidebar,
      font: userFont ?? (font === 'mono' ? 'sans' : font), headFont: userFont ?? font,
      align: cfg.header === 'center' || cfg.header === 'frame' ? 'center' : cfg.header === 'right' ? 'right' : 'left', head: cfg.head, header: cfg.header, band: cfg.header === 'band', stripe: cfg.header === 'stripe', split: cfg.header === 'split',
      compact: cfg.density === 'compact', airy: cfg.density === 'airy', mono: !!cfg.mono,
      side: cfg.layout === 'sidebar' ? { at: cfg.side ?? 'left', dark: cfg.sideStyle === 'dark' } : undefined,
    },
  };
}

export function fileName(m: DocModel, ext: string): string {
  const base = m.fileBase.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || 'Resume';
  return `${base}_Resume.${ext}`;
}

export function saveBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
