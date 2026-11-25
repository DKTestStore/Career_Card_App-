/**
 * Template registry. The three original templates (executive, elegant, modern)
 * have bespoke renderers; every other template is a configuration of the
 * shared <Generic> renderer in ResumeDoc.tsx, styled by resume.css.
 *
 * `ats: true`  → "ATS-friendly": single reading order, standard headings, no graphics.
 * `ats: false` → "Design-focused": columns, bands or graphics that older parsers may misread.
 */

export type Category = 'Single column' | 'Two column' | 'Minimal' | 'Classic' | 'Creative' | 'Executive' | 'Tech' | 'Academic' | 'Student';
export type SectionKey = 'summary' | 'work' | 'projects' | 'education' | 'skills' | 'certificates' | 'awards';

export interface GenericConfig {
  layout: 'single' | 'sidebar' | 'gutter';
  side?: 'left' | 'right';
  sideStyle?: 'dark' | 'tint' | 'line';
  header: 'left' | 'center' | 'split' | 'band' | 'initials';
  head: 'rule' | 'caps' | 'bar' | 'underline' | 'pill' | 'plain' | 'mono' | 'box' | 'double';
  font: 'sans' | 'serif' | 'classic' | 'mono';
  density: 'compact' | 'normal' | 'airy';
  skills: 'inline' | 'chips' | 'bars' | 'list';
  timeline?: boolean;
  mono?: boolean;
  order?: SectionKey[];
  labels?: Partial<Record<SectionKey, string>>;
}

export interface TemplateDef {
  id: string;
  name: string;
  category: Category;
  ats: boolean;
  blurb: string;
  config?: GenericConfig; // absent for bespoke renderers
}

const STUDENT_ORDER: SectionKey[] = ['summary', 'education', 'projects', 'work', 'skills', 'certificates', 'awards'];
const ACADEMIC_ORDER: SectionKey[] = ['summary', 'education', 'projects', 'work', 'awards', 'certificates', 'skills'];
const TECH_ORDER: SectionKey[] = ['summary', 'skills', 'work', 'projects', 'education', 'certificates', 'awards'];

