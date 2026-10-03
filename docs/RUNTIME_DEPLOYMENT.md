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
npm run test:production
npm start
```

`build:production` type-checks, builds `dist`, and bundles the server into `server.js`. `npm start` explicitly enables production and runs the compiled server with Node. Build before starting; startup fails if `dist/index.html` is absent. Uploading only `dist` is insufficient: keep `server.js`, `dist`, `package.json`, and installed production dependencies together. The runtime does not need source TypeScript or a TypeScript loader.

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

The integrated source is checked with a fresh Bun 1.4.2 frozen-lockfile installation, type checking, automated story/backup tests, production build, and `test:production`. The runtime test launches compiled `server.js` with a clean environment and outbound requests blocked; it checks home/assets/deep links, status-only health, disabled Drive, absent provider APIs, invalid ports, and missing build output. Docker is not installed in this execution environment, so the Docker image build and container startup must still be verified on the selected build host. Real Firebase login and private Drive OAuth were not exercised; no credentials were created.
