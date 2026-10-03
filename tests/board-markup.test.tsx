import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StoryKanban } from '../src/components/StoryKanban';
import { CharacterPlanner } from '../src/components/CharacterPlanner';
import { normalizeStudioState } from '../src/utils/studioAdapter';
import { normalizeCharacters } from '../src/utils/characterContinuity';
const state = normalizeStudioState({ storyIdea: 'Markup smoke test', optionalDetails: { scene1Beat: 'First beat', scene2Beat: 'Second beat', scene3Beat: 'Final beat' } });
state.characters = normalizeCharacters([{ id: 'aria', name: 'Aria', startingEmotion: 'Calm', scenes: [{scene: 1, linked: true, action: 'Find a letter', emotion: 'Curious'}] }]);
test('Editable board renders three scenes, linked character and accessible move controls', () => {
  const html = renderToStaticMarkup(<StoryKanban state={state} onChange={() => {}} />);
  assert.equal((html.match(/data-story-column=/g)||[]).length, 3);
  assert.equal((html.match(/data-board-character=/g)||[]).length, 1);
  assert.equal((html.match(/draggable="true"/g)||[]).length, 3);
  assert.match(html, /Move Scene 1 later/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Find a letter/);
  assert.match(html, /Incoming emotion:/);
  assert.match(html, /grid items-start gap-4 xl:grid-cols-3/);
});
test('Read-only board exposes no editing or drag controls', () => {
  const html = renderToStaticMarkup(<StoryKanban state={state} />);
  assert.doesNotMatch(html, /<textarea|draggable=|<button/);
  assert.match(html, /First beat/);
  assert.match(html, /Aria/);
});
test('Character planner makes List and Board views discoverable', () => {
  const html = renderToStaticMarkup(<CharacterPlanner state={state} onChange={() => {}} />);
  assert.match(html, /aria-label="Character view"/);
  assert.match(html, />List<\/button>/);
  assert.match(html, />Board<\/button>/);
});
