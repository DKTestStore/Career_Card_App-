/** Content model: JSON Resume (https://jsonresume.org/schema) with an internal `id` on list entries. */

export interface Profile { id: string; network: string; username?: string; url: string }
export interface Location { address?: string; city?: string; region?: string; countryCode?: string; postalCode?: string }

export interface Basics {
  name: string;
  label: string;
  email: string;
  phone: string;
  url: string;
  summary: string;
  location: Location;
  profiles: Profile[];
}

export interface Work {
  id: string;
  name: string;
  position: string;
  location?: string;
  url?: string;
  startDate: string;
  endDate: string;
  summary?: string;
  highlights: string[];
}

export interface Education {
  id: string;
  institution: string;
  area: string;
  studyType: string;
  startDate: string;
  endDate: string;
  score: string;
  courses: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  highlights: string[];
  keywords: string[];
}

export interface Skill { id: string; name: string; level?: string; keywords: string[] }
export interface Certificate { id: string; name: string; issuer: string; date: string; url?: string }
export interface Award { id: string; title: string; awarder: string; date: string; summary: string }

export interface ResumeContent {
  basics: Basics;
  work: Work[];
  education: Education[];
  projects: Project[];
  skills: Skill[];
  certificates: Certificate[];
  awards: Award[];
}

/** Template ids are validated against the registry in templates/registry.ts. */
export type TemplateId = string;
/** Accent preset id from lib/themes.ts, or 'custom' (uses Resume.customColor). */
export type AccentId = string;
export type FontId = 'auto' | 'sans' | 'serif' | 'classic';

export interface Resume {
  id: string;
  name: string;
  template: TemplateId;
  accent: AccentId;
  /** Hex colour used when accent === 'custom'. */
  customColor?: string;
  font?: FontId;
  content: ResumeContent;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeVersion {
  id: string;
  resumeId: string;
  number: number;
  label: string;
  createdAt: string;
  snapshot: Pick<Resume, 'name' | 'template' | 'accent' | 'content' | 'customColor' | 'font'>;
}

export const STATUSES = ['wishlist', 'applied', 'interview', 'offer', 'rejected'] as const;
export type AppStatus = (typeof STATUSES)[number];

export interface Application {
  id: string;
  company: string;
  role: string;
  location: string;
  link: string;
  dateApplied: string;
  salary: string;
  resumeId: string;
  versionId: string;
  status: AppStatus;
  notes: string;
  followUp: string;
  contact: string;
  /** Optional link to a saved ATS report. */
  atsReportId?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface AtsBreakdownItem { key: string; label: string; score: number; max: number; detail: string }

export interface AtsReport {
  id: string;
  resumeId: string;
  resumeName: string;
  jdTitle: string;
  jdText: string;
  score: number;
  breakdown: AtsBreakdownItem[];
  matched: string[];
  missing: string[];
  createdAt: string;
}

export interface Backup {
  app: 'hire-ready';
  schema: 1;
  exportedAt: string;
  resumes: Resume[];
  versions: ResumeVersion[];
  applications: Application[];
  atsReports?: AtsReport[];
  /** Added in 0.4.0 — includes the portfolio edit key, keep backups private. */
  portfolios?: import('./portfolio/types').Portfolio[];
  /** Added in 0.6.0 — personal planner events and tasks. */
  events?: PlannerEvent[];
}

/** 0.6.0 personal planner (Calendar page). Dates are local YYYY-MM-DD, times HH:MM. */
export const EVENT_CATEGORIES = ['interview', 'deadline', 'follow-up', 'study', 'personal', 'other'] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];
export interface PlannerEvent {
  id: string;
  title: string;
  kind: 'event' | 'task';
  date: string;
  allDay: boolean;
  time: string;
  endTime: string;
  category: EventCategory;
  /** Optional custom colour (hex); falls back to the category colour. */
  color: string;
  notes: string;
  done: boolean;
  /** Optional link to a tracker application. */
  applicationId?: string;
  createdAt: string;
  updatedAt: string;
}
