# Changelog

## 0.6.0 — 2026-11-26

> Built without running the Playwright / e2e suites, at the owner's request ("don't test anything"). Only `npm run lint` and `npm run build` (type-check + build) were run.

- **22 new résumé templates** (58 total: 30 ATS-friendly, 28 design-focused). Original designs, informed by a review of the kinds of layouts common on template sites (simple, professional, functional, hybrid, industry-specific); no designs, text or branding copied.
  - ATS: Boardroom, Ledger, Simple Line, Index, Skills-based, Hybrid, Care, Educator, Closer, Civic, Pivot.
  - Design: Mosaic, Noir, Horizon, Atelier, Blueprint, Canvas, Prism, Harbor, Vivid, Zen, Columnist.
  - New header styles *frame, right, ruled, tinted*; heading styles *number, tab, dotted, overline, square*; categories *Simple, Professional, Functional*; functional / hybrid / licensed / results-first section orders. All supported in PDF and Word export.
- **5 new portfolio themes** (13 total): Terminal, Corporate, Sunset, Glass, Forest (also accepted by the publish API).
- **New portfolio sections**: availability badge (open to work / freelance / not available + note), At a glance (numbers), Services / What I do, Skill levels, Awards & achievements (imported from résumé awards), Writing & talks, Languages. Editable in the builder, hideable / reorderable, rendered on public pages. Older local and published portfolios are normalised on load.
- **Calendar / planner** (`/calendar`, new nav item): month / week / agenda views, events and tasks with category, colour, time, notes and done; today / next 7 days / overdue panels; tracker applied and follow-up dates shown read-only; .ics export; stored in IndexedDB `events` (DB v4) and included in backups.
- Bottom nav now has 7 items; service worker cache v6.

## 0.5.0 — 2026-11-26

- **Upload a résumé** (PDF, Word .docx or .txt, up to 8 MB) from the Resumes page or the ATS page. The file is parsed on the device (pdf.js / fflate + DOMParser, both lazy-loaded) into contact details, summary, experience, education, projects, skills, certifications and achievements; a **review dialog** shows what was found and lets you fix it before saving as a new résumé (or *Save & check ATS*).
- **Download as PDF** — a real text-selectable A4 PDF built on the device with jsPDF, following the template's colours, header, heading style, section order and sidebar.
- **Download as Word (.docx)** — generated on the device (Office Open XML + fflate) with proper Word styles, real bullets and right-aligned dates; single column for ATS.
- Export menu: *PDF document*, *Word document*, *Print / Save as PDF (exact look)*, *Plain text*, *JSON Resume*. Files are named `First_Last_Resume.pdf/.docx`.
- **ATS match report** (inspired by Jobalytics-style scanners, rule-based and on-device): match rate %, job-title match, Hard / Soft / Other keyword tabs, priority per keyword, count in the job post vs résumé, where it appears, one-click *Add to skills* and *Add all missing hard skills*, tips for wording differences and skills that are only listed but not used in Experience. Check an uploaded file without saving it first.
- **9 new résumé templates** (36 total: 19 ATS-friendly, 17 design-focused): ATS — Consultant, Analyst, Engineer, Graduate, Banker; design — Slate, Aurora, Studio, Pulse. New header style *stripe* and heading styles *leader* and *slab*.
- **4 new portfolio themes** (8 total): Editorial, Midnight, Brutalist, Pastel — accepted by the publish API and rendered on public pages.
- Service worker cache v5. New lazy dependencies: `pdfjs-dist`, `jspdf`, `fflate`. Main bundle +1.5 kB gzip.
- Tests: `scripts/upload_export_ats_e2e.py` (desktop + mobile: upload PDF and DOCX, review, download PDF/DOCX and validate them with pdftotext / python-docx, round-trip re-import, new templates, ATS upload + match + add keywords) and `scripts/make_resume_fixtures.py`; `portfolio_e2e.py` covers all 8 themes and publishes a new theme.

## 0.4.0 — 2026-11-26

