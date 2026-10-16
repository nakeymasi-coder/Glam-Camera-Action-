# Development findings

- `server.ts` owns Express, Vite middleware, and the optional provider WebSocket bridge. Never initialize the provider at import time: missing AI credentials must not prevent local story planning.
- Use `docker compose -f docker-compose.base44.yml up -d --build`. Bun 1.4.3 supports the checked-in version-2 lockfile; older Bun 1.3.11 does not.
- The sandbox runs Node 22, installs dependencies with `bun install --frozen-lockfile`, and executes the actual `dev` script with AI key variables explicitly unset. It intentionally does not load platform secrets or call provider tools. Existing provider features are retained, not converted to local media generation.
- `BASE44_PREVIEW_MODE` is passed through, not forced; no application behavior depends on it. The platform's `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` extends Vite's host list only in environments providing it. Without these variables, the original Vite host behavior applies.
- Source is bind-mounted. `tsx watch server.ts` reloads the backend; Vite supplies frontend hot reload. `start` also uses tsx because Node alone does not reliably execute this TypeScript entry point on supported older Node releases.
- Verification: `docker compose -f docker-compose.base44.yml exec -T web sh -c 'env -u GEMINI_API_KEY -u GOOGLE_API_KEY -u GOOGLE_GENAI_API_KEY bun run build && env -u GEMINI_API_KEY -u GOOGLE_API_KEY -u GOOGLE_GENAI_API_KEY bun run lint'`.
- Preserve Firebase config, rules, paths (`users/{uid}/stories/{id}`), and all `scene_script_*` browser-storage keys. Save Prompt is local; Save to Cloud requires real Firebase Google sign-in. No cloud verification is possible without an authenticated user session.
- The live voice modal is mounted even while closed. Its disconnect function must be hoisted so the initial effect cleanup can always call it, including when mounted with `isOpen=false`.
- No publishing workflow or hosting manifest is present in this checkout. `build` emits `dist`; `NODE_ENV=production bun run start` serves it. A sandbox is not a deployment.
