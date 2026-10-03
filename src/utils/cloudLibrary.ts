import type { SavedPromptItem } from '../types';
import { normalizeStudioState } from './studioAdapter';

export const CLOUD_LIBRARY_STORAGE_KEY = 'scene_script_cloud_library_v1';
export function readLibrary(raw: string | null): SavedPromptItem[] {
  const value = JSON.parse(raw || '[]');
  if (!Array.isArray(value) || value.some(item => !item || typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.masterPrompt !== 'string' || !item.state)) {
    throw Error('Saved stories could not be read. Existing browser data has not been changed.');
  }
  return value.map(item => ({ ...item, state: normalizeStudioState(item.state) }));
}
/** Incoming records are scoped by the caller's auth generation, then deduplicated here. */
export function mergeCloudStories(previous: SavedPromptItem[], incoming: SavedPromptItem[]): SavedPromptItem[] {
  const seen = new Set(previous.map(item => item.id));
  const additions = incoming.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
  return additions.length ? [...additions, ...previous] : previous;
}
