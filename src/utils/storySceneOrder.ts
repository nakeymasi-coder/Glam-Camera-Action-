import type { CharacterSceneLink, PresetState } from '../types';
import { SCENES } from './characterContinuity';

export type SceneNumber = CharacterSceneLink['scene'];
const beatKey = (scene: SceneNumber) => `scene${scene}Beat` as const;

/**
 * Move one shared story event, including every character's link and notes, to a
 * new timeline position. Scene numbers are positions, never separate identities.
 * Using the existing fields keeps draft/save/export/generation in agreement.
 */
export function moveStoryScene(state: PresetState, from: SceneNumber, to: SceneNumber): PresetState {
  if (from === to || !SCENES.includes(from) || !SCENES.includes(to)) return state;
  const order: SceneNumber[] = [...SCENES];
  order.splice(to - 1, 0, order.splice(from - 1, 1)[0]);
  const optionalDetails = { ...state.optionalDetails };
  order.forEach((oldScene, index) => {
    const destination = beatKey(SCENES[index]);
    const source = beatKey(oldScene);
    // Retain absent optional fields in legacy drafts instead of inventing beats.
    if (Object.hasOwn(state.optionalDetails, source)) optionalDetails[destination] = state.optionalDetails[source];
    else delete optionalDetails[destination];
  });
  return {
    ...state,
    optionalDetails,
    ...(state.characters ? { characters: state.characters.map(character => ({
      ...character,
      scenes: character.scenes.map(link => ({
        ...link,
        scene: SCENES[order.indexOf(link.scene)],
      })).sort((a, b) => a.scene - b.scene),
    })) } : {}),
  };
}
