# Hire Ready architecture

Phase 1 is a static single-page app (Vite + React + TypeScript). There is no backend. It is hosted as static files on Vercel.

## Storage model (stage 1)

All user data stays in the current browser. Nothing is sent to a server.

| Location | What it stores |
|---|---|
| **IndexedDB** (`hire-ready`, via the `idb` library) | `resumes`, `versions` (up to 50 snapshots per resume), `applications`, `atsReports` (DB version 2; added in 0.3.0). If IndexedDB is unavailable, the app falls back to `localStorage`, then to in-memory storage (not persisted). |
| **localStorage** `hire-ready:session` | Guest session flag (`provider`, `firstName`, `signedInAt`). Cleared on sign-out so the next visit shows the Welcome page. |
| **localStorage** `hire-ready:profile` | Display name used for the greeting. Kept on “keep my data” sign-out so “Sign back in” can restore it. Removed when the user chooses to erase data. |

Resume content follows the [JSON Resume](https://jsonresume.org/schema) shape (`basics`, `work`, `education`, `projects`, `skills`, `certificates`, `awards`), plus Hire Ready fields (`template`, `accent`, internal `id`s). Full-workspace backups use `{ app: "hire-ready", schema: 1, resumes, versions, applications, atsReports? }` (older backups without `atsReports` still import).

Privacy defaults:

- No analytics, cookies, or tracking pixels.
- Fonts are bundled with the app (no Google Fonts request).
- Public share links and cloud sync are not in Phase 1.
- “Sign out and erase” (and Data & settings → Delete all data) removes resumes, versions, applications, and the saved profile from this device.

## Templates and colours

- `src/templates/registry.ts` lists every template: `{ id, name, category, ats, blurb, config? }`. `ats: true` means ATS-friendly (single reading order, standard headings, no graphics); `false` means design-focused. The ATS score's formatting check reads this tag.
- Executive, Elegant and Modern have bespoke renderers. All other templates are a `config` for the shared `Generic` renderer (`src/templates/Generic.tsx` + `generic.css`): layout (single, sidebar left/right with dark/tint/line styles, gutter), header (left, center, split, band, initials), heading style (rule, caps, bar, underline, pill, plain, mono, box, double), font, density, skills style (inline, chips, bars, list), timeline, monochrome, section order and labels. Adding a template is one registry entry.
- Colours (`src/lib/themes.ts`): each preset is one base colour. `deriveAccent()` computes `--theme` (darkened until 4.5:1 contrast on white), `--sidebar` (dark panel colour, 8:1 with white text) and `--theme-soft` (10% tint). A custom colour (`accent: 'custom'` + `customColor`) uses the same function.
- Fonts: templates set `--r-head` / `--r-body`; a user font choice overrides them inline.
- Migration: on load and on import, `migrateResume()` maps unknown template ids to Executive and unknown colours to Violet, so older data always renders. IndexedDB upgrades from version 1 to 2 by adding the `atsReports` store; existing data is untouched.

## ATS checker

- `src/lib/ats/score.ts` (in the main bundle, used by the editor panel and resume cards): rule-based scoring, suggestions and bullet rewrites. Pure functions, no network.
- `src/lib/ats/keywords.ts` + `samples.ts` (lazy-loaded with the `/ats` page via `React.lazy`): skills dictionary with aliases, stopwords, n-gram extraction, keyword matching, and "where to add" hints.
- Fix links navigate to `/resumes/:id?section=<key>`; the editor opens and scrolls to that section (switching to the Edit tab on mobile).

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

## Routing

Client-side paths (the host rewrites unknown URLs to `index.html`):

- `/welcome` — first visit / signed-out entry
- `/` — dashboard (signed-in)
- `/resumes`, `/resumes/:id` — list and editor (`?section=skills` opens a section)
- `/ats` — ATS checker (`?resume=<id>` preselects a resume; lazy-loaded)
- `/tracker` — application board / list
- `/settings` — backup and data controls
- `/logout` (alias `/signed-out`) — post sign-out confirmation

Unsigned visitors are redirected to `/welcome`. A signed-in visit to `/welcome` goes to the dashboard.

## Deploy

The production project is **career-card-app** on the Vercel team **career-card** (Hobby). Framework: Vite; build: `npm run build`; output: `dist`. The production URL is https://career-card-app.vercel.app.

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

