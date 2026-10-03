import { createHash } from 'node:crypto';
import type { DriveBackupInput } from '../src/utils/driveBackupTypes';
import { parseProductionSnapshot } from '../src/utils/studioAdapter';
import { characterIdentityContract, characterSceneContract, sceneBeat } from '../src/utils/characterContinuity';

export function validateDriveBackup(value: unknown): DriveBackupInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid backup.');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).some(key => !['projectId', 'title', 'savedAt', 'state'].includes(key))) throw Error('Unknown backup field.');
  if (typeof data.projectId !== 'string' || (!/^[A-Za-z0-9_-]{1,128}$/.test(data.projectId) || ['__proto__', 'constructor', 'prototype'].includes(data.projectId))) throw Error('Invalid project ID.');
  if (typeof data.title !== 'string' || data.title.length > 200) throw Error('Invalid title.');
  if (typeof data.savedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(data.savedAt) || !Number.isFinite(Date.parse(data.savedAt)) || new Date(data.savedAt).toISOString() !== data.savedAt || Date.parse(data.savedAt) > Date.now() + 300_000) throw Error('Invalid save time.');
  const stateJson = JSON.stringify({ version: 1, state: data.state, overrideText: '' });
  if (stateJson.length > 180_000) throw Error('Drive backup supports up to 180,000 snapshot characters. Shorten this snapshot; the full local save is safe.');
  // Use the same strict import parser as local production snapshots.
  const { state } = parseProductionSnapshot(stateJson);
  if ((state.characters?.length || 0) > 100) throw Error('Drive backup supports up to 100 cast members per project. The full local save is safe.');
  return { projectId: data.projectId, title: data.title.trim() || 'Untitled project', savedAt: data.savedAt, state };
}
const clean = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const label = (key: string) => key.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/^./, char => char.toUpperCase());
export function renderDriveDocuments(input: DriveBackupInput) {
  const { state } = input;
  const header = `${input.title}\nSaved from Glam, Camera, Action! at ${input.savedAt}\n\nThis app-managed backup is replaced on Save. Keep personal edits in a separate copy.\n`;
  const details = Object.entries(state.optionalDetails).filter(([, value]) => value?.trim()).map(([key, value]) => `${label(key)}\n${value}`).join('\n\n');
  const categories = [['Character types', state.characterTypes, state.customCharacter], ['Genres', state.genres, state.customGenre], ['Visual styles', state.visualStyles, state.customStyle], ['Video formats', state.videoFormats, state.customFormat], ['Energy / tone', state.energyTones, state.customTone]].map(([name, values, custom]) => `${name}: ${(values as string[]).join(', ')}${custom ? `; ${custom}` : ''}`).join('\n');
  return {
    brief: clean(`${header}\nPROJECT BRIEF\n\nStory idea\n${state.storyIdea || 'Not supplied'}\n\n${categories}\n\n${details}\n`),
    continuity: clean(`${header}\nCONTINUITY BIBLE\n\n${characterIdentityContract(state.characters || []) || 'No structured character roster saved.'}\n\nLegacy character notes\n${state.optionalDetails.characterNames || 'Not supplied'}\n\nCharacter goals\n${state.optionalDetails.characterGoals || 'Not supplied'}\n\nSetting\n${state.optionalDetails.settingLocation || 'Not supplied'}\n\nEra\n${state.optionalDetails.era || 'Not supplied'}\n\nVisual direction\n${state.visualStyles.join(', ')} ${state.customStyle}\n\nCamera direction\n${state.optionalDetails.cameraDirection || 'Not supplied'}\n\nAtmosphere\n${state.optionalDetails.atmosphereDetails || 'Not supplied'}\n\nContinuity notes\n${state.optionalDetails.continuityNotes || 'Not supplied'}\n\n${[1, 2, 3].map(scene => `SCENE ${scene}\nBeat: ${sceneBeat(state.optionalDetails, scene) || 'Not supplied'}\n${characterSceneContract(state.characters || [], scene)}`).join('\n\n')}\n`),
  };
}
export const backupDigest = (value: DriveBackupInput) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