- **My Portfolio** (new nav item on desktop and mobile, `/portfolio`): builder with About/hero, Projects, Skills, Experience, Education, Certifications, Gallery, Testimonials and Contact sections (hide / reorder), live scaled preview, and a Design & publish panel.
- **Import from résumé** into the portfolio; project editor modal (tags, description, cover, gallery, GitHub / demo links, featured).
- **4 portfolio themes** (Minimal, Developer dark, Creative, Academic) + accent colours and custom colour; theme gallery page; full-page local preview.
- Client-side image compression (max 1600 px, WebP with JPEG fallback).
- **Publishing** via two Vercel functions and a private **Vercel Blob** store: `POST /api/portfolio` (`check`, `publish`, `view` with password, `unpublish`) and `GET /api/portfolio?slug=`. Owner edit key generated in the browser, SHA-256 hash stored server-side; slugs held by another key are rejected (409). Public / private / password (scrypt-hashed) visibility, hide-phone applied server-side, 2 MB limit, light per-instance rate limits, plain-text sanitising (no HTML) and http(s)/mailto-only links.
- **Public page** `/p/:slug` (no sign-in needed) with hero, featured projects, skills, timeline, contact form (mailto), links, QR code and *Download résumé* (print-ready PDF of the chosen résumé). `/p/:slug` is served by `api/p-page.js`, which fills in title, description, canonical and Open Graph tags.
- Publish & share page: custom link with availability check, visibility, hide phone, résumé choice, copy link, QR code (SVG + PNG download), size meter, unpublish.
- IndexedDB v3 adds a `portfolios` store; backups include the portfolio (and its edit key). Service worker v4 never caches `/api/*` and does not store `/p/*` pages as the app shell.
- Portfolio routes and the QR library are lazy-loaded; the main bundle grew by about 1.5 kB gzip.
- `npm run serve:local` (local stand-in for Vercel with a folder-based store) and `scripts/portfolio_e2e.py`.

## 0.3.0 — 2026-11-25

- **ATS Check** page at `/ats` (new nav item on desktop and mobile): paste a job description or pick one of 4 samples, choose a resume, get a 0–100 score with gauge and breakdown (keywords, sections, formatting/ATS safety, contact, length, bullet quality, readability, dates).
- Matched/missing keyword chips; missing keywords explain where to add them and link to the editor section.
- Suggestions with severity and Fix links; rule-based bullet rewrites with Apply.
- Saved ATS reports (history per resume) in IndexedDB; tracker applications can link a report and show its score.
- Editor: ATS score panel with top suggestions; resume cards show a general ATS score.
- **24 new templates (27 total)** with ATS-friendly / Design-focused tags, and a template gallery with thumbnails, search, tag and category filters.
- **16 colour presets** plus a custom colour picker with automatic contrast darkening; 4 font pairings; optional skill level for skill-bar templates.
- Data migration: IndexedDB v2 (`atsReports` store); old or unknown template and colour ids map to Executive / Violet. Backups include ATS reports.
- Fix: absolutely positioned screen-reader labels inside the kanban board no longer widen the page on small screens.
- Service worker cache bumped to `hire-ready-v3`.

## 0.2.0 — 2026-11-25

- Welcome page at `/welcome` on first visit: brand hero, feature highlights, “Get started” as a guest (optional first name), and a disabled “Continue with Google” button marked Coming soon.
- Guest session stored locally. After the first visit the app opens the dashboard; signing out clears the session so the next visit shows Welcome again.
- Account menu in the desktop sidebar and the mobile header, with Sign out.
- Sign-out dialog: keep data on this device (default), or erase data (with a second confirm), plus “Download backup first”.
- Signed-out page at `/logout` (`/signed-out` works too): “Sign back in” returns to the dashboard; “Back to welcome” returns to the Welcome page.
- Auth module (`src/lib/auth.tsx`) structured so a Supabase Google provider can be plugged in later.
- Documentation: README updates (live URL, privacy, deploy notes) and `docs/ARCHITECTURE.md`.
- `vercel.json` `git.deploymentEnabled` allows automatic Git deployments from `main` only (`**: false` for every other branch). Production deploys must be made from the exact pushed `origin/main` HEAD.

## 0.1.0 — 2026-11-25

- Phase 1 app: Resume Builder (3 templates, 5 colours, versions, PDF / text / JSON Resume export) and Application Tracker (Kanban + list, follow-ups).
- On-device storage (IndexedDB, localStorage fallback), PWA / offline shell, responsive desktop and mobile layouts.
- First production deploy of `career-card-app` at https://career-card-app.vercel.app.
