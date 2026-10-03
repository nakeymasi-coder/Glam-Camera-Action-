# Glam, Camera, Action!

A local prompt/story planning studio. The browser uses deterministic templates and rules to turn a brief into a master prompt, three connected scene plans, and six image/script instruction canvases. Local Director selects keyword-based checklists; it is not an AI model, rewritten dialogue, factual research, or finished media generation. No AI API key or paid service is required.

## Development

Use Node 24 and Bun 1.3.14 (the package manager matching the checked-in `bun.lock`), or run the development container:

```sh
docker compose -f docker-compose.base44.yml up -d --build
```

The container installs the frozen lockfile and runs the existing `dev` script against bind-mounted source on port 3000, with live frontend and server reload. No external secrets file is loaded.

Without Docker:

```sh
bun install --frozen-lockfile
bun run dev
```

Project checks and production serving:

```sh
bun run lint
bun run build
NODE_ENV=production bun run start
```

`start` runs `node server.ts`; Node 24 supports this TypeScript entry point. Production mode serves `dist`, so build first. `preview` is Vite's local preview script, not a publishing command.

## Existing data and Firebase

The Firebase project, authentication provider, custom Firestore database, security rules, collection/document paths, and cloud record formats are unchanged. Firebase's public browser configuration is in `firebase-applet-config.json`; it is not a generative-AI credential. Optional Google sign-in and cloud Save require the existing Firebase project to allow the browser's origin.

Save Prompt and Library use the original `scene_script_library_v1` localStorage key; drafts use `scene_script_draft_state_v1`, generated output uses `scene_script_production_v2`, reusable brief choices use `scene_script_reusable_brief_v2`, and starter rotation uses `scene-script-studio:portable-starter-rotation:v1`. Storage remains browser/profile/origin-local. Opening this preview on a different origin does not transfer data from an older hosted origin. There are no data migrations or deletions in this change.

## Deployment status

This repository has no Dockerfile for production, Cloud Run service manifest, CI publishing workflow, Firebase Hosting configuration, or another configured deployment target/publishing script. The original environment example mentioned AI Studio/Cloud Run, but that was only a comment, not deployable configuration. Firebase's auth domain is not evidence of a published app.

`bun run build` followed by `NODE_ENV=production bun run start` is the supported build/serve sequence, **not a publishing step**. Deployment still needs an owner-selected host and its deployment configuration. This BaseCode sandbox is development-only and has no built-in Publish flow. No published URL has been verified.
