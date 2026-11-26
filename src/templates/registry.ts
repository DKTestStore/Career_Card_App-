/**
 * Template registry. The three original templates (executive, elegant, modern)
 * have bespoke renderers; every other template is a configuration of the
 * shared <Generic> renderer in ResumeDoc.tsx, styled by resume.css.
 *
 * `ats: true`  → "ATS-friendly": single reading order, standard headings, no graphics.
 * `ats: false` → "Design-focused": columns, bands or graphics that older parsers may misread.
 */

export type Category = 'Single column' | 'Two column' | 'Minimal' | 'Classic' | 'Creative' | 'Executive' | 'Tech' | 'Academic' | 'Student' | 'Professional' | 'Simple' | 'Functional';
export type SectionKey = 'summary' | 'work' | 'projects' | 'education' | 'skills' | 'certificates' | 'awards';

export interface GenericConfig {
  layout: 'single' | 'sidebar' | 'gutter';
  side?: 'left' | 'right';
  sideStyle?: 'dark' | 'tint' | 'line';
  header: 'left' | 'center' | 'split' | 'band' | 'initials' | 'stripe' | 'frame' | 'right' | 'ruled' | 'tinted';
  head: 'rule' | 'caps' | 'bar' | 'underline' | 'pill' | 'plain' | 'mono' | 'box' | 'double' | 'leader' | 'slab' | 'number' | 'tab' | 'dotted' | 'overline' | 'square';
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
/** Functional / skills-based: competencies and achievements before the job list. */
const FUNCTIONAL_ORDER: SectionKey[] = ['summary', 'skills', 'awards', 'projects', 'work', 'education', 'certificates'];
/** Combination / hybrid: skills summary, then a full chronology. */
const HYBRID_ORDER: SectionKey[] = ['summary', 'skills', 'work', 'projects', 'education', 'certificates', 'awards'];
/** Licensed professions (healthcare, teaching, trades): credentials up front. */
const LICENSED_ORDER: SectionKey[] = ['summary', 'certificates', 'work', 'education', 'skills', 'awards', 'projects'];
/** Results-led (sales, business development): achievements right after the summary. */
const RESULTS_ORDER: SectionKey[] = ['summary', 'awards', 'work', 'skills', 'education', 'certificates', 'projects'];

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
  // Added in 0.5.0 (ATS-friendly)
  { id: 'consultant', name: 'Consultant', category: 'Executive', ats: true, blurb: 'Split header, serif headings with leader lines',
    config: { layout: 'single', header: 'split', head: 'leader', font: 'serif', density: 'normal', skills: 'list' } },
  { id: 'analyst', name: 'Analyst', category: 'Single column', ats: true, blurb: 'Accent top stripe and tinted section slabs',
    config: { layout: 'single', header: 'stripe', head: 'slab', font: 'sans', density: 'compact', skills: 'inline' } },
  { id: 'engineer', name: 'Engineer', category: 'Tech', ats: true, blurb: 'Skills up top, underlined headings, dense',
    config: { layout: 'single', header: 'left', head: 'underline', font: 'sans', density: 'compact', skills: 'chips', order: TECH_ORDER } },
  { id: 'graduate', name: 'Graduate', category: 'Student', ats: true, blurb: 'Centred, airy, education first for freshers',
    config: { layout: 'single', header: 'center', head: 'pill', font: 'sans', density: 'airy', skills: 'chips', order: STUDENT_ORDER,
      labels: { work: 'Internships & Experience', summary: 'Objective' } } },
  { id: 'banker', name: 'Banker', category: 'Classic', ats: true, blurb: 'Conservative serif, centred, compact',
    config: { layout: 'single', header: 'center', head: 'leader', font: 'classic', density: 'compact', skills: 'list' } },

