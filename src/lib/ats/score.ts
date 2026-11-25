/**
 * Rule-based ATS analysis. Pure functions, no network. The JD keyword part
 * (keywords.ts) is optional and passed in so this file stays tiny for the editor.
 */
import type { AtsBreakdownItem, Resume } from '../types';
import { toPlainText } from '../resume';
import { templateById } from '../../templates/registry';

export type Severity = 'high' | 'medium' | 'low';
export type FixTarget = 'basics' | 'summary' | 'work' | 'education' | 'projects' | 'skills' | 'certificates' | 'design';
export interface Suggestion { id: string; severity: Severity; text: string; target?: FixTarget }
export interface Rewrite {
  id: string; section: 'work' | 'projects'; entryId: string; index: number; where: string;
  original: string; suggestion: string; reason: string; canApply: boolean;
}
export interface Analysis {
  score: number; label: string; hasJd: boolean;
  breakdown: AtsBreakdownItem[]; suggestions: Suggestion[]; rewrites: Rewrite[];
}
export interface KeywordInput { matched: string[]; missingCount: number; total: number; score01: number }

export const ACTION_VERBS = /^(led|built|designed|developed|created|reduced|increased|improved|launched|managed|implemented|automated|delivered|drove|owned|optimi[sz]ed|migrated|mentored|shipped|architected|analy[sz]ed|wrote|established|spearheaded|streamlined|achieved|won|organi[sz]ed|coordinated|redesigned|scaled|cut|grew|trained|taught|planned|researched|presented|collaborated|negotiated|resolved|introduced|added|integrated|deployed|engineered|conducted|prepared|produced|supported|raised|saved|accelerated|boosted|consolidated|contributed|debugged|defined|enabled|generated|identified|instrumented|lowered|modernized|modernised|partnered|prototyped|published|refactored|secured|simplified|tested|validated|ran|headed|directed|authored|ported|benchmarked|tuned|eliminated|expanded|converted|closed|sold|hired|recruited|facilitated|piloted|standardi[sz]ed|translated|visuali[sz]ed|crafted|mapped|audited|forecast(ed)?|modeled|modelled|interviewed|cleaned|reconciled)\b/i;

const WEAK: [RegExp, string][] = [
  [/^(was\s+)?responsible\s+for\s+/i, 'Led'],
  [/^(was\s+)?in\s+charge\s+of\s+/i, 'Led'],
  [/^worked\s+on\s+/i, 'Built'],
  [/^worked\s+with\s+/i, 'Collaborated with'],
  [/^helped\s+(to\s+)?/i, 'Supported'],
  [/^assisted\s+(with\s+|in\s+)?/i, 'Supported'],
  [/^(was\s+)?involved\s+in\s+/i, 'Contributed to'],
  [/^participated\s+in\s+/i, 'Contributed to'],
  [/^tasked\s+with\s+/i, 'Owned'],
  [/^duties\s+included\s+/i, 'Delivered'],
  [/^handled\s+/i, 'Managed'],
  [/^did\s+/i, 'Delivered'],
  [/^made\s+/i, 'Created'],
  [/^used\s+/i, 'Applied'],
  [/^(i|we)\s+/i, ''],
];
const IRREG: Record<string, string> = { building: 'Built', making: 'Made', writing: 'Wrote', running: 'Ran', leading: 'Led', setting: 'Set', getting: 'Got', bringing: 'Brought', teaching: 'Taught', selling: 'Sold' };
function gerundToPast(g: string): string {
  const w = g.toLowerCase();
  if (IRREG[w]) return IRREG[w];
  const stem = w.slice(0, -3);
  const past = /([^aeiou])\1$/.test(stem) && !/(ll|ss)$/.test(stem) ? stem + 'ed' : stem.endsWith('e') ? stem + 'd' : stem + 'ed';
  return past[0].toUpperCase() + past.slice(1);
}
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Rewrite a bullet's weak opener; returns null if nothing to change. */
export function strengthen(bullet: string): string | null {
  const t = bullet.trim();
  for (const [rx, verb] of WEAK) {
    const m = rx.exec(t);
    if (!m) continue;
    let rest = t.slice(m[0].length);
    const g = /^([a-z]+ing)\b\s*/i.exec(rest);
    if (g && verb !== '' && g[1].length > 4) { rest = rest.slice(g[0].length); return `${gerundToPast(g[1])} ${rest}`.trim(); }
    return verb ? `${verb} ${rest}` : cap(rest);
  }
  return null;
}

const FIRST_PERSON = /\b(i|me|my|mine|myself)\b/i;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function scoreLabel(n: number): string {
  return n >= 80 ? 'Excellent' : n >= 65 ? 'Good' : n >= 50 ? 'Fair' : 'Needs work';
}

