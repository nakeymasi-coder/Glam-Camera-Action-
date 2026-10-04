import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import type { DriveBackupView } from '../src/utils/driveBackup';
import { normalizeStudioState } from '../src/utils/studioAdapter';

type DriveClient = typeof import('../src/utils/driveBackup');
type FixtureUser = { uid: string; getIdToken: () => Promise<string> } | null;
const savedInput = () => ({ projectId: 'static-host-test', title: 'Saved project', savedAt: new Date().toISOString(), state: normalizeStudioState({ storyIdea: 'A florist repairs a broken friendship.' }) });

// Bundle the actual client module with a build-time flag and an isolated Firebase
// fixture. No Firebase service, browser storage, or external network is touched.
async function clientFixture(disabled: boolean | undefined, signedIn: boolean) {
  const calls = { tokens: 0, timers: 0, redirects: [] as string[], requests: [] as { url: string; init: RequestInit }[] };
  const user = { uid: 'fixture-owner', getIdToken: async () => { calls.tokens++; return 'fixture-id-token'; } };
  const auth: { currentUser: FixtureUser } = { currentUser: signedIn ? user : null };
  let authListener: (user: FixtureUser) => void = () => {};
  const bundled = await build({
    entryPoints: ['src/utils/driveBackup.ts'], bundle: true, write: false, format: 'cjs', platform: 'browser',
    define: { 'import.meta.env.VITE_DRIVE_BACKUP_DISABLED': disabled === undefined ? 'undefined' : JSON.stringify(String(disabled)), 'import.meta.env.VITE_DRIVE_BACKUP_MODE': 'undefined' },
    plugins: [{ name: 'fixture-firebase', setup(builder) {
      builder.onResolve({ filter: /^\.\.\/lib\/firebase$/ }, () => ({ path: 'firebase', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const auth = globalThis.fixture.auth; export const onAuthStateChanged = globalThis.fixture.onAuthStateChanged;' }));
    } }],
  });
  const module = { exports: {} as DriveClient };
  runInNewContext(bundled.outputFiles[0].text, {
    module, exports: module.exports, AbortController, URL, structuredClone, clearTimeout,
    setTimeout: (...args: Parameters<typeof setTimeout>) => { calls.timers++; return setTimeout(...args); },
    fixture: { auth, onAuthStateChanged: (_auth: unknown, listener: typeof authListener) => { authListener = listener; listener(auth.currentUser); return () => {}; } },
    window: { location: { assign: (url: string) => { calls.redirects.push(url); } } },
    fetch: async (url: string, init: RequestInit) => {
      calls.requests.push({ url, init });
      if (disabled) throw Error('A static build must never call a Drive endpoint.');
      const body = url.endsWith('/connect') ? { authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=fixture' }
        : url.endsWith('/backup') ? { status: 'synced', message: 'Fixture backup confirmed.', briefUrl: 'https://docs.google.com/document/d/fixture-brief' }
        : { configured: true, connected: !url.endsWith('/disconnect'), message: 'Fixture Drive status.', csrfToken: 'fixture-csrf' };
      return new Response(JSON.stringify(body));
    },
  });
  return {
    client: module.exports, calls,
    setSignedIn(value: boolean) { auth.currentUser = value ? user : null; authListener(auth.currentUser); },
  };
}

for (const signedIn of [false, true]) {
  test(`explicit disabled fallback stays unavailable with zero external operations (${signedIn ? 'signed in' : 'signed out'})`, async () => {
    const { client, calls, setSignedIn } = await clientFixture(true, signedIn);
    const views: DriveBackupView[] = [];
    const unsubscribe = client.subscribeDriveBackup(view => views.push(view));
    assert.equal(views[0].status?.configured, false);
    assert.equal(views[0].status?.connected, false);
    assert.match(views[0].status!.message, /Base44-hosted.*pending.*local saves still work/);
    const status = await client.getDriveBackupStatus();
    assert.equal(status.configured, false);
    assert.equal(status.connected, false);
    await assert.rejects(client.connectDriveBackup(), /unavailable.*pending/);
    const input = savedInput();
    const before = JSON.stringify(input);
    const result = await client.enqueueDriveBackup(input);
    assert.equal(result.status, 'not-configured');
    assert.equal(JSON.stringify(input), before);
    assert.equal(views.at(-1)?.result?.status, 'not-configured');
    assert.equal((await client.disconnectDriveBackup()).connected, false);
    // Signing in/out and repeated status/Save actions must not lift the host gate.
    setSignedIn(!signedIn);
    assert.equal(views.at(-1)?.status?.configured, false);
    assert.equal((await client.getDriveBackupStatus()).connected, false);
    assert.equal((await client.enqueueDriveBackup(savedInput())).status, 'not-configured');
    await assert.rejects(client.connectDriveBackup(), /unavailable.*pending/);
    client.cancelPendingDriveBackups();
    assert.ok(views.every(view => !view.busy && !view.status?.connected && view.result?.status !== 'synced'));
    assert.deepEqual(calls, { tokens: 0, timers: 0, redirects: [], requests: [] });
    unsubscribe();
  });
}

test('ordinary server build still calls authenticated Drive status/connect/backup/disconnect', async () => {
  const { client, calls } = await clientFixture(undefined, true);
  assert.equal((await client.getDriveBackupStatus()).connected, true);
  await client.connectDriveBackup();
  const result = await client.enqueueDriveBackup(savedInput());
  assert.equal(result.status, 'synced');
  assert.equal((await client.disconnectDriveBackup()).connected, false);
  assert.deepEqual(calls.requests.map(request => request.url), [
    '/api/drive/status', '/api/drive/status', '/api/drive/connect',
    '/api/drive/status', '/api/drive/backup', '/api/drive/status', '/api/drive/disconnect',
  ]);
  assert.equal(calls.tokens, 7);
  assert.equal(calls.redirects[0], 'https://accounts.google.com/o/oauth2/v2/auth?state=fixture');
  for (const request of calls.requests) {
    assert.equal((request.init.headers as Record<string, string>).Authorization, 'Bearer fixture-id-token');
    if (request.init.method === 'POST') assert.equal((request.init.headers as Record<string, string>)['X-Drive-CSRF'], 'fixture-csrf');
  }
});

test('ordinary signed-out behavior is retained when the flag is false', async () => {
  const { client, calls } = await clientFixture(false, false);
  await client.getDriveBackupStatus();
  await assert.rejects(client.connectDriveBackup(), /Sign in with Google first/);
  assert.equal((await client.enqueueDriveBackup(savedInput())).status, 'disconnected');
  assert.deepEqual(calls.requests.map(request => request.url), ['/api/drive/status']);
  assert.equal(calls.tokens, 0);
  assert.equal(calls.redirects.length, 0);
});

test('Base44 build is frontend-only and the normal build retains the Express bundle', async () => {
  const { scripts } = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(scripts['build:base44'], 'VITE_DRIVE_BACKUP_DISABLED=true VITE_DRIVE_BACKUP_MODE=browser vite build --outDir dist-base44');
  assert.match(scripts.build, /vite build && esbuild server\.ts/);
});

test('browser mode routes every operation to the per-user client without Express requests', async () => {
  const calls: string[] = [];
  const fakeStatus = { configured: true, connected: false, message: 'Connect your own account.' };
  const browserDriveClient = {
    subscribe(listener: (view: unknown) => void) { calls.push('subscribe'); listener({ status: fakeStatus, result: null, busy: false }); return () => {}; },
    getStatus: async () => { calls.push('status'); return fakeStatus; },
    connect: async () => { calls.push('connect'); },
    disconnect: async () => { calls.push('disconnect'); return fakeStatus; },
    enqueue: async () => { calls.push('enqueue'); return { status: 'disconnected', message: 'Connect first.' }; },
    cancel: () => { calls.push('cancel'); },
  };
  const bundled = await build({ entryPoints: ['src/utils/driveBackup.ts'], bundle: true, write: false, format: 'cjs', platform: 'browser',
    define: { 'import.meta.env.VITE_DRIVE_BACKUP_DISABLED': 'true', 'import.meta.env.VITE_DRIVE_BACKUP_MODE': '"browser"' },
    plugins: [{ name: 'browser-client-fixture', setup(builder) {
      builder.onResolve({ filter: /^\.\.\/lib\/firebase$/ }, () => ({ path: 'firebase', namespace: 'fixture' }));
      builder.onResolve({ filter: /^\.\/browserDriveClient$/ }, () => ({ path: 'browser', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'firebase' ? 'export const auth = { currentUser: null }; export const onAuthStateChanged = () => () => {};' : 'export const browserDriveClient = globalThis.browserClient;' }));
    } }],
  });
  const module = { exports: {} as DriveClient };
  runInNewContext(bundled.outputFiles[0].text, { module, exports: module.exports, browserClient: browserDriveClient, fetch: () => { throw Error('No Express or Google calls in routing fixture.'); } });
  const client = module.exports;
  client.subscribeDriveBackup(() => {});
  assert.equal((await client.getDriveBackupStatus()).configured, true);
  await client.connectDriveBackup();
  assert.equal((await client.enqueueDriveBackup(savedInput())).status, 'disconnected');
  await client.disconnectDriveBackup();
  client.cancelPendingDriveBackups();
  assert.deepEqual(calls, ['subscribe', 'status', 'connect', 'enqueue', 'disconnect', 'cancel']);
});
