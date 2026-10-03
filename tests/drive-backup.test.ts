import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { readDriveConfig, createDriveBackupRouter, driveAuthorizationUrl, equalOpaque } from '../server/driveBackup';
import { EncryptedDriveStore } from '../server/driveStore';
import { verifyFirebaseClaims } from '../server/driveFirebase';
import { validateDriveBackup, renderDriveDocuments } from '../server/driveContent';
import { createGoogleDriveService } from '../server/driveGoogle';
import { normalizeStudioState } from '../src/utils/studioAdapter';
import { DRIVE_FILE_SCOPE } from '../src/utils/driveBackupTypes';

const input = (seconds = 10) => ({ projectId: 'project-1', title: 'A private story', savedAt: new Date(Date.now() - seconds * 1000).toISOString(), state: normalizeStudioState({ storyIdea: 'A florist repairs a broken friendship.', optionalDetails: { continuityNotes: 'The red vase remains cracked.', scene1Beat: 'The vase breaks.' } }) });
const configEnv = (directory: string): NodeJS.ProcessEnv => ({ DRIVE_BACKUP_ENABLED: 'true', DRIVE_BACKUP_SINGLE_INSTANCE: 'true', DRIVE_BACKUP_ORIGIN: 'https://studio.example.com', GOOGLE_DRIVE_CLIENT_ID: 'test.apps.googleusercontent.com', GOOGLE_DRIVE_CLIENT_SECRET: 'test-secret-not-real', DRIVE_BACKUP_FIREBASE_PROJECT_ID: 'glam-skill-studio', DRIVE_BACKUP_STORE_DIR: directory, DRIVE_BACKUP_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString('base64') });
async function temporary<T>(run: (directory: string) => Promise<T>) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'glam-drive-test-'));
  try { return await run(directory); } finally { await fs.rm(directory, { recursive: true, force: true }); }
}
async function withRouter<T>(options: Parameters<typeof createDriveBackupRouter>[0], run: (url: string) => Promise<T>) {
  const app = express();
  app.use('/api/drive', await createDriveBackupRouter(options));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address() as { port: number };
  try { return await run(`http://127.0.0.1:${address.port}/api/drive`); }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
const noFetch = (async () => { throw Error('External network must not run in this test.'); }) as typeof fetch;

test('configuration fails closed without explicit complete secure settings', () => {
  assert.equal(readDriveConfig({}), null);
  const env = configEnv('/tmp/glam-drive-test-store');
  assert.ok(readDriveConfig(env));
  for (const changed of [{ DRIVE_BACKUP_ENABLED: 'false' }, { DRIVE_BACKUP_SINGLE_INSTANCE: 'false' }, { DRIVE_BACKUP_ORIGIN: 'http://studio.example.com' }, { DRIVE_BACKUP_ORIGIN: 'https://studio.example.com/path' }, { DRIVE_BACKUP_STORE_DIR: path.join(process.cwd(), 'dist', 'tokens') }, { DRIVE_BACKUP_ENCRYPTION_KEY: 'invalid' }, { GOOGLE_DRIVE_CLIENT_SECRET: '' }]) assert.equal(readDriveConfig({ ...env, ...changed }), null);
});

test('disabled routes neither fetch externally nor create a store or success', async () => {
  await withRouter({ env: {}, fetcher: noFetch }, async url => {
    const status = await fetch(`${url}/status`);
    assert.deepEqual((await status.json()).configured, false);
    for (const route of ['connect', 'disconnect', 'backup']) {
      const response = await fetch(`${url}/${route}`, { method: 'POST' });
      assert.equal(response.status, 503);
      assert.equal((await response.json()).status, 'not-configured');
    }
  });
});

test('store enforces owner separation, encryption, integrity and exclusive initialization', async () => temporary(async directory => {
  const store = new EncryptedDriveStore(directory, randomBytes(32));
  await store.initialize();
  await store.write('alice', { refreshToken: 'private-alice-token', projects: { project: { briefId: 'aliceDoc' } } });
  await store.write('bob', { refreshToken: 'private-bob-token', projects: {} });
  assert.equal((await store.read('alice')).refreshToken, 'private-alice-token');
  assert.equal((await store.read('bob')).refreshToken, 'private-bob-token');
  assert.deepEqual(await store.read('carol'), { projects: {} });
  const files = (await fs.readdir(directory)).filter(file => file.endsWith('.enc'));
  const bytes = await fs.readFile(path.join(directory, files[0]));
  assert.equal(bytes.toString().includes('private-'), false);
  for (const file of files) { const bytes = await fs.readFile(path.join(directory, file)); bytes[bytes.length - 1] ^= 1; await fs.writeFile(path.join(directory, file), bytes); }
  await assert.rejects(store.read('alice'));
  await assert.rejects(new EncryptedDriveStore(directory, randomBytes(32)).initialize());
}));

test('failed lock or unsafe permission init leaves router disabled', async () => temporary(async directory => {
  await fs.writeFile(path.join(directory, '.single-instance.lock'), 'another-process');
  await withRouter({ env: configEnv(directory), fetcher: noFetch }, async url => assert.equal((await (await fetch(`${url}/status`)).json()).configured, false));
}));

test('canonical storage check rejects an ancestor symlink into app root', async () => temporary(async directory => {
  const inside = await fs.mkdtemp(path.join(process.cwd(), '.drive-symlink-test-'));
  try {
    await fs.symlink(process.cwd(), path.join(directory, 'alias'));
    const alias = path.join(directory, 'alias', path.basename(inside));
    await assert.rejects(new EncryptedDriveStore(alias, randomBytes(32)).initialize());
  } finally { await fs.rm(inside, { recursive: true, force: true }); }
}));

test('Firebase verifier rejects wrong audience, issuer, expiry, alg, signature and future auth', () => {
  const key = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const certs = { testkey: key.publicKey.export({ type: 'spki', format: 'pem' }).toString() };
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub: 'alice', aud: 'glam-skill-studio', iss: 'https://securetoken.google.com/glam-skill-studio', iat: now - 10, exp: now + 3600, auth_time: now - 20 };
  const token = (changes = {}, header = {}) => {
    const encoded = [JSON.stringify({ alg: 'RS256', kid: 'testkey', ...header }), JSON.stringify({ ...claims, ...changes })].map(value => Buffer.from(value).toString('base64url')).join('.');
    return `${encoded}.${sign('RSA-SHA256', Buffer.from(encoded), key.privateKey).toString('base64url')}`;
  };
  assert.equal(verifyFirebaseClaims(token(), 'glam-skill-studio', certs), 'alice');
  for (const changes of [{ aud: 'other-project' }, { iss: 'https://evil.test' }, { exp: now - 1 }, { iat: now + 100 }, { auth_time: now + 100 }, { sub: '' }]) assert.throws(() => verifyFirebaseClaims(token(changes), 'glam-skill-studio', certs));
  assert.throws(() => verifyFirebaseClaims(token({}, { alg: 'none' }), 'glam-skill-studio', certs));
  assert.throws(() => verifyFirebaseClaims(`${token().slice(0, -12)}notasignature`, 'glam-skill-studio', certs));
});

