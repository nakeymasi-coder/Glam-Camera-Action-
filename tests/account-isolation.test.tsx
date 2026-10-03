import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { act } from 'react';
import { normalizeStudioState } from '../src/utils/studioAdapter';
import { createStoryTemplate } from '../src/utils/storyTemplates';
import type { SavedPromptItem } from '../src/types';
import type { CloudSession } from '../src/hooks/useCloudSession';
import { accountFixture, button, deferred, fixtureUser, type AccountFixture } from './helpers/account-isolation-fixture';

const keys = {
  draft: 'scene_script_draft_state_v1', production: 'scene_script_production_v2', library: 'scene_script_library_v1',
  templates: 'scene_script_templates_v1', backups: 'scene_script_project_backups_v1', brief: 'scene_script_reusable_brief_v2',
  choices: 'scene_script_preset_choices_v2_01', projectId: 'scene_script_project_id_v1',
};
const story = (label: string, id = label): SavedPromptItem => ({
  id, title: `${label} library`, createdAt: '2026-10-03T00:00:00Z',
  state: normalizeStudioState({ storyIdea: `${label} draft` }), masterPrompt: `${label} output`,
});
function seedWorkspace(fixture: AccountFixture, uid: string | null, label: string, legacy = false) {
  const state = normalizeStudioState({ storyIdea: `${label} draft`, characterTypes: ['Custom'], customCharacter: `${label} new choice` });
  const values = {
    [keys.draft]: JSON.stringify(state),
    [keys.production]: JSON.stringify({ state, prompt: `${label} output`, overrideText: `${label} manual direction` }),
    [keys.library]: JSON.stringify([story(label)]),
    [keys.templates]: JSON.stringify([createStoryTemplate(`${label} template`, 'brief', state)]),
    [keys.backups]: JSON.stringify([{ id: `${label}-backup`, title: `${label} backup`, createdAt: '2026-10-03T00:00:00Z', draft: state, production: state, prompt: `${label} old output`, overrideText: '', hasGeneratedOnce: true }]),
    [keys.brief]: JSON.stringify({ storyIdea: [`${label} reusable brief`] }),
    [keys.choices]: JSON.stringify([`${label} reusable choice`]),
    [keys.projectId]: `${label}-project`,
  };
  for (const [key, value] of Object.entries(values)) fixture.storage.setItem(legacy ? key : fixture.workspaceStorageKey(uid, key), value);
  return values;
}
const idea = (fixture: AccountFixture) => fixture.document.querySelector<HTMLTextAreaElement>('#story-idea-input');
const output = (fixture: AccountFixture) => fixture.document.querySelector<HTMLTextAreaElement>('[data-gca-panel="master"] textarea');
function assertWorkspace(fixture: AccountFixture, label: string, excluded: string[]) {
  assert.equal(idea(fixture)?.value, `${label} draft`);
  assert.equal(output(fixture)?.value, `${label} output`);
  assert.ok(fixture.document.querySelector(`[aria-label="Remove saved ${label} reusable choice"]`), 'Preset choices must belong to this workspace');
  assert.ok([...fixture.document.querySelectorAll('option')].some(option => option.value === `${label} reusable brief`), 'Brief choices must belong to this workspace');
  assert.ok([...fixture.document.querySelectorAll('[data-template-card] h4')].some(heading => heading.textContent === `${label} template`));
  assert.match(fixture.document.querySelector('[aria-label="Saved project backups"]')!.textContent!, new RegExp(`${label} backup`));
  for (const other of excluded) assert.doesNotMatch(fixture.document.body.textContent!, new RegExp(`${other} (?:draft|output|template|backup|reusable)`));
}

