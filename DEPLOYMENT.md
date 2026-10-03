# Production build and startup

Deploy as a long-running Node web service, not static-only hosting. Express serves
both the compiled frontend and the API on one origin.

## Hosting commands

Use Node.js 22.18 or newer in the Node 22 release line and Bun 1.4.2
(the version used to verify installation here). Make Bun available on the build worker.

- Build command: `bun install --frozen-lockfile && bun run build`
- Start command: `npm start`
- Health check path: `/`

Installation must include development dependencies during the build because Vite
and esbuild are build tools. The build writes the frontend to `dist/` and the
compiled server to `server.js`. Both artifacts must be retained in the same
application root, along with `package.json` and runtime dependencies. The start
command sets `NODE_ENV=production` and uses Node to run the compiled server.
Do not use `vite preview` as the production web server; it does not serve the AI API.

## Runtime environment

- `GEMINI_API_KEY`: required server-only secret, obtained from Google AI Studio.
  Add it securely to the hosting provider's environment; Base44 preview secrets
  are not automatically transferred to an external host. Never put it in a
  `VITE_` variable or commit it to Git.
- `PORT`: use the provider's assigned value; defaults to `3000` when unset.
  The server listens on `0.0.0.0`.
- `NODE_ENV`: `production` (also set by `npm start`).

`APP_URL` is not read by this app and is not required. `.env.example` documents
names only; do not copy it unchanged as a real environment file.

## Provider setup still required

Connect the intended repository/branch to your host and provide the runtime
secret above. Use HTTPS and enable WebSocket forwarding for `/api/live-ws`.
Add the deployed hostname to Firebase Authentication's authorized domains for
Google sign-in; confirm the committed Firebase configuration belongs to your
project and its Firestore rules are installed. Confirm Gemini model access and
billing before relying on AI generation.

This configuration prepares deployment; it does not create a hosting project,
public URL, or deploy/merge the branch. The Base44 compose remains a development
preview and is not the production deployment configuration.
