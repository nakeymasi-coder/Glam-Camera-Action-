import type { PresetState } from '../types';
import { normalizeStudioState, parseProductionSnapshot } from './studioAdapter';
import { createLocalId } from './projectIds';

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
export interface StoryTemplateLibrary {
  format: 'gca-story-template-library';
  version: 1;
  templates: StoryTemplate[];
}
export const STORY_TEMPLATE_STORAGE_KEY = 'scene_script_templates_v1';
export const TEMPLATE_LIMITS = {
  files: 50,
  templates: 500,
  fileBytes: 8 * 1024 * 1024,
  totalBytes: 16 * 1024 * 1024,
  templateBytes: 2 * 1024 * 1024,
  libraryBytes: 8 * 1024 * 1024,
  projectCharacters: 500,
  projectBytes: 2 * 1024 * 1024,
} as const;
const STRUCTURE_DETAILS = ['storyGoal', 'obstacle', 'endingChange', 'scene1Beat', 'scene2Beat', 'scene3Beat', 'targetDuration'] as const;
const byteLength = (text: string) => new TextEncoder().encode(text).byteLength;
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Could not read this template.';

/** Scope exports so a structure or archetype never carries unrelated project details. */
export function createStoryTemplate(title: string, kind: TemplateKind, input: PresetState): StoryTemplate {
  if (!title.trim()) throw Error('Give your template a name.');
  if (!Object.hasOwn(TEMPLATE_TYPES, kind)) throw Error('Choose a supported template type.');
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
  if (byteLength(json) > TEMPLATE_LIMITS.templateBytes) throw Error('Each template must be 2 MB or smaller.');
  const value: unknown = JSON.parse(json);
  if (!isRecord(value) || value.format !== 'gca-story-template' || value.version !== 1 || typeof value.title !== 'string' || !value.title.trim() || typeof value.kind !== 'string' || !Object.hasOwn(TEMPLATE_TYPES, value.kind)) {
    throw Error('Choose a version 1 Glam, Camera, Action! template JSON file.');
  }
  if (Object.keys(value).some(key => !['format', 'version', 'title', 'kind', 'state'].includes(key))) throw Error('Unknown template field.');
  const snapshot = parseProductionSnapshot(JSON.stringify({ version: 1, state: value.state, overrideText: '' }));
  return createStoryTemplate(value.title, value.kind as TemplateKind, snapshot.state);
}

/** Canonical content, not import order or randomly allocated cast ids, identifies a template. */
function templateContent(template: StoryTemplate): string {
  const state = normalizeStudioState(template.state);
  const value = { ...template, title: template.title.trim(), state: {
    ...state, characters: state.characters?.map(({ id: _id, ...character }) => character),
  } };
  const canonicalize = (input: unknown): unknown => Array.isArray(input) ? input.map(canonicalize)
    : isRecord(input) ? Object.fromEntries(Object.keys(input).sort().map(key => [key, canonicalize(input[key])])) : input;
  return JSON.stringify(canonicalize(value));
}

/** Stable content-derived UI ids; no schema change is needed for legacy version 1 files. */
export function storyTemplateId(template: StoryTemplate): string {
  const content = templateContent(template);
  let a = 0x811c9dc5, b = 0x9e3779b9, c = 0x85ebca6b, d = 0xc2b2ae35;
  for (let index = 0; index < content.length; index++) {
    const code = content.charCodeAt(index);
    a = Math.imul(a ^ code, 0x01000193);
    b = Math.imul(b ^ (code + 1), 0x01000193);
    c = Math.imul(c ^ (code + 2), 0x01000193);
    d = Math.imul(d ^ (code + 3), 0x01000193);
  }
  return 'template-' + [a, b, c, d].map(hash => (hash >>> 0).toString(16).padStart(8, '0')).join('');
}

function uniqueTemplates(templates: StoryTemplate[]): StoryTemplate[] {
  const contentById = new Map<string, string>();
  return templates.filter(template => {
    const id = storyTemplateId(template);
    const content = templateContent(template);
    const existing = contentById.get(id);
    if (existing !== undefined && existing !== content) throw Error('Template identifiers conflict. No templates were changed.');
    if (existing !== undefined) return false;
    contentById.set(id, content);
    return true;
  });
}

