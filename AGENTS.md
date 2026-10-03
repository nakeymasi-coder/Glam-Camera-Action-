# Imported app notes

- Run `docker compose -f docker-compose.base44.yml up -d --build`. Health probes `/` and confirms it serves the source entry. `/src/main.tsx` must serve a live transformed module, not a production bundle.
- Node 24 is needed for the existing `start` script (`node server.ts`); production requires `bun run build` and `NODE_ENV=production`. Dev uses `tsx watch` plus Vite middleware.
- Bun 1.3.14 uses lockfile version 1; the imported version 2 lockfile was unreadable by this pinned runtime. The lockfile was regenerated after dependency removal; frozen install now passes.
- No external secrets are required or loaded by compose. Its dev command explicitly unsets the removed provider key so an old dashboard value cannot reach the running app. Metadata must keep `secrets: []` and no server-side AI capability.
- Keep Firebase config, AuthBar, Firestore rules/blueprint, `users/{uid}/stories/{id}` records and browser storage keys intact. Library Save is browser-local; cloud Save is separate and requires real Firebase sign-in. Do not treat the public Firebase browser key as an AI credential.
- Firebase's umbrella package includes the unused `@firebase/ai` transitive package. Do not remove Firebase to eliminate that lockfile string; only app/auth/firestore subpaths are imported.
- The local production engine and state normalizer support legacy aliases without writing migrations. Actual old-origin or cloud records cannot be verified from an empty, signed-out preview profile.
- Check `bun run lint` and `bun run build`, and exercise Generate → Save Prompt → full browser reload → Library Load. Local Director is keyword-selected checklists, not a model. Existing styling is untouched.
- No deployment manifest or publishing script exists. The previous Cloud Run mention was only a stale environment-example comment; never invent a production URL from Firebase auth configuration or sandbox preview.
