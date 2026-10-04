# Glam, Camera, Action!

A browser-local creative planning studio: one brief, three connected scenes, a character continuity board, six image/script instruction canvases, reusable templates, and a Story Bible. Planning uses deterministic rules and templates. It does not call a generative-AI service or require an AI API key.

## Development

Use Node.js 22.12+ (22.x or 24.x) and Bun 1.4.2, matching the checked-in lockfile:

```sh
bun install --frozen-lockfile
npm run dev
```

Or run `docker compose -f docker-compose.base44.yml up -d --build`. The development preview serves port 3000 and its live source entry. No external secrets file is loaded.

## Production and verification

```sh
bun install --frozen-lockfile
npm run build:production
npm test
npm run test:production
npm start
```

The build produces `dist/` and a compiled `server.js`. The production start command sets `NODE_ENV=production`; it runs Node directly without a TypeScript loader. Keep both build artifacts beside `package.json` and installed runtime dependencies, or use the included production Dockerfile. `/healthz` is the health-check endpoint. See [deployment instructions](DEPLOYMENT.md).

## Your data and accounts

Local Save Prompt and Library keep the original `scene_script_library_v1` storage key. Existing drafts, production output, reusable choices, starter rotation, templates and project backups stay in their original browser storage keys. Moving to a different hostname or browser does not automatically transfer this data; export local JSON backups before a move.

Firebase authentication, configuration, Firestore database/rules and cloud story formats are preserved. Firebase's browser configuration is not a paid generative-AI key. Google sign-in and optional cloud Save still require the existing Firebase project to allow the app's origin.

Base44 builds include a private, per-user browser Drive connection for on-Save Google Docs backups. Google Drive/Docs API enablement and each user’s explicit consent are required; live setup is not yet verified. Reconnect after page refresh or access expiry. Local saving works independently. See [private Drive backup notes](docs/DRIVE_BACKUP.md) and [story workflow notes](docs/STORY_WORKFLOWS.md).

No public hosting target or URL is implied by a successful build. Publishing requires the selected deployment environment.
