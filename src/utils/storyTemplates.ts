import type { PresetState } from '../types';
import { normalizeStudioState, parseProductionSnapshot } from './studioAdapter';

export const TEMPLATE_TYPES = {
  structure: 'Story structure',
  characters: 'Character archetypes',
  brief: 'Complete project brief',
} as const;
export type TemplateKind = keyof typeof TEMPLATE_TYPES;
export interface StoryTemplate {
  format: 'gca-story-template';
  version: 1;
  title: string;
  kind: TemplateKind;
  state: PresetState;
}
const STRUCTURE_DETAILS = ['storyGoal', 'obstacle', 'endingChange', 'scene1Beat', 'scene2Beat', 'scene3Beat', 'targetDuration'] as const;

/** Scope exports so a structure or archetype never carries unrelated project details. */
export function createStoryTemplate(title: string, kind: TemplateKind, input: PresetState): StoryTemplate {
  if (!title.trim()) throw Error('Give your template a name.');
  const source = normalizeStudioState(input);
  const state = normalizeStudioState();
  if (kind === 'brief') return { format: 'gca-story-template', version: 1, title: title.trim(), kind, state: source };
  if (kind === 'structure') {
    state.genres = source.genres;
    state.customGenre = source.customGenre;
    STRUCTURE_DETAILS.forEach(key => { state.optionalDetails[key] = source.optionalDetails[key] || ''; });
  } else {
    if (!source.characters?.length) throw Error('Add at least one character in the Characters tab first.');
    state.characterTypes = source.characterTypes;
    state.customCharacter = source.customCharacter;
    state.characters = source.characters.map(c => ({ ...c, scenes: c.scenes.map(link => ({ ...link, linked: false, action: '', emotion: '' })) }));
  }
  return { format: 'gca-story-template', version: 1, title: title.trim(), kind, state };
}

export function parseStoryTemplate(json: string): StoryTemplate {
  const value = JSON.parse(json);
  if (!value || value.format !== 'gca-story-template' || value.version !== 1 || typeof value.title !== 'string' || !value.title.trim() || !Object.hasOwn(TEMPLATE_TYPES, value.kind)) {
    throw Error('Choose a version 1 Glam, Camera, Action! template JSON file.');
  }
  if (Object.keys(value).some(key => !['format', 'version', 'title', 'kind', 'state'].includes(key))) throw Error('Unknown template field.');
  const snapshot = parseProductionSnapshot(JSON.stringify({ version: 1, state: value.state, overrideText: '' }));
  return createStoryTemplate(value.title, value.kind, snapshot.state);
}
const joinNotes = (current: string, incoming: string) => !incoming.trim() || current === incoming ? current : !current.trim() ? incoming : current + '\n\n' + incoming;

/** Merge keeps existing text, adds template notes and creates independent cast ids. */
export function applyStoryTemplate(current: PresetState, template: StoryTemplate, mode: 'fresh' | 'merge'): PresetState {
  const incoming = normalizeStudioState(template.state);
  incoming.characters = incoming.characters?.map(c => ({ ...c, id: crypto.randomUUID() }));
  if (mode === 'fresh') return incoming;
  const next = normalizeStudioState(current);
  next.characters = [...(next.characters || []), ...(incoming.characters || [])];
  for (const key of ['characterTypes', 'genres', 'visualStyles', 'videoFormats', 'energyTones'] as const) {
    const values = incoming[key].filter(value => value !== 'None');
    // The builder's single-choice families remain single-choice when merging.
    if (key === 'characterTypes' || key === 'videoFormats') {
      if (next[key].every(value => value === 'None') && values.length) next[key] = values;
    } else {
      const combined = [...new Set([...next[key].filter(value => value !== 'None'), ...values])];
      next[key] = combined.length ? combined : ['None'];
    }
  }
  for (const key of ['storyIdea', 'customCharacter', 'customGenre', 'customStyle', 'customFormat', 'customTone'] as const) next[key] = joinNotes(next[key], incoming[key]);
  for (const key of Object.keys(incoming.optionalDetails) as (keyof PresetState['optionalDetails'])[]) {
    const value = incoming.optionalDetails[key] || '';
    next.optionalDetails[key] = key === 'targetDuration' ? next.optionalDetails[key] || value : joinNotes(next.optionalDetails[key] || '', value);
  }
  return next;
}

export function downloadStoryTemplate(template: StoryTemplate) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = (template.title.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80) || 'story') + '.gca-template.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
