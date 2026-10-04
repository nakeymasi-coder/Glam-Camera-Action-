import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build, transformSync } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { createBrowserDriveBackup, type BrowserDriveDependencies, type BrowserDriveView } from '../src/utils/browserDriveBackup';
import type { DriveBackupInput } from '../src/utils/driveBackupTypes';
import { normalizeStudioState } from '../src/utils/studioAdapter';

const ALICE_TOKEN = 'alice-private-oauth-token-never-persist';
const BOB_TOKEN = 'bob-private-oauth-token-never-persist';
const input = (seconds = 30): DriveBackupInput => ({
  projectId: 'project-1', title: 'A private story',
  savedAt: new Date(Date.now() - seconds * 1000).toISOString(),
  state: normalizeStudioState({ storyIdea: 'A florist repairs a broken friendship.', optionalDetails: { continuityNotes: 'The red vase remains cracked.', scene1Beat: 'The vase breaks.' } }),
});
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
interface Call { url: URL; method: string; body: any; init: RequestInit; token: string; }
interface MockDoc { id: string; marker: string; token: string; text: string; revision: number; }
const documentMetadata = (doc: MockDoc, accountId: string) => ({
  id: doc.id, mimeType: 'application/vnd.google-apps.document', trashed: false,
  appProperties: { glamBackup: doc.marker }, ownedByMe: true,
  owners: [{ permissionId: accountId }],
});
interface MockGoogle {
  calls: Call[];
  documents: Map<string, MockDoc>;
  accountId: string;
  email: string;
  intercept?: (call: Call) => Response | undefined | Promise<Response | undefined>;
  readonly creates: Call[];
  readonly writes: Call[];
  readonly fileCalls: Call[];
  readonly metadataReads: Call[];
  fetcher: typeof fetch;
}
function mockGoogle() {
  const calls: Call[] = [];
  const documents = new Map<string, MockDoc>();
  let nextId = 1;
  const mock: MockGoogle = {
    calls, documents,
    accountId: 'drive-account-alice',
    email: 'alice@example.test',
    intercept: undefined as undefined | ((call: Call) => Response | undefined | Promise<Response | undefined>),
    get creates() { return calls.filter(call => call.url.pathname === '/drive/v3/files' && call.method === 'POST'); },
    get writes() { return calls.filter(call => call.url.pathname.endsWith(':batchUpdate')); },
    get fileCalls() { return calls.filter(call => !call.url.pathname.endsWith('/about')); },
    get metadataReads() { return calls.filter(call => /^\/drive\/v3\/files\/[A-Za-z0-9_-]+$/.test(call.url.pathname) && call.method === 'GET'); },
    fetcher: (async (urlInput: string | URL | Request, init: RequestInit = {}) => {
      const call: Call = { url: new URL(String(urlInput)), method: init.method || 'GET', body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined, init, token: new Headers(init.headers).get('Authorization') || '' };
      calls.push(call);
      const intercepted = await mock.intercept?.(call);
      if (intercepted) return intercepted;
      if (call.url.pathname === '/drive/v3/about') return response({ user: { permissionId: mock.accountId, emailAddress: mock.email } });
      if (call.url.pathname === '/drive/v3/files' && call.method === 'POST') {
        const id = `doc-${nextId++}`;
        documents.set(id, { id, marker: call.body.appProperties.glamBackup, token: call.token, text: '', revision: 1 });
        return response({ id });
      }
      if (call.url.pathname === '/drive/v3/files') {
        const markerQuery = call.url.searchParams.get('q') || '';
        return response({ files: [...documents.values()].filter(doc => doc.token === call.token && markerQuery.includes(doc.marker)).map(({ id }) => ({ id })) });
      }
      const metadataMatch = /^\/drive\/v3\/files\/([A-Za-z0-9_-]+)$/.exec(call.url.pathname);
      if (metadataMatch && call.method === 'GET') {
        const doc = documents.get(metadataMatch[1]);
        assert.ok(doc, `Unknown mock metadata document: ${metadataMatch[1]}`);
        assert.equal(doc.token, call.token, 'A different account must not inspect this document');
        return response(documentMetadata(doc, mock.accountId));
      }
      const match = /^\/v1\/documents\/([A-Za-z0-9_-]+)(:batchUpdate)?$/.exec(call.url.pathname);
      if (call.url.hostname === 'docs.googleapis.com' && match) {
        const doc = documents.get(match[1]);
        assert.ok(doc, `Unknown mock document: ${match[1]}`);
        assert.equal(doc.token, call.token, 'A different account must not read or write this document');
        if (match[2]) {
          assert.equal(call.body.writeControl.requiredRevisionId, `revision-${doc.revision}`);
          assert.equal(call.body.requests.at(-1).insertText.location.index, 1);
          if (doc.text) assert.deepEqual(call.body.requests[0].deleteContentRange.range, { startIndex: 1, endIndex: doc.text.length + 1 });
          doc.text = call.body.requests.at(-1).insertText.text;
          doc.revision++;
          return response({});
        }
        return response({ body: { content: [{ endIndex: doc.text.length + 2, paragraph: { elements: [{ textRun: { content: `${doc.text}\n` } }] } }] }, revisionId: `revision-${doc.revision}` });
      }
      throw Error(`Unexpected mocked request: ${call.method} ${call.url}`);
    }) as typeof fetch,
  };
  return mock;
}
function harness(overrides: Partial<BrowserDriveDependencies> = {}) {
  const values = new Map<string, string>();
  const google = mockGoogle();
  const views: BrowserDriveView[] = [];
  const locks: string[] = [];
  let uid: string | null = 'alice';
  let now = Date.now();
  let authorizations = 0;
  let grant: { uid: string; email: string; accessToken: string } | undefined;
  const client = createBrowserDriveBackup({
    uid: () => uid,
    authorize: async () => { authorizations++; return grant || { uid: uid!, email: google.email, accessToken: uid === 'alice' ? ALICE_TOKEN : BOB_TOKEN }; },
    storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } },
    fetcher: google.fetcher,
    now: () => now,
    withLock: async (name, task) => { locks.push(name); return task(); },
    debounceMs: 0,
    ...overrides,
  });
  client.subscribe(view => views.push(structuredClone(view)));
  return {
    client, google, values, views, locks,
    setUid: (value: string | null) => { uid = value; },
    setGrant: (value: typeof grant) => { grant = value; },
    advance: (milliseconds: number) => { now += milliseconds; },
    get authorizations() { return authorizations; },
    receipt: () => { assert.equal(values.size, 1); return JSON.parse([...values.values()][0]); },
  };
}