// Hooks are exercised inside actual mounted React components, never by calling
// an effect callback manually or replacing React state with a test substitute.
test('one auth observer and one initial read survive unrelated renders and repeated same-UID notifications', async t => {
  const fixture = await accountFixture();
  t.after(() => fixture.cleanup());
  let latest!: CloudSession;
  function Probe({ tick }: { tick: number }) { latest = fixture.useCloudSession(); return <output>{tick}:{latest.user?.uid ?? 'guest'}</output>; }
  await fixture.render(<Probe tick={0} />);
  assert.equal(latest.ready, false);
  assert.equal(fixture.calls.subscriptions, 1);
  await fixture.emit(fixtureUser('alice'));
  assert.deepEqual(fixture.requests.map(request => request.uid), ['alice']);
  const generation = latest.generation;
  for (let tick = 1; tick <= 3; tick++) {
    await fixture.render(<Probe tick={tick} />);
    await fixture.emit(fixtureUser('alice'));
  }
  assert.equal(latest.generation, generation);
  assert.equal(fixture.calls.subscriptions, 1);
  assert.equal(fixture.calls.unsubscriptions, 0);
  assert.equal(fixture.requests.length, 1);
  await fixture.resolve(0, [story('Alice cloud')]);
  assert.equal(latest.cloudStories?.[0].title, 'Alice cloud library');
  await fixture.render(<Probe tick={99} />);
  assert.equal(fixture.requests.length, 1);
  await fixture.unmount();
  assert.equal(fixture.calls.unsubscriptions, 1);
  assert.equal(fixture.listenerCount, 0);
  assert.equal(fixture.calls.outbound, 0);
});

test('late cloud results after UID switch, logout, return to the same UID, or unmount cannot update the wrong session', async t => {
  const fixture = await accountFixture();
  t.after(() => fixture.cleanup());
  let latest!: CloudSession;
  let renders = 0;
  function Probe() { latest = fixture.useCloudSession(); renders++; return <span>{latest.user?.uid ?? 'guest'}</span>; }
  await fixture.render(<Probe />);
  await fixture.emit(fixtureUser('alice'));
  await fixture.emit(fixtureUser('bob'));
  assert.equal(latest.cloudStories, null);
  await fixture.resolve(0, [story('Stale Alice')]);
  assert.equal(latest.user?.uid, 'bob');
  assert.equal(latest.cloudStories, null);
  await fixture.emit(null);
  await fixture.resolve(1, [story('Stale Bob')]);
  assert.equal(latest.user, null);
  assert.equal(latest.cloudStories, null);
  await fixture.emit(fixtureUser('alice'));
  await fixture.emit(null);
  await fixture.emit(fixtureUser('alice'));
  await fixture.resolve(2, [story('Earlier Alice session')]);
  assert.equal(latest.cloudStories, null, 'UID equality alone must not admit a previous login generation');
  await fixture.resolve(3, [story('Current Alice session')]);
  assert.equal((latest.cloudStories as SavedPromptItem[] | null)?.[0].title, 'Current Alice session library');
  await fixture.emit(fixtureUser('carol'));
  await fixture.unmount();
  const beforeLateCompletion = renders;
  await fixture.resolve(4, [story('After unmount')]);
  assert.equal(renders, beforeLateCompletion);
  assert.equal(fixture.calls.subscriptions, 1);
  assert.equal(fixture.calls.unsubscriptions, 1);
  assert.equal(fixture.errors.length, 0);
});

