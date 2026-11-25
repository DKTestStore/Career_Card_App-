import type { Resume } from '../types';
import { fmtMonth, nowIso, uid } from '../util';
import type { Portfolio, PortfolioData, PortfolioTheme, PProject, PublicPortfolio, SectionKey } from './types';

export const PORTFOLIO_ID = 'main';
export const MAX_PUBLISH_BYTES = 2 * 1024 * 1024;

export const THEMES: { id: PortfolioTheme; name: string; blurb: string }[] = [
  { id: 'minimal', name: 'Minimal', blurb: 'Light, airy, Inter. A clean default for most roles.' },
  { id: 'developer', name: 'Developer', blurb: 'Dark navy with monospaced touches. Feels like good docs.' },
  { id: 'creative', name: 'Creative', blurb: 'Bold Fraunces name on a colour band. Strong first impression.' },
  { id: 'academic', name: 'Academic', blurb: 'Serif, centred and restrained. Great for students and research.' },
];

const THEME_ACCENT: Record<PortfolioTheme, string> = { minimal: '#5B3DF5', developer: '#0F9D9A', creative: '#5B3DF5', academic: '#8C1D40' };
export const themeDefaultAccent = (t: PortfolioTheme) => THEME_ACCENT[t];

export const PORTFOLIO_ACCENTS: { name: string; hex: string }[] = [
  { name: 'Violet', hex: '#5B3DF5' }, { name: 'Teal', hex: '#0F9D9A' }, { name: 'Navy', hex: '#1F3A68' },
  { name: 'Coral', hex: '#E5533F' }, { name: 'Maroon', hex: '#8C1D40' }, { name: 'Graphite', hex: '#16122A' },
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  about: 'About / hero', projects: 'Projects', skills: 'Skills', experience: 'Experience', education: 'Education',
  certifications: 'Certifications', gallery: 'Gallery', testimonials: 'Testimonials', contact: 'Contact & links',
};
const ORDER: SectionKey[] = ['about', 'projects', 'skills', 'experience', 'education', 'certifications', 'gallery', 'testimonials', 'contact'];

export function emptyData(): PortfolioData {
  return {
    about: { name: '', headline: '', bio: '', location: '', openTo: '', photo: '', email: '', phone: '', website: '' },
    projects: [], skills: [], experience: [], education: [], certifications: [], gallery: [], testimonials: [],
    contact: { email: '', phone: '', linkedin: '', github: '', website: '', twitter: '', showForm: true },
    sections: ORDER.map((key) => ({ key, visible: true })),
  };
}

/** Joins text fragments into sentences (adds a full stop where one is missing). */
export function joinSentences(parts: (string | undefined)[]): string {
  return parts.map((x) => (x ?? '').trim()).filter(Boolean).map((x) => (/[.!?…]$/.test(x) ? x : `${x}.`)).join(' ');
}

export function newToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
}
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;
export function slugError(s: string): string | null {
  if (!SLUG_RE.test(s) || s.includes('--')) return 'Use 3–40 lowercase letters, numbers or single hyphens.';
  return null;
}

export function newPortfolio(name = ''): Portfolio {
  const t = nowIso();
  const data = emptyData();
  data.about.name = name;
  return {
    id: PORTFOLIO_ID, slug: slugify(name) || `portfolio-${uid().slice(0, 6)}`.toLowerCase(), theme: 'minimal', accent: '#5B3DF5', resumeId: '', data,
    publish: { visibility: 'public', hidePhone: true, showResume: true, token: newToken(), publishedSlug: '', publishedAt: '', lastPublishedAt: '', passwordSet: false, dirty: false },
    createdAt: t, updatedAt: t,
  };
}