test('connect authorizes only on an explicit request and verifies the signed-in Google account', async () => {
  const h = harness();
  assert.equal((await h.client.getStatus()).connected, false);
  assert.equal((await h.client.enqueue(input())).status, 'disconnected');
  assert.equal(h.authorizations, 0);
  assert.equal(h.google.calls.length, 0);
  await h.client.connect();
  const status = await h.client.getStatus();
  assert.equal(status.connected, true);
  assert.match(status.message, /alice@example\.test/);
  assert.equal(h.authorizations, 1);
  assert.equal(h.google.calls.length, 1);
  assert.equal(h.google.calls[0].url.pathname, '/drive/v3/about');
  assert.equal(h.google.calls[0].token, `Bearer ${ALICE_TOKEN}`);
  assert.equal(h.google.creates.length, 0);
});

test('signed-out users cannot open authorization or make Drive requests', async () => {
  const h = harness(); h.setUid(null); h.client.ownerChanged();
  await assert.rejects(h.client.connect(), /Sign in with Google first/);
  assert.equal(h.authorizations, 0);
  assert.equal(h.google.calls.length, 0);
});

test('mismatched Firebase UID or Google Drive email never connects or changes files', async () => {
  const h = harness();
  h.setGrant({ uid: 'bob', email: 'alice@example.test', accessToken: ALICE_TOKEN });
  await assert.rejects(h.client.connect(), /could not be matched/);
  assert.equal(h.google.calls.length, 0);
  h.setGrant({ uid: 'alice', email: 'alice@example.test', accessToken: ALICE_TOKEN });
  h.google.email = 'bob@example.test';
  await assert.rejects(h.client.connect(), /did not match/);
  assert.equal((await h.client.getStatus()).connected, false);
  assert.equal(h.google.fileCalls.length, 0);
  assert.equal(h.values.size, 0);
});

test('explicit successful saves create exactly two native Docs and reuse their IDs on repeated saves', async () => {
  const h = harness(); await h.client.connect();
  const first = input();
  const result = await h.client.enqueue(first);
  assert.equal(result.status, 'synced');
  assert.equal(h.google.creates.length, 2);
  assert.equal(h.google.writes.length, 2);
  assert.deepEqual(h.google.metadataReads.map(call => call.url.pathname), ['/drive/v3/files/doc-1', '/drive/v3/files/doc-2']);
  const firstWriteIndex = h.google.calls.findIndex(call => call.url.pathname.endsWith(':batchUpdate'));
  assert.ok(h.google.metadataReads.every(call => h.google.calls.indexOf(call) < firstWriteIndex), 'Both newly-created Docs must be verified before either write');
  assert.match(result.briefUrl!, /\/doc-1\/edit$/);
  assert.match(result.continuityUrl!, /\/doc-2\/edit$/);
  assert.equal(h.receipt().savedAt, first.savedAt);
  assert.match(h.receipt().digest, /^[a-f0-9]{64}$/);
  assert.match(h.google.documents.get('doc-1')!.text, /PROJECT BRIEF[\s\S]*florist repairs/);
  assert.match(h.google.documents.get('doc-2')!.text, /CONTINUITY BIBLE[\s\S]*red vase remains cracked/);
  for (const call of h.google.creates) assert.equal(call.body.mimeType, 'application/vnd.google-apps.document');
  const repeated = await h.client.enqueue(first);
  assert.equal(repeated.status, 'synced');
  assert.equal(repeated.briefUrl, result.briefUrl);
  const newer = await h.client.enqueue({ ...first, title: 'A revised private story', savedAt: input(10).savedAt });
  assert.equal(newer.status, 'synced');
  assert.equal(newer.continuityUrl, result.continuityUrl);
  assert.equal(h.google.creates.length, 2);
  assert.match(h.google.documents.get('doc-1')!.text, /^A revised private story/);
  assert.equal(new Set(h.locks).size, 1);
});

