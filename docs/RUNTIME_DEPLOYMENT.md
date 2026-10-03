# Runtime and deployment

## Defaults

- Node.js 22.12+ (22.x or 24.x); the container uses Node 22.
- Bun 1.4.2 is the pinned package manager for the version-2 `bun.lock`. Install with `bun install --frozen-lockfile`; do not replace the lockfile with an npm lock.
- The server binds `0.0.0.0`, defaults to port 3000, and accepts an integer `PORT` from 1–65535.
- `GET /healthz` returns status-only JSON. It does not test optional Google services.
- Local planning needs no API key. Drive backup stays disabled by default. Existing Firebase configuration is preserved.
- Environment variables come from the process/hosting configuration. The server does not automatically load `.env`; `.env.example` is documentation. Never place secrets in `VITE_` variables or source files.

## Development preview

```sh
docker compose -f docker-compose.base44.yml up -d --build
```

This remains the Base44 preview command. Source is bind-mounted, Vite serves port 3000, and the health check verifies both `/` and `/src/main.tsx`. Only `server.ts` is watched by Node to avoid Vite dependency-cache restart loops. Changes to other backend files require a server/container restart.

Without Docker, install the pinned dependencies and run `npm run dev`. `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` is optional and is supplied by the preview host when needed; production does not run Vite.

## Production commands

On a Linux/POSIX Node host:

```sh
bun install --frozen-lockfile
npm run build:production
npm test
npm start
```

`build:production` type-checks and builds `dist`. `npm start` explicitly enables production and loads TypeScript through `tsx`, which is a production dependency. Build before starting; startup fails if `dist/index.html` is absent. Uploading only `dist` is insufficient for this full-stack app: the Node server, its backend imports, and production dependencies must be present.

For a custom port, set `PORT` in the host environment. With the server running, `npm run healthcheck` checks the matching `PORT` (default 3000). `npm run preview` is a Vite static-preview convenience, not the deployment server and does not provide the Drive API.

## Production container

```sh
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml exec -T web npm run healthcheck
```

The separate production compose file leaves Base44 development behavior intact. It builds assets, installs locked production dependencies, runs as the image's existing `node` user, and uses the runtime health check. `HOST_PORT=3100` changes only the local published port; the container still listens on 3000. No source bind mount or development HMR is used.

`.dockerignore` excludes local environment files, dependencies and previous build output. No secrets are passed at build time. For an immutable release, supply the approved Node image digest with Docker's `--build-arg NODE_IMAGE=...`; the default Node 22 tag intentionally receives upstream updates, so its base OS bytes are not pinned.

## Information still needed before live deployment

Choose the actual hosting provider/project, deployment target, and HTTPS domain. Configure the host to build this Dockerfile (or use the Node commands above), route traffic to its supplied `PORT`, and use `/healthz` for health probes. No provider, domain, release, or live deployment has been created by these files.

If private Drive backups will be enabled, first follow `DRIVE_BACKUP.md`: obtain the approved OAuth setup and server secret provisioning, use the exact HTTPS origin/callback, and provide a durable private directory outside `/app`. The default container intentionally has no Drive secrets or persistent token volume. Its `node` user must have access to any separately approved token directory. This adapter requires one process and manual stale-lease recovery after restart; do not turn on autoscaling or assume unattended Drive restarts are supported. Local story planning works with Drive disabled.

## Validation status

Type-check and production build passed in this workspace. A direct Node production smoke test passed for the home page, a SPA deep link, status-only `/healthz`, and disabled Drive status; invalid `PORT` was rejected. Docker and Bun are not installed in the current execution environment, so a fresh frozen-lock install, Docker image build and container startup still require validation on the selected build host. Existing dependencies are used for the local Node checks; those checks do not prove a clean dependency installation.
