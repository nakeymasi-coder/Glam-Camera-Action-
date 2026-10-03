import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyStoryTemplates, commitStoryTemplateImport, createStoryTemplate, createStoryTemplateLibrary,
  parseStoryTemplate, previewStoryTemplateImport, readStoryTemplateLibrary, storyTemplateId,
  STORY_TEMPLATE_STORAGE_KEY, TEMPLATE_LIMITS, type StoryTemplate,
} from '../src/utils/storyTemplates.ts';
import { normalizeStudioState } from '../src/utils/studioAdapter.ts';
import { normalizeCharacters } from '../src/utils/characterContinuity.ts';

const structure = (title = 'Three-beat reveal', goal = 'Find the truth') => {
  const state = normalizeStudioState();
  state.genres = ['Mystery'];
  state.optionalDetails.storyGoal = goal;
  state.optionalDetails.scene1Beat = `${title}: discovery`;
  state.optionalDetails.targetDuration = '30 seconds';
  state.storyIdea = 'Private project detail should not be exported';
  return createStoryTemplate(title, 'structure', state);
};
const archetypes = () => {
  const state = normalizeStudioState();
  state.characterTypes = ['Human'];
  state.characters = normalizeCharacters([{ id: 'source-hero', name: 'Reluctant hero', startingEmotion: 'Worried', endingEmotion: 'Brave', scenes: [{ scene: 1, linked: true, action: 'Story-specific action', emotion: 'Hopeful' }] }]);
  return createStoryTemplate('Reluctant hero', 'characters', state);
};
const source = (template: StoryTemplate, name = 'template.json') => ({ name, text: JSON.stringify(template) });
function storage(initial: string | null = null) {
  let raw = initial;
  let writes = 0;
  return {
    getItem: (key: string) => { assert.equal(key, STORY_TEMPLATE_STORAGE_KEY); return raw; },
    setItem: (key: string, value: string) => { assert.equal(key, STORY_TEMPLATE_STORAGE_KEY); writes++; raw = value; },
    get raw() { return raw; }, get writes() { return writes; },
  };
}

test('legacy version 1 templates retain scopes and round-trip', () => {
  const original = structure();
  assert.deepEqual(parseStoryTemplate(JSON.stringify(original)), original);
  assert.equal(original.state.storyIdea, '');
  const character = parseStoryTemplate(JSON.stringify(archetypes())).state.characters![0];
  assert.equal(character.name, 'Reluctant hero');
  assert.ok(character.scenes.every(scene => !scene.linked && !scene.action && !scene.emotion));
});

test('multi-file and exported single-library imports contain the same ordered templates', () => {
  const templates = [structure(), archetypes()];
  const fromFiles = previewStoryTemplateImport(templates.map(template => source(template)), null);
  const fromLibrary = previewStoryTemplateImport([{ name: 'library.json', text: JSON.stringify(createStoryTemplateLibrary(templates)) }], null);
  assert.deepEqual(fromFiles.additions, fromLibrary.additions);
  assert.deepEqual(fromFiles.counts, { structure: 1, characters: 1, brief: 0 });
  assert.equal(fromFiles.characterCount, 1);
  assert.equal(fromFiles.valid, 2);
  assert.deepEqual(fromFiles.errors, []);
  assert.equal(fromLibrary.sources, 1);
});

test('plain template arrays are accepted and empty libraries are rejected', () => {
  assert.equal(previewStoryTemplateImport([{ name: 'array.json', text: JSON.stringify([structure(), archetypes()]) }], null).additions.length, 2);
  const empty = previewStoryTemplateImport([{ name: 'empty.json', text: JSON.stringify({ format: 'gca-story-template-library', version: 1, templates: [] }) }], null);
  assert.match(empty.errors.join(' '), /empty/);
});

test('stable ids and duplicate detection ignore object key order and source character ids', () => {
  const original = archetypes();
  const same = JSON.parse(JSON.stringify(original)) as StoryTemplate;
  same.state.characters![0].id = 'another-device-cast-id';
  const reversed = Object.fromEntries(Object.entries(same).reverse()) as unknown as StoryTemplate;
  assert.equal(storyTemplateId(original), storyTemplateId(reversed));
  const preview = previewStoryTemplateImport([source(same), source(reversed), source(structure())], JSON.stringify([original]));
  assert.equal(preview.duplicates, 2);
  assert.equal(preview.additions.length, 1);
  assert.equal(preview.next.length, 2);
});

test('same-title changed content stays distinct and re-imported copies do not accumulate', () => {
  const first = structure('Same title', 'First goal');
  const second = structure('Same title', 'Different goal');
  assert.notEqual(storyTemplateId(first), storyTemplateId(second));
  const preview = previewStoryTemplateImport([source(first), source(second), source(first)], null);
  assert.equal(preview.additions.length, 2);
  assert.equal(preview.duplicates, 1);
});

