# Glam, Camera, Action!

## Development preview

```sh
docker compose -f docker-compose.base44.yml up -d --build
```

Open port 3000. The development environment installs the checked-in Bun lockfile using Bun 1.4.3 on Node 22, mounts live source, and starts the existing `dev` script. Vite reloads the frontend and tsx watches the server.

Local generation, presets, six canvases, Story Bible, and local library Save/Load do not need AI keys. The sandbox deliberately starts with `GEMINI_API_KEY`, `GOOGLE_API_KEY`, and `GOOGLE_GENAI_API_KEY` unset and does not inject platform secrets. Optional provider tools are preserved, but return a clear unavailable message without credentials; they are not local image/video/music generators. No AI credentials are needed to load the app.

`BASE44_PREVIEW_MODE` is passed through but does not change application logic. The platform-provided `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` extends Vite's existing allowlist in the sandbox; unset preserves the original allowlist.

Firebase authentication and cloud storage use the existing checked-in Firebase configuration. Cloud Save and synchronization require a real Google sign-in and an authorized Firebase domain. Local Save remains browser-local at the same origin and retains existing storage keys and record formats. No data migration is performed.

## Checks

```sh
docker compose -f docker-compose.base44.yml exec -T web sh -c 'env -u GEMINI_API_KEY -u GOOGLE_API_KEY -u GOOGLE_GENAI_API_KEY bun run build && env -u GEMINI_API_KEY -u GOOGLE_API_KEY -u GOOGLE_GENAI_API_KEY bun run lint'
```

## Production startup

The supported scripts are `bun run build` followed by `NODE_ENV=production bun run start` (Node 22 and installed dependencies required). This serves the generated `dist` directory on `PORT`, default 3000. These are build/start commands, not a publishing workflow. No hosting/deployment manifest is checked into this repository; the sandbox preview is not a production deployment.
