import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { act } from 'react';
import { accountFixture, button, deferred, fixtureUser, type AccountFixture } from './helpers/account-isolation-fixture';
import { normalizeStudioState } from '../src/utils/studioAdapter';
import { CLOUD_LIBRARY_STORAGE_KEY } from '../src/utils/cloudLibrary';

const uid = 'alice';
const id = (saveId: string) => `gca_v1_${saveId}`;
const path = (saveId: string, user = uid) => `users/${user}/stories/${id(saveId)}`;
const record = (saveId: string, overrides: Record<string, any> = {}) => ({
  id: 'untrusted-data-id', projectId: 'local-project', title: `Project ${saveId}`, masterPrompt: 'prompt',
  state: normalizeStudioState({ storyIdea: `Idea ${saveId}` }), userId: uid,
  createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z',
  cloudProvenance: { appId: 'glam-camera-action', version: 1, saveId, revision: 'revision-1' }, ...overrides,
});
const cacheKey = (f: AccountFixture, user = uid) => f.workspaceStorageKey(user, CLOUD_LIBRARY_STORAGE_KEY);
const trigger = (f: AccountFixture) => button(f, 'Delete cloud-saved projects');
const confirmInput = (f: AccountFixture) => f.document.querySelector<HTMLInputElement>('[aria-label="Type DELETE to confirm cloud deletion"]');
async function mount(f: AccountFixture) { await f.render(<f.App />); await f.emit(fixtureUser(uid)); }
async function open(f: AccountFixture) { await f.click(trigger(f)); await f.resolveServer(f.serverReads.length - 1); }
async function confirm(f: AccountFixture, count: number) { await f.change(confirmInput(f), 'DELETE'); await f.click(button(f, `Permanently delete ${count} cloud ${count === 1 ? 'project' : 'projects'}`)); }

// Every test executes the actual firebase.ts wrapper and cloud service. Firebase's
// SDK modules are replaced before evaluation; no Firebase SDK/network is loaded.
test('mounted review is server-backed, lists exact authoritative IDs, excludes legacy/other-app/malformed records, defaults Cancel', async t => {
  const f = await accountFixture({ realCloudWrapper: true }); t.after(() => f.cleanup());
  f.cloudRecords.set(path('one'), record('one'));
  f.cloudRecords.set('users/alice/stories/legacy', record('legacy', { cloudProvenance: undefined }));
  f.cloudRecords.set(path('other'), record('other', { cloudProvenance: { appId: 'other-app', version: 1, saveId: 'other', revision: 'r' } }));
  f.cloudRecords.set(path('mismatch'), record('not-matching'));
  await mount(f); await open(f);
  assert.match(f.document.querySelector('dialog')!.textContent!, /1 eligible cloud-saved project/);
  assert.match(f.document.querySelector('dialog')!.textContent!, /3 unmarked/);
  assert.match(f.document.querySelector('[aria-label="Eligible cloud projects"]')!.textContent!, /gca_v1_one/);
  assert.doesNotMatch(f.document.querySelector('[aria-label="Eligible cloud projects"]')!.textContent!, /untrusted-data-id|gca_v1_other/);
  assert.equal(f.document.activeElement?.textContent, 'Cancel');
  assert.equal(button(f, 'Permanently delete 1 cloud project').disabled, true);
  assert.equal(f.sdkCalls.deletes.length, 0);
  await f.change(confirmInput(f), 'delete');
  assert.equal(button(f, 'Permanently delete 1 cloud project').disabled, true);
  await f.click(button(f, 'Cancel'));
  assert.equal(f.cloudProjects.isBusy(), false);
  assert.equal(f.sdkCalls.deletes.length, 0);
  assert.ok(f.document.activeElement === trigger(f), "Focus returns to the deletion trigger");
  assert.deepEqual(f.sdkCalls.serverReads, ['users/alice/stories', 'users/alice/stories']);
  assert.equal(f.calls.outbound, 0);
});