test('all invalid files and entries appear in one preview and block the whole batch', () => {
  const brokenA = { ...structure(), version: 9 };
  const brokenB = { ...structure(), unexpected: true };
  const preview = previewStoryTemplateImport([
    source(structure()),
    { name: 'malformed.json', text: '{' },
    { name: 'bad-library.json', text: JSON.stringify({ format: 'gca-story-template-library', version: 1, templates: [brokenA, brokenB] }) },
    { name: 'unreadable.json', error: 'Read failed' },
  ], null);
  assert.equal(preview.errors.length, 4);
  assert.match(preview.errors[0], /malformed.json/);
  assert.match(preview.errors[1], /template 1/);
  assert.match(preview.errors[2], /template 2/);
  assert.equal(preview.additions.length, 1);
  const store = storage();
  assert.throws(() => commitStoryTemplateImport(preview, store), /Fix every import error/);
  assert.equal(store.writes, 0);
  assert.equal(store.raw, null);
});

test('preview is read-only; confirmation performs one write preserving existing template contents', () => {
  const existing = archetypes();
  const raw = JSON.stringify([existing]);
  const store = storage(raw);
  const preview = previewStoryTemplateImport([source(structure())], store.raw);
  assert.equal(store.writes, 0);
  assert.equal(store.raw, raw);
  const next = commitStoryTemplateImport(preview, store);
  assert.equal(store.writes, 1);
  assert.deepEqual(next[1], existing);
  assert.deepEqual(readStoryTemplateLibrary(store.raw), next);
  assert.throws(() => commitStoryTemplateImport(preview, store), /changed after this preview/);
  assert.equal(store.writes, 1);
});

test('changed storage or storage write failure never causes a partial import', () => {
  const preview = previewStoryTemplateImport([source(structure())], null);
  const anotherTab = storage(JSON.stringify([archetypes()]));
  const before = anotherTab.raw;
  assert.throws(() => commitStoryTemplateImport(preview, anotherTab), /changed after this preview/);
  assert.equal(anotherTab.raw, before);
  assert.equal(anotherTab.writes, 0);
  const fullStorage = { getItem: () => null, setItem: () => { throw Error('Quota exceeded'); } };
  assert.throws(() => commitStoryTemplateImport(preview, fullStorage), /Quota exceeded/);
});

test('unreadable existing storage is never replaced by a valid import', () => {
  for (const raw of ['broken JSON', '{"unexpected":"shape"}', '[{"version":9}]']) {
    const preview = previewStoryTemplateImport([source(structure())], raw);
    assert.match(preview.errors.join(' '), /Saved library/);
    const store = storage(raw);
    assert.throws(() => commitStoryTemplateImport(preview, store));
    assert.equal(store.raw, raw);
    assert.equal(store.writes, 0);
  }
});

test('unsupported library versions and unknown envelope fields cannot import', () => {
  for (const changes of [{ version: 2 }, { surprise: 'discard me' }]) {
    const value = { format: 'gca-story-template-library', version: 1, templates: [structure()], ...changes };
    const preview = previewStoryTemplateImport([{ name: 'library.json', text: JSON.stringify(value) }], null);
    assert.ok(preview.errors.length > 0);
  }
});

test('file, total byte and count limits reject batches without writes', () => {
  const tooManyFiles = previewStoryTemplateImport(Array.from({ length: TEMPLATE_LIMITS.files + 1 }, () => source(structure())), null);
  assert.match(tooManyFiles.errors.join(' '), /50 files/);
  const tooManyTemplates = previewStoryTemplateImport([{ name: 'huge-library.json', text: JSON.stringify(Array(TEMPLATE_LIMITS.templates + 1).fill(structure())) }], null);
  assert.match(tooManyTemplates.errors.join(' '), /500 templates/);
  const largeText = ' '.repeat(TEMPLATE_LIMITS.fileBytes + 1);
  const tooLargeFile = previewStoryTemplateImport([{ name: 'oversized.json', text: largeText }], null);
  assert.match(tooLargeFile.errors.join(' '), /8 MB/);
  const tooLargeTotal = previewStoryTemplateImport([{ name: 'one.json', text: largeText }, { name: 'two.json', text: largeText }], null);
  assert.match(tooLargeTotal.errors.join(' '), /16 MB/);
});

test('unknown nested fields and malformed characters are rejected without normalizing them away', () => {
  const broken = archetypes();
  (broken.state.characters![0] as unknown as Record<string, unknown>).typoGoal = 'lost data';
  assert.throws(() => parseStoryTemplate(JSON.stringify(broken)), /Unknown character field/);
  const unknown = structure();
  (unknown.state.optionalDetails as unknown as Record<string, unknown>).unrecognized = 'do not drop';
  assert.throws(() => parseStoryTemplate(JSON.stringify(unknown)), /Unknown optional detail/);
});

