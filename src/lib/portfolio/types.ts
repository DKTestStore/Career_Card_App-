import type { Resume } from '../types';

export type PortfolioTheme = 'minimal' | 'developer' | 'creative' | 'academic' | 'editorial' | 'midnight' | 'brutalist' | 'pastel'
  | 'terminal' | 'corporate' | 'sunset' | 'glass' | 'forest';
export type Visibility = 'public' | 'private' | 'password';
export type SectionKey = 'about' | 'projects' | 'skills' | 'experience' | 'education' | 'certifications' | 'gallery' | 'testimonials' | 'contact'
  // 0.6.0
  | 'stats' | 'services' | 'expertise' | 'awards' | 'articles' | 'languages';

export interface PProject {
  id: string;
  title: string;
  role: string;
  tags: string[];
  description: string;
  /** Compressed image data URL (webp/jpeg). */
  cover: string;
  gallery: string[];
  github: string;
  demo: string;
  featured: boolean;
}
export interface PExperience { id: string; title: string; company: string; start: string; end: string; summary: string }
export interface PEducation { id: string; school: string; degree: string; start: string; end: string; detail: string }
export interface PCert { id: string; name: string; issuer: string; date: string; url: string }
export interface PImage { id: string; src: string; caption: string }
export interface PTestimonial { id: string; quote: string; name: string; role: string }
/** 0.6.0 content blocks */
export type ServiceIcon = 'code' | 'palette' | 'target' | 'globe' | 'board' | 'award' | 'file' | 'user';
export interface PService { id: string; title: string; description: string; icon: ServiceIcon }
export interface PStat { id: string; value: string; label: string }
export interface PSkillLevel { id: string; name: string; level: number }
export interface PAward { id: string; title: string; issuer: string; date: string; detail: string }
export interface PArticle { id: string; title: string; url: string; outlet: string; date: string; summary: string }
export interface PLanguage { id: string; name: string; level: string }
export type Availability = '' | 'open' | 'freelance' | 'busy';

export interface PortfolioData {
  about: { name: string; headline: string; bio: string; location: string; openTo: string; photo: string; email: string; phone: string; website: string;
    /** 0.6.0: hire-me status badge and note (e.g. "From January 2027"). */
    availability: Availability; availabilityNote: string };
  projects: PProject[];
  skills: string[];
  experience: PExperience[];
  education: PEducation[];
  certifications: PCert[];
  gallery: PImage[];
  testimonials: PTestimonial[];
  stats: PStat[];
  services: PService[];
  expertise: PSkillLevel[];
  awards: PAward[];
  articles: PArticle[];
  languages: PLanguage[];
  contact: { email: string; phone: string; linkedin: string; github: string; website: string; twitter: string; showForm: boolean };
  /** Section order and visibility. */
  sections: { key: SectionKey; visible: boolean }[];
}

export interface PublishState {
  visibility: Visibility;
  hidePhone: boolean;
  showResume: boolean;
  /** Owner edit key (random, generated on this device). The server only stores its SHA-256. */
  token: string;
  /** Slug the server currently holds for this portfolio, if published. */
  publishedSlug: string;
  publishedAt: string;
  lastPublishedAt: string;
  passwordSet: boolean;
  /** True when local edits happened after the last publish. */
  dirty: boolean;
}

export interface Portfolio {
  id: string;
  slug: string;
  theme: PortfolioTheme;
  accent: string;
  resumeId: string;
  data: PortfolioData;
  publish: PublishState;
  createdAt: string;
  updatedAt: string;
}

/** What visitors receive from the API. */
export interface PublicPortfolio {
  slug: string;
  theme: PortfolioTheme;
  accent: string;
  data: PortfolioData;
  resume: Pick<Resume, 'template' | 'accent' | 'customColor' | 'font' | 'content'> | null;
  updatedAt?: string;
  publishedAt?: string;
}
