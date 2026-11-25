import type { FontId, Resume } from './types';

/* ---------- colour utilities ---------- */

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const toHex = (c: RGB) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrast(a: string, b: string): number {
  const x = hexToRgb(a), y = hexToRgb(b);
  if (!x || !y) return 1;
  const l1 = luminance(x), l2 = luminance(y);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
/** Darken toward black until text on white meets `ratio`. */
function darkenFor(c: RGB, ratio: number): RGB {
  let out = c;
  for (let i = 0; i < 20 && contrast(toHex(out), '#FFFFFF') < ratio; i++) out = mix(out, [0, 0, 0], 0.08);
  return out;
}

export interface AccentVars { name: string; base: string; theme: string; sidebar: string; soft: string; darkened: boolean }

/** Derive the three template variables from a single base colour, guaranteeing readable text. */
export function deriveAccent(base: string, name = 'Custom'): AccentVars {
  const rgb = hexToRgb(base) ?? [91, 61, 245];
  const theme = darkenFor(rgb, 4.5);              // headings / text on white (WCAG AA)
  const sidebar = darkenFor(mix(rgb, [0, 0, 0], 0.45), 8); // dark panels with white text
  const soft = mix(rgb, [255, 255, 255], 0.9);
  return { name, base: toHex(rgb), theme: toHex(theme), sidebar: toHex(sidebar), soft: toHex(soft), darkened: toHex(theme) !== toHex(rgb) };
}

/* ---------- presets ---------- */

export const ACCENT_PRESETS: { id: string; name: string; base: string }[] = [
  { id: 'violet', name: 'Violet', base: '#5B3DF5' },
  { id: 'indigo', name: 'Indigo', base: '#3F51B5' },
  { id: 'navy', name: 'Navy', base: '#1F3A68' },
  { id: 'sky', name: 'Sky', base: '#0284C7' },
  { id: 'teal', name: 'Teal', base: '#0F9D9A' },
  { id: 'emerald', name: 'Emerald', base: '#059669' },
  { id: 'forest', name: 'Forest', base: '#0F766E' },
  { id: 'slate', name: 'Slate', base: '#475569' },
  { id: 'charcoal', name: 'Charcoal', base: '#3D3854' },
  { id: 'black', name: 'Black', base: '#111111' },
  { id: 'purple', name: 'Purple', base: '#7E22CE' },
  { id: 'rose', name: 'Rose', base: '#E11D48' },
  { id: 'burgundy', name: 'Burgundy', base: '#8C1D40' },
  { id: 'coral', name: 'Coral', base: '#FF6B5C' },
  { id: 'amber', name: 'Amber', base: '#D97706' },
  { id: 'gold', name: 'Gold', base: '#B8860B' },
];
export const ACCENT_IDS = ACCENT_PRESETS.map((a) => a.id);

const cache = new Map<string, AccentVars>();
export function accentById(id: string): AccentVars {
  const p = ACCENT_PRESETS.find((x) => x.id === id) ?? ACCENT_PRESETS[0];
  let v = cache.get(p.id);
  if (!v) { v = deriveAccent(p.base, p.name); cache.set(p.id, v); }
  return v;
}

/** Resolve a resume's accent (preset or custom) into template variables. */
export function resolveAccent(r: Pick<Resume, 'accent' | 'customColor'>): AccentVars {
  if (r.accent === 'custom' && r.customColor && hexToRgb(r.customColor)) return deriveAccent(r.customColor, 'Custom');
  return accentById(r.accent);
}

export const isValidAccent = (id: string) => id === 'custom' || ACCENT_IDS.includes(id);

/* ---------- fonts ---------- */

export const FONTS: { id: FontId; name: string; head?: string; body?: string }[] = [
  { id: 'auto', name: 'Template default' },
  { id: 'sans', name: 'Sans (Inter)', head: "'Inter Variable', Inter, system-ui, sans-serif", body: "'Inter Variable', Inter, system-ui, sans-serif" },
  { id: 'serif', name: 'Serif headings (Fraunces)', head: "'Fraunces', Georgia, serif", body: "'Inter Variable', Inter, system-ui, sans-serif" },
  { id: 'classic', name: 'Classic (Georgia)', head: "Georgia, 'Times New Roman', serif", body: "Georgia, 'Times New Roman', serif" },
];
