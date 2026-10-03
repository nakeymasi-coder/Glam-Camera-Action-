import { createContext, useContext } from 'react';

/** UI/cache separation only. Browser-profile owners can still inspect localStorage. */
export const WORKSPACE_STORAGE_PREFIX = 'scene_script_workspace_v2:';
export const LEGACY_WORKSPACE_KEYS = [
  'scene_script_project_id_v1', 'scene_script_draft_state_v1', 'scene_script_production_v2',
  'scene_script_library_v1', 'scene_script_project_backups_v1', 'scene_script_templates_v1',
  'scene_script_reusable_brief_v2',
  ...['01', '02', '03', '04', '05'].map(step => 'scene_script_preset_choices_v2_' + step),
];
export type WorkspaceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & { keyFor: (key: string) => string };
export function workspaceStorageKey(uid: string | null, key: string, recovery = false) {
  return WORKSPACE_STORAGE_PREFIX + (recovery ? 'recovery' : uid === null ? 'guest' : 'user:' + encodeURIComponent(uid)) + ':' + key;
}
export function createWorkspaceStorage(uid: string | null, recovery = false, backing?: Storage): WorkspaceStorage {
  const source = () => backing ?? localStorage;
  const keyFor = (key: string) => workspaceStorageKey(uid, key, recovery);
  return {
    keyFor,
    getItem(key) {
      const value = source().getItem(keyFor(key));
      // Recovery is explicit and isolated. Original data is never moved, claimed or overwritten.
      if (value === null && recovery && LEGACY_WORKSPACE_KEYS.includes(key)) return source().getItem(key);
      return value === '__gca_removed__' ? null : value;
    },
    setItem(key, value) { source().setItem(keyFor(key), value); },
    removeItem(key) {
      // Tombstone prevents deleted/reset recovery content reappearing via the legacy fallback.
      if (recovery) source().setItem(keyFor(key), '__gca_removed__');
      else source().removeItem(keyFor(key));
    },
  };
}
const defaultStorage: WorkspaceStorage = {
  keyFor: key => key,
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: key => localStorage.removeItem(key),
};
export const WorkspaceStorageContext = createContext<WorkspaceStorage>(defaultStorage);
export const useWorkspaceStorage = () => useContext(WorkspaceStorageContext);

export function readLegacyBrowserData(storage: Pick<Storage, 'getItem'> = localStorage) {
  const records: Record<string, string> = {};
  for (const key of LEGACY_WORKSPACE_KEYS) {
    const raw = storage.getItem(key);
    if (raw !== null) records[key] = raw;
  }
  return { format: 'gca-legacy-browser-recovery', version: 1, records };
}
export function downloadLegacyBrowserData() {
  const data = readLegacyBrowserData();
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'glam-camera-action-older-browser-data.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
