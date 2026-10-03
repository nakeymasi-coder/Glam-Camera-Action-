import type { PresetState } from '../types';

export interface DriveBackupInput {
  projectId: string;
  title: string;
  savedAt: string;
  state: PresetState;
}
export interface DriveBackupStatus {
  configured: boolean;
  connected: boolean;
  message: string;
  csrfToken?: string;
}
export interface DriveBackupResult {
  status: 'synced' | 'not-configured' | 'disconnected' | 'superseded' | 'failed';
  message: string;
  savedAt?: string;
  briefUrl?: string;
  continuityUrl?: string;
}
export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const DRIVE_NOT_CONFIGURED = 'Google Drive backup is not configured for this app yet. Your local saves still work.';
