import type { PresetState } from '../types';

export const PROJECT_BACKUPS_KEY = 'scene_script_project_backups_v1';
export interface ProjectBackup {
  projectId?: string;
  id: string;
  title: string;
  createdAt: string;
  draft: PresetState;
  production: PresetState;
  prompt: string;
  overrideText: string;
  hasGeneratedOnce: boolean;
}

export function readProjectBackups(): ProjectBackup[] {
  const value = JSON.parse(localStorage.getItem(PROJECT_BACKUPS_KEY) || '[]');
  if (!Array.isArray(value) || value.some(item => !item || typeof item.id !== 'string' || (item.projectId !== undefined && (typeof item.projectId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(item.projectId))) || typeof item.title !== 'string' || typeof item.createdAt !== 'string' || !item.draft || !item.production || typeof item.prompt !== 'string' || typeof item.overrideText !== 'string' || typeof item.hasGeneratedOnce !== 'boolean')) {
    throw Error('Your project backups could not be read. Existing data has not been changed.');
  }
  return value;
}

/** Persist first: if storage is full or unavailable, callers must not switch drafts. */
export function saveProjectBackup(project: Omit<ProjectBackup, 'id' | 'title' | 'createdAt'>): ProjectBackup[] {
  const backup: ProjectBackup = {
    ...project,
    id: crypto.randomUUID(),
    title: project.draft.storyIdea.trim().slice(0, 80) || 'Untitled project',
    createdAt: new Date().toISOString(),
  };
  const backups = [backup, ...readProjectBackups()];
  localStorage.setItem(PROJECT_BACKUPS_KEY, JSON.stringify(backups));
  return backups;
}
