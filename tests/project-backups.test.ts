import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readProjectBackups, saveProjectBackup, PROJECT_BACKUPS_KEY } from '../src/utils/projectBackups';
import { normalizeStudioState } from '../src/utils/studioAdapter';
const values = new Map<string, string>();
let failWrites = false;
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { if (failWrites) throw Error('Storage full'); values.set(key, value); },
}, configurable: true });
const state = normalizeStudioState({ storyIdea: 'A protected project' });
const data = { projectId: 'stable-project-1', draft: state, production: state, prompt: 'Generated output', overrideText: 'Literal edit', hasGeneratedOnce: true };
test('Backups preserve project identity, draft, generated output and manual edits', () => {
  values.clear();
  const first = saveProjectBackup(data);
  assert.equal(first.length, 1);
  assert.equal(first[0].projectId, data.projectId);
  assert.deepEqual(first[0].draft, data.draft);
  assert.equal(first[0].prompt, data.prompt);
  assert.equal(first[0].overrideText, data.overrideText);
  assert.deepEqual(readProjectBackups(), first);
});
test('Legacy backups without project identity remain readable', () => {
  values.set(PROJECT_BACKUPS_KEY, JSON.stringify([{ ...data, projectId: undefined, id: 'legacy-1', title: 'Legacy', createdAt: '2026-10-03T00:00:00Z' }]));
  assert.equal(readProjectBackups()[0].id, 'legacy-1');
});
test('Failed storage writes do not replace existing backups or mutate the input', () => {
  const before = values.get(PROJECT_BACKUPS_KEY);
  const input = JSON.stringify(data);
  failWrites = true;
  assert.throws(() => saveProjectBackup(data), /Storage full/);
  failWrites = false;
  assert.equal(values.get(PROJECT_BACKUPS_KEY), before);
  assert.equal(JSON.stringify(data), input);
});
test('Malformed existing backups cannot be overwritten by a new backup', () => {
  values.set(PROJECT_BACKUPS_KEY, '{broken');
  assert.throws(() => saveProjectBackup(data));
  assert.equal(values.get(PROJECT_BACKUPS_KEY), '{broken');
});
