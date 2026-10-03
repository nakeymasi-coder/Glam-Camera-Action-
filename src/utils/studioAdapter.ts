/**
 * Scene & Script Studio portable adapter.
 * Canonical source: 3a97317303b5dc54c8721968dcac2985f364f3c8.
 * Pure, deterministic planning only: no network, paid model, credentials, or D1.
 */
import {
  normalizePresetState,
  generateMasterPrompt,
  resolvePresetValues,
  CHARACTER_TYPE_OPTIONS as canonicalCharacters,
  STORY_GENRE_OPTIONS as canonicalGenres,
  VISUAL_STYLE_OPTIONS as canonicalStyles,
  VIDEO_FORMAT_OPTIONS as canonicalFormats,
  ENERGY_TONE_OPTIONS as canonicalTones,
  type PresetState as CanonicalState,
} from '../studio-core/promptEngine';
import { buildDirectorPlan, type DirectorPlan } from '../studio-core/director-plan';
import { buildCanvasPlan } from '../studio-core/canvas-plan';
import { starterState } from '../studio-core/starter-state';
import { STORY_STARTERS, type StoryStarter } from '../studio-core/story-starters';
import { rotatedIndex } from '../studio-core/surprise-rotation';

export { BRIEF_CHOICES, BRIEF_CATEGORIES } from '../studio-core/brief-fields';
export { ERA_CHOICES } from '../studio-core/era-direction';
export { STORY_STARTERS };
export type { DirectorPlan, StoryStarter };

export const CHARACTER_TYPE_OPTIONS: string[] = canonicalCharacters.map(option => option.label);
export const STORY_GENRE_OPTIONS: string[] = canonicalGenres.map(option => option.label);
export const VISUAL_STYLE_OPTIONS: string[] = canonicalStyles.map(option => option.label);
export const VIDEO_FORMAT_OPTIONS: string[] = canonicalFormats.map(option => option.label);
export const ENERGY_TONE_OPTIONS: string[] = canonicalTones.map(option => option.label);

/** Structural compatibility with the existing React/Vite application's state. */
export interface PresetState {
  characterTypes: string[];
  customCharacter: string;
  genres: string[];
  customGenre: string;
  visualStyles: string[];
  customStyle: string;
  videoFormats: string[];
  customFormat: string;
  energyTones: string[];
  customTone: string;
  storyIdea: string;
  optionalDetails: {
    characterNames: string;
    settingLocation: string;
    dialogueMustHaves: string;
    exactTextCaptions: string;
    targetAudience: string;
    productServiceCTA: string;
    targetDuration: string;
    era?: string;
    storyGoal?: string;
    obstacle?: string;
    endingChange?: string;
    characterGoals?: string;
    productService?: string;
    callToAction?: string;
    cameraDirection?: string;
    atmosphereDetails?: string;
    continuityNotes?: string;
    scene1Beat?: string;
    scene2Beat?: string;
    scene3Beat?: string;
  };
}
export interface CanvasItem {
  id: number;
  canvasNumber: number;
  canvasType: 'image' | 'script';
  title: string;
  sceneIndex: 1 | 2 | 3;
  purpose: string;
  content: string;
}
/** Edit this snapshot, then regenerate every derived output in a single call. */
export interface ProductionSnapshot {
  version: 1;
  state: PresetState;
  /** Literal supplemental direction. Never parsed into invented structured edits. */
  overrideText: string;
}
export interface Production {
  snapshot: ProductionSnapshot;
  prompt: string;
  canvases: CanvasItem[];
  directorPlan: DirectorPlan;
  notice: string;
}

type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as ObjectValue : {};
const stringValue = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const firstString = (current: unknown, legacy: unknown): string =>
  typeof current === 'string' ? current : stringValue(legacy);

/** Keep unknown/custom labels and their order; None is exclusive, never a style. */
function selection(value: unknown): string[] {
  const incoming = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const result: string[] = [];
  for (const item of incoming) {
    if (typeof item !== 'string' || !item.trim()) continue;
    const normalized = /^none$/i.test(item.trim()) ? 'None' : /^custom$/i.test(item.trim()) ? 'Custom' : item;
    if (!result.includes(normalized)) result.push(normalized);
  }
  const active = result.filter(item => item !== 'None');
  return active.length ? active : ['None'];
}