test('confirmed deletion removes only reviewed server ID and last derived cache row; local/legacy/Drive data stay and late initial read cannot resurrect', async t => {
  const f = await accountFixture({ realCloudWrapper: true }); t.after(() => f.cleanup());
  const cloud = record('one'); f.cloudRecords.set(path('one'), cloud);
  f.storage.setItem(cacheKey(f), JSON.stringify([{ ...cloud, id: id('one') }]));
  const localKey = f.workspaceStorageKey(uid, 'scene_script_library_v1');
  const localBytes = JSON.stringify([{ ...cloud, id: id('one'), title: 'Independent local copy' }]);
  f.storage.setItem(localKey, localBytes);
  f.storage.setItem('scene_script_library_v1', 'RAW LEGACY BYTES');
  f.storage.setItem('drive-fixture-data', 'DRIVE BYTES');
  await mount(f); await open(f); await confirm(f, 1);
  assert.deepEqual(f.sdkCalls.deletes, [path('one')]);
  assert.equal(f.storage.getItem(cacheKey(f)), '[]');
  assert.equal(f.storage.getItem(localKey), localBytes);
  assert.equal(f.storage.getItem('scene_script_library_v1'), 'RAW LEGACY BYTES');
  assert.equal(f.storage.getItem('drive-fixture-data'), 'DRIVE BYTES');
  assert.match(f.document.querySelector('[aria-label="Cloud deletion result"]')!.textContent!, /1 cloud project deleted/);
  await f.resolveServer(0, [{ id: id('one'), data: cloud }]);
  assert.equal(f.storage.getItem(cacheKey(f)), '[]');
  await f.click(button(f, 'Close'));
  await f.click(f.document.querySelector('[title="Saved Prompts Library"]'));
  assert.match(f.document.querySelector('[aria-label="Library"]')!.textContent!, /Independent local copy/);
  assert.doesNotMatch(f.document.querySelector('[aria-label="Library"]')!.textContent!, /Project one/);
  assert.equal(f.calls.driveBackups.length, 0);
});

test('partial failure, changed records, already absent and future saves remain distinct; a repeat confirmation cannot delete twice', async t => {
  const f = await accountFixture({ realCloudWrapper: true }); t.after(() => f.cleanup());
  for (const name of ['one', 'two', 'three', 'four']) f.cloudRecords.set(path(name), record(name));
  await mount(f); await open(f);
  f.cloudRecords.set(path('two'), record('two', { title: 'Changed elsewhere' }));
  f.cloudRecords.delete(path('three'));
  f.transactionHooks.fail.add(path('four'));
  f.cloudRecords.set(path('future'), record('future'));
  await f.change(confirmInput(f), 'DELETE');
  await act(async () => { const control = button(f, 'Permanently delete 4 cloud projects'); control.click(); control.click(); });
  assert.deepEqual(f.sdkCalls.deletes, [path('one')]);
  const result = f.document.querySelector('[aria-label="Cloud deletion result"]')!.textContent!;
  assert.match(result, /1 cloud project deleted/); assert.match(result, /1 already absent; 1 changed and kept; 1 could not be confirmed deleted/);
  assert.ok(f.cloudRecords.has(path('future'))); assert.ok(f.cloudRecords.has(path('two'))); assert.ok(f.cloudRecords.has(path('four')));
  assert.equal(f.cloudProjects.isBusy(), false);
  await f.click(button(f, 'Close')); await open(f);
  assert.match(f.document.querySelector('dialog')!.textContent!, /3 eligible cloud-saved projects/);
});

test('a pending Save blocks review; each explicit Save is a new app-owned snapshot and never tags legacy or overwrites a collision', async t => {
  const f = await accountFixture({ realCloudWrapper: true }); t.after(() => f.cleanup());
  await f.emit(fixtureUser(uid));
  const legacy = record('old', { cloudProvenance: undefined }); f.cloudRecords.set('users/alice/stories/local-project', legacy);
  const pending = deferred<void>(); f.transactionHooks.before = async () => pending.promise;
  const saving = f.saveStoryToCloud(uid, { id: 'local-project', title: 'New Save', masterPrompt: 'prompt', state: normalizeStudioState({}) }, () => true);
  await assert.rejects(f.cloudProjects.review(uid, () => true), /already open/);
  pending.resolve(); await saving;
  assert.equal(f.cloudRecords.get('users/alice/stories/local-project'), legacy);
  assert.equal(f.sdkCalls.writes.length, 1);
  const first = f.sdkCalls.writes[0]; assert.match(first, /^users\/alice\/stories\/gca_v1_[a-f0-9-]+$/);
  const saved = f.cloudRecords.get(first)!; assert.equal(saved.cloudProvenance.appId, 'glam-camera-action'); assert.equal(saved.projectId, 'local-project');
  f.transactionHooks.before = async collision => { f.cloudRecords.set(collision, legacy); };
  await assert.rejects(f.saveStoryToCloud(uid, { id: 'local-project', title: 'Collision', masterPrompt: 'prompt', state: normalizeStudioState({}) }, () => true), /already uses this ID/);
  assert.equal(f.sdkCalls.writes.length, 1);
  assert.equal(f.cloudProjects.isBusy(), false);
});