test('enqueued snapshots are immutable and invalid data never reaches Google', async () => {
  const h = harness({ debounceMs: 5 }); await h.client.connect();
  const snapshot = input();
  const pending = h.client.enqueue(snapshot);
  snapshot.title = 'Unsaved edit'; snapshot.state.storyIdea = 'Unsaved replacement';
  assert.equal((await pending).status, 'synced');
  assert.match(h.google.documents.get('doc-1')!.text, /^A private story/);
  assert.doesNotMatch(h.google.documents.get('doc-1')!.text, /Unsaved/);
  const count = h.google.calls.length;
  assert.equal((await h.client.enqueue({ ...input(), projectId: '../escape' })).status, 'failed');
  assert.equal(h.google.calls.length, count);
});

test('the real Save Prompt handler enqueues only after successful local persistence', async () => {
  const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const match = /const handleSavePrompt = \(title: string\) => \{[\s\S]*?\n  \};(?=\n\n  \/\/ Load prompt)/.exec(source);
  assert.ok(match, 'The actual Save Prompt handler must remain inspectable');
  assert.equal((source.match(/enqueueDriveBackup\(/g) || []).length, 1, 'Only the explicit Save handler may enqueue');
  const code = transformSync(match[0], { loader: 'ts', target: 'es2022' }).code;
  const state = normalizeStudioState({ storyIdea: 'The saved production snapshot' });
  const events: string[] = [];
  let failStorage = true;
  let savedSnapshot: DriveBackupInput | undefined;
  const bindings = {
    generatedPrompt: 'Generated prompt', buildMasterPrompt: () => 'Fallback prompt', presetState: normalizeStudioState({ storyIdea: 'Unsaved draft' }),
    createLocalId: () => 'local-save-id', projectId: 'project-1', normalizeStudioState, hasGeneratedOnce: true, productionState: state,
    manualOverride: '', savedLibrary: [], LIBRARY_STORAGE_KEY: 'library',
    localStorage: { setItem: () => { events.push('persist'); if (failStorage) throw Error('Storage full'); } },
    setSavedLibrary: () => { events.push('update-library'); }, showToast: () => undefined,
    // The privacy release uses a scoped workspace adapter and guards delayed work.
    localLibrary: [], storage: { setItem: () => { events.push('persist'); if (failStorage) throw Error('Storage full'); } },
    setLocalLibrary: () => { events.push('update-library'); }, recovery: false, user: { uid: 'alice' },
    auth: { currentUser: { uid: 'alice' } }, mounted: { current: true }, isSessionCurrent: () => true,
    enqueueDriveBackup: (snapshot: DriveBackupInput) => { events.push('enqueue'); savedSnapshot = snapshot; return Promise.reject(Error('Mock Drive unavailable')); },
  };
  const save = new Function(...Object.keys(bindings), `${code}\nreturn handleSavePrompt;`)(...Object.values(bindings)) as (title: string) => boolean;
  assert.equal(save('Failed local save'), false);
  await Promise.resolve();
  assert.deepEqual(events, ['persist']);
  failStorage = false; events.length = 0;
  assert.equal(save('Saved snapshot'), true);
  assert.deepEqual(events, ['persist', 'update-library']);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events, ['persist', 'update-library', 'enqueue']);
  assert.equal(savedSnapshot!.state.storyIdea, state.storyIdea);
  assert.equal(savedSnapshot!.title, 'Saved snapshot');
});

test('access tokens never enter browser receipts, status, results, or error messages', async () => {
  const h = harness(); await h.client.connect();
  assert.equal((await h.client.enqueue(input())).status, 'synced');
  h.google.intercept = call => { if (call.url.pathname.endsWith(':batchUpdate')) throw Error(`A provider error containing ${ALICE_TOKEN}`); };
  const failed = await h.client.enqueue(input(10));
  assert.equal(failed.status, 'failed');
  const exposed = JSON.stringify({ storage: [...h.values], views: h.views, status: await h.client.getStatus(), failed });
  assert.equal(exposed.includes(ALICE_TOKEN), false);
  assert.equal(exposed.includes('accessToken'), false);
  assert.equal(exposed.includes('refreshToken'), false);
  const fields = ['briefId', 'continuityId', 'briefPending', 'continuityPending', 'savedAt', 'attemptedAt', 'digest'];
  assert.ok(Object.keys(h.receipt()).every(key => fields.includes(key)));
  for (const call of h.google.calls) {
    assert.equal(call.init.credentials, 'omit');
    assert.equal(call.init.cache, 'no-store');
    assert.equal(call.init.redirect, 'error');
    assert.equal(call.url.href.includes(ALICE_TOKEN), false);
  }
});

