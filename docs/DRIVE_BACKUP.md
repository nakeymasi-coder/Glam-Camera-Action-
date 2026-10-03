# Private Google Drive backups

## Current deployment status

This feature is implemented but **disabled until secure server configuration and each user's explicit OAuth consent are supplied**. No client credentials, encryption keys, OAuth grants, remote documents, or live Google tests were created during implementation. A shared Base44 service-role Drive connector is deliberately not used: it would write multiple users' backups into one connected account.

Local Save Prompt works independently. Only after a successful local save does the app queue its saved production snapshot. Editing fields does not upload anything. Generate first when field edits should become the saved production snapshot. When generation has not run, the app's existing Save behavior uses the draft. The two Google Docs are managed snapshots: later saves replace the first document tab's text. Keep unique manual edits in another document.

The UI never labels a backup synced until both document writes and their durable receipt succeed. A failure can leave one Google Doc newer than the other; the next Save retries the pair. Local data is unaffected. There are no paid AI calls.

## Minimal activation requirements

Activation is an operator task requiring approval for the OAuth application/credentials and persistent access. Do not paste secrets into chat or frontend code.

1. Use an approved Google Cloud Web application OAuth client, with Google Drive API and Google Docs API enabled. Configure its consent screen and publishing/test-user status for the intended audience. Google testing grants may expire according to Google's current rules.
2. Supply the actual app HTTPS origin in `DRIVE_BACKUP_ORIGIN` with no trailing slash or path. Register exactly that origin plus `/api/drive/callback` as the authorized redirect URI. The server never derives redirects from request Host headers. No deployment hostname is assumed here.
3. Supply `GOOGLE_DRIVE_CLIENT_ID` and `GOOGLE_DRIVE_CLIENT_SECRET` via the server secret manager. Request exactly `https://www.googleapis.com/auth/drive.file`. No broad `drive`, `documents`, Gmail, or paid AI scopes are requested. The existing Firebase sign-in remains separate.
4. Set `DRIVE_BACKUP_FIREBASE_PROJECT_ID` to the exact existing Firebase project's ID. The server verifies RS256 signatures with Google's fixed Firebase signing-certificate endpoint and checks issuer, audience, expiry, issued-at, and auth time. It does not trust a posted UID. No Firebase Admin SDK or service-account private key is needed. Certificate verification does not perform Firebase's additional server-side revoked-token check; standard ID-token expiration applies.
5. Provision a private durable directory outside the app source, build output, and any web-served path. Set `DRIVE_BACKUP_STORE_DIR` to its absolute path. Directory mode must be 0700 and token files 0600. The canonical directory path is checked against the canonical app root, including symlink ancestry. Keep the disk encrypted/backed up under the operator's policy.
6. Supply a cryptographically random 32-byte base64 `DRIVE_BACKUP_ENCRYPTION_KEY` from the server secret manager. Tokens and document mappings use AES-256-GCM with owner-bound authenticated data. Losing this key loses access to stored tokens/mappings; do not rotate it without a decrypt/re-encrypt migration. Keep it separate from storage backups.
7. Run exactly one server process for this adapter. Set `DRIVE_BACKUP_SINGLE_INSTANCE=true` and finally `DRIVE_BACKUP_ENABLED=true`. Inject environment settings through the deployment, not Vite. The checked-in Docker development configuration intentionally does not forward any of these secrets. The server does not automatically load .env files.
8. Users first sign in through the existing Google/Firebase login and then choose Connect Google Drive. They explicitly consent on Google. Nothing initiates OAuth automatically. A successful connection does not upload existing projects until the user presses Save Prompt again.

## Isolation and security properties

