# Development notes

- Use `docker compose -f docker-compose.base44.yml up -d --build`. Source is bind-mounted; Vite reloads the frontend and Node watches only server.ts. Watching the full import graph loops when Vite updates its dependency cache.
- bun.lock uses lockfile version 2 and needs Bun 1.4.2 (1.3.14 cannot read it). Compose installs the pinned manager and dependencies on startup without changing the lockfile.
- The Express dev middleware attaches HMR to its own HTTP server. Port 3000 serves `/` and unhashed `/src/main.tsx`; both are checked by the container healthcheck.
- Local generation lives in src/utils/studioAdapter.ts and src/studio-core. No AI API key is needed, no provider routes run, and former provider components are not imported into the active UI. Do not reconnect them for local planning.
- Preserve browser storage keys: scene_script_draft_state_v1, scene_script_library_v1, scene_script_production_v2, scene_script_reusable_brief_v2, scene_script_preset_choices_v2_*. Do not clear or migrate user drafts/library during theme work.
- Firebase configuration, auth and optional cloud sync are independent of local planning; leave them unchanged unless requested.
- Checks: `docker compose -f docker-compose.base44.yml exec -T web bun run lint` and `docker compose -f docker-compose.base44.yml exec -T web bun run build`. Browser checks should exercise Quick Seeds, Generate Story Prompt, editable output, local Save/Library Load, six canvases and Story Bible. Back up and restore existing browser data around temporary test saves.
