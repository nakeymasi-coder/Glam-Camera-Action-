# Base44-hosted planner

The existing application can produce a separate static frontend for Base44 SPA hosting. This keeps the local story builder, characters/Kanban, templates/imports, browser saves/backups, six canvases, Story Bible, approved footer/theme and existing Firebase browser integration.

## Important feature boundary

Base44 site hosting uploads the built frontend; it does not run this repository's Express server. The Base44 build sets `VITE_DRIVE_BACKUP_MODE=browser` and disables Express Drive routes. Its browser-only Drive connection requests per-user `drive.file` permission through a separate Firebase Google reauthentication popup. Local Save remains independent; only a connected user's explicit successful Save queues the saved snapshot. Google tokens stay in memory and never enter browser storage. Reload/expiry requires reconnection, and closing the page can interrupt backup.

The existing per-user Express Drive implementation remains in source for Node deployments. The user reported enabling Drive and Docs APIs in the existing Google project; production consent and an actual document save still need live validation. See `DRIVE_BACKUP.md` for setup and durability limits. Do not use Base44's shared builder Drive connector, silently grant OAuth, or change Firebase auth/data/rules as part of site publication.

## Build

```sh
bun install --frozen-lockfile
npm run lint
npm test
npm run build:base44
```

The static artifact is `dist-base44/`, separate from the Express `dist/` build. It contains the frontend only. `base44/config.jsonc` points site deployment at this directory. The application uses existing Firebase browser configuration and does not require the Base44 SDK or an AI key.

## Link and publish the existing app

Use the official CLI only after the user approves its account connection and the exact publication. Never put access tokens in this repository, command arguments or chat. The CLI's local app mapping is ignored by Git. Do not create another app or modify remote source branches to bypass protections.

With approved authentication, link the intended existing app using `npx base44 link --app-id <verified existing app ID>`. Confirm the returned target before publication. Run the site-only command `npx base44 site deploy --no-build` from this project so only the verified frontend artifact is uploaded. Do not run the all-resources `npx base44 deploy` command; it is unnecessary for this Firebase-backed planner.

The CLI reports the actual application URL only after successful publication. A successful GitHub push, Base Code preview or Create PR is not proof of publication. Verify the returned HTTPS URL, asset loading, browser interactions and accurate Drive connection status. Do not report live backup verified until the user consents and both Google Docs writes are confirmed.

## Account-separated browser workspaces

The app waits for Firebase identity resolution before showing stored work. Guest work and each Firebase UID have separate browser workspaces under `scene_script_workspace_v2:`. Switching accounts or signing out remounts the workspace, including the draft, generated output/manual edits, local library, templates, project backups and saved choices. Guest work returns on sign-out; each account's work returns when that account signs in again. Local saved prompts and cached cloud copies are separate. The story auth observer fetches once per actual UID transition; generation checks discard late reads after logout, another account, an A → B → A cycle or unmount. Unrelated renders and repeated notifications for the same UID do not fetch again.

Older unscoped storage keys are left byte-for-byte intact. Since their ownership cannot be established, nothing is automatically shown or assigned to the first signed-in account. A visible “Your older browser work is preserved” notice offers a raw JSON export and an explicitly confirmed recovery workspace. Recovery reads the originals as a fallback and writes only separate recovery copies; reset uses a recovery-only tombstone. The export retains each original raw string, including malformed data, for manual recovery. Cloud Save and Drive backup are unavailable inside recovery, and account changes close it. Returning to the normal workspace does not import recovery content.

This separation prevents accidental mixing in the app; it is not encryption or a security boundary against someone controlling the same browser profile. All storage remains specific to the browser/profile/origin. A different preview or published hostname does not automatically copy drafts or libraries. Template JSON export/import remains available for moving templates between origins; the raw older-data export is a preservation/recovery archive, not an automatic account import.

## Source preservation

The development sandbox and a site-only published artifact can represent different branches/versions. Keep the verified GitHub commit as the release source; select that branch before further work in Base Code. Never assume a later editor preview is the already-published static artifact.
