import type { AccentId, Backup, FontId, Resume, ResumeContent, TemplateId } from './types';
import { migrateTemplateId } from '../templates/registry';
import { isValidAccent, FONTS } from './themes';
import { nowIso, uid, fmtRange, fmtMonth } from './util';

export function emptyContent(): ResumeContent {
  return {
    basics: { name: '', label: '', email: '', phone: '', url: '', summary: '', location: { city: '', region: '', countryCode: '' }, profiles: [] },
    work: [], education: [], projects: [], skills: [], certificates: [], awards: [],
  };
}

export function newResume(name: string, content: ResumeContent = emptyContent(), template: TemplateId = 'executive', accent: AccentId = 'violet'): Resume {
  const t = nowIso();
  return { id: uid(), name, template, accent, content, createdAt: t, updatedAt: t };
}

const HEX = /^#[0-9a-f]{6}$/i;
/** Keep saved data compatible: map old/unknown template, accent and font ids to valid ones. */
export function migrateResume<T extends Pick<Resume, 'template' | 'accent' | 'customColor' | 'font'>>(r: T): T {
  const template = migrateTemplateId(r.template);
  let accent = isValidAccent(r.accent) ? r.accent : 'violet';
  if (accent === 'custom' && !(r.customColor && HEX.test(r.customColor))) accent = 'violet';
  const font: FontId | undefined = r.font && FONTS.some((f) => f.id === r.font) ? r.font : undefined;
  if (template === r.template && accent === r.accent && font === r.font) return r;
  return { ...r, template, accent, font };
}

/* ---------- JSON Resume import / export ---------- */

type Obj = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strs = (v: unknown): string[] => arr(v).map(str).filter(Boolean);
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {});

/** Accepts any JSON Resume-ish object and returns a fully-populated ResumeContent with ids. */
export function normalizeContent(input: unknown): ResumeContent {
  const r = obj(input);
  const b = obj(r.basics);
  const loc = obj(b.location);
  return {
    basics: {
      name: str(b.name), label: str(b.label), email: str(b.email), phone: str(b.phone),
      url: str(b.url ?? b.website), summary: str(b.summary),
      location: { address: str(loc.address), city: str(loc.city), region: str(loc.region), countryCode: str(loc.countryCode), postalCode: str(loc.postalCode) },
      profiles: arr(b.profiles).map((p) => { const o = obj(p); return { id: uid(), network: str(o.network), username: str(o.username), url: str(o.url) }; }),
    },
    work: arr(r.work ?? r.volunteer).map((w) => {
      const o = obj(w);
      return { id: uid(), name: str(o.name ?? o.company ?? o.organization), position: str(o.position), location: str(o.location), url: str(o.url ?? o.website),
        startDate: str(o.startDate), endDate: str(o.endDate), summary: str(o.summary), highlights: strs(o.highlights) };
    }),
    education: arr(r.education).map((e) => {
      const o = obj(e);
      return { id: uid(), institution: str(o.institution), area: str(o.area), studyType: str(o.studyType), startDate: str(o.startDate), endDate: str(o.endDate), score: str(o.score ?? o.gpa), courses: strs(o.courses) };
    }),
    projects: arr(r.projects).map((p) => {
      const o = obj(p);
      return { id: uid(), name: str(o.name), description: str(o.description), url: str(o.url), startDate: str(o.startDate), endDate: str(o.endDate), highlights: strs(o.highlights), keywords: strs(o.keywords) };
    }),
    skills: arr(r.skills).map((s) => { const o = obj(s); return { id: uid(), name: str(o.name), level: str(o.level), keywords: strs(o.keywords) }; }),
    certificates: arr(r.certificates).map((c) => { const o = obj(c); return { id: uid(), name: str(o.name), issuer: str(o.issuer), date: str(o.date), url: str(o.url) }; }),
    awards: arr(r.awards).map((a) => { const o = obj(a); return { id: uid(), title: str(o.title), awarder: str(o.awarder), date: str(o.date), summary: str(o.summary) }; }),
  };
}

