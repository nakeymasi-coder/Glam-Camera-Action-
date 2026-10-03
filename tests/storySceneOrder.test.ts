import assert from 'node:assert/strict';
import test from 'node:test';
import type { PresetState } from '../src/types';
import { SCENES, characterSceneContract, incomingCharacterEmotion } from '../src/utils/characterContinuity';
import { moveStoryScene, type SceneNumber } from '../src/utils/storySceneOrder';
import { createProduction, normalizeStudioState, parseProductionSnapshot, serializeProductionSnapshot } from '../src/utils/studioAdapter';

function exampleState(): PresetState {
  return normalizeStudioState({
    storyIdea: 'Keep the friends and their parcel consistent.',
    optionalDetails: {
      scene1Beat: '  EVENT_A: A sealed parcel arrives.\n',
      scene2Beat: 'EVENT_B: They open the parcel.',
      scene3Beat: 'EVENT_C: They deliver its contents. 🧡',
      cameraDirection: 'Keep a steady camera.',
      continuityNotes: 'The parcel is blue.',
      characterNames: 'Legacy cast notes stay intact.',
    },
    characters: ['Maya', 'Alex'].map((name, index) => ({
      id: `stable-${name}`, name, appearance: 'A warm coat', goal: 'Deliver the parcel',
      startingEmotion: 'Curious', endingEmotion: 'Proud', relationships: 'Longtime friends',
      continuityNotes: 'Keep their names and wardrobe.',
      scenes: SCENES.map(scene => ({
        scene, linked: scene !== (index === 0 ? 2 : 1),
        action: `${name}_ACTION_${scene}\n  saved notes`,
        emotion: `${name}_EMOTION_${scene}`,
      })),
    })),
  });
}
function freezeDeep<T>(object: T): T {
  if (object && typeof object === 'object') {
    Object.freeze(object);
    Object.values(object).forEach(freezeDeep);
  }
  return object;
}
function assertOrder(actual: PresetState, original: PresetState, order: SceneNumber[]) {
  assert.equal(actual.storyIdea, original.storyIdea);
  assert.equal(actual.optionalDetails.continuityNotes, original.optionalDetails.continuityNotes);
  assert.equal(actual.optionalDetails.cameraDirection, original.optionalDetails.cameraDirection);
  assert.equal(actual.optionalDetails.characterNames, original.optionalDetails.characterNames);
  assert.equal(actual.characters?.length, original.characters?.length);
  order.forEach((source, index) => {
    const destination = SCENES[index];
    assert.equal(actual.optionalDetails[`scene${destination}Beat`], original.optionalDetails[`scene${source}Beat`]);
  });
  actual.characters!.forEach((character, index) => {
    const { scenes, ...identity } = character;
    const { scenes: oldScenes, ...oldIdentity } = original.characters![index];
    assert.deepEqual(identity, oldIdentity, 'stable ids, identities, arc intent and continuity notes must not change');
    assert.deepEqual(scenes.map(link => link.scene), [1, 2, 3]);
    order.forEach((source, index) => {
      assert.deepEqual(scenes[index], { ...oldScenes.find(link => link.scene === source), scene: SCENES[index] }, 'actions, emotions and linked/unlinked flags must travel as one event');
    });
  });
}

for (const from of SCENES) for (const to of SCENES) {
  test(`move ${from} to ${to} preserves all content without mutating the source`, () => {
    const original = freezeDeep(exampleState());
    const before = JSON.stringify(original);
    const actual = moveStoryScene(original, from, to);
    const order: SceneNumber[] = [...SCENES];
    order.splice(to - 1, 0, order.splice(from - 1, 1)[0]);
    assertOrder(actual, original, order);
    assert.equal(JSON.stringify(original), before);
    if (from === to) assert.equal(actual, original);
  });
}