test('App never flashes a workspace before auth resolves and isolates every local workspace surface across account and guest switches', async t => {
  const fixture = await accountFixture();
  t.after(() => fixture.cleanup());
  const alice = seedWorkspace(fixture, 'alice', 'Alice');
  const bob = seedWorkspace(fixture, 'bob', 'Bob');
  const guest = seedWorkspace(fixture, null, 'Guest');
  const legacy = seedWorkspace(fixture, null, 'Legacy', true);
  await fixture.render(<fixture.App />);
  assert.equal(idea(fixture), null);
  assert.equal(output(fixture), null);
  assert.doesNotMatch(fixture.document.body.textContent!, /Alice|Bob|Guest|Legacy draft/);
  assert.equal(fixture.calls.subscriptions, 1);
  await fixture.emit(fixtureUser('alice'));
  assertWorkspace(fixture, 'Alice', ['Bob', 'Guest', 'Legacy']);
  await fixture.click(fixture.document.querySelector('[title="Saved Prompts Library"]'));
  assert.match(fixture.document.querySelector('[aria-label="Library"]')!.textContent!, /Alice library/);
  assert.doesNotMatch(fixture.document.querySelector('[aria-label="Library"]')!.textContent!, /Bob library|Guest library|Legacy library/);
  await fixture.click(button(fixture, 'Close library'));
  await fixture.change(idea(fixture), 'Alice edited draft');
  await fixture.change(output(fixture), 'Alice edited output');
  await fixture.click(button(fixture, 'Add reusable choice'));
  await fixture.click(button(fixture, 'Save current story idea'));
  await fixture.change(fixture.document.querySelector<HTMLInputElement>('#template-title'), 'Alice added template');
  await fixture.submit(fixture.document.querySelector('#template-title')!.closest('form'));
  assert.equal(JSON.parse(fixture.storage.getItem(fixture.workspaceStorageKey('alice', keys.draft))!).storyIdea, 'Alice edited draft');
  assert.equal(JSON.parse(fixture.storage.getItem(fixture.workspaceStorageKey('alice', keys.production))!).prompt, 'Alice edited output');
  assert.ok(JSON.parse(fixture.storage.getItem(fixture.workspaceStorageKey('alice', keys.choices))!).includes('Alice new choice'));
  assert.ok(JSON.parse(fixture.storage.getItem(fixture.workspaceStorageKey('alice', keys.brief))!).storyIdea.includes('Alice edited draft'));
  assert.match(fixture.storage.getItem(fixture.workspaceStorageKey('alice', keys.templates))!, /Alice added template/);
  assert.equal(fixture.requests.length, 1, 'Workspace typing, output editing and local saves must not refetch cloud stories');
  await fixture.emit(fixtureUser('alice'));
  assert.equal(idea(fixture)?.value, 'Alice edited draft');
  assert.equal(fixture.requests.length, 1);
  await fixture.emit(fixtureUser('bob'));
  assertWorkspace(fixture, 'Bob', ['Alice', 'Guest', 'Legacy']);
  await fixture.emit(null);
  assertWorkspace(fixture, 'Guest', ['Alice', 'Bob', 'Legacy']);
  await fixture.emit(fixtureUser('alice'));
  assert.equal(idea(fixture)?.value, 'Alice edited draft');
  assert.equal(output(fixture)?.value, 'Alice edited output');
  assert.match(fixture.document.body.textContent!, /Alice added template/);
  for (const [key, value] of Object.entries(bob)) assert.equal(fixture.storage.getItem(fixture.workspaceStorageKey('bob', key)), value);
  for (const [key, value] of Object.entries(guest)) assert.equal(fixture.storage.getItem(fixture.workspaceStorageKey(null, key)), value);
  for (const [key, value] of Object.entries(legacy)) assert.equal(fixture.storage.getItem(key), value, 'Legacy originals are never implicitly claimed or rewritten');
  assert.notEqual(fixture.storage.getItem(fixture.workspaceStorageKey('alice', keys.draft)), alice[keys.draft]);
  assert.equal(fixture.calls.subscriptions, 1, 'AuthBar must consume the root identity instead of creating another observer');
  assert.equal(fixture.calls.outbound, 0);
});