/**
 * Safe for partial/legacy records. Strings retain original whitespace and newlines.
 * This returns a new object and never writes or migrates saved user data.
 */
export function normalizeStudioState(saved?: unknown): PresetState {
  const source = object(saved);
  const details = object(source.optionalDetails);
  return {
    characterTypes: selection(source.characterTypes ?? source.characterType),
    customCharacter: stringValue(source.customCharacter),
    genres: selection(source.genres ?? source.genre),
    customGenre: stringValue(source.customGenre),
    visualStyles: selection(source.visualStyles ?? source.visualStyle),
    customStyle: firstString(source.customStyle, source.customVisualStyle),
    videoFormats: selection(source.videoFormats ?? source.videoFormat),
    customFormat: firstString(source.customFormat, source.customVideoFormat),
    energyTones: selection(source.energyTones ?? source.energyTone),
    customTone: firstString(source.customTone, source.customEnergyTone),
    storyIdea: stringValue(source.storyIdea),
    optionalDetails: {
      characterNames: stringValue(details.characterNames),
      settingLocation: firstString(details.settingLocation, details.setting),
      dialogueMustHaves: stringValue(details.dialogueMustHaves),
      exactTextCaptions: firstString(details.exactTextCaptions, details.onScreenText),
      targetAudience: stringValue(details.targetAudience),
      productServiceCTA: stringValue(details.productServiceCTA),
      targetDuration: firstString(details.targetDuration, details.duration),
      era: stringValue(details.era),
      storyGoal: stringValue(details.storyGoal),
      obstacle: stringValue(details.obstacle),
      endingChange: stringValue(details.endingChange),
      characterGoals: stringValue(details.characterGoals),
      productService: stringValue(details.productService),
      callToAction: stringValue(details.callToAction),
      cameraDirection: stringValue(details.cameraDirection),
      atmosphereDetails: stringValue(details.atmosphereDetails),
      continuityNotes: stringValue(details.continuityNotes),
      scene1Beat: stringValue(details.scene1Beat),
      scene2Beat: stringValue(details.scene2Beat),
      scene3Beat: stringValue(details.scene3Beat),
    },
  };
}

export function toCanonicalState(input?: unknown): CanonicalState {
  const state = normalizeStudioState(input);
  const details = state.optionalDetails;
  return normalizePresetState({
    characterType: [...state.characterTypes], customCharacter: state.customCharacter,
    genre: [...state.genres], customGenre: state.customGenre,
    visualStyle: [...state.visualStyles], customVisualStyle: state.customStyle,
    videoFormat: [...state.videoFormats], customVideoFormat: state.customFormat,
    energyTone: [...state.energyTones], customEnergyTone: state.customTone,
    storyIdea: state.storyIdea,
    optionalDetails: {
      characterNames: details.characterNames, setting: details.settingLocation,
      dialogueMustHaves: details.dialogueMustHaves, onScreenText: details.exactTextCaptions,
      targetAudience: details.targetAudience, duration: details.targetDuration,
      era: details.era, storyGoal: details.storyGoal, obstacle: details.obstacle,
      endingChange: details.endingChange, characterGoals: details.characterGoals,
      // A legacy combined field is context. Never manufacture a CTA from it.
      productService: details.productService || details.productServiceCTA,
      callToAction: details.callToAction || '',
    },
  });
}

export function normalizeProductionSnapshot(input?: unknown, overrideText?: string): ProductionSnapshot {
  const source = object(input);
  const isSnapshot = 'version' in source || ('state' in source && 'overrideText' in source);
  if (isSnapshot && source.version !== 1) throw new Error('Unsupported production snapshot version. Expected version 1.');
  return {
    version: 1,
    state: normalizeStudioState(isSnapshot ? source.state : input),
    overrideText: typeof overrideText === 'string' ? overrideText : isSnapshot ? stringValue(source.overrideText) : '',
  };
}

/** Stable JSON is the editable source of truth, not a prose-to-state parser. */
export function serializeProductionSnapshot(input?: unknown, overrideText?: string): string {
  return JSON.stringify(normalizeProductionSnapshot(input, overrideText), null, 2);
}