test('disconnect cancels a debounced save and requires another explicit connection', async () => {
  const h = harness({ debounceMs: 10 }); await h.client.connect();
  const pending = h.client.enqueue(input());
  const status = await h.client.disconnect();
  assert.equal(status.connected, false);
  assert.equal((await pending).status, 'superseded');
  assert.equal((await h.client.enqueue(input())).status, 'disconnected');
  assert.equal(h.google.fileCalls.length, 0);
  assert.equal(h.authorizations, 1);
});

test('an account switch during authorization cancels the stale connection before any API request', async () => {
  const authorization = deferred<{ uid: string; email: string; accessToken: string }>();
  const h = harness({ authorize: () => authorization.promise });
  const connecting = h.client.connect();
  h.setUid('bob'); h.client.ownerChanged();
  authorization.resolve({ uid: 'alice', email: 'alice@example.test', accessToken: ALICE_TOKEN });
  await assert.rejects(connecting, /cancelled/);
  assert.equal((await h.client.getStatus()).connected, false);
  assert.equal(h.google.calls.length, 0);
});

test('a later connect wins an authorization race and stale completion cannot replace its account', async () => {
  const first = deferred<{ uid: string; email: string; accessToken: string }>();
  let attempts = 0;
  const h = harness({ authorize: () => ++attempts === 1 ? first.promise : Promise.resolve({ uid: 'alice', email: 'alice@example.test', accessToken: ALICE_TOKEN }) });
  const oldConnect = h.client.connect();
  await h.client.connect();
  first.resolve({ uid: 'alice', email: 'alice@example.test', accessToken: 'obsolete-token' });
  await assert.rejects(oldConnect, /cancelled/);
  assert.equal((await h.client.getStatus()).connected, true);
  assert.equal(h.google.calls.length, 1);
  assert.equal(h.google.calls[0].token, `Bearer ${ALICE_TOKEN}`);
});

test('account switch during a request aborts it and never publishes stale success or uses old IDs', async () => {
  const h = harness(); await h.client.connect();
  const started = deferred<Call>();
  const release = deferred<Response>();
  h.google.intercept = call => {
    if (call.url.pathname === '/drive/v3/files' && call.method === 'GET') { started.resolve(call); return release.promise; }
  };
  const pending = h.client.enqueue(input());
  const call = await started.promise;
  h.setUid('bob'); h.client.ownerChanged();
  assert.equal(call.init.signal?.aborted, true);
  release.resolve(response({ files: [] }));
  assert.equal((await pending).status, 'superseded');
  assert.equal(h.google.creates.length, 0);
  assert.equal((await h.client.getStatus()).connected, false);
  h.google.intercept = undefined; h.google.email = 'bob@example.test'; h.google.accountId = 'drive-account-bob';
  await h.client.connect();
  assert.equal((await h.client.enqueue(input())).status, 'synced');
  assert.ok(h.google.creates.every(item => item.token === `Bearer ${BOB_TOKEN}`));
  assert.equal(h.views.filter(view => view.result?.status === 'synced').length, 1);
});

test('401 expires the connection, sanitizes provider errors, and does not silently authorize again', async () => {
  const h = harness(); await h.client.connect();
  h.google.intercept = call => call.url.pathname === '/drive/v3/files' ? response({ error: ALICE_TOKEN }, 401) : undefined;
  const result = await h.client.enqueue(input());
  assert.equal(result.status, 'failed');
  assert.match(result.message, /Connect Drive again/);
  assert.equal((await h.client.getStatus()).connected, false);
  const count = h.google.calls.length;
  assert.equal((await h.client.enqueue(input())).status, 'disconnected');
  assert.equal(h.google.calls.length, count);
  assert.equal(h.authorizations, 1);
  assert.equal(JSON.stringify(h.views).includes(ALICE_TOKEN), false);
});

test('50-minute session expiry blocks saves without any API call or automatic reconnect', async () => {
  const h = harness(); await h.client.connect(); h.advance(50 * 60_000);
  assert.equal((await h.client.enqueue(input())).status, 'disconnected');
  assert.equal((await h.client.getStatus()).connected, false);
  assert.equal(h.google.fileCalls.length, 0);
  assert.equal(h.authorizations, 1);
});

test('failure of the second document write never confirms the pair, and retry keeps IDs', async () => {
  const h = harness(); await h.client.connect();
  h.google.intercept = call => call.url.pathname === '/v1/documents/doc-2:batchUpdate' ? response({}, 500) : undefined;
  const snapshot = input();
  assert.equal((await h.client.enqueue(snapshot)).status, 'failed');
  assert.equal(h.google.writes.length, 2);
  assert.ok(h.google.documents.get('doc-1')!.text);
  assert.equal(h.google.documents.get('doc-2')!.text, '');
  assert.equal(h.receipt().savedAt, undefined);
  assert.equal(h.receipt().digest, undefined);
  h.google.intercept = undefined;
  assert.equal((await h.client.enqueue(snapshot)).status, 'synced');
  assert.equal(h.google.creates.length, 2);
  assert.equal(h.receipt().savedAt, snapshot.savedAt);
});