test('App clears cloud visibility on logout/switch and ignores late reads without persisting cloud records in another workspace', async t => {
  const fixture = await accountFixture();
  t.after(() => fixture.cleanup());
  seedWorkspace(fixture, 'alice', 'Alice');
  seedWorkspace(fixture, 'bob', 'Bob');
  seedWorkspace(fixture, null, 'Guest');
  await fixture.render(<fixture.App />);
  await fixture.emit(fixtureUser('alice'));
  await fixture.resolve(0, [story('Cloud Alice'), story('Cloud duplicate', 'Alice')]);
  await fixture.click(fixture.document.querySelector('[title="Saved Prompts Library"]'));
  let library = fixture.document.querySelector('[aria-label="Library"]')!;
  assert.match(library.textContent!, /Cloud Alice library/);
  assert.equal(library.querySelectorAll('h4').length, 2, 'Cloud overlap merges by ID without duplicating a local record');
  await fixture.emit(null);
  assert.equal(fixture.document.querySelector('[aria-label="Library"]'), null, 'Account switches also close account-specific modals');
  await fixture.emit(fixtureUser('alice'));
  await fixture.emit(fixtureUser('bob'));
  await fixture.resolve(2, [story('Cloud Bob')]);
  await fixture.resolve(1, [story('Late Cloud Alice')]);
  await fixture.click(fixture.document.querySelector('[title="Saved Prompts Library"]'));
  library = fixture.document.querySelector('[aria-label="Library"]')!;
  assert.match(library.textContent!, /Cloud Bob library/);
  assert.doesNotMatch(library.textContent!, /Cloud Alice|Late Cloud Alice|Alice library|Guest library/);
  assert.equal(JSON.parse(fixture.storage.getItem(fixture.workspaceStorageKey('bob', keys.library))!).length, 1, 'Read-only cloud merging must not rewrite the local library');
  assert.doesNotMatch(fixture.storage.getItem(fixture.workspaceStorageKey('bob', keys.library))!, /Cloud Alice|Cloud Bob/);
  assert.doesNotMatch(fixture.storage.getItem(fixture.workspaceStorageKey(null, keys.library))!, /Cloud Alice|Cloud Bob/);
  assert.equal(fixture.requests.length, 3);
  assert.equal(fixture.calls.subscriptions, 1);
});

test('explicit recovery preserves raw originals, disables cloud/Drive writes, exports exact bytes and closes on auth change', async t => {
  const fixture = await accountFixture();
  t.after(() => fixture.cleanup());
  seedWorkspace(fixture, 'alice', 'Alice');
  seedWorkspace(fixture, 'bob', 'Bob');
  const legacy = seedWorkspace(fixture, null, 'Legacy', true);
  // Formatting is intentionally non-canonical: export and recovery must preserve it.
  fixture.storage.setItem(keys.library, ` \n ${legacy[keys.library]} \n`);
  legacy[keys.library] = fixture.storage.getItem(keys.library)!;
  await fixture.render(<fixture.App />);
  await fixture.emit(fixtureUser('alice'));
  assert.doesNotMatch(fixture.document.body.textContent!, /Legacy draft|Legacy template|Legacy backup/);
  let confirmation = '';
  fixture.dom.window.confirm = text => { confirmation = text ?? ''; return false; };
  await fixture.click(button(fixture, 'Open recovery workspace'));
  assert.match(confirmation, /another person|Google account/);
  assert.equal(idea(fixture)?.value, 'Alice draft', 'Cancelling recovery must retain the account workspace');
  fixture.dom.window.confirm = () => true;
  await fixture.click(button(fixture, 'Open recovery workspace'));
  assertWorkspace(fixture, 'Legacy', ['Alice', 'Bob']);
  assert.equal(fixture.document.querySelector('[title="Save active story to your Firestore account"]'), null);
  assert.equal(fixture.document.querySelector('[data-drive-fixture]'), null);
  await fixture.change(idea(fixture), 'Recovered safe copy');
  assert.equal(JSON.parse(fixture.storage.getItem(fixture.workspaceStorageKey(null, keys.draft, true))!).storyIdea, 'Recovered safe copy');
  assert.equal(fixture.storage.getItem(fixture.workspaceStorageKey('alice', keys.draft)), JSON.stringify(normalizeStudioState({ storyIdea: 'Alice draft', characterTypes: ['Custom'], customCharacter: 'Alice new choice' })));
  fixture.downloadLegacyBrowserData();
  assert.equal(fixture.downloads.length, 1);
  assert.match(fixture.downloads[0].filename, /older-browser-data\.json$/);
  const exported = JSON.parse(await fixture.blobs[0].text());
  assert.deepEqual(exported.records, legacy);
  for (const [key, value] of Object.entries(legacy)) assert.equal(fixture.storage.getItem(key), value);
  await fixture.emit(fixtureUser('bob'));
  assertWorkspace(fixture, 'Bob', ['Legacy', 'Alice']);
  assert.equal(fixture.calls.cloudSaves.length, 0);
  assert.equal(fixture.calls.driveBackups.length, 0);
});

