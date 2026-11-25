import type { AccentId, TemplateId } from './types';

export const ACCENTS: Record<AccentId, { name: string; theme: string; sidebar: string; soft: string }> = {
  violet: { name: 'Violet', theme: '#5B3DF5', sidebar: '#2A1F6E', soft: '#EEEAFF' },
  teal: { name: 'Teal', theme: '#0F9D9A', sidebar: '#0A5C5A', soft: '#E6F7F6' },
  charcoal: { name: 'Charcoal', theme: '#3D3854', sidebar: '#1C1830', soft: '#EEEBF3' },
  coral: { name: 'Coral', theme: '#E2574A', sidebar: '#9E3B31', soft: '#FFF1EF' },
  forest: { name: 'Forest', theme: '#0F766E', sidebar: '#134E4A', soft: '#E6F4F2' },
};

export const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[];

export const TEMPLATES: { id: TemplateId; name: string; blurb: string }[] = [
  { id: 'executive', name: 'Executive', blurb: 'Two-column, dark sidebar, serif headings' },
  { id: 'elegant', name: 'Elegant', blurb: 'Centered serif name, soft tinted sidebar' },
  { id: 'modern', name: 'Modern', blurb: 'Single column, accent rule, sans-serif' },
];
