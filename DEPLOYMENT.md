# Production deployment

This integrated version is a long-running Node web service. Express serves the built frontend and the optional Drive API on the same origin. It needs no Gemini key, paid-generation setup, or AI WebSocket forwarding.

## Host commands

- Runtime: Node.js 22.12+ in the 22.x line, or Node 24.x
- Package manager: Bun 1.4.2
- Build: `bun install --frozen-lockfile && npm run build:production`
- Verify: `npm test && npm run test:production`
- Start: `npm start`
- Health check: `/healthz`
- Port: use the host-provided `PORT`; default is 3000 and the server binds `0.0.0.0`

Build dependencies must be installed for the build. Retain both `dist/` and `server.js` in the application root with `package.json` and runtime dependencies. Do not run Vite preview as a production service. The supplied Dockerfile packages these artifacts and runs as the existing `node` user; `docker-compose.production.yml` is a local production smoke-test configuration.

Environment variables come from the hosting process, not automatic `.env` loading. Leave Drive disabled for the key-free planner. Firebase sign-in remains independent and may require the deployed hostname to be added to the existing project's authorized domains. Use HTTPS for the public app.

See [runtime details and verification limitations](docs/RUNTIME_DEPLOYMENT.md) and [Drive activation requirements](docs/DRIVE_BACKUP.md). No live deployment, new credentials, domain or hosting project is created by these files.
