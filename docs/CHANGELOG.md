# Changelog

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