test('review lock blocks save; stale A→B→A confirm before React commit and logout during transaction cannot delete', async t => {
  const f = await accountFixture({ realCloudWrapper: true }); t.after(() => f.cleanup());
  f.cloudRecords.set(path('one'), record('one'));
  await mount(f); await open(f);
  await assert.rejects(f.saveStoryToCloud(uid, { id: 'project', title: 'Blocked', masterPrompt: '', state: {} }, () => true), /already open/);
  await f.change(confirmInput(f), 'DELETE');
  const oldConfirm = button(f, 'Permanently delete 1 cloud project');
  await act(async () => { f.dispatchAuth(fixtureUser('bob')); f.dispatchAuth(fixtureUser(uid)); oldConfirm.click(); });
  assert.equal(f.sdkCalls.deletes.length, 0);
  assert.equal(f.document.querySelector('dialog')?.hasAttribute('open'), false);
  await open(f); await f.change(confirmInput(f), 'DELETE');
  const wait = deferred<void>(); f.transactionHooks.before = async () => wait.promise;
  await f.click(button(f, 'Permanently delete 1 cloud project'));
  await f.emit(null);
  await act(async () => { wait.resolve(); });
  assert.equal(f.sdkCalls.deletes.length, 0); assert.ok(f.cloudRecords.has(path('one')));
  assert.equal(f.document.querySelector('[aria-label="Cloud deletion result"]'), null);
  assert.equal(f.cloudProjects.isBusy(), false);
});

test('successful commit after account unmount clears only original account cache, and a reconstructed page cannot resurrect it', async t => {
  let f = await accountFixture({ realCloudWrapper: true }); t.after(() => f.cleanup());
  const cloud = record('one'); f.cloudRecords.set(path('one'), cloud);
  f.storage.setItem(cacheKey(f), JSON.stringify([{ ...cloud, id: id('one') }]));
  const bobCache = JSON.stringify([{ ...record('bob'), id: id('bob') }]); f.storage.setItem(cacheKey(f, 'bob'), bobCache);
  const localKey = f.workspaceStorageKey(uid, 'scene_script_library_v1');
  const localBytes = JSON.stringify([{ ...cloud, id: id('one'), title: 'Separate local save' }]); f.storage.setItem(localKey, localBytes);
  await mount(f); await open(f); await f.change(confirmInput(f), 'DELETE');
  const commit = deferred<void>(); f.transactionHooks.afterDecide = () => commit.promise;
  await f.click(button(f, 'Permanently delete 1 cloud project'));
  await f.emit(fixtureUser('bob'));
  await act(async () => { commit.resolve(); });
  assert.deepEqual(f.sdkCalls.deletes, [path('one')]);
  assert.equal(f.storage.getItem(cacheKey(f)), '[]'); assert.equal(f.storage.getItem(cacheKey(f, 'bob')), bobCache);
  assert.equal(f.storage.getItem(localKey), localBytes);
  assert.equal(f.document.querySelector('[aria-label="Cloud deletion result"]'), null);
  const persisted = Object.fromEntries(Array.from({ length: f.storage.length }, (_, i) => f.storage.key(i)!).map(key => [key, f.storage.getItem(key)!]));
  await f.cleanup();
  f = await accountFixture({ realCloudWrapper: true });
  for (const [key, value] of Object.entries(persisted)) f.storage.setItem(key, value);
  await mount(f); await f.resolveServer(0);
  assert.equal(f.storage.getItem(cacheKey(f)), '[]');
  await f.click(f.document.querySelector('[title="Saved Prompts Library"]'));
  assert.match(f.document.querySelector('[aria-label="Library"]')!.textContent!, /Separate local save/);
  assert.doesNotMatch(f.document.querySelector('[aria-label="Library"]')!.textContent!, /Project one/);
});

test('already-absent reviewed records remove only their derived cache, and storage failures are disclosed separately from cloud deletion', async t => {
  const f = await accountFixture({ realCloudWrapper: true }); t.after(() => f.cleanup());
  f.cloudRecords.set(path('one'), record('one')); f.cloudRecords.set(path('two'), record('two'));
  f.storage.setItem(cacheKey(f), JSON.stringify(['one', 'two'].map(name => ({ ...record(name), id: id(name) }))));
  await mount(f); await open(f); f.cloudRecords.delete(path('one'));
  await confirm(f, 2);
  assert.equal(f.storage.getItem(cacheKey(f)), '[]');
  assert.match(f.document.querySelector('[aria-label="Cloud deletion result"]')!.textContent!, /1 already absent/);
  await f.click(button(f, 'Close'));
  f.cloudRecords.set(path('three'), record('three'));
  f.storage.setItem(cacheKey(f), JSON.stringify([{ ...record('three'), id: id('three') }]));
  await open(f);
  const proto = Object.getPrototypeOf(f.storage); const original = proto.setItem;
  proto.setItem = function (key: string, value: string) { if (key === cacheKey(f)) throw Error('Synthetic quota failure'); return original.call(this, key, value); };
  try { await confirm(f, 1); } finally { proto.setItem = original; }
  assert.ok(!f.cloudRecords.has(path('three')));
  assert.match(f.document.querySelector('[aria-label="Cloud deletion result"]')!.textContent!, /could not remove their cached cloud copies/);
  assert.match(f.storage.getItem(cacheKey(f))!, /gca_v1_three/);
});

