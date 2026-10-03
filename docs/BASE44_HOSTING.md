# Base44-hosted planner

The existing application can produce a separate static frontend for Base44 SPA hosting. This keeps the local story builder, characters/Kanban, templates/imports, browser saves/backups, six canvases, Story Bible, approved footer/theme and existing Firebase browser integration.

## Important feature boundary

Base44 site hosting uploads the built frontend; it does not run this repository's Express server. The Base44 build therefore sets the non-secret `VITE_DRIVE_BACKUP_DISABLED=true` flag. The visible Drive panel says private backup is pending/unavailable, keeps Connect disabled, and makes no Drive API, token or redirect requests. Local Save remains available. This is not a completed Google Drive integration.

The existing per-user Express Drive implementation remains in source for future work. Enabling Drive on Base44 requires a separately reviewed per-user backend implementation and explicit OAuth/security approval. Do not replace it with Base44's shared app-scoped Drive connector. Do not change Firebase auth/data/rules as part of site publication.

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

The CLI reports the actual application URL only after successful publication. A successful GitHub push, Base Code preview or Create PR is not proof of publication. Verify the returned HTTPS URL, asset loading, browser interactions and disabled Drive status before sharing it as working.

Storage keys stay unchanged, but browser storage is scoped to the browser/profile/origin. A different preview or published hostname does not automatically copy prior drafts and libraries. Use the existing JSON export/import workflow when moving between origins; no automatic data migration is included.

## Source preservation

The development sandbox and a site-only published artifact can represent different branches/versions. Keep the verified GitHub commit as the release source; select that branch before further work in Base Code. Never assume a later editor preview is the already-published static artifact.
