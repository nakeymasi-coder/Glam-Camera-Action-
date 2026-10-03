import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeCloudStories } from '../src/utils/cloudLibrary';
import { normalizeStudioState } from '../src/utils/studioAdapter';
import type { SavedPromptItem } from '../src/types';

const story = (id: string): SavedPromptItem => ({ id, title: id, createdAt: '2026-10-03T00:00:00Z', state: normalizeStudioState(), masterPrompt: id });
test('duplicate-only cloud results retain exact previous array identity', () => {
  const previous = [story('one'), story('two')];
  assert.equal(mergeCloudStories(previous, []), previous);
  assert.equal(mergeCloudStories(previous, [story('one'), story('two'), story('one')]), previous);
  assert.equal(mergeCloudStories(previous, previous.map(item => ({ ...item }))), previous);
  assert.deepEqual(previous.map(item => item.id), ['one', 'two']);
});
test('cloud additions deduplicate both incoming IDs and existing IDs without mutating input', () => {
  const previous = [story('one')];
  const incoming = [story('two'), story('two'), story('one'), story('three')];
  const merged = mergeCloudStories(previous, incoming);
  assert.notEqual(merged, previous);
  assert.deepEqual(merged.map(item => item.id), ['two', 'three', 'one']);
  assert.equal(merged[2], previous[0]);
  assert.deepEqual(previous.map(item => item.id), ['one']);
  assert.equal(incoming.length, 4);
});