/** Reject invalid structured edits visibly instead of silently dropping user's edits. */
export function parseProductionSnapshot(json: string): ProductionSnapshot {
  const value: unknown = JSON.parse(json);
  const root = object(value);
  if (root.version !== 1 || !root.state || typeof root.state !== 'object' || Array.isArray(root.state)) {
    throw new Error('Use a version 1 production snapshot with a state object.');
  }
  if (typeof root.overrideText !== 'string') throw new Error('overrideText must be a string.');
  for (const key of Object.keys(root)) {
    if (!['version', 'state', 'overrideText'].includes(key)) throw new Error(`Unknown snapshot field: ${key}`);
  }
  const state = object(root.state);
  const template = normalizeStudioState();
  for (const key of Object.keys(state)) {
    if (!Object.hasOwn(template, key)) throw new Error(`Unknown state field: ${key}`);
  }
  for (const [key, defaultValue] of Object.entries(template)) {
    if (key === 'optionalDetails') continue;
    const item = state[key];
    if (Array.isArray(defaultValue)) {
      if (!Array.isArray(item) || item.some(value => typeof value !== 'string')) throw new Error(`${key} must be a string array.`);
    } else if (typeof item !== 'string') throw new Error(`${key} must be a string.`);
  }
  const details = object(state.optionalDetails);
  if (!state.optionalDetails || typeof state.optionalDetails !== 'object' || Array.isArray(state.optionalDetails)) {
    throw new Error('optionalDetails must be an object.');
  }
  for (const [key, item] of Object.entries(details)) {
    if (!Object.hasOwn(template.optionalDetails, key)) throw new Error(`Unknown optional detail: ${key}`);
    if (typeof item !== 'string') throw new Error(`optionalDetails.${key} must be a string.`);
  }
  return normalizeProductionSnapshot(root);
}

/** Repeated context is guidance, not an instruction to repeat dialogue in every scene. */
function literalContract(snapshot: ProductionSnapshot): string {
  const state = snapshot.state;
  const details = state.optionalDetails;
  const rows: string[] = [];
  const put = (label: string, value: string | undefined) => {
    if (value?.trim()) rows.push(`${label}:\n${value}`);
  };
  put('Story idea', state.storyIdea);
  for (const [label, selections, custom] of [
    ['Character family', state.characterTypes, state.customCharacter],
    ['Genre', state.genres, state.customGenre],
    ['Visual style', state.visualStyles, state.customStyle],
    ['Video format', state.videoFormats, state.customFormat],
    ['Energy / tone', state.energyTones, state.customTone],
  ] as [string, string[], string][]) {
    const values = selections.flatMap(value => value === 'None' ? [] : value === 'Custom' ? custom.trim() ? [custom] : [] : [value]);
    if (values.length) put(label, values.join('\n'));
  }
  for (const [key, label] of [
    ['cameraDirection', 'Explicit camera & composition (overrides automatic shot / camera defaults)'],
    ['atmosphereDetails', 'Explicit lighting, texture & sound (overrides automatic atmosphere defaults)'],
    ['continuityNotes', 'Continuity anchors & permitted story-driven changes'],
    ['characterNames', 'Character names & descriptions'], ['settingLocation', 'Setting'],
    ['storyGoal', 'Story goal'], ['obstacle', 'Obstacle / stakes'],
    ['endingChange', 'Ending / what changes'], ['characterGoals', 'Character goals'],
    ['era', 'Era / time period'], ['targetDuration', 'Requested total duration'],
    ['targetAudience', 'Audience'], ['productService', 'Product / service context'],
    ['productServiceCTA', 'Legacy combined product/service/CTA note (literal context; do not infer an extra sales pitch)'],
    ['dialogueMustHaves', 'Exact spoken words (once across the production; default Scene 2 unless otherwise specified)'],
    ['exactTextCaptions', 'Exact on-screen text (once across the production; default Scene 3 unless otherwise specified; not spoken dialogue)'],
    ['callToAction', 'Explicit requested call to action (default Scene 3)'],
  ] as [keyof PresetState['optionalDetails'], string][]) put(label, details[key]);
  const contract = rows.length ? [
    'SHARED PRODUCTION CONTRACT — VERBATIM USER INPUT',
    'Apply the same brief to every paired image/script. Keep exact supplied wording. These repeated reference notes do not mean repeat every event, line, or caption in every scene. Required dialogue and captions keep their specified/default placement.',
    ...rows,
  ].join('\n\n') : '';
  const override = snapshot.overrideText.trim() ? [
    'LITERAL USER OVERRIDE — CARRIED INTO ALL SIX SCENE PROMPTS',
    'The following text is supplemental user direction. It has NOT been interpreted into structured fields, runtime allocations, or a rewritten director plan. Where it changes those fields, edit the structured production snapshot and regenerate to synchronize the displayed plan. Preserve the literal text and follow explicit direction over automatic creative defaults.',
    snapshot.overrideText,
  ].join('\n\n') : '';
  return [contract, override].filter(Boolean).join('\n\n');
}

