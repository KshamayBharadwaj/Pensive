# Pensieve — Personal File Vault

Single-user, password-protected file vault. Files live in **Google Drive**; metadata (folders, favorites, activity, password hash) lives in **Supabase PostgreSQL**. Built with Next.js + TypeScript + Tailwind, deployed on Vercel.

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env and fill values:
   ```bash
   cp .env.example .env.local
   ```
   Required:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
   - `SESSION_SECRET` (≥ 32 chars). Optional: `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
3. Apply DB schema: run `supabase/migrations/0001_init.sql` in the Supabase SQL editor (or `supabase db push`).
4. Run dev:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` → create vault password (first visit) → unlock → upload/organize.

### Getting a Google refresh token (one-time, server-side)

1. Create OAuth client (Desktop or Web) in Google Cloud Console, enable **Google Drive API**.
2. Exchange an auth code with `https://www.googleapis.com/auth/drive` scope, store the refresh token in `GOOGLE_REFRESH_TOKEN`. Never expose it to the browser.

## MVP workflow

Setup → Login → See files → Upload → Create folder → Move → Favorite → Search → Download → Rename → Delete → Logout.

## API

```
POST /api/auth/setup | POST /api/auth/login | POST /api/auth/logout
GET  /api/auth/session | POST /api/auth/change-password
GET  /api/files?folderId=&view=&sort=&order=&filter=&q=&page=&limit=
POST /api/files/upload (multipart: files[], folderId?)
GET  /api/files/[id] | GET /api/files/[id]/download
PATCH /api/files/[id]/rename | PATCH /api/files/[id]/move
POST /api/files/[id]/favorite | DELETE /api/files/[id]/delete
GET/POST /api/folders | GET /api/folders/[id]
PATCH /api/folders/[id]/rename | PATCH /api/folders/[id]/move
POST /api/folders/[id]/favorite | DELETE /api/folders/[id]/delete
GET  /api/search?q= | POST /api/sync { folderId? }
```

Success: `{ "success": true, "data": {} }`. Error: `{ "success": false, "error": { "code", "message" } }`.

## Security / engineering rules

- Drive bytes are source of truth for contents; Supabase for favorites/activity/password.
- Passwords hashed server-side (bcrypt); sessions are signed HttpOnly cookies; no auth in localStorage.
- Google + Supabase service keys stay server-side; only `NEXT_PUBLIC_*` is public.
- Upload creates metadata only after Drive succeeds; folder delete refuses non-empty without explicit force.
- Search uses Supabase metadata (debounced), never Drive per keystroke.