  // Added in 0.6.0 (ATS-friendly) — inspired by the "ATS / Simple / Professional" families on popular template sites, built from scratch
  { id: 'boardroom', name: 'Boardroom', category: 'Professional', ats: true, blurb: 'Heavy top rule, serif caps headings, measured spacing',
    config: { layout: 'single', header: 'ruled', head: 'caps', font: 'serif', density: 'normal', skills: 'list' } },
  { id: 'ledger', name: 'Ledger', category: 'Professional', ats: true, blurb: 'Framed name block and dotted section rules',
    config: { layout: 'single', header: 'frame', head: 'dotted', font: 'classic', density: 'compact', skills: 'inline' } },
  { id: 'simple-line', name: 'Simple Line', category: 'Simple', ats: true, blurb: 'Short accent line over each heading, nothing else',
    config: { layout: 'single', header: 'left', head: 'overline', font: 'sans', density: 'airy', skills: 'inline' } },
  { id: 'index', name: 'Index', category: 'Simple', ats: true, blurb: 'Numbered sections (01, 02…) for a tidy read',
    config: { layout: 'single', header: 'left', head: 'number', font: 'sans', density: 'normal', skills: 'inline' } },
  { id: 'skills-based', name: 'Skills-Based', category: 'Functional', ats: true, blurb: 'Functional format: competencies and wins before jobs',
    config: { layout: 'single', header: 'center', head: 'square', font: 'sans', density: 'normal', skills: 'list', order: FUNCTIONAL_ORDER,
      labels: { summary: 'Profile', skills: 'Core Competencies', awards: 'Selected Achievements', work: 'Employment History' } } },
  { id: 'hybrid', name: 'Hybrid', category: 'Functional', ats: true, blurb: 'Combination format: key skills, then full history',
    config: { layout: 'single', header: 'split', head: 'tab', font: 'sans', density: 'normal', skills: 'list', order: HYBRID_ORDER,
      labels: { summary: 'Profile', skills: 'Key Skills', work: 'Professional Experience' } } },
  { id: 'care', name: 'Care', category: 'Professional', ats: true, blurb: 'Licences first; for healthcare and allied roles',
    config: { layout: 'single', header: 'tinted', head: 'bar', font: 'sans', density: 'normal', skills: 'inline', order: LICENSED_ORDER,
      labels: { certificates: 'Licenses & Certifications', work: 'Clinical Experience' } } },
  { id: 'educator', name: 'Educator', category: 'Professional', ats: true, blurb: 'Credentials and education up top, classic serif',
    config: { layout: 'single', header: 'center', head: 'overline', font: 'classic', density: 'normal', skills: 'list',
      order: ['summary', 'certificates', 'education', 'work', 'skills', 'awards', 'projects'],
      labels: { summary: 'Teaching Philosophy', certificates: 'Credentials', work: 'Teaching Experience' } } },
  { id: 'closer', name: 'Closer', category: 'Professional', ats: true, blurb: 'Results first, right-aligned header; sales & BD',
    config: { layout: 'single', header: 'right', head: 'underline', font: 'sans', density: 'normal', skills: 'inline', order: RESULTS_ORDER,
      labels: { awards: 'Key Results', work: 'Sales Experience' } } },
  { id: 'civic', name: 'Civic', category: 'Classic', ats: true, blurb: 'Detailed public-sector style with dotted rules',
    config: { layout: 'single', header: 'ruled', head: 'dotted', font: 'classic', density: 'normal', skills: 'list',
      labels: { work: 'Work Experience', certificates: 'Training & Certifications' } } },
  { id: 'pivot', name: 'Pivot', category: 'Functional', ats: true, blurb: 'Career-change format: transferable skills lead',
    config: { layout: 'single', header: 'left', head: 'square', font: 'sans', density: 'compact', skills: 'inline', order: FUNCTIONAL_ORDER,
      labels: { summary: 'Career Change Summary', skills: 'Transferable Skills', awards: 'Highlights', work: 'Work History' } } },

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
  // Added in 0.5.0 (design-focused)
  { id: 'slate', name: 'Slate', category: 'Executive', ats: false, blurb: 'Dark slate sidebar with serif leader headings',
    config: { layout: 'sidebar', side: 'left', sideStyle: 'dark', header: 'left', head: 'leader', font: 'serif', density: 'normal', skills: 'list' } },
  { id: 'aurora', name: 'Aurora', category: 'Creative', ats: false, blurb: 'Colour band header with a tinted right column',
    config: { layout: 'sidebar', side: 'right', sideStyle: 'tint', header: 'band', head: 'pill', font: 'sans', density: 'normal', skills: 'chips' } },
  { id: 'studio', name: 'Studio', category: 'Creative', ats: false, blurb: 'Gutter headings on slabs, serif, lots of air',
    config: { layout: 'gutter', header: 'stripe', head: 'slab', font: 'serif', density: 'airy', skills: 'chips' } },
  { id: 'pulse', name: 'Pulse', category: 'Creative', ats: false, blurb: 'Monogram header, timeline and skill bars',
    config: { layout: 'single', header: 'initials', head: 'bar', font: 'sans', density: 'normal', skills: 'bars', timeline: true } },
  // Added in 0.6.0 (design-focused)
  { id: 'mosaic', name: 'Mosaic', category: 'Creative', ats: false, blurb: 'Tinted header and side panel with tab headings',
    config: { layout: 'sidebar', side: 'left', sideStyle: 'tint', header: 'tinted', head: 'tab', font: 'sans', density: 'normal', skills: 'chips' } },
  { id: 'noir', name: 'Noir', category: 'Executive', ats: false, blurb: 'Dark right column, serif, overline headings',
    config: { layout: 'sidebar', side: 'right', sideStyle: 'dark', header: 'left', head: 'overline', font: 'serif', density: 'normal', skills: 'list' } },
  { id: 'horizon', name: 'Horizon', category: 'Creative', ats: false, blurb: 'Colour band header with numbered sections',
    config: { layout: 'single', header: 'band', head: 'number', font: 'sans', density: 'normal', skills: 'chips' } },
  { id: 'atelier', name: 'Atelier', category: 'Creative', ats: false, blurb: 'Gutter headings, right-set name, serif accents',
    config: { layout: 'gutter', header: 'right', head: 'square', font: 'serif', density: 'airy', skills: 'inline' } },
  { id: 'blueprint', name: 'Blueprint', category: 'Tech', ats: false, blurb: 'Monospace, ruled header, lined right column',
    config: { layout: 'sidebar', side: 'right', sideStyle: 'line', header: 'ruled', head: 'dotted', font: 'mono', density: 'compact', skills: 'chips', order: TECH_ORDER } },
  { id: 'canvas', name: 'Canvas', category: 'Creative', ats: false, blurb: 'Monogram, tab headings and a timeline',
    config: { layout: 'single', header: 'initials', head: 'tab', font: 'sans', density: 'airy', skills: 'chips', timeline: true } },
  { id: 'prism', name: 'Prism', category: 'Creative', ats: false, blurb: 'Band header, tinted left panel, skill bars',
    config: { layout: 'sidebar', side: 'left', sideStyle: 'tint', header: 'band', head: 'square', font: 'sans', density: 'normal', skills: 'bars' } },
  { id: 'harbor', name: 'Harbor', category: 'Two column', ats: false, blurb: 'Framed name, lined left column, serif',
    config: { layout: 'sidebar', side: 'left', sideStyle: 'line', header: 'frame', head: 'overline', font: 'serif', density: 'normal', skills: 'list' } },
  { id: 'vivid', name: 'Vivid', category: 'Creative', ats: false, blurb: 'Bold band, tab headings and skill bars',
    config: { layout: 'single', header: 'band', head: 'tab', font: 'sans', density: 'compact', skills: 'bars' } },
  { id: 'zen', name: 'Zen', category: 'Minimal', ats: false, blurb: 'Centred calm with gutter headings and dotted rules',
    config: { layout: 'gutter', header: 'center', head: 'dotted', font: 'sans', density: 'airy', skills: 'inline' } },
  { id: 'columnist', name: 'Columnist', category: 'Two column', ats: false, blurb: 'Dark left column with numbered main sections',
    config: { layout: 'sidebar', side: 'left', sideStyle: 'dark', header: 'left', head: 'number', font: 'classic', density: 'normal', skills: 'list' } },
];

export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id);
export const CATEGORIES: Category[] = ['Single column', 'Two column', 'Simple', 'Professional', 'Functional', 'Minimal', 'Classic', 'Creative', 'Executive', 'Tech', 'Academic', 'Student'];

/** Old/unknown ids fall back to Executive so saved data always renders. */
const LEGACY: Record<string, string> = { exec: 'executive', default: 'executive', plain: 'minimal', serif: 'classic' };
export function migrateTemplateId(id: string | undefined): string {
  if (id && TEMPLATE_IDS.includes(id)) return id;
  if (id && LEGACY[id]) return LEGACY[id];
  return 'executive';
}
export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
