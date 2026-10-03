# Story workflow features

Based on `ui-theme-update` commit `3eecdcca892fd62d908e97b9731ea434a26e4075`.
These changes are a local, unpublished feature patch. Existing theme CSS, Firebase configuration, and paid-provider routes are unchanged.

## Characters board

Open **Characters → Board**. Each column is one of the existing three story scenes; its cards show the characters linked to that scene. Drag a scene handle onto another scene, use its arrow keys, or select **Earlier / Later**. The scene beat and every character's links, actions, emotional changes, and unlinked notes move together. There is no separate board-only order.

Scene numbers denote timeline positions. Identity, relationships, and continuity anchors stay with the character. Emotional handoffs follow the newly ordered linked scenes. Generate again to refresh the master prompt, Story Bible and six canvases. Existing local saves, snapshots and templates preserve the reordered fields without migration.

## Template libraries

**Templates** accepts multiple existing version 1 template files, a JSON array of those templates, or an exported library envelope:

```json
{
  "format": "gca-story-template-library",
  "version": 1,
  "templates": []
}
```

Each `templates` entry must be a complete version 1 `gca-story-template` exported from this app. Empty envelopes are rejected. Use **Download library JSON** to create a populated portable library without hand-authoring the state schema.

- Select up to 50 files, 500 templates, 8 MB per file, and 16 MB in one batch
- Review counts, types, character totals, duplicates and every validation error before **Confirm import**
- Invalid batches, changed storage after preview, and failed storage writes leave the existing library unchanged
- Content-based identities skip duplicate copies, including independently exported cast IDs; changed content with the same title remains distinct
- **Select all → Load selected** combines the selection once; a new project backs up the previous draft/output/manual edits before switching
- Multiple structures append notes to the same three scene positions; review competing directions. The first populated single-choice setting wins for a new project; existing choices win when merging
- The combined project is limited to 500 characters and 2 MB

Files remain local and are never uploaded by importing. The browser library and saved-project backups are not the Google Drive connection.

## Google Drive

The Drive adapter is disabled until its documented secure server configuration and the user's explicit Google consent are complete. See `DRIVE_BACKUP.md` for activation requirements and limitations. Existing local saves succeed independently of Drive.

## Checks

Run:

```sh
npm run lint
npm test
npm run build
```

Local production smoke checks should confirm `/` returns 200, `/api/drive/status` reports `configured: false` without setup, and disabled Drive write endpoints return 503. No real Google authorization or paid-provider calls are needed for tests.

Before publishing, verify desktop and narrow-screen interactions: Board/List switching, Scene 3 → Scene 1 drag, repeated arrow moves, Earlier/Later, link/unlink note preservation, Generate, save/reload, import/cancel, duplicate re-import, select-all, fresh-project backup/restore and local-storage failure messages. Static markup and pure-function tests do not replace browser interaction checks.