function canvasInput(state: CanonicalState): Record<string, unknown> {
  return {
    presets: state,
    characterType: resolvePresetValues(state.characterType, state.customCharacter),
    genre: resolvePresetValues(state.genre, state.customGenre),
    visualStyle: resolvePresetValues(state.visualStyle, state.customVisualStyle),
    videoFormat: resolvePresetValues(state.videoFormat, state.customVideoFormat),
    energyTone: resolvePresetValues(state.energyTone, state.customEnergyTone),
    storyIdea: state.storyIdea,
    optionalDetails: state.optionalDetails,
  };
}

export function createProduction(input?: unknown, overrideText?: string): Production {
  const snapshot = normalizeProductionSnapshot(input, overrideText);
  const canonical = toCanonicalState(snapshot.state);
  const appendix = literalContract(snapshot);
  const append = (text: string) => appendix ? `${text}\n\n${appendix}` : text;
  const plan = buildCanvasPlan(canvasInput(canonical));
  const details = snapshot.state.optionalDetails;
  const directorPlan = buildDirectorPlan(canonical);
  if (details.cameraDirection?.trim()) {
    directorPlan.framing = details.cameraDirection;
    directorPlan.scenes = directorPlan.scenes.map(scene => ({ ...scene, camera: details.cameraDirection! }));
  }
  if (details.atmosphereDetails?.trim()) directorPlan.lighting = details.atmosphereDetails;
  if (details.continuityNotes?.trim()) directorPlan.continuity.push(details.continuityNotes);
  const beats = [details.scene1Beat, details.scene2Beat, details.scene3Beat];
  directorPlan.scenes = directorPlan.scenes.map((scene, index) => ({ ...scene, storyCue: beats[index]?.trim() ? beats[index] : scene.storyCue }));
  const sceneDirection = (scene: number) => {
    const beat = beats[scene - 1];
    const previous = beats[scene - 2];
    return [
      `SCENE ${scene} — EXPLICIT BEAT & CONTINUITY HANDOFF`,
      beat?.trim() ? `This scene's supplied beat (priority over automatic story cues):\n${beat}` : 'Use the shared story goal and automatic scene role; no explicit beat supplied.',
      scene > 1 ? `Carry forward the preceding scene's final character positions, prop ownership / condition and emotional state. Show the consequence before introducing new action.${previous?.trim() ? '\nPrevious beat — reference only, do not replay:\n' + previous : ''}` : 'Establish character identity, geography and recurring prop state for later scenes.',
      scene < 3 ? 'End with a clear action, discovery or changed state that motivates the next scene. Do not resolve a later beat early.' : 'Pay off the preceding change; do not reset props or undo character progress without an explicit story reason.',
    ].join('\n\n');
  };
  const hasBeats = beats.some(beat => beat?.trim());
  return {
    snapshot,
    prompt: append(generateMasterPrompt(canonical)) + (hasBeats ? '\n\n' + [1, 2, 3].map(sceneDirection).join('\n\n') : ''),
    directorPlan,
    canvases: plan.canvases.map(canvas => ({
      id: canvas.number,
      canvasNumber: canvas.number,
      canvasType: canvas.type === 'IMAGE' ? 'image' : 'script',
      title: canvas.title,
      sceneIndex: canvas.scene as 1 | 2 | 3,
      purpose: canvas.role,
      content: append(canvas.instructions) + (hasBeats ? '\n\n' + sceneDirection(canvas.scene) : ''),
    })),
    notice: 'Local structured planning templates, not AI-written finished scenes or rendered images. The versioned production snapshot is the shared source for the master prompt, six canvases, and director plan.' +
      (snapshot.overrideText.trim() ? ' Literal override text is included in the master prompt and all six canvases; it is not parsed into the displayed director plan. Edit the structured snapshot for synchronized runtime, cast, or story changes.' : ''),
  };
}

