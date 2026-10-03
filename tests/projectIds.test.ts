import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLocalId } from '../src/utils/projectIds';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('Local IDs preserve native randomUUID output when available', () => {
  const expected = 'a607bd49-1723-4f3d-8882-7fbda5c8b40f';
  const cryptoApi = {
    randomUUID() { assert.equal(this, cryptoApi); return expected; },
    getRandomValues() { throw Error('Native UUID generation needs no fallback'); },
  };
  assert.equal(createLocalId(cryptoApi), expected);
});

test('Local IDs fall back to random bytes with UUID version and variant bits', () => {
  const cryptoApi = {
    getRandomValues(bytes: Uint8Array) {
      assert.equal(this, cryptoApi);
      assert.equal(bytes.length, 16);
      bytes.forEach((_, index) => { bytes[index] = index; });
      return bytes;
    },
  };
  const id = createLocalId(cryptoApi);
  assert.equal(id, '00010203-0405-4607-8809-0a0b0c0d0e0f');
  assert.match(id, uuidPattern);
});

test('HTTP-compatible default path produces fresh IDs when randomUUID is absent', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  let sequence = 0;
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
    getRandomValues(bytes: Uint8Array) { bytes.fill(++sequence); return bytes; },
  } });
  try {
    const first = createLocalId();
    const second = createLocalId();
    assert.match(first, uuidPattern);
    assert.match(second, uuidPattern);
    assert.notEqual(first, second);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
    else Reflect.deleteProperty(globalThis, 'crypto');
  }
});

test('Local IDs do not silently fall back to weak randomness when crypto fails', () => {
  assert.throws(() => createLocalId({ getRandomValues() { throw Error('Random source unavailable'); } }), /Random source unavailable/);
});