/** Fill sections from a resume. Images, gallery and testimonials are kept. */
export function importFromResume(p: Portfolio, r: Resume): Portfolio {
  const c = r.content;
  const b = c.basics;
  const loc = [b.location?.city, b.location?.region].filter(Boolean).join(', ');
  const prof = (re: RegExp) => b.profiles.find((x) => re.test(x.network) || re.test(x.url))?.url ?? '';
  const prevProjects = new Map(p.data.projects.map((x) => [x.title.toLowerCase(), x]));
  const projects: PProject[] = c.projects.map((x, i) => {
    const prev = prevProjects.get(x.name.toLowerCase());
    const github = /github\.com/i.test(x.url ?? '') ? x.url ?? '' : prev?.github ?? '';
    return {
      id: prev?.id ?? uid(), title: x.name, role: prev?.role ?? '', tags: x.keywords.slice(0, 8),
      description: joinSentences([x.description, ...x.highlights]),
      cover: prev?.cover ?? '', gallery: prev?.gallery ?? [], github, demo: github ? (prev?.demo ?? '') : (x.url ?? prev?.demo ?? ''),
      featured: prev?.featured ?? i < 2,
    };
  });
  const skills = Array.from(new Set(c.skills.flatMap((s) => (s.keywords.length ? s.keywords : [s.name])).map((s) => s.trim()).filter(Boolean))).slice(0, 40);
  const data: PortfolioData = {
    ...p.data,
    about: {
      ...p.data.about, name: b.name || p.data.about.name, headline: b.label || p.data.about.headline, bio: b.summary || p.data.about.bio,
      location: loc || p.data.about.location, email: b.email || p.data.about.email, phone: b.phone || p.data.about.phone, website: b.url || p.data.about.website,
    },
    projects: projects.length ? projects : p.data.projects,
    skills: skills.length ? skills : p.data.skills,
    experience: c.work.length ? c.work.map((w) => ({
      id: w.id || uid(), title: w.position, company: w.name, start: fmtMonth(w.startDate), end: w.endDate ? fmtMonth(w.endDate) : 'Present',
      summary: joinSentences([w.summary, ...w.highlights.slice(0, 2)]),
    })) : p.data.experience,
    education: c.education.length ? c.education.map((e) => ({
      id: e.id || uid(), school: e.institution, degree: [e.studyType, e.area].filter(Boolean).join(', '), start: fmtMonth(e.startDate), end: e.endDate ? fmtMonth(e.endDate) : 'Present', detail: e.score,
    })) : p.data.education,
    certifications: c.certificates.length ? c.certificates.map((x) => ({ id: x.id || uid(), name: x.name, issuer: x.issuer, date: fmtMonth(x.date), url: x.url ?? '' })) : p.data.certifications,
    contact: {
      ...p.data.contact, email: b.email || p.data.contact.email, phone: b.phone || p.data.contact.phone,
      linkedin: prof(/linkedin/i) || p.data.contact.linkedin, github: prof(/github/i) || p.data.contact.github,
      website: b.url || p.data.contact.website, twitter: prof(/twitter|x\.com/i) || p.data.contact.twitter,
    },
  };
  const slug = !p.publish.publishedSlug && (!p.slug || p.slug.startsWith('portfolio-')) ? slugify(b.name) || p.slug : p.slug;
  return { ...p, slug, resumeId: r.id, data };
}

/** Payload sent to the server (and its size, which must stay under 2 MB). */
export function publishPayload(p: Portfolio, resume: Resume | undefined): Omit<PublicPortfolio, 'slug'> {
  return {
    theme: p.theme, accent: p.accent, data: p.data,
    resume: p.publish.showResume && resume ? { template: resume.template, accent: resume.accent, customColor: resume.customColor, font: resume.font, content: resume.content } : null,
  };
}
export function byteSize(v: unknown): number {
  return new Blob([JSON.stringify(v)]).size;
}
export function fmtBytes(n: number): string {
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;
}
export function publicUrl(slug: string): string {
  return `${location.origin}/p/${slug}`;
}
/** Visitor view of local data (applies hide-phone like the server does). */
export function localView(p: Portfolio, resume: Resume | undefined): PublicPortfolio {
  const pl = publishPayload(p, resume);
  const data = structuredClone(pl.data);
  const res = pl.resume ? structuredClone(pl.resume) : null;
  if (p.publish.hidePhone) {
    data.about.phone = ''; data.contact.phone = '';
    if (res) res.content.basics.phone = '';
  }
  return { slug: p.slug, theme: pl.theme, accent: pl.accent, data, resume: res };
}

/** Defensive defaults for data received from the server (older or partial payloads). */
export function normalizeView(v: PublicPortfolio): PublicPortfolio {
  const e = emptyData();
  const d = (v.data ?? {}) as Partial<PortfolioData>;
  const arr = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);
  const keys = new Set(e.sections.map((s) => s.key));
  const secs = arr<{ key: SectionKey; visible: boolean }>(d.sections).filter((s) => keys.has(s.key));
  for (const s of e.sections) if (!secs.some((x) => x.key === s.key)) secs.push(s);
  return {
    ...v,
    theme: THEMES.some((t) => t.id === v.theme) ? v.theme : 'minimal',
    data: {
      about: { ...e.about, ...(d.about ?? {}) },
      contact: { ...e.contact, ...(d.contact ?? {}) },
      projects: arr<PProject>(d.projects).map((p) => ({ ...{ id: uid(), title: '', role: '', description: '', cover: '', github: '', demo: '', featured: false }, ...p, tags: arr<string>(p.tags), gallery: arr<string>(p.gallery) })),
      skills: arr<string>(d.skills), experience: arr(d.experience), education: arr(d.education), certifications: arr(d.certifications),
      gallery: arr(d.gallery), testimonials: arr(d.testimonials), sections: secs,
    },
  };
}