function stripEmpty<T>(v: T): T {
  if (Array.isArray(v)) return v.map(stripEmpty).filter((x) => x !== undefined && x !== '') as T;
  if (v && typeof v === 'object') {
    const out: Obj = {};
    for (const [k, val] of Object.entries(v as Obj)) {
      if (k === 'id') continue;
      const s = stripEmpty(val);
      if (s === '' || s === undefined) continue;
      if (Array.isArray(s) && s.length === 0) continue;
      if (s && typeof s === 'object' && !Array.isArray(s) && Object.keys(s).length === 0) continue;
      out[k] = s;
    }
    return out as T;
  }
  return v;
}

export function toJsonResume(r: Resume): object {
  return {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    ...stripEmpty(r.content),
    meta: { canonical: '', version: 'v1.0.0', lastModified: r.updatedAt, theme: r.template, hireReady: { name: r.name, template: r.template, accent: r.accent, customColor: r.customColor, font: r.font } },
  };
}

export function fromJsonResume(input: unknown, fallbackName = 'Imported resume'): Resume {
  const o = obj(input);
  const meta = obj(obj(o.meta).hireReady);
  const content = normalizeContent(o);
  const tpl = str(meta.template) as TemplateId;
  const acc = str(meta.accent) as AccentId;
  const r = newResume(
    str(meta.name) || (content.basics.name ? `${content.basics.name} — Imported` : fallbackName),
    content, tpl, acc,
  );
  const cc = str(meta.customColor);
  if (HEX.test(cc)) r.customColor = cc;
  const f = str(meta.font);
  if (f) r.font = f as FontId;
  return migrateResume(r);
}

export function isBackup(v: unknown): v is Backup {
  const o = obj(v);
  return o.app === 'hire-ready' && Array.isArray(o.resumes) && Array.isArray(o.applications);
}

/* ---------- Plain text export ---------- */

export function toPlainText(c: ResumeContent): string {
  const L: string[] = [];
  const b = c.basics;
  const loc = [b.location.city, b.location.region, b.location.countryCode].filter(Boolean).join(', ');
  if (b.name) L.push(b.name.toUpperCase());
  if (b.label) L.push(b.label);
  const contact = [b.email, b.phone, loc, b.url, ...b.profiles.map((p) => p.url || `${p.network}: ${p.username}`)].filter(Boolean);
  if (contact.length) L.push(contact.join(' | '));
  const section = (t: string) => { L.push('', t.toUpperCase(), '-'.repeat(t.length)); };
  if (b.summary) { section('Summary'); L.push(b.summary); }
  if (c.work.length) {
    section('Experience');
    c.work.forEach((w, i) => {
      if (i) L.push('');
      L.push([w.position, w.name].filter(Boolean).join(' — ') + (w.location ? `, ${w.location}` : ''));
      const r = fmtRange(w.startDate, w.endDate); if (r) L.push(r);
      if (w.summary) L.push(w.summary);
      w.highlights.filter(Boolean).forEach((h) => L.push(`- ${h}`));
    });
  }
  if (c.education.length) {
    section('Education');
    c.education.forEach((e) => {
      L.push([[e.studyType, e.area].filter(Boolean).join(' in '), e.institution].filter(Boolean).join(' — '));
      const meta = [fmtRange(e.startDate, e.endDate, false), e.score && `Score: ${e.score}`].filter(Boolean).join(' | ');
      if (meta) L.push(meta);
      if (e.courses.length) L.push(`Courses: ${e.courses.join(', ')}`);
    });
  }
  if (c.projects.length) {
    section('Projects');
    c.projects.forEach((p, i) => {
      if (i) L.push('');
      L.push(p.name + (p.url ? ` (${p.url})` : ''));
      if (p.description) L.push(p.description);
      p.highlights.filter(Boolean).forEach((h) => L.push(`- ${h}`));
      if (p.keywords.length) L.push(`Tech: ${p.keywords.join(', ')}`);
    });
  }
  if (c.skills.length) {
    section('Skills');
    c.skills.forEach((s) => L.push(`${s.name}${s.keywords.length ? ': ' + s.keywords.join(', ') : ''}`));
  }
  if (c.certificates.length) {
    section('Certifications');
    c.certificates.forEach((x) => L.push([x.name, x.issuer, fmtMonth(x.date)].filter(Boolean).join(' — ')));
  }
  if (c.awards.length) {
    section('Achievements');
    c.awards.forEach((a) => L.push([a.title, a.awarder, fmtMonth(a.date)].filter(Boolean).join(' — ') + (a.summary ? `: ${a.summary}` : '')));
  }
  return L.join('\n').trim() + '\n';
}