test('uncertain creation is journaled and cannot create duplicates even after reloading', async () => {
  const h = harness(); await h.client.connect();
  h.google.intercept = call => { if (call.url.pathname === '/drive/v3/files' && call.method === 'POST') throw Error('Ambiguous network failure'); };
  const snapshot = input();
  assert.equal((await h.client.enqueue(snapshot)).status, 'failed');
  assert.equal(h.receipt().briefPending, true);
  assert.equal(h.receipt().savedAt, undefined);
  const second = await h.client.enqueue(snapshot);
  assert.equal(second.status, 'failed');
  assert.match(second.message, /unconfirmed/);
  assert.equal(h.google.creates.length, 1);
  const reopened = harness({
    storage: { getItem: key => h.values.get(key) ?? null, setItem: (key, value) => { h.values.set(key, value); } },
    fetcher: h.google.fetcher,
  });
  await reopened.client.connect();
  assert.match((await reopened.client.enqueue(snapshot)).message, /unconfirmed/);
  assert.equal(h.google.creates.length, 1);
});

test('a lost creation response can recover its existing app-marked document without duplication', async () => {
  const h = harness(); await h.client.connect();
  h.google.intercept = call => {
    if (call.url.pathname === '/drive/v3/files' && call.method === 'POST') {
      h.google.documents.set('accepted-remote-doc', { id: 'accepted-remote-doc', marker: call.body.appProperties.glamBackup, token: call.token, text: '', revision: 1 });
      throw Error('The create succeeded remotely but its response was lost');
    }
  };
  const snapshot = input();
  assert.equal((await h.client.enqueue(snapshot)).status, 'failed');
  h.google.intercept = undefined;
  const recovered = await h.client.enqueue(snapshot);
  assert.equal(recovered.status, 'synced');
  assert.match(recovered.briefUrl!, /accepted-remote-doc/);
  assert.equal(h.google.creates.length, 2, 'One lost create and one continuity create');
  assert.equal(h.google.documents.size, 2);
});

test('definitive create rejection permits an explicit retry after reconnect, but no failed attempt marks synced', async () => {
  const h = harness(); await h.client.connect();
  h.google.intercept = call => call.url.pathname === '/drive/v3/files' && call.method === 'POST' ? response({}, 403) : undefined;
  const snapshot = input();
  assert.equal((await h.client.enqueue(snapshot)).status, 'failed');
  assert.equal(h.receipt().briefPending, false);
  assert.equal(h.receipt().savedAt, undefined);
  assert.equal((await h.client.getStatus()).connected, false);
  h.google.intercept = undefined;
  await h.client.connect();
  assert.equal((await h.client.enqueue(snapshot)).status, 'synced');
  assert.equal(h.google.creates.length, 3);
});

test('a partially written newer snapshot protects its high-water mark from delayed older saves', async () => {
  const h = harness(); await h.client.connect();
  const old = input(60);
  assert.equal((await h.client.enqueue(old)).status, 'synced');
  h.google.intercept = call => call.url.pathname === '/v1/documents/doc-2:batchUpdate' ? response({}, 500) : undefined;
  const newer = { ...old, savedAt: input(10).savedAt, title: 'Newer content' };
  assert.equal((await h.client.enqueue(newer)).status, 'failed');
  assert.equal(h.receipt().attemptedAt, newer.savedAt);
  assert.equal(h.receipt().digest, undefined);
  const calls = h.google.calls.length;
  assert.equal((await h.client.enqueue(old)).status, 'superseded');
  assert.equal(h.google.calls.length, calls);
  assert.match(h.google.documents.get('doc-1')!.text, /^Newer content/);
});

test('newer timestamps already in either remote document prevent both writes', async () => {
  const h = harness(); await h.client.connect();
  const old = input(60);
  await h.client.enqueue(old);
  const remote = h.google.documents.get('doc-2')!;
  remote.text = remote.text.replace(old.savedAt, input(5).savedAt);
  const writes = h.google.writes.length;
  const result = await h.client.enqueue({ ...old, savedAt: input(30).savedAt });
  assert.equal(result.status, 'superseded');
  assert.match(result.message, /newer snapshot/);
  assert.equal(h.google.writes.length, writes);
});

test('a different Drive account identity uses separate receipts and never reuses prior IDs', async () => {
  const h = harness(); await h.client.connect();
  const first = await h.client.enqueue(input());
  await h.client.disconnect();
  h.google.accountId = 'replacement-drive-account';
  await h.client.connect();
  const second = await h.client.enqueue(input());
  assert.equal(second.status, 'synced');
  assert.notEqual(first.briefUrl, second.briefUrl);
  assert.notEqual(first.continuityUrl, second.continuityUrl);
  assert.equal(h.google.creates.length, 4);
  assert.equal(h.values.size, 2);
  assert.equal(new Set(h.locks).size, 2);
});

test('unavailable safe locking or damaged local receipts fail closed without file API changes', async () => {
  const unavailable = harness({ withLock: async () => { throw Error('Web Locks unavailable'); } });
  await unavailable.client.connect();
  assert.equal((await unavailable.client.enqueue(input())).status, 'failed');
  assert.equal(unavailable.google.fileCalls.length, 0);
  const damaged = harness({ storage: { getItem: () => '{broken JSON', setItem: () => { throw Error('Must not overwrite damaged receipt'); } } });
  await damaged.client.connect();
  assert.equal((await damaged.client.enqueue(input())).status, 'failed');
  assert.equal(damaged.google.fileCalls.length, 0);
});