export function buildMasterPrompt(input?: unknown, overrideText?: string): string {
  return createProduction(input, overrideText).prompt;
}
export function generateSixCanvases(input?: unknown, overrideText?: string): CanvasItem[] {
  return createProduction(input, overrideText).canvases;
}

export function starterToStudioState(starter: StoryStarter): PresetState {
  return normalizeStudioState(starterState(starter));
}
/** Forty coordinated full briefs, not independently shuffled cast/story fragments. */
export const COORDINATED_STARTERS = STORY_STARTERS.map(starter => ({
  id: starter.id,
  title: starter.title,
  state: starterToStudioState(starter),
}));

export interface LocalRotationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface LocalStarterRotationOptions {
  /** Pass null to keep rotation in memory. localStorage is accessed only by this factory. */
  storage?: LocalRotationStorage | null;
  storageKey?: string;
  /** Optional deterministic seed for tests. Existing saved state wins. */
  seed?: number;
}
export interface LocalStarterPick {
  starter: StoryStarter;
  state: PresetState;
  cycle: number;
  position: number;
  persistence: 'browser-local' | 'memory-only';
  notice: string;
}
interface RotationRecord { version: 1; catalogue: string; seed: number; cursor: number }
const ROTATION_CATALOGUE = STORY_STARTERS.map(starter => starter.id).join('|');

/**
 * Device/browser-profile/origin-local sequential rotation. Visits all 40 starters
 * before reuse and avoids a cycle-boundary repeat. Not account, cloud, D1, or
 * atomic cross-tab persistence. Clear browser storage to reset that browser.
 */
export function createLocalStarterRotation(options: LocalStarterRotationOptions = {}) {
  let storage: LocalRotationStorage | null = options.storage ?? null;
  if (options.storage === undefined) {
    try { storage = typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage; }
    catch { storage = null; }
  }
  const key = options.storageKey || 'scene-script-studio:portable-starter-rotation:v1';
  const seed = typeof options.seed === 'number' && Number.isFinite(options.seed)
    ? options.seed >>> 0 : Math.floor(Math.random() * 0x100000000) >>> 0;
  let state: RotationRecord = { version: 1, catalogue: ROTATION_CATALOGUE, seed, cursor: 0 };
  const restore = () => {
    if (!storage) return;
    try {
      const raw = storage.getItem(key);
      if (!raw) return;
      const saved = object(JSON.parse(raw));
      if (saved.version === 1 && saved.catalogue === ROTATION_CATALOGUE &&
          Number.isInteger(saved.seed) && Number.isSafeInteger(saved.cursor) &&
          Number(saved.seed) >= 0 && Number(saved.seed) <= 0xffffffff && Number(saved.cursor) >= 0 && Number(saved.cursor) < Number.MAX_SAFE_INTEGER) {
        // Another sequential caller may have advanced the same browser's rotation.
        state = { version: 1, catalogue: ROTATION_CATALOGUE, seed: Number(saved.seed), cursor: Number(saved.cursor) };
      }
    } catch { /* Corrupt/unavailable storage must not block planning; retain memory state. */ }
  };
  restore();
  return {
    next(): LocalStarterPick {
      restore();
      const position = state.cursor % STORY_STARTERS.length;
      const cycle = Math.floor(state.cursor / STORY_STARTERS.length);
      const index = rotatedIndex(STORY_STARTERS.length, state.seed, state.cursor);
      const starter = STORY_STARTERS[index];
      state = { ...state, cursor: state.cursor + 1 };
      let persistence: LocalStarterPick['persistence'] = 'memory-only';
      if (storage) {
        try { storage.setItem(key, JSON.stringify(state)); persistence = 'browser-local'; }
        catch { storage = null; }
      }
      return {
        starter, state: starterToStudioState(starter), cycle, position, persistence,
        notice: persistence === 'browser-local'
          ? 'Non-repeating rotation saved only in this browser profile on this device and origin. It is not account-synced or D1-backed, and simultaneous tabs are not atomic.'
          : 'Browser storage is unavailable or disabled. Non-repeating rotation lasts only for this in-memory session.',
      };
    },
  };
}
