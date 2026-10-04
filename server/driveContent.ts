import { createHash } from 'node:crypto';
import type { DriveBackupInput } from '../src/utils/driveBackupTypes';
export { validateDriveBackup, renderDriveDocuments } from '../src/utils/driveContent';
export const backupDigest = (value: DriveBackupInput) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