test('Cancel during a pending server review releases the barrier; its late completion cannot unlock a newer Save', async t => {
  const f = await accountFixture({ realCloudWrapper: true }); t.after(() => f.cleanup());
  await mount(f); await f.click(trigger(f));
  assert.equal(f.cloudProjects.isBusy(), true);
  await f.click(button(f, 'Cancel')); assert.equal(f.cloudProjects.isBusy(), false);
  const wait = deferred<void>(); f.transactionHooks.before = () => wait.promise;
  const saving = f.saveStoryToCloud(uid, { id: 'local-project', title: 'Next Save', masterPrompt: '', state: {} }, () => true);
  await f.resolveServer(1); assert.equal(f.cloudProjects.isBusy(), true);
  wait.resolve(); await saving; assert.equal(f.cloudProjects.isBusy(), false);
  assert.equal(f.sdkCalls.deletes.length, 0);
  assert.equal(f.document.querySelector('dialog')?.hasAttribute('open'), false);
});

test('unsafe owner/project identifiers and zero-eligible reviews fail closed before mutation', async t => {
  const f = await accountFixture({ realCloudWrapper: true }); t.after(() => f.cleanup());
  await f.emit(fixtureUser(uid));
  await assert.rejects(f.saveStoryToCloud(uid, { id: '../other', title: 'Bad ID', masterPrompt: '', state: {} }, () => true), /cannot be safely saved/);
  await assert.rejects(f.cloudProjects.review('bob', () => true), /account changed/);
  assert.equal(f.sdkCalls.transactions.length, 0);
  await f.render(<f.App />); await f.emit(fixtureUser(uid)); await open(f);
  assert.match(f.document.querySelector('dialog')!.textContent!, /No eligible cloud projects found/);
  assert.equal(confirmInput(f), null); assert.equal(button(f, 'Permanently delete 0 cloud projects').disabled, true);
  assert.equal(f.sdkCalls.deletes.length, 0);
});

test('batched A→B→A during a deferred deletion expires it and a new review remains usable', async t => {
  const f = await accountFixture({ realCloudWrapper: true }); t.after(() => f.cleanup());
  f.cloudRecords.set(path('one'), record('one'));
  await mount(f); await open(f); await f.change(confirmInput(f), 'DELETE');
  const pending = deferred<void>(); f.transactionHooks.before = () => pending.promise;
  await f.click(button(f, 'Permanently delete 1 cloud project'));
  await act(async () => { f.dispatchAuth(fixtureUser('bob')); f.dispatchAuth(fixtureUser(uid)); });
  await act(async () => { pending.resolve(); });
  assert.equal(f.sdkCalls.deletes.length, 0); assert.equal(f.cloudProjects.isBusy(), false);
  f.transactionHooks.before = undefined; await open(f);
  assert.equal(button(f, 'Cancel').disabled, false); assert.equal(confirmInput(f)?.disabled, false);
  await confirm(f, 1); assert.deepEqual(f.sdkCalls.deletes, [path('one')]);
});

test('a concurrent explicit Save cannot discard the initial cloud read or replace an older record', async t => {
  const f = await accountFixture({ realCloudWrapper: true }); t.after(() => f.cleanup());
  const old = record('existing'); f.cloudRecords.set(path('existing'), old);
  await mount(f);
  await f.click(f.document.querySelector('[title="Save active story to your Firestore account"]'));
  assert.equal(f.sdkCalls.writes.length, 1);
  await f.resolveServer(0, [{ id: id('existing'), data: old }]);
  await f.click(f.document.querySelector('[title="Saved Prompts Library"]'));
  assert.match(f.document.querySelector('[aria-label="Library"]')!.textContent!, /Project existing/);
  assert.ok(f.cloudRecords.has(path('existing')));
  assert.notEqual(f.sdkCalls.writes[0], path('existing'));
});