- Each request is bound to its verified Firebase identity plus an opaque `__Host-` Secure/HttpOnly/SameSite=Lax session cookie. POSTs require exact configured Origin and a session-bound CSRF token. OAuth state is random, expiring, single-use and tied to the session; PKCE uses S256.
- Google refresh tokens stay on the server. The browser receives status, CSRF tokens and document links only. They are never put in browser storage, URLs, source code, or responses. Do not log authorization headers or callback query strings in the reverse proxy.
- Account selection is explicit. The Drive account's permission ID is verified using `about.get` under `drive.file`. Changing the selected Drive account resets that owner's mappings before uploads. No Google file permissions are changed and no sharing is enabled by the app. Workspace administrator policies still apply.
- Queue jobs capture their owner's UID and immutable snapshot. Sign-out, account switches and Disconnect invalidate/cancel pending work and clear old document links. A request already accepted by the server may finish in its original owner's Drive; it cannot switch to the new user's token.
- The server validates IDs and the full snapshot using the existing strict production-snapshot import parser. Request bodies are bounded to 256 KiB, snapshot serialization to 180,000 JavaScript string characters, roster to 100 story characters, and stored projects to 2,000 per owner. Save times use canonical UTC ISO strings. These limits apply only to Drive, not local import/save.
- Google hostnames are fixed and redirects are rejected. Request-supplied URLs, file paths or UIDs are not accepted. Google document IDs are syntax checked before path use.
- Saves are serialized server-side. A durable newest-attempted timestamp prevents an older tab from overwriting a newer attempt. Same request retries reuse the receipt; subsequent saves reuse the same document IDs. Each document replacement uses Google's required revision ID. Mutation responses are not blindly retried. Read-only requests retry at most twice with timeouts; failed saves require another explicit Save.
- Connect/Disconnect/backup writes are rate-limited per session. The in-memory session map is bounded. This is a small single-instance deployment adapter, not a horizontally scaled token service.

## Disconnect and recovery

Disconnect immediately removes the locally stored refresh token, attempts Google token revocation, and keeps existing Google documents. If Google cannot confirm revocation, the UI explicitly instructs the user to remove the app from Google Account connections. Existing files and local saves are not deleted.

The storage directory uses an exclusive `.single-instance.lock` lease. A second process fails closed, including after a crash or restart where a previous lease remains. Before restarting an enabled server, stop the old server and confirm it exited, then remove only that lease file. Never remove it while another server is active. No automated unlock is attempted. Multi-replica deployments must replace the file adapter and session map with a transactional, encrypted store plus distributed locks before activation.

Native Google Docs do not support Drive's pre-generated IDs. Before first creation, a durable journal marks intent. App-private file properties identify the owner/project/document kind. On an uncertain create response, later Saves search for that marker and adopt the found document; they never blindly create another. Definitive provider 4xx rejections (except request timeouts) clear the pending intent for a safe future retry. If an uncertain create remains absent, the project stays blocked until operator reconciliation; time alone does not guarantee recovery. An operator should inspect the exact account, app marker and Google logs before clearing only the affected pending flag through an authenticated maintenance procedure. No general maintenance endpoint is exposed.

If users delete or structurally change managed documents, the backend fails visibly rather than silently writing an unexpected file. A disconnected browser, cancelled fetch or server error never creates a confirmed-sync message. Google Docs are not a full local-library/JSON restore mechanism: these two readable documents contain the saved brief and continuity; the existing JSON/local backup tools remain the restore path.

## Verification and sources

Run `node --import tsx --test tests/drive-backup.test.ts`, `npm run lint`, and `npm run build`. Tests use temporary encrypted storage, local HTTP and mocked Google responses only. Real OAuth, account consent, Google API behavior and live private-document access still require authorized deployment validation. Do not claim those checks passed from the mocks.

Official references checked 2026-10-03:

- [Google web-server OAuth, offline access and token handling](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Drive recommended per-file scope](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Native Docs creation permits drive.file](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/create)
- [Native Docs batch update permits drive.file and revision controls](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/batchUpdate)
- [Drive account identification supports drive.file](https://developers.google.com/workspace/drive/api/reference/rest/v3/about/get)
- [Google Workspace files do not accept pre-generated Drive IDs](https://developers.google.com/workspace/drive/api/guides/create-file)
- [Firebase ID-token verification requirements](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
