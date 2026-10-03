import { createHash } from 'node:crypto';
import type { DriveOwner, DriveProject, EncryptedDriveStore } from './driveStore';
import type { DriveBackupInput, DriveBackupResult } from '../src/utils/driveBackupTypes';
import { backupDigest, renderDriveDocuments } from './driveContent';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const DOCS = 'https://docs.googleapis.com/v1/documents';
const idPattern = /^[A-Za-z0-9_-]{1,200}$/;
export const isDocumentId = (value: unknown): value is string => typeof value === 'string' && idPattern.test(value);
export class GoogleBackupError extends Error { constructor(message: string, public status = 502, public providerStatus?: number) { super(message); } }
export interface GoogleConfig { clientId: string; clientSecret: string; origin: string; }

export function createGoogleDriveService(config: GoogleConfig, store: EncryptedDriveStore, fetcher: typeof fetch = fetch) {
  async function request(url: string, init: RequestInit, attempts = 1): Promise<any> {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetcher(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(15_000) });
        if (response.ok) return response.status === 204 ? {} : await response.json();
        if ((response.status === 429 || response.status >= 500) && attempt + 1 < attempts) { await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1))); continue; }
        throw new GoogleBackupError(response.status === 401 ? 'Drive access expired. Disconnect and reconnect to continue.' : 'Google Drive could not complete this backup. Your local save is safe.', response.status === 401 ? 401 : 502, response.status);
      } catch (error) {
        if (error instanceof GoogleBackupError) throw error;
        if (attempt + 1 >= attempts) throw new GoogleBackupError('Drive did not confirm this backup. Your local save is safe.');
      }
    }
  }
  const json = (token: string, method = 'GET', body?: unknown): RequestInit => ({ method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  async function refresh(owner: DriveOwner) {
    if (!owner.refreshToken) throw new GoogleBackupError('Connect your private Google Drive to enable backup.', 409);
    const value = await request('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: 'refresh_token', refresh_token: owner.refreshToken }) });
    if (typeof value.access_token !== 'string') throw new GoogleBackupError('Drive connection needs to be renewed.', 401);
    return value.access_token as string;
  }
  async function ensureDocument(uid: string, owner: DriveOwner, project: DriveProject, projectId: string, kind: 'brief' | 'continuity', title: string, token: string) {
    const idKey = kind === 'brief' ? 'briefId' : 'continuityId';
    const pendingKey = kind === 'brief' ? 'briefPending' : 'continuityPending';
    if (project[idKey]) {
      if (!isDocumentId(project[idKey])) throw new GoogleBackupError('Invalid saved document reference.');
      return project[idKey]!;
    }
    const marker = createHash('sha256').update(`${uid}\0${projectId}\0${kind}`).digest('hex');
    const query = `trashed = false and mimeType = 'application/vnd.google-apps.document' and appProperties has { key='glamBackup' and value='${marker}' }`;
    const found = await request(`${DRIVE}/files?${new URLSearchParams({ q: query, fields: 'files(id),nextPageToken', pageSize: '10', spaces: 'drive' })}`, json(token), 2);
    if (!Array.isArray(found.files) || found.files.length > 1 || found.nextPageToken) throw new GoogleBackupError('Duplicate backup documents need review before this project can sync.');
    if (found.files.length === 1 && isDocumentId(found.files[0].id)) {
      project[idKey] = found.files[0].id;
      project[pendingKey] = false;
      await store.write(uid, owner);
      return project[idKey]!;
    }
    // Native Google Docs cannot accept pre-generated IDs. Never repeat an uncertain
    // create: persist intent first, then reconcile by appProperties on the next Save.
    if (project[pendingKey]) throw new GoogleBackupError('A previous document creation is unconfirmed. Please retry later; no duplicate has been created.');
    project[pendingKey] = true;
    await store.write(uid, owner);
    let created;
    try {
      created = await request(`${DRIVE}/files?fields=id`, json(token, 'POST', { name: `${title} — ${kind === 'brief' ? 'Project Brief' : 'Continuity Bible'}`, mimeType: 'application/vnd.google-apps.document', appProperties: { glamBackup: marker } }));
    } catch (error) {
      if (error instanceof GoogleBackupError && error.providerStatus && error.providerStatus >= 400 && error.providerStatus < 500 && error.providerStatus !== 408) {
        project[pendingKey] = false; // Definitive rejection: no create was accepted.
        await store.write(uid, owner);
      }
      throw error;
    }
    if (!isDocumentId(created.id)) throw new GoogleBackupError('Google did not return a valid document ID.');
    project[idKey] = created.id;
    project[pendingKey] = false;
    await store.write(uid, owner);
    return created.id as string;
  }
  async function replaceDocument(documentId: string, content: string, token: string) {
    if (!isDocumentId(documentId)) throw new GoogleBackupError('Invalid document ID.');
    const document = await request(`${DOCS}/${documentId}?fields=body(content(endIndex)),revisionId`, json(token), 2);
    const end = document.body?.content?.at(-1)?.endIndex;
    if (!Number.isInteger(end) || end < 2 || typeof document.revisionId !== 'string') throw new GoogleBackupError('Backup document structure could not be read.');
    const requests: unknown[] = [];
    if (end > 2) requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: end - 1 } } });
    requests.push({ insertText: { location: { index: 1 }, text: content } });
    // No blind retry of a mutation. On another Save we read the actual revision/content
    // again, preventing duplicated text after an ambiguous response.
    await request(`${DOCS}/${documentId}:batchUpdate`, json(token, 'POST', { requests, writeControl: { requiredRevisionId: document.revisionId } }));
  }
  return {
    async exchange(code: string, verifier: string) {
      return request('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, code_verifier: verifier, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: `${config.origin}/api/drive/callback`, grant_type: 'authorization_code' }) });
    },
    async accountId(token: string): Promise<string> {
      const value = await request(`${DRIVE}/about?fields=user(permissionId)`, json(token), 2);
      if (typeof value.user?.permissionId !== 'string' || !value.user.permissionId) throw new GoogleBackupError('Drive account could not be verified.');
      return value.user.permissionId;
    },
    async revoke(token: string) {
      const response = await fetcher('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }), redirect: 'error', signal: AbortSignal.timeout(15_000) });
      if (!response.ok && response.status !== 400) throw new GoogleBackupError('Google could not confirm access revocation.');
    },
    async backup(uid: string, input: DriveBackupInput): Promise<DriveBackupResult> {
      return store.exclusive(async () => {
        const owner = await store.read(uid);
        const digest = backupDigest(input);
        if (!Object.hasOwn(owner.projects, input.projectId) && Object.keys(owner.projects).length >= 2000) throw new GoogleBackupError('This Drive account has reached the project backup limit.');
        // Parsed JSON maps retain Object.prototype. Never treat inherited names
        // (for example toString/valueOf) as this owner's project receipt.
        if (!Object.hasOwn(owner.projects, input.projectId)) Object.defineProperty(owner.projects, input.projectId, { value: {}, enumerable: true, writable: true, configurable: true });
        const project = owner.projects[input.projectId];
        if ((project.attemptedAt || project.savedAt) && input.savedAt < (project.attemptedAt || project.savedAt)!) return { status: 'superseded', message: 'A newer saved snapshot is already backed up.' };
        const links = () => ({ briefUrl: `https://docs.google.com/document/d/${project.briefId}/edit`, continuityUrl: `https://docs.google.com/document/d/${project.continuityId}/edit` });
        if (!owner.refreshToken) throw new GoogleBackupError('Connect your private Google Drive to enable backup.', 409);
        if (project.digest === digest && project.briefId && project.continuityId) return { status: 'synced', message: 'Both saved snapshot documents are backed up.', savedAt: project.savedAt, ...links() };
        const token = await refresh(owner);
        const content = renderDriveDocuments(input);
        // A partial newer write invalidates the old successful receipt. Reserve the
        // high-watermark before mutations so a delayed older tab cannot overwrite it.
        delete project.digest;
        project.attemptedAt = input.savedAt;
        await store.write(uid, owner);
        const briefId = await ensureDocument(uid, owner, project, input.projectId, 'brief', input.title, token);
        await replaceDocument(briefId, content.brief, token);
        const continuityId = await ensureDocument(uid, owner, project, input.projectId, 'continuity', input.title, token);
        await replaceDocument(continuityId, content.continuity, token);
        project.digest = digest;
        project.savedAt = input.savedAt;
        await store.write(uid, owner);
        return { status: 'synced', message: 'Project brief and continuity are backed up in your Google Drive.', savedAt: input.savedAt, ...links() };
      });
    },
  };
}
