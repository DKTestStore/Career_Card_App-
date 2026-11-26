# Hire Ready architecture

Hire Ready is a single-page app (Vite + React + TypeScript) hosted on Vercel. Since 0.4.0 it has two small Node functions (`api/`) used only for **published portfolios**; everything else stays in the browser.

## Storage model (stage 1)

All user data stays in the current browser. Nothing is sent to a server.

| Location | What it stores |
|---|---|
| **IndexedDB** (`hire-ready`, via the `idb` library) | `resumes`, `versions` (up to 50 snapshots per resume), `applications`, `atsReports` (added in 0.3.0), `portfolios` (0.4.0, DB v3), `events` (0.6.0 planner, DB v4). If IndexedDB is unavailable, the app falls back to `localStorage`, then to in-memory storage (not persisted). |
| **localStorage** `hire-ready:session` | Guest session flag (`provider`, `firstName`, `signedInAt`). Cleared on sign-out so the next visit shows the Welcome page. |
| **localStorage** `hire-ready:profile` | Display name used for the greeting. Kept on “keep my data” sign-out so “Sign back in” can restore it. Removed when the user chooses to erase data. |

Resume content follows the [JSON Resume](https://jsonresume.org/schema) shape (`basics`, `work`, `education`, `projects`, `skills`, `certificates`, `awards`), plus Hire Ready fields (`template`, `accent`, internal `id`s). Full-workspace backups use `{ app: "hire-ready", schema: 1, resumes, versions, applications, atsReports? }` (older backups without `atsReports` still import).

Privacy defaults:

- No analytics, cookies, or tracking pixels.
- Fonts are bundled with the app (no Google Fonts request).
- Cloud sync is not available. The only data that leaves the device is a portfolio the user explicitly publishes (see below); unpublishing deletes it from the server.
- “Sign out and erase” (and Data & settings → Delete all data) removes resumes, versions, applications, and the saved profile from this device.

## Templates and colours

- `src/templates/registry.ts` lists every template: `{ id, name, category, ats, blurb, config? }`. `ats: true` means ATS-friendly (single reading order, standard headings, no graphics); `false` means design-focused. The ATS score's formatting check reads this tag.
- Executive, Elegant and Modern have bespoke renderers. All other templates are a `config` for the shared `Generic` renderer (`src/templates/Generic.tsx` + `generic.css`): layout (single, sidebar left/right with dark/tint/line styles, gutter), header (left, center, split, band, stripe, initials), heading style (rule, caps, bar, underline, pill, plain, mono, box, double, leader, slab), font, density, skills style (inline, chips, bars, list), timeline, monochrome, section order and labels. Adding a template is one registry entry.
- Colours (`src/lib/themes.ts`): each preset is one base colour. `deriveAccent()` computes `--theme` (darkened until 4.5:1 contrast on white), `--sidebar` (dark panel colour, 8:1 with white text) and `--theme-soft` (10% tint). A custom colour (`accent: 'custom'` + `customColor`) uses the same function.
- Fonts: templates set `--r-head` / `--r-body`; a user font choice overrides them inline.
- Migration: on load and on import, `migrateResume()` maps unknown template ids to Executive and unknown colours to Violet, so older data always renders. IndexedDB upgrades from version 1 to 2 by adding the `atsReports` store; existing data is untouched.

## ATS checker

- `src/lib/ats/score.ts` (in the main bundle, used by the editor panel and resume cards): rule-based scoring, suggestions and bullet rewrites. Pure functions, no network.
- `src/lib/ats/keywords.ts` + `samples.ts` (lazy-loaded with the `/ats` page via `React.lazy`): skills dictionary with aliases, stopwords, n-gram extraction, keyword matching, and "where to add" hints.
- Fix links navigate to `/resumes/:id?section=<key>`; the editor opens and scrolls to that section (switching to the Edit tab on mobile).
- Match report (0.5.0): `matchKeywords(resume, jd, jdTitle)` returns `hits[]` with `{ term, kind, group: hard|soft|other, priority: high|medium|low, matched, jdCount, resumeCount, where[], wording? }` plus a job-title match. Priority is rule-based: a hard skill is *high* when the JD repeats it or it sits in the must-have zone (lines after "Requirements / Must have / Qualifications"), *low* when it only appears under "Nice to have / Bonus / Preferred". The match rate is priority-weighted (3/2/1). `skillsGroupFor()` picks the skills group used by "Add to skills". The source can be a saved résumé or an uploaded file held in memory as a temporary résumé (`id: 'uploaded'`); editing actions require saving it first.

## Résumé upload and PDF / Word download (0.5.0)

All on the device; no file leaves the browser. Every module below is loaded with dynamic `import()` only when used, so the main bundle grew by ~1.5 kB gzip.

- `src/lib/import/extract.ts` — file → `Line[]` (`{ text, bullet?, bold?, size?, gapBefore? }`). PDF: `pdfjs-dist` legacy build + its worker (max 10 pages, 30 s timeout, runs grouped by baseline, a gutter search to read two-column/sidebar PDFs column by column, bold/size from fonts). DOCX: `fflate.unzipSync` reads only `word/document.xml`, `DOMParser` walks paragraphs and tables; list numbering / *List* styles become bullets, *Heading/Title* styles and bold runs are marked. TXT as-is. Rejects >8 MB, unsupported types and image-only PDFs.
- `src/lib/import/parse.ts` — `Line[]` → `ResumeContent` + a report (sections found, ignored headings, warnings). Heading dictionary (with ALL-CAPS / spaced-letter variants), contact regexes (email, phone, URLs → LinkedIn/GitHub profiles, "City, Region"), name from the largest font / first name-like line, date-range parser (`Jan 2023 – Present`, `06/2021`, `2019 - 2023`…), and per-section parsers for work, education (degree / institution / CGPA), projects (tech lists), skills (`Group: a, b`, label lines), certifications and awards. Unknown sections are reported, not dropped silently.
- `src/components/UploadResume.tsx` (small, main bundle) + `UploadReview.tsx` (lazy review dialog) — used by the Resumes page and the ATS page.
- `src/lib/export/model.ts` — résumé + template config → a layout-neutral `DocModel` (contacts, ordered sections with entries/bullets/skill groups, and a `DocStyle`: accent, font family, alignment, header/heading style, band/stripe/split, compact/airy, sidebar).
- `src/lib/export/pdf.ts` — `jspdf` (A4, pt) draws real text with the base-14 fonts (text stays selectable and ATS-readable): header variants, sidebar column (repainted on every page), heading styles, right-aligned dates, text bullets, page breaks with margins, PDF metadata. Text is mapped to WinAnsi.
- `src/lib/export/docx.ts` — hand-written OOXML (`[Content_Types].xml`, `document.xml`, `styles.xml` with Title/Subtitle/Heading1/Heading2/List Bullet, `numbering.xml`, core/app props) zipped with `fflate.zipSync`. Single column, right tab stop for dates, template colour and fonts.
- Lazy chunk sizes (gzip): pdf.js ~167 kB (+ worker file), jsPDF ~123 kB, fflate ~9 kB, parser/exporters a few kB each.

## Auth module

`src/lib/auth.tsx` exposes an `AuthProvider` / `useAuth()` context:

- **Guest provider (current):** `signInAsGuest(firstName?)` writes the session flag and optional first name. This is what “Get started” and “Sign back in” use.
- **Google provider (planned):** `signInWithGoogle()` and `googleAvailable` are already on the interface. Today `googleAvailable` is `false` and the Welcome-page Google button is disabled with a “Coming soon” tag. The function is a documented stub that rejects.

Pages should keep calling these methods rather than localStorage directly, so a later provider can be swapped in without rewriting the Welcome or Logout flows.

## Planned: Supabase Google SSO (stage 2)

When Google sign-in is enabled:

1. Add a Supabase project and configure the Google OAuth provider (authorized redirect `https://career-card-app.vercel.app` plus local dev).
2. Implement `signInWithGoogle` with `supabase.auth.signInWithOAuth({ provider: 'google' })`, persist the Supabase session, and set `googleAvailable` to `true`.
3. On first signed-in visit, offer to **upload the local IndexedDB workspace** (resumes, versions, applications) into a per-user Postgres table, then sync across devices.
4. Keep a guest path: users who do not sign in with Google continue to use on-device storage only.
5. Row-level security must ensure one user can only read their own rows. Do not store raw IP addresses in analytics.

Until that work lands, Hire Ready has no accounts and no server-side copy of anyone’s data.

## Portfolio (0.4.0; 8 themes since 0.5.0, 13 since 0.6.0)

### Client
- `src/lib/portfolio/` — types, model (empty portfolio, import from résumé, slug rules, payload/size, defensive `normalizeData` / `normalizePortfolio` / `normalizeView` — fill missing arrays and insert newer section keys before Contact so portfolios saved or published before 0.6.0 keep working), API client, image compression (`compressImage`: canvas resize to ≤1600 px, WebP q0.8 with JPEG fallback, stored as data URLs), QR (`qrcode-generator`, dynamically imported), `usePublish` hook.
- `src/portfolio/` — `Builder`, `ProjectModal`, `PublishPage`, `ThemesPage`, `LocalPreview`, `PublicPage`, `PortfolioView` (the one renderer used by the live page, builder preview and theme gallery; themes are CSS classes `pf-<theme>` (13) with `--pf-accent`, and the layout adapts with container queries), `ResumePrint`.
- All portfolio routes are `React.lazy` chunks. `/p/:slug` is handled before the sign-in gate, without the app shell.
- Storage: IndexedDB store `portfolios` (DB v3), one record `id: 'main'`. Edits are debounced like résumé edits; discrete choices (theme, colour, visibility) are written immediately. Backups include the record.

### Server (Vercel functions, plain ESM JavaScript)
- `api/portfolio.js`
  - `GET ?slug=` → `200` public view, `401 {needsPassword}`, `403 {private}`, `404`.
  - `POST {action:'check', slug, token?}` → `{available, mine}`.
  - `POST {action:'publish', slug, previousSlug?, token, visibility, password?, hidePhone, theme, accent, data, resume}` → upsert. Rejects with `409` if the slug belongs to a different edit key. Moving to a new slug deletes the old one (same key only).
  - `POST {action:'view', slug, password}` → content of a password-protected portfolio.
  - `POST {action:'unpublish', slug, token}` → delete (owner only).
- `api/p-page.js` — serves `/p/:slug` (rewrite in `vercel.json`): the SPA `index.html` with title, description, canonical, robots and Open Graph tags for public portfolios; generic `noindex` tags otherwise.
- `api/_lib/portfolio.js` — validation, sanitising, hashing, rate limiting and the storage adapter.

Storage: one private blob per portfolio, `portfolios/<slug>.json` in the Blob store **hire-ready-portfolios** (private access, region `bom1`, Hobby free tier) connected to `career-card-app`; the connection sets `BLOB_READ_WRITE_TOKEN`. Locally (`npm run serve:local`) the same code writes to `PORTFOLIO_STORE_DIR` instead. Images are embedded in the JSON as data URLs, so private/password content is never reachable through a public blob URL.

Record: `{ v, slug, ownerHash, visibility, theme, accent, hidePhone, password: {salt, hash} | null, data, resume, publishedAt, updatedAt }`.

Security and privacy:
- **Edit key:** 32 random bytes generated in the browser and kept in IndexedDB; the server stores only its SHA-256 and compares in constant time. Losing the key (e.g. erasing browser data without a backup) means the page can no longer be updated or unpublished from the app.
- **Passwords:** scrypt with a random 16-byte salt; checked on the server; never returned. Wrong-password attempts are rate-limited.
- **Private:** the server keeps only the slug reservation (no content).
- **Hide phone:** phone numbers are removed from `about`, `contact` and the résumé snapshot before storage.
- **Sanitising:** every string is stripped of control characters and HTML tags; URL fields allow only `http(s)` and `mailto`; image fields accept only `data:image/(webp|jpeg|png);base64`. React escapes everything on render; the SEO function HTML-escapes its tags.
- **Limits:** request and stored record ≤ 2 MB; per-instance in-memory rate limits (hashed client IP, never stored): publish 30/10 min, password 20/10 min, reads 240/min.
- **No analytics:** view counting was left out because each Blob write is a billable operation on the free tier; the publish page shows a teaser instead.
- API responses are `no-store`; the service worker skips `/api/*`.

## Routing

Client-side paths (the host rewrites unknown URLs to `index.html`):

- `/welcome` — first visit / signed-out entry
- `/` — dashboard (signed-in)
- `/resumes`, `/resumes/:id` — list and editor (`?section=skills` opens a section)
- `/ats` — ATS checker (`?resume=<id>` preselects a resume; lazy-loaded)
- `/portfolio` — portfolio builder (lazy-loaded); `/portfolio/publish`, `/portfolio/themes`, `/portfolio/preview`
- `/p/:slug` — public portfolio (no sign-in; served via `api/p-page.js` for SEO tags)
- `/tracker` — application board / list
- `/settings` — backup and data controls
- `/logout` (alias `/signed-out`) — post sign-out confirmation

Unsigned visitors are redirected to `/welcome` (except `/p/:slug`). A signed-in visit to `/welcome` goes to the dashboard.

## Deploy

The production project is **career-card-app** on the Vercel team **career-card** (Hobby). Framework: Vite; build: `npm run build`; output: `dist`; functions: `api/*.js` (Node). Environment: `BLOB_READ_WRITE_TOKEN` (set by the Blob store connection). The production URL is https://career-card-app.vercel.app.

Git auto-deploy is not connected yet: the Vercel account needs a GitHub Login Connection before `DKTestStore/Career_Card_App-` can be linked. Until then, production is updated by deploying the source files to that project (CLI or API) **after a push to `main`**, from the exact `origin/main` HEAD commit (local HEAD is checked against `origin/main` first, and the commit SHA is recorded in deployment metadata).

### Production branch rule

Vercel must sync with and deploy **only the `main` branch**.

- `vercel.json` includes:

```json
"git": {
  "deploymentEnabled": {
    "main": true,
    "**": false
  }
}
```

  `**` disables automatic deployments for every other branch, including names with slashes (e.g. `feat/foo`). `main` remains enabled because a branch deploys if any matching rule is `true`.
- When a GitHub Login Connection is added and the repo is linked, set the project's production branch to `main` if it is not already.
- Do not deploy production from a feature branch, a dirty working tree, or a local commit that has not been pushed to `origin/main`.



## Résumé template system (0.6.0)
- Templates are data (`src/templates/registry.ts`, `GenericConfig`) rendered by `Generic.tsx` + `generic.css` and mapped to the PDF / DOCX exporters through `DocStyle` in `src/lib/export/model.ts`.
- 0.6.0 adds header styles `frame | right | ruled | tinted`, heading styles `number | tab | dotted | overline | square`, categories *Simple / Professional / Functional*, and section orders for functional (skills-first), hybrid, licensed (certifications first) and results-first résumés. All are supported in HTML preview, jsPDF export and DOCX export (borders / shading / numbering).

## Calendar / planner (0.6.0)
- `src/pages/CalendarPage.tsx` (lazy chunk with `calendar.css`), route `/calendar`, nav key `calendar`.
- Data: `PlannerEvent` in `src/lib/types.ts`; IndexedDB store `events` (DB v4 upgrade only creates the store). Store API: `events`, `upsertEvent`, `deleteEvent`; backups carry `events?` (merge by id on import, cleared by *Delete all data*).
- Tracker items are derived at render time (applied date, follow-up date; *Interview* when status is interview) and never written to the `events` store.
- `.ics` export is generated in the browser (RFC 5545 VEVENTs, floating local times, all-day as `VALUE=DATE`).
