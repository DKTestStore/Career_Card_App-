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
  { id: 'editorial', name: 'Editorial', blurb: 'Magazine-style serif headlines, ink rules and square corners.' },
  { id: 'midnight', name: 'Midnight', blurb: 'Deep navy with an accent glow and glassy cards. Striking at night.' },
  { id: 'brutalist', name: 'Brutalist', blurb: 'Thick borders, hard shadows and mono labels. Loud and confident.' },
  { id: 'pastel', name: 'Pastel', blurb: 'Soft gradient, rounded cards and friendly type. Warm and approachable.' },
  { id: 'terminal', name: 'Terminal', blurb: 'Black screen, phosphor accent and monospace everything. For engineers.' },
  { id: 'corporate', name: 'Corporate', blurb: 'Navy header, crisp cards and a grey canvas. Safe for finance, consulting and ops.' },
  { id: 'sunset', name: 'Sunset', blurb: 'Warm orange-to-pink hero, big type and rounded cards. Great for marketing and design.' },
  { id: 'glass', name: 'Glass', blurb: 'Frosted cards over a colourful gradient. Modern and eye-catching.' },
  { id: 'forest', name: 'Forest', blurb: 'Earthy greens, serif headlines and paper tones. Calm and grounded.' },
];

const THEME_ACCENT: Record<PortfolioTheme, string> = { minimal: '#5B3DF5', developer: '#0F9D9A', creative: '#5B3DF5', academic: '#8C1D40', editorial: '#C2410C', midnight: '#3B82F6', brutalist: '#FF5C39', pastel: '#DB2777',
  terminal: '#22C55E', corporate: '#1D4ED8', sunset: '#EA580C', glass: '#7C3AED', forest: '#2F6B3F' };
export const themeDefaultAccent = (t: PortfolioTheme) => THEME_ACCENT[t];

export const PORTFOLIO_ACCENTS: { name: string; hex: string }[] = [
  { name: 'Violet', hex: '#5B3DF5' }, { name: 'Teal', hex: '#0F9D9A' }, { name: 'Navy', hex: '#1F3A68' },
  { name: 'Coral', hex: '#E5533F' }, { name: 'Maroon', hex: '#8C1D40' }, { name: 'Graphite', hex: '#16122A' },
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  about: 'About / hero', projects: 'Projects', skills: 'Skills', experience: 'Experience', education: 'Education',
  certifications: 'Certifications', gallery: 'Gallery', testimonials: 'Testimonials', contact: 'Contact & links',
  stats: 'At a glance (numbers)', services: 'Services / What I do', expertise: 'Skill levels', awards: 'Awards & achievements', articles: 'Writing & talks', languages: 'Languages',
};
const ORDER: SectionKey[] = ['about', 'stats', 'services', 'projects', 'skills', 'expertise', 'experience', 'education', 'certifications', 'awards', 'articles', 'languages', 'gallery', 'testimonials', 'contact'];
/** Sections added after 0.4.0; inserted before Contact for older portfolios. */
const NEW_KEYS: SectionKey[] = ['stats', 'services', 'expertise', 'awards', 'articles', 'languages'];

export const AVAILABILITY: { id: PortfolioData['about']['availability']; label: string }[] = [
  { id: '', label: 'Don’t show' }, { id: 'open', label: 'Open to work' }, { id: 'freelance', label: 'Available for freelance' }, { id: 'busy', label: 'Not available right now' },
];
export const LANGUAGE_LEVELS = ['Native', 'Fluent', 'Professional', 'Conversational', 'Basic'];

export function emptyData(): PortfolioData {
  return {
    about: { name: '', headline: '', bio: '', location: '', openTo: '', photo: '', email: '', phone: '', website: '', availability: '', availabilityNote: '' },
    projects: [], skills: [], experience: [], education: [], certifications: [], gallery: [], testimonials: [],
    stats: [], services: [], expertise: [], awards: [], articles: [], languages: [],
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
    awards: c.awards.length ? c.awards.map((x) => ({ id: x.id || uid(), title: x.title, issuer: x.awarder, date: fmtMonth(x.date), detail: x.summary ?? '' })) : p.data.awards,
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

/** Fills defaults for older or partial data (portfolios saved or published before newer fields existed). */
export function normalizeData(raw: unknown): PortfolioData {
  const e = emptyData();
  const d = (raw ?? {}) as Partial<PortfolioData>;
  const arr = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);
  const keys = new Set(e.sections.map((s) => s.key));
  const secs = arr<{ key: SectionKey; visible: boolean }>(d.sections).filter((s) => keys.has(s.key));
  for (const k of NEW_KEYS) {
    if (secs.some((x) => x.key === k)) continue;
    const ci = secs.findIndex((x) => x.key === 'contact');
    secs.splice(ci >= 0 ? ci : secs.length, 0, { key: k, visible: true });
  }
  for (const s of e.sections) if (!secs.some((x) => x.key === s.key)) secs.push(s);
  const withId = <T extends { id?: string }>(x: T) => ({ ...x, id: x.id || uid() }) as T & { id: string };
  return {
    about: { ...e.about, ...(d.about ?? {}) },
    contact: { ...e.contact, ...(d.contact ?? {}) },
    projects: arr<PProject>(d.projects).map((p) => ({ ...{ id: uid(), title: '', role: '', description: '', cover: '', github: '', demo: '', featured: false }, ...p, tags: arr<string>(p.tags), gallery: arr<string>(p.gallery) })),
    skills: arr<string>(d.skills), experience: arr(d.experience), education: arr(d.education), certifications: arr(d.certifications),
    gallery: arr(d.gallery), testimonials: arr(d.testimonials),
    stats: arr<Partial<PortfolioData['stats'][number]>>(d.stats).map((x) => withId({ value: '', label: '', ...x })),
    services: arr<Partial<PortfolioData['services'][number]>>(d.services).map((x) => withId({ title: '', description: '', icon: 'code' as const, ...x })),
    expertise: arr<Partial<PortfolioData['expertise'][number]>>(d.expertise).map((x) => withId({ name: '', ...x, level: Math.max(0, Math.min(100, Number(x.level) || 0)) })),
    awards: arr<Partial<PortfolioData['awards'][number]>>(d.awards).map((x) => withId({ title: '', issuer: '', date: '', detail: '', ...x })),
    articles: arr<Partial<PortfolioData['articles'][number]>>(d.articles).map((x) => withId({ title: '', url: '', outlet: '', date: '', summary: '', ...x })),
    languages: arr<Partial<PortfolioData['languages'][number]>>(d.languages).map((x) => withId({ name: '', level: '', ...x })),
    sections: secs,
  };
}

/** Local portfolio with defaults filled in (call on load and on backup import). */
export function normalizePortfolio(p: Portfolio): Portfolio {
  return { ...p, theme: THEMES.some((t) => t.id === p.theme) ? p.theme : 'minimal', data: normalizeData(p.data) };
}

/** Defensive defaults for data received from the server (older or partial payloads). */
export function normalizeView(v: PublicPortfolio): PublicPortfolio {
  return { ...v, theme: THEMES.some((t) => t.id === v.theme) ? v.theme : 'minimal', data: normalizeData(v.data) };
}