test('OAuth only requests drive.file, with PKCE and pinned callback', () => {
  const config = readDriveConfig(configEnv('/tmp/example'))!;
  const url = new URL(driveAuthorizationUrl(config, 'state', 'verifier'));
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.searchParams.get('scope'), DRIVE_FILE_SCOPE);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://studio.example.com/api/drive/callback');
  assert.equal(equalOpaque('abc', 'äbc'), false);
  assert.equal(equalOpaque('abc', 'abc'), true);
});

test('enabled routes reject forged origin, missing CSRF, different owner, replay and invalid state', async () => temporary(async directory => {
  await withRouter({ env: configEnv(directory), fetcher: noFetch, verifyIdentity: async value => { if (!value?.startsWith('Bearer ')) throw Error('no identity'); return value.slice(7); } }, async url => {
    const response = await fetch(`${url}/status`, { headers: { Authorization: 'Bearer alice' } });
    const status = await response.json();
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    assert.match(response.headers.get('set-cookie')!, /HttpOnly/);
    assert.match(response.headers.get('set-cookie')!, /Secure/);
    const headers = { Authorization: 'Bearer alice', Cookie: cookie, Origin: 'https://studio.example.com', 'X-Drive-CSRF': status.csrfToken, 'Content-Type': 'application/json' };
    for (const change of [{ Origin: 'https://evil.test' }, { 'X-Drive-CSRF': '' }, { Authorization: 'Bearer bob' }]) assert.equal((await fetch(`${url}/connect`, { method: 'POST', headers: { ...headers, ...change }, body: '{}' })).status, 403);
    const connect = await fetch(`${url}/connect`, { method: 'POST', headers, body: '{}' });
    assert.equal(connect.status, 200);
    const authorization = new URL((await connect.json()).authorizationUrl);
    const state = authorization.searchParams.get('state');
    assert.equal((await fetch(`${url}/callback?state=invalid&code=bogus`, { headers: { Cookie: cookie }, redirect: 'manual' })).status, 400);
    const cancelled = await fetch(`${url}/callback?state=${state}&error=access_denied`, { headers: { Cookie: cookie }, redirect: 'manual' });
    assert.equal(cancelled.status, 303);
    assert.match(cancelled.headers.get('location')!, /drive=cancelled$/);
    assert.equal((await fetch(`${url}/callback?state=${state}&code=bogus`, { headers: { Cookie: cookie }, redirect: 'manual' })).status, 400);
  });
}));

