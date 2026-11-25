# Hire Ready — Phase 1

Lightweight, installable web app with two modules:

- **Resume Builder** — create resumes from blank or sample profiles, edit every section, live A4 preview with 3 templates × 5 colour themes, version history, PDF / text / JSON Resume export.
- **Application Tracker** — Kanban board (Wishlist → Applied → Interview → Offer → Rejected) with drag-and-drop, list view, search/filter, stats and overdue follow-up highlights.

No backend, no account, no tracking. All data stays in the user's browser (IndexedDB, with a localStorage fallback).

## Features

### Resume Builder
- Dashboard + Resumes page: create (blank or Software Engineer / Fresher-Student / Product Designer samples), open, duplicate, rename, delete (with confirmation), search.
- Editor sections: Contact (incl. LinkedIn/GitHub/portfolio profiles), Summary, Experience, Education, Projects, Skills, Certifications, Achievements. Add / remove / reorder entries; bullet lists with reorder (Enter adds a bullet, Backspace on an empty bullet removes it).
- Live preview at real A4 size (scaled), page-break guides when content runs past one page.
- Templates: **Executive** (two-column, dark sidebar, serif headings), **Elegant** (centred serif name, tinted sidebar), **Modern** (single column, accent rule). Colours: Violet, Teal, Charcoal, Coral, Forest.
- Autosave (debounced) with a *Saving… / Saved* indicator.
- Versions: manual "Save version" snapshots (optional label), up to **50 per resume** (oldest dropped), restore with confirmation, delete.
- Export: **PDF** via the browser print dialog (print stylesheet prints only the resume on a clean A4 page — choose *Save as PDF*), **Plain text**, **JSON Resume** (jsonresume.org schema; template/colour kept in `meta.hireReady`).
- Import a JSON Resume file as a new resume.
- Quick ATS-friendly checks (contact info, summary length, measurable bullets, action verbs, bullet length, skills count, education).

### Application Tracker
- Fields: company, role, location, job link, date applied, salary/CTC, resume + saved version used, status, notes, next follow-up date, contact.
- Board: native HTML5 drag-and-drop between and within columns (desktop); every card also has ◀ / ▶ buttons and a status dropdown (always visible on touch screens, on hover/focus on desktop) so it works on mobile and by keyboard.
- List view (table on desktop, stacked cards on mobile) with sort, search and status filter.
- Stats: total, count per status (click to filter), response rate = (Interview + Offer + Rejected) ÷ everything past Wishlist.
- Follow-ups: overdue cards get a coral edge + badge, "due today" in amber; dashboard lists upcoming follow-ups.

### Data
- Full backup export/import (JSON) with *Merge* or *Replace all*; "Delete all data" in Data & settings.
- PWA: web manifest + service worker (offline app shell, cache-first hashed assets). Installable from the browser menu.
- Responsive: left sidebar on desktop; bottom nav, single column and Edit / Preview / Design tabs on mobile (tested at 360, 390, 900 and 1440 px wide).
- Accessibility: labelled inputs, skip link, native `<dialog>` modals (focus trap + Esc), radio-group semantics for template/colour pickers, keyboard-operable menus, visible focus rings, reduced-motion support.

## Stack
Vite 7 + React 19 + TypeScript, plain CSS. Runtime deps: `react`, `react-dom`, `idb` (~1 kB), and self-hosted fonts (`@fontsource-variable/inter`, `@fontsource/fraunces`) — no Google Fonts requests.

## Local development
```bash
npm i
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ at http://localhost:4173
npm run lint       # ESLint
npm run typecheck  # tsc
```

Optional smoke test + screenshots (Python Playwright, uses a local Chrome):
```bash
npm run build && npx vite preview --port 4173 &
python3 scripts/review.py   # writes screenshots-review/*.png and a sample PDF
```

## Deploy to Vercel
It's a static SPA, so no configuration is needed beyond the included `vercel.json` (build `npm run build`, output `dist`, SPA rewrite to `/index.html`).

**Option A — dashboard:** push this folder to a Git repo, then on [vercel.com](https://vercel.com) → *Add New… → Project* → import the repo → *Deploy*. Vercel detects Vite automatically.

**Option B — CLI:**
```bash
npx vercel          # first run links/creates the project (preview deploy)
npx vercel --prod   # production deploy
```

## Data model (stage 1)
| Store | Contents |
|---|---|
| `resumes` | `{ id, name, template, accent, content (JSON Resume: basics, work, education, projects, skills, certificates, awards), createdAt, updatedAt }` |
| `versions` | `{ id, resumeId, number, label, createdAt, snapshot: { name, template, accent, content } }` — max 50 per resume |
| `applications` | `{ id, company, role, location, link, dateApplied, salary, resumeId, versionId, status, notes, followUp, contact, order, … }` |

Stage 2 (accounts + sync via Supabase) can upload this same data on first sign-in.

## Known limitations
- PDF export uses the browser print dialog (users pick *Save as PDF*); multi-page resumes break wherever the browser breaks them, with no top margin on page 2.
- Section order within the resume is fixed (entries inside each section can be reordered).
- Drag-and-drop is desktop-only (HTML5 DnD doesn't fire on touch); mobile uses the move buttons / status dropdown.
- Data lives in one browser; use backup export/import to move between devices.