/** Read only; malformed or unsupported saved data is never silently reset. */
export function readStoryTemplateLibrary(raw: string | null): StoryTemplate[] {
  if (raw === null) return [];
  if (byteLength(raw) > TEMPLATE_LIMITS.libraryBytes) throw Error('Saved template library exceeds the 8 MB safety limit.');
  const saved: unknown = JSON.parse(raw);
  if (!Array.isArray(saved)) throw Error('Saved templates could not be read.');
  if (saved.length > TEMPLATE_LIMITS.templates) throw Error(`Saved library exceeds the ${TEMPLATE_LIMITS.templates}-template limit.`);
  return uniqueTemplates(saved.map(value => parseStoryTemplate(JSON.stringify(value))));
}

export interface TemplateImportSource { name: string; text?: string; error?: string }
export interface TemplateImportPreview {
  sources: number;
  found: number;
  valid: number;
  duplicates: number;
  additions: StoryTemplate[];
  counts: Record<TemplateKind, number>;
  characterCount: number;
  errors: string[];
  /** Exact storage revision reviewed by the user. A changed library requires another preview. */
  previousRaw: string | null;
  next: StoryTemplate[];
}

/** Validate every file/entry first. This function performs no storage or draft writes. */
export function previewStoryTemplateImport(sources: TemplateImportSource[], previousRaw: string | null): TemplateImportPreview {
  const preview: TemplateImportPreview = {
    sources: sources.length, found: 0, valid: 0, duplicates: 0, additions: [],
    counts: { structure: 0, characters: 0, brief: 0 }, characterCount: 0,
    errors: [], previousRaw, next: [],
  };
  let existing: StoryTemplate[] = [];
  try { existing = readStoryTemplateLibrary(previousRaw); }
  catch (error) { preview.errors.push(`Saved library: ${errorMessage(error)} Existing data has not been changed.`); }
  if (!sources.length) preview.errors.push('Choose at least one JSON file.');
  if (sources.length > TEMPLATE_LIMITS.files) preview.errors.push(`Choose up to ${TEMPLATE_LIMITS.files} files at once.`);
  const totalBytes = sources.reduce((total, source) => total + byteLength(source.text || ''), 0);
  if (totalBytes > TEMPLATE_LIMITS.totalBytes) preview.errors.push('Selected files must total 16 MB or less.');
  const seen = new Map(existing.map(template => [storyTemplateId(template), templateContent(template)]));
  for (const source of sources.slice(0, TEMPLATE_LIMITS.files)) {
    if (source.error) { preview.errors.push(`${source.name}: ${source.error}`); continue; }
    if (typeof source.text !== 'string') { preview.errors.push(`${source.name}: File contents could not be read.`); continue; }
    if (byteLength(source.text) > TEMPLATE_LIMITS.fileBytes) { preview.errors.push(`${source.name}: Each file must be 8 MB or smaller.`); continue; }
    if (totalBytes > TEMPLATE_LIMITS.totalBytes) continue;
    let value: unknown;
    try { value = JSON.parse(source.text); }
    catch { preview.errors.push(`${source.name}: Invalid JSON. Check commas, quotes and brackets.`); continue; }
    let entries: unknown[];
    if (Array.isArray(value)) entries = value;
    else if (isRecord(value) && value.format === 'gca-story-template-library') {
      if (value.version !== 1) { preview.errors.push(`${source.name}: Unsupported library version. Expected version 1.`); continue; }
      const unknownFields = Object.keys(value).filter(key => !['format', 'version', 'templates'].includes(key));
      if (unknownFields.length) preview.errors.push(`${source.name}: Unknown library fields: ${unknownFields.join(', ')}.`);
      if (!Array.isArray(value.templates)) { preview.errors.push(`${source.name}: Library templates must be an array.`); continue; }
      entries = value.templates;
    } else entries = [value];
    if (!entries.length) preview.errors.push(`${source.name}: The template library is empty.`);
    preview.found += entries.length;
    if (preview.found > TEMPLATE_LIMITS.templates) {
      preview.errors.push(`${source.name}: Import at most ${TEMPLATE_LIMITS.templates} templates in one batch.`);
      continue;
    }
    entries.forEach((entry, index) => {
      const label = `${source.name}, template ${index + 1}`;
      try {
        const template = parseStoryTemplate(JSON.stringify(entry));
        const id = storyTemplateId(template);
        const content = templateContent(template);
        if (seen.has(id) && seen.get(id) !== content) throw Error('Template identifiers conflict.');
        preview.valid++;
        if (seen.has(id)) { preview.duplicates++; return; }
        seen.set(id, content);
        preview.additions.push(template);
        preview.counts[template.kind]++;
        preview.characterCount += template.state.characters?.length || 0;
      } catch (error) { preview.errors.push(`${label}: ${errorMessage(error)}`); }
    });
  }
  // Keep the selected files' order. Existing cards keep their order and contents.
  preview.next = [...preview.additions, ...existing];
  if (preview.next.length > TEMPLATE_LIMITS.templates) preview.errors.push(`The browser library can contain up to ${TEMPLATE_LIMITS.templates} templates. This import would exceed that limit.`);
  if (byteLength(JSON.stringify(preview.next)) > TEMPLATE_LIMITS.libraryBytes) preview.errors.push('The combined library exceeds the 8 MB safety limit. Import fewer templates.');
  return preview;
}