test('payload parser rejects unsafe IDs, unknown fields, impossible dates and invalid state', () => {
  assert.equal(validateDriveBackup(input()).projectId, 'project-1');
  for (const projectId of ['../escape', '__proto__', 'constructor', 'prototype', 'a/b']) assert.throws(() => validateDriveBackup({ ...input(), projectId }));
  assert.throws(() => validateDriveBackup({ ...input(), owner: 'someone-else' }));
  assert.throws(() => validateDriveBackup({ ...input(), savedAt: '2026-02-31T00:00:00.000Z' }));
  assert.throws(() => validateDriveBackup({ ...input(), state: { garbage: true } }));
  const docs = renderDriveDocuments(validateDriveBackup(input()));
  assert.match(docs.brief, /florist repairs/);
  assert.match(docs.continuity, /red vase remains cracked/);
  assert.match(docs.continuity, /SCENE 1/);
});

function mockGoogle() {
  let creates = 0, writes = 0, failCreate = false, failWrite = false, rejectCreate = false;
  const documents = new Map<string, { id: string; marker: string }>();
  const fetcher = (async (urlInput: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(urlInput));
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
    if (url.hostname === 'oauth2.googleapis.com') return response({ access_token: 'mock-access-token' });
    if (url.pathname === '/drive/v3/files' && init?.method === 'POST') {
      creates++;
      if (failCreate) throw Error('Ambiguous network failure');
      if (rejectCreate) return response({}, 403);
      const id = `doc${creates}`;
      documents.set(id, { id, marker: body.appProperties.glamBackup });
      return response({ id });
    }
    if (url.pathname === '/drive/v3/files') return response({ files: [...documents.values()].filter(item => url.searchParams.get('q')?.includes(item.marker)).map(({ id }) => ({ id })) });
    if (url.pathname.endsWith(':batchUpdate')) { writes++; return response({}, failWrite ? 500 : 200); }
    if (url.hostname === 'docs.googleapis.com') return response({ body: { content: [{ endIndex: 2 }] }, revisionId: 'revision-1' });
    throw Error('Unexpected Google call');
  }) as typeof fetch;
  return { fetcher, get creates() { return creates; }, get writes() { return writes; }, failCreate: () => { failCreate = true; }, rejectCreate: () => { rejectCreate = true; }, failWrite: () => { failWrite = true; } };
}

test('backups upsert two docs, dedupe retries, preserve save watermark and isolate owners', async () => temporary(async directory => {
  const store = new EncryptedDriveStore(directory, randomBytes(32)); await store.initialize();
  await store.write('alice', { refreshToken: 'alice-refresh', projects: {} });
  await store.write('bob', { refreshToken: 'bob-refresh', projects: {} });
  const google = mockGoogle();
  const service = createGoogleDriveService(readDriveConfig(configEnv(directory))!, store, google.fetcher);
  const first = input(30);
  assert.equal((await service.backup('alice', first)).status, 'synced');
  assert.equal(google.creates, 2); assert.equal(google.writes, 2);
  assert.equal((await service.backup('alice', first)).status, 'synced'); assert.equal(google.writes, 2);
  const third = { ...first, savedAt: input(10).savedAt };
  await service.backup('alice', third);
  assert.equal(google.creates, 2);
  assert.equal((await store.read('alice')).projects['project-1'].savedAt, third.savedAt);
  assert.equal((await service.backup('alice', { ...first, savedAt: input(20).savedAt, title: 'Older second edit' })).status, 'superseded');
  const bob = await service.backup('bob', first);
  assert.equal(google.creates, 4);
  assert.notEqual(bob.briefUrl, (await service.backup('alice', third)).briefUrl);
}));

test('ambiguous native-Doc creation is journaled and never automatically repeated', async () => temporary(async directory => {
  const store = new EncryptedDriveStore(directory, randomBytes(32)); await store.initialize();
  await store.write('alice', { refreshToken: 'alice-refresh', projects: {} });
  const google = mockGoogle(); google.failCreate();
  const service = createGoogleDriveService(readDriveConfig(configEnv(directory))!, store, google.fetcher);
  await assert.rejects(service.backup('alice', input()));
  await assert.rejects(service.backup('alice', input()), /unconfirmed/);
  assert.equal(google.creates, 1);
  assert.equal((await store.read('alice')).projects['project-1'].briefPending, true);
  assert.equal((await store.read('alice')).projects['project-1'].savedAt, undefined);
}));

