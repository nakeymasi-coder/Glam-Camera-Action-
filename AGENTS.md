# Base44 Dev Environment

## Architecture
Single-origin Express + Vite (middleware mode) app. `server.ts` runs an Express
server on port 3000 that mounts Vite as middleware in dev mode, serving both the
React SPA and the `/api/gemini/*` API endpoints. Package manager is **bun**
(lockfile: `bun.lock`). Dev command: `tsx server.ts`.

## Startup
```
docker compose -f docker-compose.base44.yml up -d --build
```
The compose service installs bun globally, runs `bun install --frozen-lockfile`,
then `npx tsx server.ts`.

## Key Fix: Vite Host Blocking
Vite 8 in middleware mode blocks requests from non-localhost hosts with a 403.
`vite.config.ts` has `server.allowedHosts: true` to allow the preview proxy host.
Without this, the preview iframe gets a 403 "Blocked request" error.

## Secrets
- `GEMINI_API_KEY` — required at boot, delivered via `/run/base44/app.env`.
  Used by the Express server for all Gemini AI API calls.
- `APP_URL` — referenced in `.env.example` but not used at runtime; not required.

## Verification
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → 200
- `npx tsc --noEmit` → no errors
- Browser console → no errors, React root renders