/** One write after explicit preview confirmation, with a stale-preview guard. */
export function commitStoryTemplateImport(preview: TemplateImportPreview, storage: Pick<Storage, 'getItem' | 'setItem'>): StoryTemplate[] {
  if (preview.errors.length) throw Error('Fix every import error before saving. Nothing has been imported.');
  if (!preview.additions.length) throw Error('Every template is already in your library. Nothing needs to be imported.');
  if (storage.getItem(STORY_TEMPLATE_STORAGE_KEY) !== preview.previousRaw) throw Error('Your template library changed after this preview. Select the files again to review the current library. Nothing was imported.');
  // localStorage.setItem is atomic: quota/permission errors leave the previous value intact.
  storage.setItem(STORY_TEMPLATE_STORAGE_KEY, JSON.stringify(preview.next));
  return preview.next;
}

const joinNotes = (current: string, incoming: string) => !incoming.trim() || current === incoming ? current : !current.trim() ? incoming : current + '\n\n' + incoming;

/** Merge keeps existing text, adds template notes and creates independent cast ids. */
export function applyStoryTemplate(current: PresetState, template: StoryTemplate, mode: 'fresh' | 'merge'): PresetState {
  const incoming = normalizeStudioState(template.state);
  incoming.characters = incoming.characters?.map(c => ({ ...c, id: createLocalId() }));
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

/** Prepare the entire result before App backs up or writes anything. No partial project loads. */
export function applyStoryTemplates(current: PresetState, templates: StoryTemplate[], mode: 'fresh' | 'merge'): PresetState {
  if (!templates.length) throw Error('Select at least one template.');
  if (templates.length > TEMPLATE_LIMITS.templates) throw Error(`Select up to ${TEMPLATE_LIMITS.templates} templates.`);
  const checked = uniqueTemplates(templates.map(template => parseStoryTemplate(JSON.stringify(template))));
  let next = mode === 'fresh' ? normalizeStudioState() : normalizeStudioState(current);
  for (const [index, template] of checked.entries()) {
    next = applyStoryTemplate(next, template, mode === 'fresh' && index === 0 ? 'fresh' : 'merge');
    if ((next.characters?.length || 0) > TEMPLATE_LIMITS.projectCharacters) throw Error(`A project can load up to ${TEMPLATE_LIMITS.projectCharacters} character cards at once. Choose fewer archetypes.`);
    if (byteLength(JSON.stringify(next)) > TEMPLATE_LIMITS.projectBytes) throw Error('The combined draft exceeds 2 MB. Choose fewer templates.');
  }
  return next;
}

function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadStoryTemplate(template: StoryTemplate) {
  downloadJson(template, (template.title.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80) || 'story') + '.gca-template.json');
}
export function createStoryTemplateLibrary(templates: StoryTemplate[]): StoryTemplateLibrary {
  if (!templates.length) throw Error('Save or import a template before exporting the library.');
  if (templates.length > TEMPLATE_LIMITS.templates) throw Error(`Export up to ${TEMPLATE_LIMITS.templates} templates.`);
  const library: StoryTemplateLibrary = { format: 'gca-story-template-library', version: 1, templates: uniqueTemplates(templates.map(template => parseStoryTemplate(JSON.stringify(template)))) };
  if (byteLength(JSON.stringify(library, null, 2)) > TEMPLATE_LIMITS.fileBytes) throw Error('The exported library exceeds 8 MB. Download individual templates instead.');
  return library;
}
export function downloadStoryTemplateLibrary(templates: StoryTemplate[]) {
  downloadJson(createStoryTemplateLibrary(templates), 'story-library.gca-templates.json');
}
