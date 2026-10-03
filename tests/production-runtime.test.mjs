import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtemp, copyFile, symlink, rm, readFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const outboundGuard = fileURLToPath(new URL('./helpers/no-outbound.mjs', import.meta.url));
async function unusedPort() {
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  return port;
}
function launch(cwd, port) {
  // Deliberately omit all inherited secrets, provider keys, and optional Drive settings.
  const child = spawn(process.execPath, ['--import', outboundGuard, 'server.js'], {
    cwd, env: { PATH: process.env.PATH, NODE_ENV: 'production', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  return { child, output: () => output };
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  await exited;
}

test('Compiled production server starts without keys and serves only local planning + disabled Drive', { timeout: 15000 }, async t => {
  const port = await unusedPort();
  const process = launch(root, port);
  t.after(() => stop(process.child));
  const origin = `http://127.0.0.1:${port}`;
  let healthy = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (process.child.exitCode !== null) break;
    try { healthy = (await fetch(`${origin}/healthz`)).ok; if (healthy) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 75));
  }
  assert.ok(healthy, process.output());
  const health = await fetch(`${origin}/healthz`);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const home = await fetch(origin);
  assert.equal(home.status, 200);
  const html = await home.text();
  const asset = html.match(/src="([^\"]+\.js)"/)?.[1];
  assert.ok(asset, 'Production HTML includes built JavaScript');
  const javascript = await fetch(new URL(asset, origin));
  assert.equal(javascript.status, 200);
  assert.match(javascript.headers.get('content-type'), /javascript/);
  const deepLink = await fetch(`${origin}/projects/continuity-review`);
  assert.equal(deepLink.status, 200);
  assert.equal(await deepLink.text(), html);
  const status = await fetch(`${origin}/api/drive/status`);
  assert.equal(status.status, 200);
  const drive = await status.json();
  assert.equal(drive.configured, false);
  assert.equal(drive.connected, false);
  for (const endpoint of ['connect', 'backup', 'disconnect']) {
    const response = await fetch(`${origin}/api/drive/${endpoint}`, { method: 'POST' });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).status, 'not-configured');
  }
  for (const endpoint of ['image', 'chat', 'search', 'music', 'speech', 'video-start', 'video-status', 'video-download']) {
    for (const method of ['GET', 'POST']) {
      const response = await fetch(`${origin}/api/gemini/${endpoint}`, { method });
      assert.equal(response.status, 404, `${method} ${endpoint}`);
      assert.match(response.headers.get('content-type'), /json/);
    }
  }
  for (const endpoint of ['/api/live-ws', '/api/unknown']) {
    assert.equal((await fetch(`${origin}${endpoint}`)).status, 404);
  }
  assert.doesNotMatch(process.output(), /UNEXPECTED_OUTBOUND_REQUEST/);
});

test('Production fails closed for missing build output and invalid PORT', { timeout: 10000 }, async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'glam-production-'));
  try {
    await copyFile(path.join(root, 'server.js'), path.join(temporary, 'server.js'));
    await copyFile(path.join(root, 'package.json'), path.join(temporary, 'package.json'));
    await symlink(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
    for (const [cwd, port, expected] of [[temporary, 3000, /ENOENT/], [root, 'invalid', /PORT must be an integer/], [root, 0, /PORT must be an integer/]]) {
      const process = launch(cwd, port);
      const [code] = await once(process.child, 'exit');
      assert.equal(code, 1);
      assert.match(process.output(), expected);
    }
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('Provider package and source hooks are absent; Firebase configuration is retained', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.dependencies['@google/genai'], undefined);
  assert.equal(manifest.dependencies.ws, undefined);
  const metadata = JSON.parse(await readFile(path.join(root, 'metadata.json'), 'utf8'));
  assert.deepEqual(metadata.majorCapabilities, []);
  const server = await readFile(path.join(root, 'server.js'), 'utf8');
  assert.doesNotMatch(server, /GoogleGenAI|GEMINI_API_KEY|generativelanguage\.googleapis\.com/);
  const firebase = JSON.parse(await readFile(path.join(root, 'firebase-applet-config.json'), 'utf8'));
  assert.ok(firebase.projectId);
});
