# Hire Ready

Lightweight, installable web app for building resumes and tracking job applications.

**Live:** [https://career-card-app.vercel.app](https://career-card-app.vercel.app)

No real account yet. A guest session lives in this browser. All resumes, applications and portfolio drafts stay on the device (IndexedDB, with a localStorage fallback). The only server-side data is a portfolio you choose to **publish** (stored in a private Vercel Blob store). There is no tracking.

## Features

### Welcome and sign-out
- **Welcome page** (`/welcome`) on first visit: brand hero, a short value proposition, and four highlights (resume builder with templates, application tracker, private on-device data, offline / installable).
- **Get started** enters as a guest. An optional first name personalises the dashboard greeting (stored only on this device).
- **Continue with Google** is visible but disabled, tagged *Coming soon*. The auth module is structured so Supabase Google SSO can plug in later (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).
- After the first visit, the app opens the **dashboard**. Signing out clears the guest session so the next visit shows Welcome again.
- **Account menu** (sidebar on desktop, header on mobile) with **Sign out**. A dialog offers *Keep my data on this device* (default) or *Sign out and erase data from this device* (with a second confirm), plus a *Download backup first* link.
- **Signed-out page** (`/logout`, also `/signed-out`): *Sign back in* returns to the dashboard (data intact unless it was erased); *Back to welcome* returns to the Welcome page.

### Resume Builder
- Dashboard + Resumes page: create (blank or Software Engineer / Fresher-Student / Product Designer samples), open, duplicate, rename, delete (with confirmation), search.
- Editor sections: Contact (incl. LinkedIn/GitHub/portfolio profiles), Summary, Experience, Education, Projects, Skills, Certifications, Achievements. Add / remove / reorder entries; bullet lists with reorder (Enter adds a bullet, Backspace on an empty bullet removes it).
- Live preview at real A4 size (scaled), page-break guides when content runs past one page.
- **27 templates**, each tagged **ATS-friendly** (14) or **Design-focused** (13), chosen from a gallery with thumbnails, search, tag filter and category filter (Single column, Two column, Minimal, Classic, Creative, Executive, Tech, Academic, Student). Every template renders all sections and prints to a clean A4 page.
  - ATS-friendly: Modern, Minimal ATS, Classic Serif, Harvard, Compact, Clean Pro, Ribbon, Startup, Monochrome, Executive Classic, Developer, Academic CV, Fresher, Campus Placement.
  - Design-focused: Executive, Elegant, Sidebar Right, Corporate, Infographic (skill bars), Creative Banner, Metro, Timeline, Bold, Nordic, Portfolio, Tech Stack, Scholar.
- **16 colour presets** (Violet, Indigo, Navy, Sky, Teal, Emerald, Forest, Slate, Charcoal, Black, Purple, Rose, Burgundy, Coral, Amber, Gold) plus a **custom colour picker**. Light colours are automatically darkened until text meets WCAG AA contrast (4.5:1) on white; the editor shows the adjusted value.
- **Font pairings:** template default, Sans (Inter), Serif headings (Fraunces), Classic (Georgia).
- Optional skill *Level* (e.g. Expert, 80%) used by skill-bar templates.
- Autosave (debounced) with a *Saving… / Saved* indicator.
- Versions: manual "Save version" snapshots (optional label), up to **50 per resume** (oldest dropped), restore with confirmation, delete.
- Export: **PDF** via the browser print dialog (print stylesheet prints only the resume on a clean A4 page — choose *Save as PDF*), **Plain text**, **JSON Resume** (jsonresume.org schema; template/colour kept in `meta.hireReady`).
- Import a JSON Resume file as a new resume.
- ATS score panel in the editor (general score, breakdown, top suggestions with **Fix** links that open the right section).

### My Portfolio (`/portfolio`, public pages at `/p/:slug`)
- **Builder** with Sections / Live preview / Design & publish (tabs on mobile). Sections: About/hero (photo, headline, “open to”, bio, location, website), **Projects**, Skills, Experience, Education, Certifications, Gallery, Testimonials, Contact & social links. Each section can be hidden or reordered.
- **Import from résumé** fills About, Projects, Skills, Experience, Education, Certifications and Contact from any saved résumé (images, gallery and testimonials are kept).
- **Project editor**: title, role, tech tags, description, cover image, screenshot gallery (up to 6), GitHub and live-demo links, *Featured* toggle (featured projects show first).
- **4 themes** — Minimal, Developer (dark), Creative, Academic — plus 6 accent colours and a custom colour. Theme gallery at `/portfolio/themes`; full-page local preview at `/portfolio/preview`.
- **Images are compressed on the device**: longest side resized to 1600 px and saved as WebP (JPEG fallback) before they are stored.
- **Publish & share** (`/portfolio/publish`): custom link (`/p/your-name`, availability check), **Public / Private / Password**, **Hide phone number** (applied on the server), choose the résumé behind *Download résumé*, copy link, **QR code** (SVG on screen, PNG download), size meter (2 MB limit), unpublish.
- **Public page** `/p/:slug`: hero with photo and CTAs (*Download résumé* opens a print-ready PDF of the chosen résumé; *Contact*), featured project cards, skills, experience timeline, education, certifications, gallery, testimonials, contact form (opens the visitor’s email app; nothing is stored), links and QR code. Server-rendered `<title>`, description, canonical and Open Graph tags for public portfolios; password and private pages are `noindex`.

### ATS Check (`/ats`)
Everything runs in the browser: no external APIs, nothing uploaded.
- Pick a resume, then paste a job description or load one of four sample JDs (Backend Engineer, Embedded/IoT Firmware, Product Designer, Data Analyst).
- **Score 0–100** with a gauge and a breakdown: keyword match (35), section completeness (10), formatting & ATS safety (15, uses the template's ATS tag), contact info (8), length (7), bullet quality (15: action verbs, numbers/%, no first person, 8–30 words), readability (5), date consistency (5). Without a JD the other 65 points are scaled to 100.
- Keywords come from a built-in multi-domain skills dictionary (software, cloud, data/ML, embedded/IoT, design, product, marketing, finance, soft skills, certifications, degrees) with aliases, plus repeated n-grams from the JD (stopwords removed).
- **Matched** (teal) and **missing** (coral) keyword chips; clicking a missing keyword explains where to add it, with a button that opens that editor section.
- Suggestions sorted by severity (high / medium / low) with **Fix** links.
- Rule-based **bullet rewrites** for weak openers ("Responsible for", "Worked on", "Helped", "I …"): **Apply** replaces just the opener; bullets without numbers get a prompt to add a measurable result.
- **Save report** keeps a history per resume (IndexedDB). In the tracker, an application can link to a saved ATS report and the card shows its score.

### Application Tracker
- Fields: company, role, location, job link, date applied, salary/CTC, resume + saved version used, status, notes, next follow-up date, contact.
- Board: native HTML5 drag-and-drop between and within columns (desktop); every card also has ◀ / ▶ buttons and a status dropdown (always visible on touch screens, on hover/focus on desktop) so it works on mobile and by keyboard.
- List view (table on desktop, stacked cards on mobile) with sort, search and status filter.
- Stats: total, count per status (click to filter), response rate = (Interview + Offer + Rejected) ÷ everything past Wishlist.
- Follow-ups: overdue cards get a coral edge + badge, "due today" in amber; dashboard lists upcoming follow-ups.

### Data and privacy
- Full backup export/import (JSON) with *Merge* or *Replace all*; "Delete all data" in Data & settings, and the sign-out erase option.
- **Local-only storage.** Resumes, versions and applications never leave this browser unless you export a file. There is no cloud copy, no analytics, and no cookies. Fonts are bundled with the app.
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

Portfolio publishing locally (serves `dist/`, the API and `/p/:slug`; portfolios are saved to `.local-portfolios/`):
```bash
npm run build && npm run serve:local    # http://localhost:4174
npm run dev                             # optional: Vite on :5173 proxies /api to :4174
```

Optional smoke test + screenshots (Python Playwright, uses a local Chrome):
```bash
python3 scripts/portfolio_e2e.py         # with serve:local running: portfolio build/import/images/themes/publish/visitor/password/private/unpublish/mobile
npm run build && npx vite preview --port 4173 &
python3 scripts/review.py                # core smoke test, screenshots-review/*.png and a sample PDF
python3 scripts/ats_templates_review.py  # ATS flow, all templates (render, overflow, print/PDF), colours, persistence, contact sheet
python3 scripts/migration_check.py       # upgrades a v0.2 IndexedDB and checks old template/colour ids migrate
```

## Deploy to Vercel

Production project: **career-card-app** on the **career-card** team.  
Production URL: https://career-card-app.vercel.app


**Production branch rule:** Vercel must sync with and deploy **only `main`**. Production deploys are created from the exact `origin/main` HEAD commit (local `HEAD` is verified to match `origin/main` before a manual upload). `vercel.json` sets `git.deploymentEnabled` so that, once GitHub is linked, only `main` triggers deployments (`main: true`, `**: false` — the `**` glob also covers branch names with slashes). Other branches do not auto-deploy.

It is a SPA plus two small Node functions in `api/`. `vercel.json` sets the build command (`npm run build`), the output directory (`dist`), `/p/:slug` → `api/p-page.js` (SEO tags), and the rewrite of every other non-`/api` route to `/index.html`.

**Environment variables**

| Name | Where | Purpose |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | Vercel project (Production, Preview, Development) — added automatically when the Blob store `hire-ready-portfolios` (private, region `bom1`) is connected to the project | Read/write published portfolios in Vercel Blob. Without it, `/api/portfolio` returns 503 and publishing shows an error; the builder and local preview still work. |
| `PORTFOLIO_STORE_DIR` | Local only (optional) | Folder used by `npm run serve:local` instead of Vercel Blob (default `.local-portfolios/`). |

**Option A — Git auto-deploy (preferred, once GitHub is connected):** push to `main` on [DKTestStore/Career_Card_App-](https://github.com/DKTestStore/Career_Card_App-). Vercel will build automatically after the GitHub repo is linked to the project.

> **Note:** Git auto-deploy is not active yet. The Vercel account must have a **GitHub Login Connection** (Vercel account settings → Login Connections / Git) before the repo can be linked. Until that is done, a push to GitHub does not update production.

**Option B — CLI, after the project exists:**
```bash
npx vercel          # first run links/creates the project (preview deploy)
npx vercel --prod   # production deploy
```

**Option C — dashboard:** on [vercel.com](https://vercel.com) → the `career-card-app` project → *Deployments* → deploy from Git once the Login Connection is in place, or use the CLI above.

## Data model (stage 1)
| Store | Contents |
|---|---|
| `resumes` | `{ id, name, template, accent, customColor?, font?, content (JSON Resume: basics, work, education, projects, skills, certificates, awards), createdAt, updatedAt }` |
| `versions` | `{ id, resumeId, number, label, createdAt, snapshot: { name, template, accent, customColor, font, content } }` — max 50 per resume |
| `applications` | `{ id, company, role, location, link, dateApplied, salary, resumeId, versionId, status, notes, followUp, contact, atsReportId?, order, … }` |
| `atsReports` | `{ id, resumeId, resumeName, jdTitle, jdText, score, breakdown[], matched[], missing[], createdAt }` |
| `portfolios` | `{ id: 'main', slug, theme, accent, resumeId, data: { about, projects[], skills[], experience[], education[], certifications[], gallery[], testimonials[], contact, sections[] }, publish: { visibility, hidePhone, showResume, token, publishedSlug, … } }` — images are data URLs (compressed WebP/JPEG). DB version 3. |
| `hire-ready:session` / `hire-ready:profile` | Guest session flag and display name in `localStorage` (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)) |

Stage 2 (Google SSO + sync via Supabase) can upload this same data on first sign-in. Details and the planned hook points are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Changes are listed in [docs/CHANGELOG.md](docs/CHANGELOG.md).

## Known limitations
- PDF export uses the browser print dialog (users pick *Save as PDF*); multi-page resumes break wherever the browser breaks them, with no top margin on page 2.
- Section order is set by the template (e.g. Fresher and Academic put Education first); entries inside each section can be reordered.
- The ATS score is a rule-based estimate. Real applicant tracking systems differ, and keyword matching is literal (synonyms outside the built-in alias list are not recognised).
- Drag-and-drop is desktop-only (HTML5 DnD doesn't fire on touch); mobile uses the move buttons / status dropdown.
- Data lives in one browser; use backup export/import to move between devices. A published portfolio can only be updated or unpublished from the browser that holds its edit key (it is included in backups).
- Portfolio view counts are not collected yet (the publish page shows a teaser). The contact form opens the visitor’s email app; messages are not sent or stored by Hire Ready.
- A published portfolio (JSON plus images) must stay under 2 MB.
- Google sign-in is not available yet; the button is visible but disabled.
- Pushing to GitHub does not auto-deploy until a GitHub Login Connection is added in Vercel.
