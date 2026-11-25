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

export type TemplateId = 'executive' | 'elegant' | 'modern';
export type AccentId = 'violet' | 'teal' | 'charcoal' | 'coral' | 'forest';

export interface Resume {
  id: string;
  name: string;
  template: TemplateId;
  accent: AccentId;
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
  snapshot: Pick<Resume, 'name' | 'template' | 'accent' | 'content'>;
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
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Backup {
  app: 'hire-ready';
  schema: 1;
  exportedAt: string;
  resumes: Resume[];
  versions: ResumeVersion[];
  applications: Application[];
}