test('a cloud read failure stays local and does not restart the auth observer or fetch on ordinary edits', async t => {
  const fixture = await accountFixture();
  t.after(() => fixture.cleanup());
  seedWorkspace(fixture, 'alice', 'Alice');
  await fixture.render(<fixture.App />);
  await fixture.emit(fixtureUser('alice'));
  await fixture.reject(0);
  assert.equal(idea(fixture)?.value, 'Alice draft');
  await fixture.change(idea(fixture), 'Still editable after failure');
  await fixture.emit(fixtureUser('alice'));
  assert.equal(idea(fixture)?.value, 'Still editable after failure');
  assert.equal(fixture.requests.length, 1);
  assert.equal(fixture.calls.subscriptions, 1);
  assert.equal(fixture.errors.length, 1);
});

test('queued local Save backup and stale cloud button cannot use an account generation that changed before React committed', async t => {
  const fixture = await accountFixture();
  t.after(() => fixture.cleanup());
  seedWorkspace(fixture, 'alice', 'Alice');
  seedWorkspace(fixture, 'bob', 'Bob');
  await fixture.render(<fixture.App />);
  await fixture.emit(fixtureUser('alice'));
  await fixture.click(button(fixture, 'Save Prompt'));
  const form = fixture.document.querySelector<HTMLFormElement>('[aria-label="Save prompt"] form')!;
  const oldCloudButton = fixture.document.querySelector<HTMLButtonElement>('[title="Save active story to your Firestore account"]')!;
  await act(async () => {
    form.dispatchEvent(new fixture.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    // Both changes happen before the queued Promise.resolve backup runs or React
    // can commit an unmount. UID-only and mounted-only checks are insufficient.
    fixture.dispatchAuth(fixtureUser('bob'));
    fixture.dispatchAuth(fixtureUser('alice'));
    oldCloudButton.click();
  });
  assert.equal(fixture.calls.driveBackups.length, 0);
  assert.equal(fixture.calls.cloudSaves.length, 0);
  assert.equal(JSON.parse(fixture.storage.getItem(fixture.workspaceStorageKey('alice', keys.library))!).length, 2, 'The successful local save survives a cancelled old-session backup');
  assert.equal(JSON.parse(fixture.storage.getItem(fixture.workspaceStorageKey('bob', keys.library))!).length, 1);
  await fixture.click(button(fixture, 'Save Prompt'));
  await fixture.submit(fixture.document.querySelector('[aria-label="Save prompt"] form'));
  assert.equal(fixture.calls.driveBackups.length, 1, 'An unchanged authenticated session still reaches the synthetic Drive boundary');
  await fixture.emit(null);
  // Guest Save must stay local even when a generated guest output exists.
  assert.equal(fixture.calls.driveBackups.length, 1);
});

test('an unfinished template file read cannot surface or import into the next account workspace', async t => {
  const fixture = await accountFixture();
  t.after(() => fixture.cleanup());
  seedWorkspace(fixture, 'alice', 'Alice');
  const bob = seedWorkspace(fixture, 'bob', 'Bob');
  await fixture.render(<fixture.App />);
  await fixture.emit(fixtureUser('alice'));
  const pendingRead = deferred<string>();
  const input = fixture.document.querySelector<HTMLInputElement>('#template-file')!;
  Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'alice-private-template.json', size: 400, text: () => pendingRead.promise }] });
  await act(async () => { input.dispatchEvent(new fixture.dom.window.Event('change', { bubbles: true })); });
  assert.equal(input.disabled, true);
  await fixture.emit(fixtureUser('bob'));
  await act(async () => { pendingRead.resolve(JSON.stringify(createStoryTemplate('Alice deferred private template', 'brief', normalizeStudioState({ storyIdea: 'Alice private import' })))); });
  assert.equal(fixture.document.querySelector('[aria-label="Template import preview"]'), null);
  assert.doesNotMatch(fixture.document.body.textContent!, /Alice deferred private template|Alice private import/);
  assert.equal(fixture.storage.getItem(fixture.workspaceStorageKey('bob', keys.templates)), bob[keys.templates]);
  assert.equal(fixture.document.querySelector<HTMLInputElement>('#template-file')?.disabled, false);
});