export function analyze(r: Pick<Resume, 'content' | 'template'>, kw?: KeywordInput): Analysis {
  const c = r.content, b = c.basics;
  const tpl = templateById(r.template);
  const S: Suggestion[] = [];
  const add = (severity: Severity, text: string, target?: FixTarget) => S.push({ id: `s${S.length}`, severity, text, target });
  const items: AtsBreakdownItem[] = [];
  const push = (key: string, label: string, score: number, max: number, detail: string) => items.push({ key, label, score: Math.max(0, Math.min(max, Math.round(score * 10) / 10)), max, detail });

  // Keyword match
  if (kw) {
    push('keywords', 'Keyword match', kw.score01 * 35, 35, kw.total ? `${kw.matched.length} of ${kw.total} job keywords found` : 'No recognisable keywords in the job description');
    if (kw.total && kw.score01 < 0.5) add('high', `Only ${Math.round(kw.score01 * 100)}% of the job's keywords appear in your resume. Add the missing ones you genuinely have.`, 'skills');
    else if (kw.total && kw.score01 < 0.75) add('medium', `${kw.missingCount} job keywords are missing. Click a red keyword to see where to add it.`, 'skills');
  }

  // Sections
  let sec = 0;
  if (b.summary.trim()) sec += 2; else add('medium', 'Add a 2–4 sentence professional summary.', 'summary');
  if (c.work.length + c.projects.length) sec += 3; else add('high', 'Add work experience, internships or projects.', 'work');
  if (c.education.length) sec += 2; else add('medium', 'Add your education (degree, institution, year).', 'education');
  if (c.skills.length) sec += 2; else add('high', 'Add a Skills section. ATS systems match on it directly.', 'skills');
  if (b.label.trim()) sec += 1; else add('low', 'Add a headline/title under your name (e.g. "Backend Engineer").', 'basics');
  push('sections', 'Section completeness', sec, 10, `${[b.summary.trim(), c.work.length + c.projects.length, c.education.length, c.skills.length, b.label.trim()].filter(Boolean).length}/5 core sections`);

  // Formatting / ATS safety
  let fmt = 15;
  const fd: string[] = [];
  if (!tpl.ats) { fmt -= 5; fd.push('design-focused template'); add('medium', `"${tpl.name}" is design-focused (columns or graphics). For online portals, switch to an ATS-friendly template.`, 'design'); }
  if (tpl.config?.skills === 'bars') { fmt -= 2; fd.push('skill bars'); }
  const allText = toPlainText(c);
  if (/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(allText)) { fmt -= 2; fd.push('emoji/symbols'); add('low', 'Remove emoji and decorative symbols; parsers may drop them.', 'work'); }
  const prose0 = [b.summary, ...c.work.flatMap((w) => [w.summary, ...w.highlights]), ...c.projects.flatMap((x) => [x.description, ...x.highlights])].join('\n');
  const tables = /\t|\|.*\|/.test(prose0);
  if (tables) { fmt -= 1; fd.push('table-like text'); add('low', 'Avoid tabs or | separated columns in bullets; parsers read them as tables.', 'work'); }
  push('formatting', 'Formatting & ATS safety', fmt, 15, fd.length ? `Penalties: ${fd.join(', ')}` : `ATS-friendly template, standard headings`);

  // Contact
  let ct = 0;
  if (b.name.trim()) ct += 2; else add('high', 'Add your full name.', 'basics');
  if (EMAIL.test(b.email.trim())) ct += 2; else add('high', b.email ? 'Your email address looks invalid.' : 'Add an email address.', 'basics');
  if (b.phone.replace(/\D/g, '').length >= 8) ct += 2; else add('high', 'Add a phone number with country code.', 'basics');
  if (b.location.city || b.location.region || b.location.countryCode) ct += 1; else add('low', 'Add your city/region. Many recruiters filter by location.', 'basics');
  if (b.url || b.profiles.length) ct += 1; else add('low', 'Add a LinkedIn, GitHub or portfolio link.', 'basics');
  push('contact', 'Contact information', ct, 8, ct === 8 ? 'Name, email, phone, location and link present' : 'Some contact details missing');

  // Length
  const total = words(allText);
  const len = total < 100 ? 0 : total < 250 ? 2 : total < 350 ? 5 : total <= 900 ? 7 : total <= 1200 ? 4 : 2;
  if (total < 350) add(total < 250 ? 'high' : 'medium', `Resume is short (${total} words). Aim for 400–800 words with concrete achievements.`, 'work');
  if (total > 1200) add('medium', `Resume is long (${total} words). Trim to the most relevant 1–2 pages.`, 'work');
  push('length', 'Length', len, 7, `${total} words (ideal 350–900)`);

  // Bullets
  const bl: { text: string; section: 'work' | 'projects'; entryId: string; index: number; where: string }[] = [];
  c.work.forEach((w) => w.highlights.forEach((h, i) => h.trim() && bl.push({ text: h.trim(), section: 'work', entryId: w.id, index: i, where: [w.position, w.name].filter(Boolean).join(' · ') || 'Experience' })));
  c.projects.forEach((p) => p.highlights.forEach((h, i) => h.trim() && bl.push({ text: h.trim(), section: 'projects', entryId: p.id, index: i, where: p.name || 'Project' })));
  const n = bl.length;
  let bs = 0;
  if (n) {
    const action = bl.filter((x) => ACTION_VERBS.test(x.text)).length / n;
    const nums = bl.filter((x) => /\d|%/.test(x.text)).length / n;
    const fp = bl.filter((x) => !FIRST_PERSON.test(x.text)).length / n;
    const okLen = bl.filter((x) => words(x.text) >= 8 && words(x.text) <= 30).length / n;
    bs = action * 5 + Math.min(1, nums / 0.5) * 4 + fp * 3 + okLen * 3;
    if (action < 0.7) add('medium', `${Math.round((1 - action) * n)} bullet(s) don't start with a strong action verb. See rewrite suggestions below.`, 'work');
    if (nums < 0.4) add('high', `Only ${Math.round(nums * n)} of ${n} bullets include numbers. Quantify impact (%, ₹/$, time saved, users).`, 'work');
    if (fp < 1) add('medium', 'Remove first-person words (I, my, me) from bullets.', 'work');
    if (okLen < 0.7) add('low', 'Keep bullets between 8 and 30 words: one achievement each.', 'work');
  } else add('high', 'Add 3–5 achievement bullets to each role or project.', 'work');
  push('bullets', 'Bullet quality', bs, 15, n ? `${n} bullets analysed` : 'No bullets yet');

  // Readability
  const prose = [b.summary, ...bl.map((x) => x.text)].join('. ');
  const sentences = prose.split(/[.!?]+\s/).map((s) => s.trim()).filter((s) => words(s) > 2);
  const avg = sentences.length ? sentences.reduce((a, s) => a + words(s), 0) / sentences.length : 0;
  const sw = words(b.summary);
  let rd = !sentences.length ? 0 : avg <= 22 ? 3 : avg <= 30 ? 2 : 1;
  rd += sw >= 20 && sw <= 90 ? 2 : sw ? 1 : 0;
  if (avg > 30) add('low', `Sentences average ${Math.round(avg)} words. Shorter sentences scan better.`, 'work');
  if (sw > 90) add('low', `Summary is ${sw} words. Keep it under 90.`, 'summary');
  push('readability', 'Readability', rd, 5, sentences.length ? `Avg ${Math.round(avg)} words per sentence; summary ${sw} words` : 'Not enough text yet');

  // Dates
  let dt = 5;
  const dd: string[] = [];
  const noStart = c.work.filter((w) => !w.startDate).length;
  if (noStart) { dt -= 2; dd.push(`${noStart} role(s) without start date`); add('medium', 'Add start dates (month and year) to every role.', 'work'); }
  const inverted = [...c.work, ...c.education].filter((x) => x.startDate && x.endDate && x.endDate < x.startDate).length;
  if (inverted) { dt -= 2; dd.push('end date before start date'); add('high', 'One or more entries end before they start. Check your dates.', 'work'); }
  const current = c.work.filter((w) => w.startDate && !w.endDate).length;
  if (current > 1) { dt -= 1; dd.push('multiple current roles'); add('low', 'More than one role is marked as current (no end date).', 'work'); }
  if (c.education.length && c.education.every((e) => !e.endDate && !e.startDate)) { dt -= 1; dd.push('education without dates'); }
  push('dates', 'Date consistency', dt, 5, dd.length ? dd.join('; ') : 'Dates complete and in order');

  // Rewrites
  const rewrites: Rewrite[] = [];
  for (const x of bl) {
    if (rewrites.length >= 10) break;
    const better = strengthen(x.text);
    const id = `${x.entryId}:${x.index}`;
    if (better && better !== x.text) rewrites.push({ id, ...x, original: x.text, suggestion: better, reason: FIRST_PERSON.test(x.text.split(' ')[0]) ? 'Drop first person' : 'Stronger action verb', canApply: true });
    else if (!/\d|%/.test(x.text)) rewrites.push({ id, ...x, original: x.text, suggestion: `${x.text.replace(/\.$/, '')}, [add result: e.g. by 25%, for 10k users, saving 5 hrs/week]`, reason: 'Add a measurable result', canApply: false });
    else if (words(x.text) > 30) rewrites.push({ id, ...x, original: x.text, suggestion: 'Split into two bullets: the action and the result.', reason: 'Too long', canApply: false });
  }

  const got = items.reduce((a, i) => a + i.score, 0);
  const max = items.reduce((a, i) => a + i.max, 0);
  const score = Math.round((got / max) * 100);
  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  S.sort((a, z) => order[a.severity] - order[z.severity]);
  return { score, label: scoreLabel(score), hasJd: !!kw, breakdown: items, suggestions: S, rewrites };
}
