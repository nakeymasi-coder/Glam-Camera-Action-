# Development notes

- Base44 runs Express and Vite middleware together on port 3000 from the bind-mounted checkout. API requests and the live WebSocket bridge share the frontend origin.
- Use Bun 1.4.2 for the version-2 `bun.lock`; Bun 1.3.11 cannot parse it. Compose installs with `--frozen-lockfile` before launching `bun --watch server.ts`.
- `GEMINI_API_KEY` is required by the server's top-level AI client initialization. It comes from `/run/base44/app.env`; do not add it to Compose `environment` or commit credentials.
- Keep `DISABLE_HMR` unset for live edits. Pass the platform's `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` through Compose for preview host acceptance.
- Verify with `docker compose -f docker-compose.base44.yml ps`, `curl -fsS http://localhost:3000/` (must include `/@vite/client` and `/src/main.tsx`), and `docker compose -f docker-compose.base44.yml exec -T web bun run lint`.
- AI generation calls require a valid key and provider model access/billing; serving the preview does not verify these external integrations.