test('a 401 cancels already-queued snapshots so an expired credential cannot make further requests', async () => {
  const h = harness(); await h.client.connect();
  const started = deferred<void>();
  const release = deferred<Response>();
  h.google.intercept = call => {
    if (call.url.pathname === '/drive/v3/files') { started.resolve(); return release.promise; }
  };
  const first = h.client.enqueue(input());
  await started.promise;
  const queued = h.client.enqueue({ ...input(), projectId: 'another-project' });
  await new Promise(resolve => setTimeout(resolve, 5));
  release.resolve(response({}, 401));
  assert.equal((await first).status, 'failed');
  const queuedResult = await queued;
  assert.ok(['disconnected', 'superseded'].includes(queuedResult.status));
  assert.equal(h.google.fileCalls.length, 1);
});

for (const [name, changes] of [
  ['wrong project marker', { appProperties: { glamBackup: 'another-project-marker' } }],
  ['missing app marker', { appProperties: {} }],
  ['wrong document MIME type', { mimeType: 'application/pdf' }],
  ['trashed document', { trashed: true }],
  ['not owned by the user', { ownedByMe: false }],
  ['foreign account owner', { owners: [{ permissionId: 'foreign-owner' }] }],
  ['missing account owner', { owners: [] }],
] as const) {
  test(`cached document ID with ${name} fails before either Docs mutation`, async () => {
    const h = harness(); await h.client.connect();
    const snapshot = input(60);
    assert.equal((await h.client.enqueue(snapshot)).status, 'synced');
    const writes = h.google.writes.length;
    const before = [...h.google.documents.values()].map(doc => doc.text);
    h.google.intercept = call => {
      if (call.url.pathname === '/drive/v3/files/doc-2') return response({ ...documentMetadata(h.google.documents.get('doc-2')!, h.google.accountId), ...changes });
    };
    const result = await h.client.enqueue({ ...snapshot, savedAt: input(10).savedAt });
    assert.equal(result.status, 'failed');
    assert.equal(h.google.writes.length, writes, 'Even the valid brief must not be updated when continuity verification fails');
    assert.deepEqual([...h.google.documents.values()].map(doc => doc.text), before);
    assert.equal(h.receipt().savedAt, snapshot.savedAt);
    assert.equal(h.google.creates.length, 2);
  });
}

test('a cached receipt sharing the same brief and continuity ID fails before Docs mutation', async () => {
  const h = harness(); await h.client.connect();
  const snapshot = input(60);
  assert.equal((await h.client.enqueue(snapshot)).status, 'synced');
  const key = [...h.values.keys()][0];
  h.values.set(key, JSON.stringify({ ...h.receipt(), continuityId: h.receipt().briefId }));
  const writes = h.google.writes.length;
  const result = await h.client.enqueue({ ...snapshot, savedAt: input(10).savedAt });
  assert.equal(result.status, 'failed');
  assert.equal(h.google.writes.length, writes);
  assert.equal(h.google.creates.length, 2);
});

test('search-adopted IDs undergo metadata verification before either Docs mutation', async () => {
  const h = harness(); await h.client.connect();
  const snapshot = input(60);
  assert.equal((await h.client.enqueue(snapshot)).status, 'synced');
  h.values.clear();
  const reads = h.google.metadataReads.length;
  const writes = h.google.writes.length;
  assert.equal((await h.client.enqueue({ ...snapshot, savedAt: input(30).savedAt })).status, 'synced');
  assert.equal(h.google.creates.length, 2, 'Existing app-marked Docs must be adopted');
  assert.deepEqual(h.google.metadataReads.slice(reads).map(call => call.url.pathname), ['/drive/v3/files/doc-1', '/drive/v3/files/doc-2']);
  assert.equal(h.google.writes.length, writes + 2);
  h.values.clear();
  h.google.intercept = call => {
    if (call.url.pathname === '/drive/v3/files/doc-2') return response({ ...documentMetadata(h.google.documents.get('doc-2')!, h.google.accountId), appProperties: { glamBackup: 'changed-after-search' } });
  };
  const rejected = await h.client.enqueue({ ...snapshot, savedAt: input(10).savedAt });
  assert.equal(rejected.status, 'failed');
  assert.equal(h.google.writes.length, writes + 2, 'Search results alone cannot authorize replacing document content');
  assert.equal(h.google.creates.length, 2);
});

test('just-created IDs are checked for the expected marker before either Docs mutation', async () => {
  const h = harness(); await h.client.connect();
  h.google.intercept = call => {
    if (call.url.pathname === '/drive/v3/files/doc-2') return response({ ...documentMetadata(h.google.documents.get('doc-2')!, h.google.accountId), appProperties: {} });
  };
  const result = await h.client.enqueue(input());
  assert.equal(result.status, 'failed');
  assert.equal(h.google.creates.length, 2);
  assert.equal(h.google.metadataReads.length, 2);
  assert.equal(h.google.writes.length, 0);
  assert.equal(h.receipt().savedAt, undefined);
  assert.equal(h.receipt().digest, undefined);
});

