import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createWorkspaceStorage, workspaceStorageKey, readLegacyBrowserData,
  LEGACY_WORKSPACE_KEYS,
} from '../src/utils/workspaceStorage';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  let failWrites = false;
  const storage: Storage = {
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem(key, value) {
      if (failWrites) throw new DOMException('Synthetic storage is full', 'QuotaExceededError');
      values.set(key, String(value));
    },
    removeItem: key => { values.delete(key); },
    clear: () => values.clear(),
  };
  return { storage, values, exhaustQuota() { failWrites = true; } };
}

const legacyRecords = Object.fromEntries(LEGACY_WORKSPACE_KEYS.map((key, index) => [
  key, index % 2 ? ` { "legacy": ${index}, "text": "preserve spacing" }\n` : `intentionally malformed legacy value ${index}\n`,
]));

test('guest, individual UIDs and recovery have distinct browser keys without claiming legacy data', () => {
  const { storage } = memoryStorage(legacyRecords);
  const guest = createWorkspaceStorage(null, false, storage);
  const alice = createWorkspaceStorage('alice', false, storage);
  const bob = createWorkspaceStorage('bob', false, storage);
  for (const key of LEGACY_WORKSPACE_KEYS) {
    assert.equal(guest.getItem(key), null);
    assert.equal(alice.getItem(key), null);
    assert.equal(bob.getItem(key), null);
    guest.setItem(key, 'guest copy');
    alice.setItem(key, 'alice copy');
    bob.setItem(key, 'bob copy');
    assert.equal(guest.getItem(key), 'guest copy');
    assert.equal(alice.getItem(key), 'alice copy');
    assert.equal(bob.getItem(key), 'bob copy');
    assert.equal(storage.getItem(key), legacyRecords[key]);
  }
  const keys = [null, 'guest', 'recovery', 'alice', 'a:b', 'a%3Ab'].map(uid => workspaceStorageKey(uid, 'draft'));
  keys.push(workspaceStorageKey(null, 'draft', true));
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(readLegacyBrowserData(storage).records, legacyRecords);
});

test('explicit recovery reads original raw values but edits and reset only affect recovery copies', () => {
  const { storage } = memoryStorage(legacyRecords);
  const recovery = createWorkspaceStorage('alice', true, storage);
  for (const key of LEGACY_WORKSPACE_KEYS) {
    assert.equal(recovery.getItem(key), legacyRecords[key]);
    recovery.setItem(key, 'recovered edit');
    assert.equal(recovery.getItem(key), 'recovered edit');
    assert.equal(storage.getItem(key), legacyRecords[key]);
    recovery.removeItem(key);
    assert.equal(recovery.getItem(key), null, 'A removed recovery item must not reappear from legacy fallback');
    assert.equal(storage.getItem(key), legacyRecords[key]);
  }
  assert.deepEqual(readLegacyBrowserData(storage), {
    format: 'gca-legacy-browser-recovery', version: 1, records: legacyRecords,
  });
});

test('quota failures preserve every original legacy value byte-for-byte and remain exportable', () => {
  const fixture = memoryStorage(legacyRecords);
  const recovery = createWorkspaceStorage(null, true, fixture.storage);
  fixture.exhaustQuota();
  for (const key of LEGACY_WORKSPACE_KEYS) {
    assert.throws(() => recovery.setItem(key, 'failed copy'), { name: 'QuotaExceededError' });
    assert.throws(() => recovery.removeItem(key), { name: 'QuotaExceededError' });
    assert.equal(recovery.getItem(key), legacyRecords[key]);
    assert.equal(fixture.storage.getItem(key), legacyRecords[key]);
  }
  const exported = JSON.parse(JSON.stringify(readLegacyBrowserData(fixture.storage)));
  assert.deepEqual(exported.records, legacyRecords);
  assert.equal(fixture.storage.length, LEGACY_WORKSPACE_KEYS.length, 'Failed writes must not leave partially claimed legacy records');
});
