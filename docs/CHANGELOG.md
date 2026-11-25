# Changelog

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