test('403 permission rejection clears the session and prevents queued old-credential requests', async () => {
  const h = harness(); await h.client.connect();
  const started = deferred<void>();
  const release = deferred<Response>();
  h.google.intercept = call => {
    if (call.url.pathname === '/drive/v3/files') { started.resolve(); return release.promise; }
  };
  const first = h.client.enqueue(input());
  await started.promise;
  const queued = h.client.enqueue({ ...input(), projectId: 'another-project' });
  await new Promise(resolve => setTimeout(resolve, 5));
  release.resolve(response({ error: { message: `Permission was revoked for ${ALICE_TOKEN}` } }, 403));
  const failed = await first;
  assert.equal(failed.status, 'failed');
  assert.match(failed.message, /reconnect Drive|connect Drive again/i);
  assert.match(failed.message, /access|permission|grant/i);
  assert.ok(['disconnected', 'superseded'].includes((await queued).status));
  assert.equal((await h.client.getStatus()).connected, false);
  assert.equal(h.google.fileCalls.length, 1);
  assert.equal((await h.client.enqueue(input())).status, 'disconnected');
  assert.equal(h.google.fileCalls.length, 1);
  assert.equal(h.authorizations, 1);
  assert.equal(JSON.stringify(h.views).includes(ALICE_TOKEN), false);
});

test('expiry while waiting for a Web Lock blocks all Google requests after lock release', async () => {
  const entered = deferred<void>();
  const release = deferred<void>();
  const h = harness({ withLock: async (_name, task) => { entered.resolve(); await release.promise; return task(); } });
  await h.client.connect();
  const pending = h.client.enqueue(input());
  await entered.promise;
  h.advance(50 * 60_000 + 1);
  release.resolve();
  const result = await pending;
  assert.notEqual(result.status, 'synced');
  assert.equal(h.google.fileCalls.length, 0);
  assert.equal((await h.client.getStatus()).connected, false);
  assert.ok(h.views.every(view => view.result?.status !== 'synced'));
  assert.equal(h.authorizations, 1);
});

for (const stage of ['metadata', 'document read', 'first document write', 'second document write'] as const) {
  test(`expiry between ${stage} request and response blocks further requests and synced results`, async () => {
    const h = harness(); await h.client.connect();
    const started = deferred<Call>();
    const release = deferred<Response>();
    const path = stage === 'metadata' ? '/drive/v3/files/doc-1'
      : stage === 'document read' ? '/v1/documents/doc-1'
      : stage === 'first document write' ? '/v1/documents/doc-1:batchUpdate'
      : '/v1/documents/doc-2:batchUpdate';
    h.google.intercept = call => {
      if (call.url.pathname === path) { started.resolve(call); return release.promise; }
    };
    const pending = h.client.enqueue(input());
    await started.promise;
    const callsAtExpiry = h.google.calls.length;
    h.advance(50 * 60_000 + 1);
    release.resolve(response(stage === 'metadata' ? documentMetadata(h.google.documents.get('doc-1')!, h.google.accountId)
      : stage === 'document read' ? { body: { content: [{ endIndex: 2 }] }, revisionId: 'revision-1' } : {}));
    const result = await pending;
    assert.notEqual(result.status, 'synced');
    assert.equal(h.google.calls.length, callsAtExpiry, 'Expired access must not authorize another API request');
    assert.equal(h.receipt().savedAt, undefined);
    assert.equal(h.receipt().digest, undefined);
    assert.equal((await h.client.getStatus()).connected, false);
    assert.ok(h.views.every(view => view.result?.status !== 'synced'));
    assert.equal(h.authorizations, 1);
  });
}

async function bundledFixture(entry: string, fixture: Record<string, unknown>, modules: Record<string, string>, env: Record<string, string> = {}) {
  const bundled = await build({
    entryPoints: [new URL(entry, import.meta.url).pathname], bundle: true, write: false, format: 'cjs', platform: 'browser',
    define: { 'import.meta.env': JSON.stringify(env) },
    plugins: [{ name: 'browser-drive-test-dependencies', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(modules, args.path) ? { path: args.path, namespace: 'fixture' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: modules[args.path] }));
    } }],
  });
  const module = { exports: {} as any };
  runInNewContext(bundled.outputFiles[0].text, {
    module, exports: module.exports, fixture, AbortController, URL, structuredClone, setTimeout, clearTimeout,
    fetch: () => { throw Error('No real or facade network request is allowed in this fixture'); },
  });
  return module.exports;
}