test('failed Google write never marks the pair synced', async () => temporary(async directory => {
  const store = new EncryptedDriveStore(directory, randomBytes(32)); await store.initialize();
  await store.write('alice', { refreshToken: 'alice-refresh', projects: {} });
  const google = mockGoogle(); google.failWrite();
  const service = createGoogleDriveService(readDriveConfig(configEnv(directory))!, store, google.fetcher);
  await assert.rejects(service.backup('alice', input()));
  assert.equal((await store.read('alice')).projects['project-1'].savedAt, undefined);
  assert.equal((await store.read('alice')).projects['project-1'].digest, undefined);
}));


test('definitive Google create rejection allows a future explicit retry', async () => temporary(async directory => {
  const store = new EncryptedDriveStore(directory, randomBytes(32)); await store.initialize();
  await store.write('alice', { refreshToken: 'alice-refresh', projects: {} });
  const google = mockGoogle(); google.rejectCreate();
  const service = createGoogleDriveService(readDriveConfig(configEnv(directory))!, store, google.fetcher);
  await assert.rejects(service.backup('alice', input()));
  assert.equal((await store.read('alice')).projects['project-1'].briefPending, false);
  await assert.rejects(service.backup('alice', input()));
  assert.equal(google.creates, 2);
}));

test('a partial newer write invalidates old receipts and blocks delayed older tabs', async () => temporary(async directory => {
  const store = new EncryptedDriveStore(directory, randomBytes(32)); await store.initialize();
  await store.write('alice', { refreshToken: 'alice-refresh', projects: {} });
  const google = mockGoogle();
  const service = createGoogleDriveService(readDriveConfig(configEnv(directory))!, store, google.fetcher);
  const old = input(30);
  await service.backup('alice', old);
  google.failWrite();
  const latest = { ...old, savedAt: input(10).savedAt, title: 'Newer content' };
  await assert.rejects(service.backup('alice', latest));
  const record = (await store.read('alice')).projects['project-1'];
  assert.equal(record.digest, undefined);
  assert.equal(record.attemptedAt, latest.savedAt);
  assert.equal((await service.backup('alice', old)).status, 'superseded');
}));

test('OAuth reconnect clears mappings for a different Drive account and Disconnect removes tokens', async () => temporary(async directory => {
  let account = 'drive-account-a';
  let revocations = 0;
  const fetcher = (async (url: string | URL | Request) => {
    if (String(url) === 'https://oauth2.googleapis.com/token') return new Response(JSON.stringify({ access_token: 'mock-access', refresh_token: `refresh-${account}`, scope: DRIVE_FILE_SCOPE }));
    if (String(url).startsWith('https://www.googleapis.com/drive/v3/about')) return new Response(JSON.stringify({ user: { permissionId: account } }));
    if (String(url) === 'https://oauth2.googleapis.com/revoke') { revocations++; return new Response(''); }
    throw Error('Unexpected external request');
  }) as typeof fetch;
  const env = configEnv(directory);
  await withRouter({ env, fetcher, verifyIdentity: async () => 'alice' }, async url => {
    const response = await fetch(`${url}/status`, { headers: { Authorization: 'Bearer alice' } });
    const status = await response.json();
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    const headers = { Authorization: 'Bearer alice', Cookie: cookie, Origin: 'https://studio.example.com', 'X-Drive-CSRF': status.csrfToken, 'Content-Type': 'application/json' };
    const connect = async () => {
      const started = await fetch(`${url}/connect`, { method: 'POST', headers, body: '{}' });
      const state = new URL((await started.json()).authorizationUrl).searchParams.get('state');
      const callback = await fetch(`${url}/callback?state=${state}&code=mock-code`, { headers: { Cookie: cookie }, redirect: 'manual' });
      assert.equal(callback.status, 303);
      assert.match(callback.headers.get('location')!, /drive=connected$/);
    };
    const inspector = new EncryptedDriveStore(directory, Buffer.alloc(32, 3));
    await connect();
    const first = await inspector.read('alice');
    assert.equal(first.accountId, 'drive-account-a');
    first.projects['project-1'] = { briefId: 'previous-account-doc' };
    await inspector.write('alice', first);
    account = 'drive-account-b';
    await connect();
    const second = await inspector.read('alice');
    assert.equal(second.accountId, 'drive-account-b');
    assert.deepEqual(second.projects, {});
    const disconnected = await fetch(`${url}/disconnect`, { method: 'POST', headers, body: '{}' });
    assert.equal((await disconnected.json()).connected, false);
    assert.equal((await inspector.read('alice')).refreshToken, undefined);
    assert.equal(revocations, 1);
  });
}));


