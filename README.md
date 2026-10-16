# Glam, Camera, Action!

## Local development

Use Node 22 and Bun 1.4.3 with the checked-in lockfile:

```sh
bun install --frozen-lockfile
bun run dev
```

Open port 3000. Vite reloads the frontend and tsx watches the server.

Local prompt planning, presets, six canvases, Story Bible, and local library Save/Load do not need AI keys. `GEMINI_API_KEY` is optional: provider tools are preserved, but return an unavailable message without credentials. They are not local image/video/music generators.

Firebase authentication and cloud storage use the existing checked-in Firebase configuration. Cloud Save and synchronization require a real Google sign-in and an authorized Firebase domain. Local Save remains browser-local at the same origin and retains existing storage keys and record formats. No data migration is performed.

## Checks

```sh
bun run build
bun run lint
```

## Production startup

Run `bun run build` followed by `NODE_ENV=production bun run start` with dependencies installed. This serves the generated `dist` directory on `PORT`, default 3000. These are build/start commands, not a publishing workflow. No hosting/deployment manifest is checked into this repository.