test('the actual browser-mode facade routes every operation to the per-user client, never server endpoints', async () => {
  const calls: string[] = [];
  const connected = { configured: true, connected: true, message: 'Fixture connected' };
  const result = { status: 'synced', message: 'Fixture synced' };
  const snapshot = input();
  const listener = () => {};
  const unsubscribe = () => {};
  const browserClient = {
    subscribe: (value: unknown) => { assert.equal(value, listener); calls.push('subscribe'); return unsubscribe; },
    cancel: () => { calls.push('cancel'); },
    getStatus: async () => { calls.push('status'); return connected; },
    connect: async () => { calls.push('connect'); },
    disconnect: async () => { calls.push('disconnect'); return connected; },
    enqueue: async (value: unknown) => { assert.equal(value, snapshot); calls.push('enqueue'); return result; },
  };
  const client = await bundledFixture('../src/utils/driveBackup.ts', { browserClient, auth: { currentUser: { uid: 'alice' } } }, {
    '../lib/firebase': 'export const auth = globalThis.fixture.auth; export const onAuthStateChanged = (_auth, listener) => { listener(auth.currentUser); return () => {}; };',
    './browserDriveClient': 'export const browserDriveClient = globalThis.fixture.browserClient;',
  }, { VITE_DRIVE_BACKUP_MODE: 'browser', VITE_DRIVE_BACKUP_DISABLED: 'true' });
  assert.equal(client.subscribeDriveBackup(listener), unsubscribe);
  assert.equal(await client.getDriveBackupStatus(), connected);
  await client.connectDriveBackup();
  assert.equal(await client.enqueueDriveBackup(snapshot), result);
  assert.equal(await client.disconnectDriveBackup(), connected);
  client.cancelPendingDriveBackups();
  assert.deepEqual(calls, ['subscribe', 'status', 'connect', 'enqueue', 'disconnect', 'cancel']);
});

async function authorizationFixture() {
  let dependencies!: BrowserDriveDependencies;
  let ownerChanges = 0;
  let authListener!: () => void;
  const providers: { scopes: string[]; parameters: Record<string, string> }[] = [];
  const popupUsers: unknown[] = [];
  const user = { uid: 'alice', email: 'alice@example.test', providerData: [{ providerId: 'google.com', email: 'alice@example.test' }] };
  const fixture = {
    auth: { currentUser: user },
    result: { user, credential: { accessToken: ALICE_TOKEN, refreshToken: 'must-not-return-this' } },
    popupError: undefined as unknown,
    GoogleAuthProvider: class {
      scopes: string[] = [];
      parameters: Record<string, string> = {};
      constructor() { providers.push(this); }
      addScope(scope: string) { this.scopes.push(scope); }
      setCustomParameters(parameters: Record<string, string>) { this.parameters = parameters; }
      static credentialFromResult(result: any) { return result.credential; }
    },
    reauthenticateWithPopup: async (selected: unknown) => { popupUsers.push(selected); if (fixture.popupError) throw fixture.popupError; return fixture.result; },
    onAuthStateChanged: (_auth: unknown, listener: () => void) => { authListener = listener; listener(); },
    createBrowserDriveBackup: (received: BrowserDriveDependencies) => { dependencies = received; return { ownerChanged: () => { ownerChanges++; } }; },
  };
  await bundledFixture('../src/utils/browserDriveClient.ts', fixture, {
    'firebase/auth': 'export const { GoogleAuthProvider, reauthenticateWithPopup } = globalThis.fixture;',
    '../lib/firebase': 'export const { auth, onAuthStateChanged } = globalThis.fixture;',
    './browserDriveBackup': 'export const { createBrowserDriveBackup } = globalThis.fixture;',
  });
  return { fixture, providers, popupUsers, dependencies, fireAuthChange: () => authListener(), get ownerChanges() { return ownerChanges; } };
}

test('the actual Firebase browser adapter reauthenticates the current user using only drive.file', async () => {
  const h = await authorizationFixture();
  assert.equal(h.dependencies.uid(), 'alice');
  assert.equal(h.popupUsers.length, 0);
  const grant = await h.dependencies.authorize();
  assert.equal(h.popupUsers[0], h.fixture.auth.currentUser);
  assert.deepEqual(h.providers[0].scopes, ['https://www.googleapis.com/auth/drive.file']);
  assert.equal(h.providers[0].parameters.prompt, 'select_account');
  assert.equal(h.providers[0].parameters.login_hint, 'alice@example.test');
  assert.equal(grant.uid, 'alice');
  assert.equal(grant.accessToken, ALICE_TOKEN);
  assert.equal(grant.email, 'alice@example.test');
  assert.equal(Object.hasOwn(grant, 'refreshToken'), false);
  h.fireAuthChange();
  assert.equal(h.ownerChanges, 2);
});

test('the actual Firebase browser adapter rejects changed users and sanitizes popup/provider failures', async () => {
  const h = await authorizationFixture();
  h.fixture.result = { ...h.fixture.result, user: { ...h.fixture.result.user, uid: 'bob' } };
  await assert.rejects(h.dependencies.authorize(), /Google Drive connection was not completed/);
  for (const [code, message] of [
    ['auth/user-mismatch', /same Google account/],
    ['auth/popup-blocked', /blocked Google/],
    ['auth/popup-closed-by-user', /cancelled/],
    ['auth/cancelled-popup-request', /cancelled/],
    ['auth/internal-error', /was not completed/],
  ] as const) {
    h.fixture.popupError = { code, message: ALICE_TOKEN, credential: { accessToken: ALICE_TOKEN } };
    await assert.rejects(h.dependencies.authorize(), error => {
      assert.match(String(error), message);
      assert.equal(String(error).includes(ALICE_TOKEN), false);
      return true;
    });
  }
});
