/**
 * Best-effort, rule-based mapping of extracted résumé text into ResumeContent.
 * Pure function: no DOM, no network. The user reviews the result before saving.
 */
import type { Education, Project, ResumeContent, Work } from '../types';
import { emptyContent } from '../resume';
import { uid } from '../util';
import type { Line } from './extract';

export type SectionKind = 'summary' | 'work' | 'education' | 'skills' | 'projects' | 'certificates' | 'awards' | 'languages' | 'other';
export interface ParseReport { found: SectionKind[]; ignored: string[]; warnings: string[] }
export interface ParseResult { content: ResumeContent; report: ParseReport }

const HEADINGS: [SectionKind, string[]][] = [
  ['summary', ['summary', 'professional summary', 'profile', 'professional profile', 'about me', 'about', 'objective', 'career objective', 'career summary', 'executive summary', 'overview', 'personal statement', 'profile summary']],
  ['work', ['experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'internships', 'internship', 'internship experience', 'relevant experience', 'career history', 'experience and internships', 'internships and experience', 'professional background', 'industry experience']],
  ['education', ['education', 'academic background', 'academics', 'education and qualifications', 'qualifications', 'academic qualifications', 'educational qualifications', 'education and training', 'academic details']],
  ['skills', ['skills', 'technical skills', 'core skills', 'key skills', 'core competencies', 'competencies', 'skills and tools', 'tools', 'technologies', 'tech stack', 'skills and interests', 'areas of expertise', 'expertise', 'languages and tools', 'skill set', 'skillset', 'technical proficiency', 'tools and technologies', 'skills summary', 'soft skills']],
  ['projects', ['projects', 'academic projects', 'personal projects', 'key projects', 'selected projects', 'project experience', 'research', 'research projects', 'research and projects', 'publications', 'major projects', 'notable projects', 'side projects']],
  ['certificates', ['certifications', 'certificates', 'licenses and certifications', 'certifications and courses', 'courses', 'training', 'licenses', 'certifications and training', 'online courses', 'courses and certifications']],
  ['awards', ['awards', 'achievements', 'honors', 'honours', 'awards and achievements', 'accomplishments', 'honours and awards', 'honors and awards', 'achievements and awards', 'extracurricular', 'extracurricular activities', 'extra curricular activities', 'activities', 'leadership', 'leadership and activities', 'positions of responsibility', 'volunteering', 'volunteer experience']],
  ['languages', ['languages', 'languages known', 'language']],
  ['other', ['interests', 'hobbies', 'hobbies and interests', 'references', 'declaration', 'personal details', 'personal information', 'additional information', 'contact', 'contact information']],
];
const HEAD_MAP = new Map<string, SectionKind>(HEADINGS.flatMap(([k, xs]) => xs.map((x) => [x, k] as [string, SectionKind])));
const normHead = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

export function headingKind(l: Line): SectionKind | null {
  if (l.bullet) return null;
  const t = l.text.trim().replace(/[:：]$/, '');
  if (t.length > 42 || t.split(/\s+/).length > 5) return null;
  return HEAD_MAP.get(normHead(t)) ?? null;
}

/* ---------- dates ---------- */
const MON_ALT = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const MON = `(?:${MON_ALT})\\.?`;
const MON_CAP = `(${MON_ALT})\\.?`;
const D1 = `(?:${MON}\\s*[,'’]?\\s*(?:\\d{4}|\\d{2})|\\d{1,2}\\s*[/.-]\\s*\\d{4}|\\d{4}\\s*[/.-]\\s*\\d{1,2}(?!\\d)|(?:19|20)\\d{2})`;
const END = `(?:${D1}|present|current|currently|now|ongoing|till\\s+date|to\\s+date|today)`;
const RANGE_RX = new RegExp(`(${D1})\\s*(?:-|–|—|to|until|till|→|~)\\s*(${END})`, 'i');
const SINGLE_RX = new RegExp(`(${D1})`, 'i');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function toIso(s: string): string {
  const t = s.toLowerCase().trim();
  if (/present|current|now|ongoing|date|today/.test(t)) return '';
  let m = new RegExp(`^${MON_CAP}\\s*[,'’]?\\s*(\\d{4}|\\d{2})$`, 'i').exec(t);
  if (m) {
    const mi = MONTHS.indexOf(m[1].slice(0, 3)) + 1;
    const y = m[2].length === 2 ? `20${m[2]}` : m[2];
    return `${y}-${String(mi).padStart(2, '0')}`;
  }
  m = /^(\d{1,2})\s*[/.-]\s*(\d{4})$/.exec(t);
  if (m && +m[1] >= 1 && +m[1] <= 12) return `${m[2]}-${m[1].padStart(2, '0')}`;
  m = /^(\d{4})\s*[/.-]\s*(\d{1,2})$/.exec(t);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${m[2].padStart(2, '0')}`;
  m = /^((?:19|20)\d{2})$/.exec(t);
  return m ? m[1] : '';
}

/** Pulls a date range (or single date) out of a line, returning the rest of the text. */
export function takeDates(s: string): { start: string; end: string; rest: string; found: boolean } {
  const r = RANGE_RX.exec(s);
  if (r) return { start: toIso(r[1]), end: toIso(r[2]), rest: tidy(s.replace(r[0], ' ')), found: true };
  const one = SINGLE_RX.exec(s);
  if (one && toIso(one[1])) return { start: toIso(one[1]), end: toIso(one[1]), rest: tidy(s.replace(one[0], ' ')), found: true };
  return { start: '', end: '', rest: s, found: false };
}
const hasDate = (s: string) => RANGE_RX.test(s) || new RegExp(`^\\s*${D1}\\s*$`, 'i').test(s);
const tidy = (s: string) => s.replace(/\(\s*\)/g, ' ').replace(/\s{2,}/g, '   ').replace(/^[\s|,•·–—-]+|[\s|,•·–—-]+$/g, '').trim();

/* ---------- contacts ---------- */
const EMAIL_RX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RX = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,5}\)[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}(?:[\s.-]?\d{2,4})?/;
const URL_RX = /\b(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+(?:com|in|io|dev|me|org|net|co|ai|app|page|site|xyz|tech|info)(?:\/[^\s|,;)]*)?/gi;
const SPLIT_RX = /\s*[|•·◦●▪]\s*|\s{3,}|\s+\/\s+/;

function contactish(s: string): boolean {
  return EMAIL_RX.test(s) || (PHONE_RX.test(s) && (s.match(/\d/g)?.length ?? 0) >= 8) || /linkedin|github|https?:|www\./i.test(s);
}

/* ---------- helpers ---------- */
const TITLE_WORDS = /\b(engineer|developer|manager|intern|analyst|designer|lead|consultant|associate|director|officer|specialist|executive|head|architect|scientist|coordinator|assistant|trainee|founder|co-founder|president|administrator|technician|teacher|lecturer|professor|researcher|programmer|accountant|representative|strategist|marketer|writer|editor|sde|swe|vp|cto|ceo|cfo|owner|partner|fellow|volunteer|tutor|mentor|member|apprentice|operator|supervisor|advisor|student)\b/i;
const ORG_WORDS = /\b(inc|ltd|llc|llp|pvt|private|limited|technologies|technology|tech|solutions|labs?|corp|corporation|company|co\.|systems|bank|university|services|group|software|consulting|ventures|studio|studios|foundation|institute|agency|hospital|global|india|networks|industries|enterprises|media|digital|analytics)\b/i;
const DEGREE_RX = /\b(b\.?\s?tech|b\.?\s?e\b\.?|b\.?\s?sc|bachelor(?:'s|s)?|m\.?\s?tech|m\.?\s?sc|m\.?\s?s\b|master(?:'s|s)?|mba|bba|ph\.?\s?d|doctorate|diploma|associate(?:'s)? degree|hsc|ssc|class\s+(?:x|xii|10|12)(?:th)?|12th|10th|higher secondary|secondary school|b\.?\s?com|m\.?\s?com|b\.?\s?a\b\.?|m\.?\s?a\b\.?|bca|mca|b\.?\s?des|m\.?\s?des|b\.?\s?arch|mbbs|llb|cbse|icse)/i;
const INST_RX = /\b(university|college|institute|school|academy|polytechnic|iit|nit|iiit|bits|vidyalaya|vidyapeeth|campus)\b/i;
const SCORE_RX = /(?:c?gpa|cpi|sgpa|percentage|grade|score|marks)\s*[:\-–]?\s*([\d.]+\s*(?:\/\s*[\d.]+)?\s*%?)|\b(\d{1,2}(?:\.\d+)?\s*%)|\b(\d(?:\.\d{1,2})?\s*\/\s*(?:10|4)(?:\.0)?)\b/i;

const splitParts = (s: string) => s.split(/\s+(?:at|@)\s+|\s*[|•·]\s*|\s+[–—-]\s+|\s{3,}|,\s+(?=[A-Z])/).map((x) => x.trim()).filter(Boolean);
const joinText = (xs: string[]) => xs.reduce((acc, x) => (acc.endsWith('-') && /^[a-z]/.test(x) ? acc.slice(0, -1) + x : acc ? `${acc} ${x}` : x), '').trim();
const ENDS_SENTENCE = /[.!?;:]$/;

interface Block { head: string[]; bullets: string[]; para: string[] }

/** Split a section into entries: header lines followed by bullets / paragraphs. */
function blocks(lines: Line[]): Block[] {
  const out: Block[] = [];
  let cur: Block | null = null;
  let last: 'head' | 'bullet' | 'para' | null = null;
  for (const l of lines) {
    const t = l.text.trim();
    if (!t) continue;
    if (l.bullet) {
      if (!cur) { cur = { head: [], bullets: [], para: [] }; out.push(cur); }
      cur.bullets.push(t); last = 'bullet'; continue;
    }
    // Wrapped bullet continuation (PDFs break long bullets into several lines).
    if (cur && last === 'bullet' && !l.gapBefore && !hasDate(t) && !l.bold
      && (/^[a-z(&,]/.test(t) || !ENDS_SENTENCE.test(cur.bullets[cur.bullets.length - 1]))) {
      cur.bullets[cur.bullets.length - 1] = joinText([cur.bullets[cur.bullets.length - 1], t]); continue;
    }
    const words = t.split(/\s+/).length;
    const isPara = words > 14 && !hasDate(t) && !l.bold;
    if (cur && isPara && cur.head.length) {
      if (last === 'para' && !l.gapBefore) cur.para[cur.para.length - 1] = joinText([cur.para[cur.para.length - 1], t]); else cur.para.push(t);
      last = 'para'; continue;
    }
    const newEntry = !cur || cur.bullets.length > 0 || cur.para.length > 0 || cur.head.length >= 3 || (l.gapBefore && cur.head.length > 0)
      || (cur.head.some(hasDate) && hasDate(t) && cur.head.length >= 2);
    if (newEntry) { cur = { head: [], bullets: [], para: [] }; out.push(cur); }
    cur!.head.push(t); last = 'head';
  }
  return out;
}

function work(lines: Line[]): Work[] {
  return blocks(lines).map((b) => {
    let start = '', end = '';
    const heads = b.head.map((h) => { const d = takeDates(h); if (d.found && !start) { start = d.start; end = d.end; return d.rest; } return h; }).filter(Boolean);
    let position = '', name = '', location = '';
    const p1 = splitParts(heads[0] ?? '');
    if (p1.length >= 2) {
      const [a, c] = p1;
      if (ORG_WORDS.test(a) && !TITLE_WORDS.test(a) || (TITLE_WORDS.test(c) && !TITLE_WORDS.test(a))) { name = a; position = c; } else { position = a; name = c; }
      if (p1[2]) location = p1[2];
    } else if (p1.length === 1) {
      if (TITLE_WORDS.test(p1[0]) || !heads[1]) position = p1[0]; else name = p1[0];
    }
    if (heads[1]) {
      const p2 = splitParts(heads[1]);
      if (!name && p2[0]) name = p2[0]; else if (!position && p2[0]) position = p2[0]; else if (!location && p2[0] && p2[0].length < 40) location = p2[0];
      if (p2[1] && !location && p2[1].length < 40) location = p2[1];
    }
    if (!b.bullets.length && b.para.length > 1) { b.bullets.push(...b.para.slice(1)); b.para.length = 1; }
    return { id: uid(), position, name, location, url: '', startDate: start, endDate: end, summary: b.para.join(' '), highlights: b.bullets };
  }).filter((w) => w.position || w.name || w.highlights.length);
}

function education(lines: Line[]): Education[] {
  const out: Education[] = [];
  let cur: Education | null = null;
  const fresh = (): Education => ({ id: uid(), institution: '', area: '', studyType: '', startDate: '', endDate: '', score: '', courses: [] });
  for (const l of lines) {
    let t = l.text.trim();
    if (!t) continue;
    const course = /^(?:relevant\s+)?(?:course\s*work|courses)\s*[:\-–]\s*(.+)$/i.exec(t);
    if (course && cur) { cur.courses.push(...course[1].split(/,|;|\|/).map((x) => x.trim()).filter(Boolean)); continue; }
    const deg = DEGREE_RX.test(t), inst = INST_RX.test(t);
    if (!cur || (deg && cur.studyType) || (inst && !deg && cur.institution)) {
      cur = fresh(); out.push(cur);
    }
    const d = takeDates(t);
    if (d.found && !cur.startDate && !cur.endDate) { cur.startDate = d.start === d.end ? '' : d.start; cur.endDate = d.end; t = d.rest; }
    const sc = SCORE_RX.exec(t);
    if (sc && !cur.score) { cur.score = sc[0].trim(); t = tidy(t.replace(sc[0], ' ')); }
    let sawDeg = false;
    for (const part of splitParts(t)) {
      if (sawDeg && !cur.area && !INST_RX.test(part) && !DEGREE_RX.test(part) && part.length < 60 && !/\d/.test(part)) { cur.area = part; continue; }
      sawDeg = false;
      if (DEGREE_RX.test(part) && !cur.studyType) {
        sawDeg = true;
        const m = /^(.*?)(?:\s+(?:in|of)\s+|\s*[,(]\s*)(.+?)\)?$/i.exec(part);
        if (m && DEGREE_RX.test(m[1])) { cur.studyType = m[1].trim(); cur.area = m[2].trim(); } else cur.studyType = part;
      } else if (INST_RX.test(part) && !cur.institution) cur.institution = part;
      else if (!cur.institution && !l.bullet && part.length > 3 && !DEGREE_RX.test(part)) cur.institution = part;
      else if (!cur.area && cur.studyType && part.length < 60 && !/\d/.test(part)) cur.area = part;
    }
  }
  return out.filter((e) => e.institution || e.studyType);
}

function projects(lines: Line[]): Project[] {
  return blocks(lines).map((b) => {
    let start = '', end = '', url = '';
    const keywords: string[] = [];
    const heads: string[] = [];
    for (let h of b.head) {
      const d = takeDates(h); if (d.found && !start) { start = d.start; end = d.end === d.start ? '' : d.end; h = d.rest; }
      const u = h.match(URL_RX); if (u && !url) { url = u[0]; h = tidy(h.replace(u[0], ' ')); }
      const tech = /^(?:tech(?:nologies)?(?:\s*stack)?|tools|built with|stack)\s*[:\-–]\s*(.+)$/i.exec(h);
      if (tech) { keywords.push(...tech[1].split(/,|;|\|/).map((x) => x.trim()).filter(Boolean)); continue; }
      if (h) heads.push(h);
    }
    const bullets = b.bullets.filter((x) => {
      const tech = /^(?:tech(?:nologies)?(?:\s*stack)?|tools|built with|stack)\s*[:\-–]\s*(.+)$/i.exec(x);
      if (tech) { keywords.push(...tech[1].split(/,|;|\|/).map((y) => y.trim()).filter(Boolean)); return false; }
      return true;
    });
    const parts = splitParts(heads[0] ?? '');
    const name = parts[0] ?? '';
    // "Name | React, Node" → keywords from the comma list part.
    for (const p of parts.slice(1)) if (/,/.test(p) || p.length < 25) keywords.push(...p.split(/,\s*/).map((x) => x.trim()).filter(Boolean));
    const description = joinText([...heads.slice(1), ...b.para]);
    return { id: uid(), name, description, url, startDate: start, endDate: end, highlights: bullets, keywords: [...new Set(keywords)].slice(0, 12) };
  }).reduce<Project[]>((acc, p) => {
    // "Raspberry Pi · MQTT · React" on its own line is the previous project's tech list.
    const prev = acc[acc.length - 1];
    const techOnly = prev && !p.highlights.length && !p.description && !p.url && p.keywords.length >= 1 && [p.name, ...p.keywords].every((k) => k.split(/\s+/).length <= 3);
    if (techOnly) { prev.keywords = [...new Set([...prev.keywords, p.name, ...p.keywords])].slice(0, 12); return acc; }
    acc.push(p);
    return acc;
  }, []).filter((p) => p.name || p.highlights.length);
}

function skills(lines: Line[], languages = false): ResumeContent['skills'] {
  const groups: ResumeContent['skills'] = [];
  const loose: string[] = [];
  let pending = '';
  let last: ResumeContent['skills'][number] | null = null;
  lines.forEach((l, i) => {
    const t = l.text.trim();
    if (!t) return;
    // A short bold line followed by a list is a group label (sidebar layouts).
    const next = lines[i + 1]?.text ?? '';
    if (!l.bullet && !/[,;|:]/.test(t) && t.split(/\s+/).length <= 4 && (l.bold || /[,;|]/.test(next))) { pending = t; return; }
    // Wrapped continuation of the previous group's list ("…, AWS," + "Docker, MQTT").
    if (!l.bullet && last && /[,;]$/.test(lines[i - 1]?.text.trim() ?? '') && !/:/.test(t)) {
      const g = last;
      g.keywords.push(...t.split(/\s*[,;|•·]\s*/).map((x) => x.replace(/[.,;]$/, '').trim()).filter(Boolean));
      return;
    }
    const m0 = /^([^:]{2,40}):\s*(.+)$/.exec(t);
    const m = m0 ?? (pending ? [t, pending, t] as unknown as RegExpExecArray : null);
    pending = '';
    const items = (m0 ? m0[2] : t).split(/\s*(?:,|;|\||•|·|\s{3,}|\s\/\s)\s*/).map((x) => x.replace(/[.,;]$/, '').trim()).filter((x) => x && x.length <= 40);
    if (m) {
      const g = groups.find((x) => x.name.toLowerCase() === m[1].trim().toLowerCase());
      if (g) { g.keywords.push(...items); last = g; } else { last = { id: uid(), name: m[1].trim(), level: '', keywords: items }; groups.push(last); }
    } else { loose.push(...items); last = null; }
  });
  if (loose.length) groups.push({ id: uid(), name: languages ? 'Languages' : groups.length ? 'Other' : 'Skills', level: '', keywords: [...new Set(loose)] });
  return groups.map((g) => ({ ...g, keywords: [...new Set(g.keywords)] }));
}

function certs(lines: Line[]): ResumeContent['certificates'] {
  const out: ResumeContent['certificates'] = [];
  for (const l of lines) {
    const t = l.text.trim();
    if (!t) continue;
    const d = takeDates(t);
    const prev = out[out.length - 1];
    if (prev && d.found && !d.rest.trim() && !prev.date) { prev.date = d.start; continue; }
    if (prev && /[–—-]$/.test(prev.name) && !d.found) { prev.name = `${prev.name} ${d.rest}`; continue; }
    if (prev && !l.bullet && !d.found && !prev.issuer && d.rest.split(/\s+/).length <= 6 && !/[.]$/.test(d.rest)) { prev.issuer = d.rest; continue; }
    const parts = d.rest.split(/\s+[–—-]\s+(?!(?:associate|professional|practitioner|specialty|expert|fundamentals|foundation|advanced)\b)|\s*\|\s*|\s*,\s+(?=[A-Z])|\s+by\s+|\s*\((.+)\)\s*$/i).filter(Boolean).map((x) => x.trim());
    out.push({ id: uid(), name: parts[0] ?? d.rest, issuer: parts[1] ?? '', date: d.start, url: '' });
  }
  return out.filter((c) => c.name);
}

function awards(lines: Line[]): ResumeContent['awards'] {
  const out: ResumeContent['awards'] = [];
  for (const l of lines) {
    const t = l.text.trim();
    if (!t) continue;
    const prev = out[out.length - 1];
    if (prev && !l.bullet && /^[a-z]/.test(t)) { prev.summary = joinText([prev.summary, t]); continue; }
    if (prev && !l.bullet && !hasDate(t) && !prev.summary && (/[.!]$/.test(t) || t.split(/\s+/).length > 6)) { prev.summary = t; continue; }
    if (prev && !l.bullet && !hasDate(t) && !prev.awarder && !prev.summary && t.split(/\s+/).length <= 6) { prev.awarder = t; continue; }
    const d = takeDates(t);
    const m = /^(.{3,80}?)\s*(?::|\s[–—-]\s)\s*(.+)$/.exec(d.rest);
    out.push({ id: uid(), title: m ? m[1] : d.rest, awarder: '', date: d.start, summary: m ? m[2] : '' });
  }
  return out;
}

/* ---------- main ---------- */
export function parseResume(lines: Line[]): ParseResult {
  const c = emptyContent();
  const report: ParseReport = { found: [], ignored: [], warnings: [] };
  // Split into header + sections.
  const sections: { kind: SectionKind; title: string; lines: Line[] }[] = [];
  const header: Line[] = [];
  for (const l of lines) {
    const k = headingKind(l);
    if (k) { sections.push({ kind: k, title: l.text.replace(/[:：]$/, '').trim(), lines: [] }); continue; }
    if (sections.length) sections[sections.length - 1].lines.push(l); else header.push(l);
  }

  // Header: name, label, contacts.
  const all = lines.map((l) => l.text).join('\n');
  const hdr = header.length ? header : lines.slice(0, 6);
  const sized = hdr.slice(0, 5).filter((l) => l.size);
  const biggest = sized.length ? sized.reduce((a, b) => ((b.size ?? 0) > (a.size ?? 0) ? b : a)) : null;
  const nameLine = (biggest && !contactish(biggest.text) && biggest.text.split(/\s+/).length <= 6 ? biggest : null)
    ?? hdr.find((l) => !contactish(l.text) && /^[\p{L} .'-]{3,60}$/u.test(l.text.trim()) && l.text.trim().split(/\s+/).length <= 5);
  if (nameLine) {
    const nm = nameLine.text.trim();
    c.basics.name = nm === nm.toUpperCase() ? nm.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (x) => x.toUpperCase()) : nm;
  }
  const afterName = nameLine ? hdr.slice(hdr.indexOf(nameLine) + 1) : hdr;
  const labelLine = afterName.find((l) => !contactish(l.text) && l.text.length < 90 && l.text.split(/\s+/).length <= 12 && !/,\s*[A-Z]{2,}$/.test(l.text) && !l.text.includes('|'));
  if (labelLine && afterName.indexOf(labelLine) <= 1) c.basics.label = labelLine.text.trim();
  const email = EMAIL_RX.exec(all); if (email) c.basics.email = email[0];
  // Re-join URLs that wrapped onto the next line ("linkedin.com/in/name-" + "rest").
  const headText = hdr.map((l) => l.text).reduce((acc, t) => (/[-/]$/.test(acc) && /^[a-z0-9]/i.test(t) ? acc + t : acc ? `${acc}   ${t}` : t), '');
  const phoneSrc = (headText.match(/(?:\+?\d[\d\s().-]{8,}\d)/g) ?? all.match(/(?:\+?\d[\d\s().-]{8,}\d)/g) ?? []).find((p) => (p.match(/\d/g)?.length ?? 0) >= 10 && !RANGE_RX.test(p));
  if (phoneSrc) c.basics.phone = phoneSrc.trim();
  const urls = ([...(headText.match(URL_RX) ?? [])] as string[]).concat(all.match(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com)\/[^\s|,;)]+/gi) ?? []);
  const seen = new Set<string>();
  const keyOf = (u: string) => u.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  const allKeys = urls.map(keyOf);
  for (const u of urls) {
    if (allKeys.some((k) => k !== keyOf(u) && k.startsWith(keyOf(u)))) continue; // a wrapped fragment of a longer URL
    if (c.basics.email.toLowerCase().includes(u.toLowerCase().replace(/^https?:\/\//, ''))) continue;
    const key = u.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    if (seen.has(key)) continue; seen.add(key);
    const full = /^https?:/i.test(u) ? u : `https://${u}`;
    if (/linkedin\.com/i.test(u)) c.basics.profiles.push({ id: uid(), network: 'LinkedIn', username: key.split('/').filter(Boolean).pop() ?? '', url: full });
    else if (/github\.com/i.test(u)) c.basics.profiles.push({ id: uid(), network: 'GitHub', username: key.split('/').filter(Boolean).pop() ?? '', url: full });
    else if (!c.basics.url) c.basics.url = full;
  }
  // Location: a "City, Region" piece in the header that isn't a contact.
  for (const l of hdr) {
    for (const piece of l.text.split(SPLIT_RX)) {
      const p = piece.trim();
      if (!p || contactish(p) || p === c.basics.name || p === c.basics.label) continue;
      const m = /^([\p{L} .'-]{2,30}),\s*([\p{L} .'-]{2,30})(?:,\s*([\p{L} .'-]{2,30}))?$/u.exec(p);
      if (m) { c.basics.location = { city: m[1].trim(), region: '', countryCode: [m[2], m[3]].map((x) => (x ?? '').trim()).filter(Boolean).join(', ') }; break; } // editor edits city + "Country / region"
    }
    if (c.basics.location.city) break;
  }
  // A long sentence in the header usually is the summary.
  const headPara = hdr.filter((l) => l !== nameLine && l !== labelLine && !contactish(l.text) && l.text.split(/\s+/).length > 12);

  for (const s of sections) {
    if (!report.found.includes(s.kind) && s.kind !== 'other') report.found.push(s.kind);
    switch (s.kind) {
      case 'summary': c.basics.summary = joinText([c.basics.summary, ...s.lines.map((l) => l.text.trim())]); break;
      case 'work': c.work.push(...work(s.lines)); break;
      case 'education': c.education.push(...education(s.lines)); break;
      case 'projects': c.projects.push(...projects(s.lines)); break;
      case 'skills': c.skills.push(...skills(s.lines)); break;
      case 'languages': c.skills.push(...skills(s.lines, true)); break;
      case 'certificates': c.certificates.push(...certs(s.lines)); break;
      case 'awards': c.awards.push(...awards(s.lines)); break;
      default: report.ignored.push(s.title);
    }
  }
  if (!c.basics.summary && headPara.length) c.basics.summary = joinText(headPara.map((l) => l.text.trim()));
  if (!sections.length) {
    report.warnings.push('No section headings were recognised, so the text was placed in the Summary. Split it into sections in the editor.');
    c.basics.summary = joinText(lines.filter((l) => l !== nameLine && !contactish(l.text)).map((l) => l.text.trim())).slice(0, 2000);
  }
  if (!c.basics.name) report.warnings.push('Could not find your name. Add it in the review step.');
  if (!c.basics.email) report.warnings.push('No email address found.');
  if (sections.length && !c.work.length && !c.projects.length) report.warnings.push('No experience or projects were detected.');
  return { content: c, report };
}