test('fresh bulk application combines structures and cast atomically without changing its inputs', () => {
  const current = normalizeStudioState();
  current.storyIdea = 'Existing draft';
  const first = structure();
  const second = structure('Second structure', 'Second goal');
  second.state.optionalDetails.targetDuration = '60 seconds';
  const cast = archetypes();
  const before = JSON.stringify({ current, first, second, cast });
  const next = applyStoryTemplates(current, [first, second, cast], 'fresh');
  assert.equal(next.storyIdea, '');
  assert.equal(next.optionalDetails.storyGoal, 'Find the truth\n\nSecond goal');
  assert.equal(next.optionalDetails.targetDuration, '30 seconds');
  assert.equal(next.characters!.length, 1);
  assert.notEqual(next.characters![0].id, cast.state.characters![0].id);
  assert.equal(JSON.stringify({ current, first, second, cast }), before);
});

test('bulk merge preserves current choices, notes, characters, and creates independent incoming cast ids', () => {
  const current = normalizeStudioState();
  current.storyIdea = 'Existing draft';
  current.characterTypes = ['Animal'];
  current.optionalDetails.storyGoal = 'Existing goal';
  current.optionalDetails.targetDuration = '90 seconds';
  current.characters = normalizeCharacters([{ id: 'existing-character', name: 'Existing cast' }]);
  const next = applyStoryTemplates(current, [structure(), archetypes()], 'merge');
  assert.equal(next.storyIdea, 'Existing draft');
  assert.equal(next.optionalDetails.storyGoal, 'Existing goal\n\nFind the truth');
  assert.equal(next.optionalDetails.targetDuration, '90 seconds');
  assert.deepEqual(next.characterTypes, ['Animal']);
  assert.equal(next.characters![0].id, 'existing-character');
  assert.equal(next.characters!.length, 2);
  assert.notEqual(next.characters![1].id, 'source-hero');
  assert.equal(current.characters.length, 1);
});

test('bulk application validates all templates before building a result and collapses exact duplicates', () => {
  const current = normalizeStudioState();
  const cast = archetypes();
  const bad = { ...structure(), version: 9 } as unknown as StoryTemplate;
  const before = JSON.stringify(current);
  assert.throws(() => applyStoryTemplates(current, [cast, bad], 'merge'));
  assert.equal(JSON.stringify(current), before);
  assert.equal(applyStoryTemplates(current, [cast, cast], 'fresh').characters!.length, 1);
  assert.throws(() => applyStoryTemplates(current, [], 'fresh'), /Select at least/);
});

test('library export preserves briefs and legacy duplicate storage is read without any writes', () => {
  const state = normalizeStudioState();
  state.storyIdea = 'Full brief';
  const brief = createStoryTemplate('My brief', 'brief', state);
  const library = createStoryTemplateLibrary([structure(), archetypes(), brief]);
  const preview = previewStoryTemplateImport([{ name: 'export.json', text: JSON.stringify(library) }], null);
  assert.deepEqual(preview.errors, []);
  assert.deepEqual(preview.counts, { structure: 1, characters: 1, brief: 1 });
  assert.equal(preview.additions[2].state.storyIdea, 'Full brief');
  const raw = JSON.stringify([brief, brief]);
  assert.equal(readStoryTemplateLibrary(raw).length, 1);
  assert.equal(raw, JSON.stringify([brief, brief]));
});

test('oversized individual templates and over-capacity draft loads fail before changing a draft', () => {
  assert.throws(() => parseStoryTemplate(' '.repeat(TEMPLATE_LIMITS.templateBytes + 1)), /2 MB/);
  const current = normalizeStudioState();
  current.storyIdea = 'Keep this draft';
  const state = normalizeStudioState();
  state.characters = normalizeCharacters(Array.from({ length: TEMPLATE_LIMITS.projectCharacters + 1 }, (_, index) => ({ id: `cast-${index}`, name: `Character ${index}` })));
  const hugeCast = createStoryTemplate('Too many characters', 'characters', state);
  const before = JSON.stringify(current);
  assert.throws(() => applyStoryTemplates(current, [hugeCast], 'fresh'), /500 character cards/);
  assert.equal(JSON.stringify(current), before);
});


test('legacy version 1 imports and saved libraries accept previously valid long titles', () => {
  const legacy = structure('A'.repeat(300));
  assert.equal(parseStoryTemplate(JSON.stringify(legacy)).title, legacy.title);
  assert.equal(readStoryTemplateLibrary(JSON.stringify([legacy])).length, 1);
  const preview = previewStoryTemplateImport([source(legacy)], null);
  assert.deepEqual(preview.errors, []);
  assert.equal(preview.additions[0].title, legacy.title);
});