test('real recovery components under quota failure leave original bytes available for raw export', async t => {
  const fixture = await accountFixture();
  t.after(() => fixture.cleanup());
  const legacy = seedWorkspace(fixture, null, 'Legacy', true);
  await fixture.render(<fixture.App />);
  await fixture.emit(fixtureUser('alice'));
  fixture.dom.window.Storage.prototype.setItem = function () {
    throw new DOMException('Synthetic quota exceeded', 'QuotaExceededError');
  };
  await fixture.click(button(fixture, 'Open recovery workspace'));
  assert.equal(idea(fixture)?.value, 'Legacy draft');
  await fixture.change(idea(fixture), 'Unsaved recovery edit');
  assert.equal(idea(fixture)?.value, 'Unsaved recovery edit');
  for (const [key, value] of Object.entries(legacy)) assert.equal(fixture.storage.getItem(key), value);
  assert.equal(fixture.storage.getItem(fixture.workspaceStorageKey(null, keys.draft, true)), null);
  fixture.downloadLegacyBrowserData();
  assert.deepEqual(JSON.parse(await fixture.blobs[0].text()).records, legacy);
  assert.equal(fixture.calls.cloudSaves.length, 0);
  assert.equal(fixture.calls.driveBackups.length, 0);
});

test('repeated equal cloud arrays in the actual workspace cause no repeated localStorage writes', async t => {
  const fixture = await accountFixture();
  t.after(() => fixture.cleanup());
  seedWorkspace(fixture, 'alice', 'Alice');
  const user = fixtureUser('alice');
  fixture.auth.currentUser = user;
  const storage = fixture.createWorkspaceStorage('alice');
  const writes: string[] = [];
  const originalSet = fixture.dom.window.Storage.prototype.setItem;
  fixture.dom.window.Storage.prototype.setItem = function (key: string, value: string) {
    writes.push(key);
    originalSet.call(this, key, value);
  };
  const renderWorkspace = () => fixture.render(
    <fixture.WorkspaceStorageContext.Provider value={storage}>
      <fixture.AppWorkspace user={user} cloudStories={[story('Cloud Alice')]} recovery={false} isSessionCurrent={() => true} onOpenRecovery={() => {}} onExitRecovery={() => {}} />
    </fixture.WorkspaceStorageContext.Provider>
  );
  await renderWorkspace();
  const initialWrites = writes.length;
  assert.ok(initialWrites > 0, 'The test must observe actual persistence effects');
  await renderWorkspace();
  await renderWorkspace();
  await renderWorkspace();
  assert.equal(writes.length, initialWrites, 'ID-identical cloud arrays must retain state identity and avoid write churn');
  await fixture.click(fixture.document.querySelector('[title="Saved Prompts Library"]'));
  assert.equal(fixture.document.querySelector('[aria-label="Library"]')!.querySelectorAll('h4').length, 2);
  assert.equal(fixture.requests.length, 0);
  assert.equal(fixture.calls.subscriptions, 0, 'A workspace consumes the root session and never subscribes itself');
});
