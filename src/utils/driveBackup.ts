import { auth, onAuthStateChanged } from '../lib/firebase';
import type { DriveBackupInput, DriveBackupResult, DriveBackupStatus } from './driveBackupTypes';
import { DRIVE_NOT_CONFIGURED } from './driveBackupTypes';
export type { DriveBackupInput, DriveBackupResult, DriveBackupStatus } from './driveBackupTypes';

// Base44 serves the SPA without the optional Express Drive endpoints.
// This public build flag contains no credentials; normal server builds keep using the adapter.
const driveBackupDisabled = import.meta.env.VITE_DRIVE_BACKUP_DISABLED === 'true';
const staticDriveStatus = (): DriveBackupStatus => ({ configured: false, connected: false, message: 'Google Drive backup is unavailable in this Base44-hosted version. Private Drive setup is pending. Your local saves still work.' });
export interface DriveBackupView { status: DriveBackupStatus | null; result: DriveBackupResult | null; busy: boolean; }
let view: DriveBackupView = { status: driveBackupDisabled ? staticDriveStatus() : null, result: null, busy: false };
let epoch = 0;
let owner = auth.currentUser?.uid || null;
const listeners = new Set<(view: DriveBackupView) => void>();
const active = new Set<AbortController>();
const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; resolve: (result: DriveBackupResult) => void }>();
let serial: Promise<unknown> = Promise.resolve();
const superseded = (): DriveBackupResult => ({ status: 'superseded', message: 'This Drive request was cancelled or replaced. Your local save is safe.' });
function publish(patch: Partial<DriveBackupView>) { view = { ...view, ...patch }; listeners.forEach(listener => listener(view)); }
export function subscribeDriveBackup(listener: (view: DriveBackupView) => void) { listeners.add(listener); listener(view); return () => { listeners.delete(listener); }; }
export function cancelPendingDriveBackups() {
  epoch++;
  for (const item of pending.values()) { clearTimeout(item.timer); item.resolve(superseded()); }
  pending.clear();
  active.forEach(controller => controller.abort());
  active.clear();
  publish({ result: null, busy: false });
}
onAuthStateChanged(auth, user => {
  if ((user?.uid || null) !== owner) { cancelPendingDriveBackups(); owner = user?.uid || null; publish({ status: driveBackupDisabled ? staticDriveStatus() : null, result: null }); }
});
const sameOwner = (uid: string | null, version: number) => version === epoch && (auth.currentUser?.uid || null) === uid;
async function api(path: string, method: 'GET' | 'POST', uid: string | null, version: number, data?: unknown) {
  if (driveBackupDisabled) throw Error(staticDriveStatus().message);
  const user = auth.currentUser;
  if ((user?.uid || null) !== uid || version !== epoch) throw Error('Drive request cancelled.');
  const token = user ? await user.getIdToken() : undefined;
  if (!sameOwner(uid, version)) throw Error('Drive request cancelled.');
  const controller = new AbortController();
  active.add(controller);
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(`/api/drive/${path}`, { method, credentials: 'same-origin', cache: 'no-store', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(method === 'POST' ? { 'Content-Type': 'application/json', 'X-Drive-CSRF': view.status?.csrfToken || '' } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }), signal: controller.signal });
    if (!sameOwner(uid, version)) throw Error('Drive request cancelled.');
    const result = await response.json();
    if (!response.ok) throw Error(typeof result.message === 'string' ? result.message : 'Drive backup did not complete.');
    return result;
  } finally { clearTimeout(timer); active.delete(controller); }
}
export async function getDriveBackupStatus(): Promise<DriveBackupStatus> {
  if (driveBackupDisabled) {
    const status = staticDriveStatus();
    publish({ status });
    return status;
  }
  const uid = auth.currentUser?.uid || null;
  const version = epoch;
  const status = await api('status', 'GET', uid, version) as DriveBackupStatus;
  if (sameOwner(uid, version)) publish({ status });
  return status;
}
export async function connectDriveBackup(): Promise<void> {
  if (driveBackupDisabled) throw Error(staticDriveStatus().message);
  if (!auth.currentUser) throw Error('Use Sign in with Google first, then connect Drive.');
  const uid = auth.currentUser.uid, version = epoch;
  const status = await getDriveBackupStatus();
  if (!status.configured) throw Error(DRIVE_NOT_CONFIGURED);
  const result = await api('connect', 'POST', uid, version, {});
  const url = new URL(result.authorizationUrl);
  if (url.origin !== 'https://accounts.google.com' || url.pathname !== '/o/oauth2/v2/auth') throw Error('Drive connection URL could not be verified.');
  if (sameOwner(uid, version)) window.location.assign(url.href);
}
export async function disconnectDriveBackup(): Promise<DriveBackupStatus> {
  cancelPendingDriveBackups();
  if (driveBackupDisabled) return getDriveBackupStatus();
  const uid = auth.currentUser?.uid || null, version = epoch;
  await getDriveBackupStatus();
  const status = await api('disconnect', 'POST', uid, version, {}) as DriveBackupStatus;
  if (sameOwner(uid, version)) publish({ status, result: null });
  return status;
}
/** Call only AFTER the requested local Save succeeds. Explicit Save only, never on edits. */
export function enqueueDriveBackup(input: DriveBackupInput): Promise<DriveBackupResult> {
  if (driveBackupDisabled) {
    const status = staticDriveStatus();
    const result: DriveBackupResult = { status: 'not-configured', message: status.message };
    publish({ status, result, busy: false });
    return Promise.resolve(result);
  }
  const uid = auth.currentUser?.uid || null;
  const version = epoch;
  // A task owns an immutable saved snapshot and the authenticated user at Save time.
  const snapshot = structuredClone(input);
  if (!uid) return Promise.resolve({ status: 'disconnected', message: 'Saved locally. Sign in and connect Drive for private backups.' });
  const previous = pending.get(input.projectId);
  if (previous) { clearTimeout(previous.timer); previous.resolve(superseded()); }
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      pending.delete(input.projectId);
      const task = async () => {
        if (!sameOwner(uid, version)) return resolve(superseded());
        publish({ busy: true, result: null });
        let result: DriveBackupResult;
        try {
          const status = await getDriveBackupStatus();
          if (!sameOwner(uid, version)) return resolve(superseded());
          if (!status.configured) result = { status: 'not-configured', message: DRIVE_NOT_CONFIGURED };
          else if (!status.connected) result = { status: 'disconnected', message: 'Saved locally. Connect Drive to enable private backups.' };
          else result = await api('backup', 'POST', uid, version, snapshot) as DriveBackupResult;
        } catch (error) {
          result = { status: 'failed', message: error instanceof Error && error.name !== 'AbortError' ? error.message : 'Drive did not confirm this backup. Your local save is safe; use Save Prompt to retry.' };
        } finally { if (sameOwner(uid, version)) publish({ busy: false }); }
        if (!sameOwner(uid, version)) return resolve(superseded());
        publish({ result });
        resolve(result);
      };
      serial = serial.then(task, task);
    }, 350);
    pending.set(input.projectId, { timer, resolve });
  });
}