test('Object.prototype-named project IDs are own receipts and cannot leak across owners', async () => temporary(async directory => {
  const store = new EncryptedDriveStore(directory, randomBytes(32)); await store.initialize();
  await store.write('alice', { refreshToken: 'alice-refresh', projects: {} });
  await store.write('bob', { refreshToken: 'bob-refresh', projects: {} });
  const google = mockGoogle();
  const service = createGoogleDriveService(readDriveConfig(configEnv(directory))!, store, google.fetcher);
  for (const projectId of ['toString', 'valueOf', 'hasOwnProperty']) {
    const snapshot = validateDriveBackup({ ...input(), projectId });
    const alice = await service.backup('alice', snapshot);
    const bob = await service.backup('bob', snapshot);
    assert.equal(alice.status, 'synced');
    assert.equal(bob.status, 'synced');
    assert.notEqual(alice.briefUrl, bob.briefUrl);
    assert.notEqual(alice.continuityUrl, bob.continuityUrl);
    assert.equal(Object.hasOwn((await store.read('alice')).projects, projectId), true);
    assert.equal(Object.hasOwn((await store.read('bob')).projects, projectId), true);
  }
  assert.equal(google.creates, 12);
  assert.equal(Object.hasOwn(Object.prototype.toString, 'digest'), false);
}));


test('Disconnect invalidates a queued/in-flight OAuth callback even when revocation fails', async () => temporary(async directory => {
  let startExchange!: () => void;
  const exchangeStarted = new Promise<void>(resolve => { startExchange = resolve; });
  let releaseExchange!: () => void;
  const exchangeGate = new Promise<void>(resolve => { releaseExchange = resolve; });
  let admitDisconnect!: () => void;
  const disconnectAdmitted = new Promise<void>(resolve => { admitDisconnect = resolve; });
  let exchangeCount = 0;
  const fetcher = (async (url: string | URL | Request) => {
    if (String(url) === 'https://oauth2.googleapis.com/token') {
      exchangeCount++; startExchange(); await exchangeGate;
      return new Response(JSON.stringify({ access_token: 'mock-access', refresh_token: 'cancelled-grant', scope: DRIVE_FILE_SCOPE }));
    }
    if (String(url).includes('/drive/v3/about')) return new Response(JSON.stringify({ user: { permissionId: 'drive-account-a' } }));
    if (String(url) === 'https://oauth2.googleapis.com/revoke') return new Response('', { status: 500 });
    throw Error('Unexpected request');
  }) as typeof fetch;
  await withRouter({ env: configEnv(directory), fetcher, verifyIdentity: async authorization => {
    if (authorization === 'Bearer disconnect') setImmediate(admitDisconnect);
    return 'alice';
  } }, async url => {
    const response = await fetch(`${url}/status`, { headers: { Authorization: 'Bearer alice' } });
    const status = await response.json();
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    const headers = { Authorization: 'Bearer alice', Cookie: cookie, Origin: 'https://studio.example.com', 'X-Drive-CSRF': status.csrfToken, 'Content-Type': 'application/json' };
    const started = await fetch(`${url}/connect`, { method: 'POST', headers, body: '{}' });
    const state = new URL((await started.json()).authorizationUrl).searchParams.get('state');
    const callback = fetch(`${url}/callback?state=${state}&code=mock-code`, { headers: { Cookie: cookie }, redirect: 'manual' });
    await exchangeStarted;
    const disconnect = fetch(`${url}/disconnect`, { method: 'POST', headers: { ...headers, Authorization: 'Bearer disconnect' }, body: '{}' });
    await disconnectAdmitted;
    assert.equal((await fetch(`${url}/callback?state=${state}&code=mock-code`, { headers: { Cookie: cookie }, redirect: 'manual' })).status, 400);
    releaseExchange();
    assert.match((await callback).headers.get('location')!, /drive=failed$/);
    const disconnected = await (await disconnect).json();
    assert.equal(disconnected.connected, false);
    assert.match(disconnected.message, /did not confirm revocation/);
    const final = await (await fetch(`${url}/status`, { headers })).json();
    assert.equal(final.connected, false);
    assert.equal(exchangeCount, 1);
    const inspector = new EncryptedDriveStore(directory, Buffer.alloc(32, 3));
    assert.equal((await inspector.read('alice')).refreshToken, undefined);
  });
}));
