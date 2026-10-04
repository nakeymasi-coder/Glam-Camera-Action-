# Cloud-project deletion: local implementation draft

This is a local-only source change. It has not been pushed, deployed, or exercised against a real Firebase account. Tests use synthetic data and mocked Firebase SDK modules; no live cloud deletion has been verified.

## Customer-visible scope

The signed-in account controls offer **Delete cloud-saved projects**. Guests and the separate older-data recovery workspace do not offer it. Opening it reads the signed-in account's `users/{uid}/stories` collection from the server and shows an exact, frozen list of eligible record titles, authoritative document IDs, saved/updated times, story details, count and account. Cancel has default focus. Deletion requires typing `DELETE` and pressing the explicitly permanent action button.

Only new, app-marked cloud saves are eligible: app ID `glam-camera-action`, provenance version 1, a validated unique save ID/revision, matching owner, `gca_v1_` authoritative document ID and supported record data. These are client provenance checks, not cryptographic proof or new server-enforced app isolation. Existing Firestore owner rules remain unchanged.

Unmarked legacy records, different-app records, malformed data and mismatching IDs are counted as excluded and preserved. They are never automatically claimed, migrated, tagged or deleted. The dialog does not claim all older cloud work was deleted.

Every explicit Cloud Save makes a fresh UUID-namespaced snapshot. The local project identity remains separate. Its transaction requires the target ID to be absent, so it cannot overwrite or mark a legacy collision. This also prevents a pending update from recreating the same previously deleted document ID. An explicit later save is a new cloud copy.

## Preservation and results

Only the exact reviewed documents are considered. Each deletion transaction rechecks the original account/session, provenance and canonical complete document content. Changed records are kept. Missing, deleted, changed, unconfirmed failures and stopped records have separate result counts. A new review is needed before retrying. The document itself is deleted; this app creates no nested project subcollections and this feature does not recursively delete unknown subcollections.

Confirmed-deleted and confirmed-already-absent IDs are removed only from this account's derived cloud cache. Independently saved local library entries, drafts, output, templates, backups, original legacy browser keys, Google Drive documents, Firebase profile/auth account and other collections are untouched. Matching IDs in the independent local library are preserved. The last derived cache row writes `[]`.

Cache cleanup uses the original UID even if a confirmed transaction finishes after logout/account switching or component unmount. UI updates remain bound to the originating session. A storage-read/write failure is disclosed separately: a cloud original can be absent while stale browser bytes remain. In-memory absence filtering still prevents a late fetch in this tab from restoring the row.

## Concurrency limits

The save/review barrier and absence tracking are tab-local. A pending server review can be cancelled without unlocking a newer operation when its result arrives late. The reviewed set is bound to its original auth generation, including batched A→B→A transitions. An already-submitted transaction cannot be recalled; an eventual successful commit still cleans its original account's cache.

Other tabs/devices are not blocked. New/future saves outside the frozen reviewed set may remain. Transactional content rechecks preserve changed records. Other tabs or devices may retain cached copies, and another open tab can rewrite its stale cloud-cache array into shared browser storage. This feature is not a cross-device erase, an account-deletion mechanism, or a promise that every historical copy is gone.

A later legacy-deletion flow is technically feasible, but must be separate: show precise legacy project details and authoritative IDs, require explicit item selection and exact permanent-deletion confirmation, and never infer ownership from the generic path or record shape. That path is not implemented here.

## Verification

`tests/cloud-project-deletion.test.tsx` mounts the actual App/AuthBar/dialog and executes the actual `src/lib/firebase.ts` wrapper and cloud service, replacing Firebase SDK modules before evaluation. It covers authoritative IDs/exclusions/default Cancel, explicit confirmation, last-cache cleanup, separate local preservation, late reads, partial failures, changed/missing/future records, duplicate confirmations, save/review locks, collision refusal, invalid identifiers, account-generation switches, post-commit unmount/reconstructed-page persistence, storage errors, pending-Cancel races, and concurrent initial reads/saves.

Run `npm run lint`, `npm test`, `npm run build`, `npm run build:base44`, and `npm run test:production`. Focused tests can additionally preload `tests/helpers/no-outbound.mjs` to reject any unexpected network attempt. Real Firebase authorization, live account deletion and real-browser native modal behavior are not verified by the synthetic suite.
