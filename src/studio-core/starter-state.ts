import { normalizePresetState, hasCreativeInput, generateMasterPrompt, type PresetState } from './promptEngine';
import type { StoryStarter } from './story-starters';
export function starterState(starter:StoryStarter):PresetState{
 const format=/educational/i.test(starter.genre)?'Explainer':/mystery|suspense|thriller/i.test(starter.genre)?'Mini Episode':/drama|romance|inspirational|slice of life/i.test(starter.genre)?'Storytime':'Short Skit';
 return normalizePresetState({characterType:[starter.family],genre:[starter.genre],visualStyle:[starter.style],videoFormat:[format],energyTone:[...starter.tone],storyIdea:starter.idea,optionalDetails:{characterNames:starter.cast,setting:starter.setting,era:starter.era,storyGoal:starter.goal,obstacle:starter.obstacle,endingChange:starter.ending,characterGoals:starter.goal}});
}
export function briefFingerprint(state:PresetState){return JSON.stringify(normalizePresetState(state));}

export function canReplaceWithStarter(state:PresetState,masterPrompt:string,promptPresets:PresetState|null,lastAutomaticFingerprint:string|null):boolean{
 const empty=!hasCreativeInput(state)&&![state.customCharacter,state.customGenre,state.customVisualStyle,state.customVideoFormat,state.customEnergyTone].some(value=>value.trim());
 const untouchedOutput=!masterPrompt||masterPrompt===generateMasterPrompt(promptPresets||state);
 return empty||(lastAutomaticFingerprint===briefFingerprint(state)&&untouchedOutput);
}