export const TEMPLATES: TemplateDef[] = [
  // Bespoke originals
  { id: 'executive', name: 'Executive', category: 'Two column', ats: false, blurb: 'Dark left sidebar, serif headings' },
  { id: 'elegant', name: 'Elegant', category: 'Two column', ats: false, blurb: 'Centred serif name, tinted sidebar' },
  { id: 'modern', name: 'Modern', category: 'Single column', ats: true, blurb: 'Accent rule, clean sans-serif' },

  // ATS-friendly single column
  { id: 'minimal', name: 'Minimal ATS', category: 'Minimal', ats: true, blurb: 'Plain text-first layout for job portals',
    config: { layout: 'single', header: 'left', head: 'caps', font: 'sans', density: 'normal', skills: 'inline' } },
  { id: 'classic', name: 'Classic Serif', category: 'Classic', ats: true, blurb: 'Centred header, ruled serif headings',
    config: { layout: 'single', header: 'center', head: 'rule', font: 'classic', density: 'normal', skills: 'inline' } },
  { id: 'harvard', name: 'Harvard', category: 'Classic', ats: true, blurb: 'Traditional business-school format',
    config: { layout: 'single', header: 'center', head: 'double', font: 'classic', density: 'compact', skills: 'list' } },
  { id: 'compact', name: 'Compact', category: 'Minimal', ats: true, blurb: 'Dense spacing to fit more on one page',
    config: { layout: 'single', header: 'split', head: 'underline', font: 'sans', density: 'compact', skills: 'inline' } },
  { id: 'clean', name: 'Clean Pro', category: 'Single column', ats: true, blurb: 'Airy single column with thin rules',
    config: { layout: 'single', header: 'left', head: 'rule', font: 'sans', density: 'airy', skills: 'inline' } },
  { id: 'ribbon', name: 'Ribbon', category: 'Single column', ats: true, blurb: 'Accent bar beside each heading',
    config: { layout: 'single', header: 'left', head: 'bar', font: 'sans', density: 'normal', skills: 'inline' } },
  { id: 'startup', name: 'Startup', category: 'Single column', ats: true, blurb: 'Pill headings and skill tags',
    config: { layout: 'single', header: 'split', head: 'pill', font: 'sans', density: 'normal', skills: 'chips' } },
  { id: 'monochrome', name: 'Monochrome', category: 'Minimal', ats: true, blurb: 'Black and grey only, printer friendly',
    config: { layout: 'single', header: 'left', head: 'caps', font: 'sans', density: 'normal', skills: 'inline', mono: true } },
  { id: 'executive-classic', name: 'Executive Classic', category: 'Executive', ats: true, blurb: 'Senior single column, serif headings',
    config: { layout: 'single', header: 'center', head: 'rule', font: 'serif', density: 'airy', skills: 'list' } },
  { id: 'developer', name: 'Developer', category: 'Tech', ats: true, blurb: 'Skills first, monospace headings',
    config: { layout: 'single', header: 'left', head: 'mono', font: 'mono', density: 'normal', skills: 'chips', order: TECH_ORDER } },
  { id: 'academic', name: 'Academic CV', category: 'Academic', ats: true, blurb: 'Education and research first',
    config: { layout: 'single', header: 'center', head: 'rule', font: 'classic', density: 'normal', skills: 'list', order: ACADEMIC_ORDER,
      labels: { projects: 'Research & Projects', awards: 'Honours & Awards', certificates: 'Certifications & Courses' } } },
  { id: 'fresher', name: 'Fresher', category: 'Student', ats: true, blurb: 'Education and projects first for students',
    config: { layout: 'single', header: 'left', head: 'bar', font: 'sans', density: 'normal', skills: 'chips', order: STUDENT_ORDER,
      labels: { work: 'Internships & Experience', summary: 'Objective' } } },
  { id: 'campus', name: 'Campus Placement', category: 'Student', ats: true, blurb: 'One-page format for placement cells',
    config: { layout: 'single', header: 'split', head: 'box', font: 'sans', density: 'compact', skills: 'inline', order: STUDENT_ORDER,
      labels: { work: 'Internships', summary: 'Career Objective' } } },

  // Design-focused
  { id: 'sidebar-right', name: 'Sidebar Right', category: 'Two column', ats: false, blurb: 'Main content left, tinted details right',
    config: { layout: 'sidebar', side: 'right', sideStyle: 'tint', header: 'left', head: 'caps', font: 'sans', density: 'normal', skills: 'chips' } },
  { id: 'corporate', name: 'Corporate', category: 'Executive', ats: false, blurb: 'Dark right sidebar, serif name',
    config: { layout: 'sidebar', side: 'right', sideStyle: 'dark', header: 'left', head: 'rule', font: 'serif', density: 'normal', skills: 'list' } },
  { id: 'infographic', name: 'Infographic', category: 'Creative', ats: false, blurb: 'Skill bars and monogram sidebar',
    config: { layout: 'sidebar', side: 'left', sideStyle: 'dark', header: 'initials', head: 'bar', font: 'sans', density: 'normal', skills: 'bars' } },
  { id: 'banner', name: 'Creative Banner', category: 'Creative', ats: false, blurb: 'Full-width colour header band',
    config: { layout: 'single', header: 'band', head: 'underline', font: 'sans', density: 'normal', skills: 'chips' } },
  { id: 'metro', name: 'Metro', category: 'Creative', ats: false, blurb: 'Colour band with two-column body',
    config: { layout: 'sidebar', side: 'right', sideStyle: 'line', header: 'band', head: 'caps', font: 'sans', density: 'normal', skills: 'bars' } },
  { id: 'timeline', name: 'Timeline', category: 'Creative', ats: false, blurb: 'Experience on a vertical timeline',
    config: { layout: 'single', header: 'left', head: 'bar', font: 'sans', density: 'normal', skills: 'chips', timeline: true } },
  { id: 'bold', name: 'Bold', category: 'Creative', ats: false, blurb: 'Oversized name and heavy section bars',
    config: { layout: 'single', header: 'band', head: 'box', font: 'sans', density: 'compact', skills: 'chips' } },
  { id: 'nordic', name: 'Nordic', category: 'Minimal', ats: false, blurb: 'Headings in a left gutter, lots of air',
    config: { layout: 'gutter', header: 'left', head: 'plain', font: 'sans', density: 'airy', skills: 'inline' } },
  { id: 'portfolio', name: 'Portfolio', category: 'Creative', ats: false, blurb: 'Tinted sidebar with large monogram',
    config: { layout: 'sidebar', side: 'left', sideStyle: 'tint', header: 'initials', head: 'underline', font: 'serif', density: 'normal', skills: 'chips' } },
  { id: 'tech-sidebar', name: 'Tech Stack', category: 'Tech', ats: false, blurb: 'Dark sidebar with tech chips',
    config: { layout: 'sidebar', side: 'left', sideStyle: 'dark', header: 'left', head: 'mono', font: 'mono', density: 'compact', skills: 'chips', order: TECH_ORDER } },
  { id: 'scholar', name: 'Scholar', category: 'Academic', ats: false, blurb: 'Serif CV with gutter headings',
    config: { layout: 'gutter', header: 'center', head: 'plain', font: 'classic', density: 'normal', skills: 'list', order: ACADEMIC_ORDER,
      labels: { projects: 'Research', awards: 'Honours' } } },
];

export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id);
export const CATEGORIES: Category[] = ['Single column', 'Two column', 'Minimal', 'Classic', 'Creative', 'Executive', 'Tech', 'Academic', 'Student'];

/** Old/unknown ids fall back to Executive so saved data always renders. */
const LEGACY: Record<string, string> = { exec: 'executive', default: 'executive', plain: 'minimal', serif: 'classic' };
export function migrateTemplateId(id: string | undefined): string {
  if (id && TEMPLATE_IDS.includes(id)) return id;
  if (id && LEGACY[id]) return LEGACY[id];
  return 'executive';
}
export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