const permutations: SceneNumber[][] = [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]];
for (const order of permutations) {
  test(`permutation ${order.join('-')} survives save/load and feeds every generated output`, () => {
    const original = exampleState();
    let current = original;
    const positions: SceneNumber[] = [...SCENES];
    order.forEach((source, index) => {
      const from = SCENES[positions.indexOf(source)];
      const to = SCENES[index];
      current = moveStoryScene(current, from, to);
      positions.splice(to - 1, 0, positions.splice(from - 1, 1)[0]);
    });
    assertOrder(current, original, order);
    const saved = serializeProductionSnapshot(current, 'Preserve this literal override.');
    const loaded = parseProductionSnapshot(saved);
    assert.deepEqual(loaded.state, current);
    const generated = createProduction(loaded);
    assert.deepEqual(generated.snapshot.state, current);
    assert.equal(generated.canvases.length, 6);
    order.forEach((source, index) => {
      const scene = SCENES[index];
      const beat = original.optionalDetails[`scene${source}Beat`]!;
      const direction = characterSceneContract(current.characters!, scene);
      assert.ok(generated.prompt.includes(`SCENE ${scene} — EXPLICIT BEAT & CONTINUITY HANDOFF\n\nThis scene's supplied beat (priority over automatic story cues):\n${beat}`));
      assert.ok(generated.prompt.includes(direction));
      assert.ok(generated.directorPlan.scenes[index].storyCue?.startsWith(beat));
      assert.ok(generated.directorPlan.scenes[index].storyCue?.includes(direction));
      const canvases = generated.canvases.filter(canvas => canvas.sceneIndex === scene);
      assert.equal(canvases.length, 2);
      for (const canvas of canvases) {
        assert.ok(canvas.content.includes(`This scene's supplied beat (priority over automatic story cues):\n${beat}`));
        assert.ok(canvas.content.includes(direction));
        for (const character of current.characters!) {
          for (const link of character.scenes) if (!link.linked) assert.ok(!canvas.content.includes(link.action), 'unlinked notes stay saved but never enter generated scene direction');
        }
      }
    });
  });
}

test('emotional handoffs use chronological scene numbers in unsorted imported links', () => {
  const character = exampleState().characters![0];
  character.scenes = [character.scenes[1], character.scenes[0], character.scenes[2]].map(link => ({ ...link, linked: true }));
  assert.equal(incomingCharacterEmotion(character, 1), 'Curious');
  assert.equal(incomingCharacterEmotion(character, 3), 'Maya_EMOTION_2');
  assert.ok(characterSceneContract([character], 3).includes('Incoming emotional state: Maya_EMOTION_2'));
  character.scenes[0].emotion = '  ';
  assert.equal(incomingCharacterEmotion(character, 3), 'Maya_EMOTION_1');
  character.scenes[1].linked = false;
  assert.equal(incomingCharacterEmotion(character, 3), 'Curious');
});

test('reordered emotional handoffs follow the new preceding event', () => {
  const state = exampleState();
  state.characters![0].scenes.forEach(link => { link.linked = true; });
  const moved = moveStoryScene(state, 3, 1);
  const character = moved.characters![0];
  assert.equal(incomingCharacterEmotion(character, 1), 'Curious');
  assert.equal(incomingCharacterEmotion(character, 2), 'Maya_EMOTION_3');
  assert.equal(incomingCharacterEmotion(character, 3), 'Maya_EMOTION_1');
});

test('legacy drafts retain absent roster and optional beat fields without migration', () => {
  const state = exampleState();
  delete state.characters;
  delete state.optionalDetails.scene1Beat;
  delete state.optionalDetails.scene3Beat;
  const moved = moveStoryScene(state, 2, 3);
  assert.equal(Object.hasOwn(moved, 'characters'), false);
  assert.equal(Object.hasOwn(moved.optionalDetails, 'scene1Beat'), false);
  assert.equal(Object.hasOwn(moved.optionalDetails, 'scene2Beat'), false);
  assert.equal(moved.optionalDetails.scene3Beat, state.optionalDetails.scene2Beat);
  assert.doesNotThrow(() => createProduction(moved));
});

test('blank or identical beat text never becomes an event identity', () => {
  const state = exampleState();
  state.optionalDetails.scene1Beat = '';
  state.optionalDetails.scene2Beat = '';
  state.optionalDetails.scene3Beat = '';
  assertOrder(moveStoryScene(state, 3, 1), state, [3, 1, 2]);
});

test('out-of-range input is a no-op', () => {
  const state = exampleState();
  for (const invalid of [0, 4, -1, NaN, 1.5]) {
    assert.equal(moveStoryScene(state, invalid as SceneNumber, 2), state);
    assert.equal(moveStoryScene(state, 2, invalid as SceneNumber), state);
  }
});
