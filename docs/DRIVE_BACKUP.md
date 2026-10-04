# Private Google Drive backups

## Base44 static deployment: browser connection

`npm run build:base44` now selects the browser-only per-user adapter. The existing Firebase Google sign-in and project configuration are unchanged. The normal Node/Express build retains its separate, disabled-until-configured server adapter below.

Connect Drive opens an explicit Firebase Google reauthentication popup with `drive.file` added to a separate provider instance. Google consent is completed by each user. The returned Google account must match the currently signed-in Firebase user and the Drive account reported by Google. There is no shared builder Drive, service-account grant, refresh token, client secret, or paid AI call.

The Google API access token stays in memory for this page only. No Google token is written into localStorage, Firestore, URLs, logs, or exported files. Reloading the page requires reconnection; expired/revoked access fails visibly and requires another user click. A conservative 50-minute session cutoff avoids claiming indefinite access. Firebase's own existing sign-in persistence is separate and is not used to refresh Google Drive access.

### Operator setup and live validation

Enable Google Drive API and Google Docs API in the existing `glam-skill-studio` Google Cloud project, if not already enabled. Review the existing OAuth app audience/consent restrictions if Google rejects the connection. Creating or changing OAuth clients, credentials, scopes in Cloud Console, or Firebase security settings is not performed by this implementation.

Official setup links: [Drive API](https://console.cloud.google.com/flows/enableapi?apiid=drive.googleapis.com) and [Docs API](https://console.cloud.google.com/flows/enableapi?apiid=docs.googleapis.com). Select the existing project. These are the exact links supplied by Google's official JavaScript quickstarts.

On 2026-10-03 the available cloud browser returned “Site Unavailable” for Google Cloud Console. API enablement could not be independently verified or changed there. The user subsequently reported enabling both APIs in the existing project. No live OAuth grants or real Google Docs were created during implementation. The user must connect and save once before live backup can be called verified.

### Save, isolation, and receipts

- Local Save succeeds first. Only its immutable saved snapshot is queued; field edits and Generate do not upload. If fields changed after generation, Generate again before Save to update that snapshot.
- Each connection, request, queue item, and UI result is bound to its original Firebase UID and cancellation generation. Account switching or disconnect cancels queued work and clears visible links. A request already accepted by Google may finish in the original account, never in the next user's account.
- Browser Web Locks serialize saves across tabs on the same origin. Non-secret document IDs, pending-create markers, digests, and timestamps are stored under a hash of Firebase UID, Google Drive account ID, and project ID. No titles, story content, or Google tokens are added to these receipts.
- The two app-managed Google Docs are reused. Existing docs are located using app-private hashed markers. Document revisions and saved timestamps reject conflicting or older writes. Both writes and the local receipt must succeed before the UI says backed up.
- Every stored, discovered or newly created document ID is checked against Drive metadata before any content replacement: native Doc type, not trashed, current owner and the exact account/project/document-kind marker. A changed or damaged receipt cannot redirect a backup into an unrelated app-accessible document.
- Permission failures clear the page's connection and queued credentials. Session age is checked after queue/lock waits, before and after Google requests, and before confirming success; expired work requires reconnection instead of continuing with an old token.
- Google Docs do not support pre-generated IDs. Creation intent is journaled before the request. An uncertain create is searched for on the next Save and is not blindly repeated. If it remains missing, backup stays unconfirmed rather than creating a duplicate. Definitive provider rejection allows another explicit attempt.
- The browser journal is not a server database: clearing site storage loses it, and Web Locks do not coordinate different devices. Avoid simultaneous first saves of the same project from different devices. Discovered duplicate markers fail visibly. A durable, distributed backend would be needed for stronger cross-device guarantees.
- A failed second document write can leave a mixed pair; the next explicit Save retries with fresh revisions. Local data is unaffected. Leaving/closing this page can interrupt backup; there is no background service or scheduled upload.
- Disconnect clears this page's token and pending work without deleting files. It does not silently revoke the Google OAuth app because the existing Google sign-in uses that app too. The UI explains how to revoke permission through Google Account connections.
- Docs are human-readable snapshots, not full-library/JSON restores. Existing local and JSON backup tools remain the restore path. No sharing permissions are changed.

### Checks

Run `npm run lint`, `npm test`, `npm run build:base44`, `npm run build`, and `npm run test:production`. Browser adapter tests use synthetic Google responses only. Live consent, actual API enablement, production OAuth policies, and real private-document access remain a distinct user-authorized check.

Official references: [Firebase Google provider scopes and access token](https://firebase.google.com/docs/auth/web/google-signin), [Firebase popup reauthentication](https://firebase.google.com/docs/reference/js/auth#reauthenticatewithpopup), [Drive per-file scope](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Docs revision controls](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/batchUpdate).

## Optional Node/Express deployment

The remainder describes the original server adapter, not the Base44 browser deployment. It stays disabled until its separately approved secure configuration is provided.

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
