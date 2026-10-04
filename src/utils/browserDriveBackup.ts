import type { DriveBackupInput, DriveBackupResult, DriveBackupStatus } from './driveBackupTypes';
import { renderDriveDocuments, validateDriveBackup } from './driveContent';

export interface BrowserDriveView { status: DriveBackupStatus; result: DriveBackupResult | null; busy: boolean; }
interface Grant { uid: string; accessToken: string; email: string; }
interface Receipt { briefId?: string; continuityId?: string; briefPending?: boolean; continuityPending?: boolean; attemptedAt?: string; savedAt?: string; digest?: string; }
interface Session extends Grant { accountId: string; obtainedAt: number; }
export interface BrowserDriveDependencies {
  uid: () => string | null;
  authorize: () => Promise<Grant>;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  fetcher?: typeof fetch;
  now?: () => number;
  withLock: <T>(name: string, task: () => Promise<T>) => Promise<T>;
  debounceMs?: number;
}
const DRIVE = 'https://www.googleapis.com/drive/v3';
const DOCS = 'https://docs.googleapis.com/v1/documents';
const idPattern = /^[A-Za-z0-9_-]{1,200}$/;
const SESSION_MAX_AGE_MS = 50 * 60_000;
const cancelled = (): DriveBackupResult => ({ status: 'superseded', message: 'This Drive request was cancelled or replaced. Your local save is safe.' });
const reconnectMessage = 'Saved locally. Connect Drive again to back up this snapshot. Connections last only for this open page and expire.';
const permissionMessage = 'Google refused Drive access. Check that Drive and Docs APIs are enabled and that you granted this app file access, then reconnect Drive. Your local save is safe.';
class DriveError extends Error { constructor(message: string, public providerStatus?: number, public endedConnection = false) { super(message); } }
async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), item => item.toString(16).padStart(2, '0')).join('');
}
/** Browser-only OAuth: credentials are held solely in this closure, never in receipts. */
export function createBrowserDriveBackup(deps: BrowserDriveDependencies) {
  const fetcher = deps.fetcher || fetch;
  const now = deps.now || Date.now;
  let owner = deps.uid();
  let epoch = 0;
  let session: Session | null = null;
  let connectionNotice: string | null = null;
  let serial: Promise<unknown> = Promise.resolve();
  const active = new Set<AbortController>();
  const listeners = new Set<(view: BrowserDriveView) => void>();
  const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; resolve: (value: DriveBackupResult) => void }>();
  const disconnectedStatus = (): DriveBackupStatus => ({ configured: true, connected: false, message: deps.uid() ? connectionNotice || 'Connect your signed-in Google account to back up on Save. Reconnect after refreshing this page or when access expires.' : 'Sign in with Google above, then connect your private Drive.' });
  const connectedStatus = (value: Session): DriveBackupStatus => ({ configured: true, connected: true, message: `Connected to ${value.email}. Save Prompt backs up while this page stays open.` });
  let view: BrowserDriveView = { status: disconnectedStatus(), result: null, busy: false };
  const publish = (patch: Partial<BrowserDriveView>) => { view = { ...view, ...patch }; listeners.forEach(listener => listener(view)); };
  const current = (uid: string | null, version: number) => uid === deps.uid() && version === epoch;
  const guard = (uid: string, version: number) => { if (!current(uid, version)) throw new DriveError('Drive request cancelled.'); };
  function invalidate(message?: string, result: DriveBackupResult | null = null) {
    epoch++;
    for (const job of pending.values()) { clearTimeout(job.timer); job.resolve(cancelled()); }
    pending.clear();
    active.forEach(controller => controller.abort());
    active.clear();
    session = null;
    connectionNotice = message || null;
    publish({ status: disconnectedStatus(), result, busy: false });
  }
  function endConnection(uid: string, version: number, message: string, providerStatus?: number): DriveError {
    if (current(uid, version)) invalidate(message, { status: 'failed', message });
    return new DriveError(message, providerStatus, true);
  }
  function guardSession(uid: string, version: number, token?: string) {
    guard(uid, version);
    if (!session || session.uid !== uid || (token !== undefined && session.accessToken !== token)) throw new DriveError(reconnectMessage);
    if (now() - session.obtainedAt >= SESSION_MAX_AGE_MS) throw endConnection(uid, version, reconnectMessage);
  }
  function ownerChanged() { if (owner !== deps.uid()) { owner = deps.uid(); invalidate(); } }
  function status(): DriveBackupStatus {
    ownerChanged();
    // Google API access tokens are not Firebase ID tokens and cannot be renewed by getIdToken().
    if (session && now() - session.obtainedAt >= SESSION_MAX_AGE_MS) invalidate(reconnectMessage);
    return session ? connectedStatus(session) : disconnectedStatus();
  }
  async function request(path: string, token: string, uid: string, version: number, method = 'GET', body?: unknown, connecting = false, beforeAuthDisconnect?: () => void) {
    const check = () => connecting ? guard(uid, version) : guardSession(uid, version, token);
    check();
    const controller = new AbortController();
    active.add(controller);
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetcher(path, { method, redirect: 'error', cache: 'no-store', credentials: 'omit', signal: controller.signal, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      check();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // A definitively rejected create can safely clear its intent before the
          // connection generation changes. Even a journal failure must disconnect.
          try { beforeAuthDisconnect?.(); }
          finally { throw endConnection(uid, version, response.status === 401 ? reconnectMessage : permissionMessage, response.status); }
        }
        if (response.status === 429) throw new DriveError('Google is limiting requests. Your local save is safe; wait and use Save Prompt to retry.', 429);
        throw new DriveError('Google could not complete this backup. Your local save is safe; use Save Prompt to retry.', response.status);
      }
      const value = response.status === 204 ? {} : await response.json();
      check();
      return value;
    } catch (error) {
      if (error instanceof DriveError) throw error;
      throw new DriveError('Google did not confirm this backup. Your local save is safe; use Save Prompt to retry.');
    } finally { clearTimeout(timeout); active.delete(controller); }
  }
  function readReceipt(key: string): Receipt {
    try {
      const raw = deps.storage.getItem(key);
      if (!raw) return {};
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error();
      for (const [field, item] of Object.entries(value)) {
        if (['briefId', 'continuityId'].includes(field) ? typeof item !== 'string' || !idPattern.test(item) : ['briefPending', 'continuityPending'].includes(field) ? typeof item !== 'boolean' : ['savedAt', 'attemptedAt'].includes(field) ? typeof item !== 'string' || !Number.isFinite(Date.parse(item)) : field === 'digest' ? typeof item !== 'string' || !/^[a-f0-9]{64}$/.test(item) : true) throw Error();
      }
      return value;
    } catch { throw new DriveError('The local Drive receipt is unavailable or damaged. No remote changes were made. Your local project is safe.'); }
  }
  function writeReceipt(key: string, receipt: Receipt, uid: string, version: number) {
    guardSession(uid, version);
    try { deps.storage.setItem(key, JSON.stringify(receipt)); }
    catch { throw new DriveError('The browser could not save the Drive receipt. Backup is not confirmed; your local project is safe.'); }
  }
  async function connect() {
    ownerChanged();
    const uid = deps.uid();
    if (!uid) throw new DriveError('Sign in with Google first, then connect Drive.');
    invalidate();
    const version = epoch;
    // Invoke authorization synchronously from the user's click, before any awaited network work.
    const grant = await deps.authorize();
    guard(uid, version);
    if (grant.uid !== uid || !grant.accessToken || !grant.email) throw new DriveError('Google account could not be matched to your current sign-in. Connect again.');
    const about = await request(`${DRIVE}/about?fields=user(permissionId,emailAddress)`, grant.accessToken, uid, version, 'GET', undefined, true);
    const account = about.user;
    if (!account || typeof account.permissionId !== 'string' || !idPattern.test(account.permissionId) || typeof account.emailAddress !== 'string' || account.emailAddress.toLowerCase() !== grant.email.toLowerCase()) throw new DriveError('Drive account did not match your signed-in Google account. No files were changed.');
    session = { ...grant, email: account.emailAddress, accountId: account.permissionId, obtainedAt: now() };
    publish({ status: status(), result: null });
  }
  async function verifyDocument(id: string, marker: string, connected: Session, version: number) {
    if (!idPattern.test(id)) throw new DriveError('Google returned an invalid document reference.');
    const fields = 'id,mimeType,trashed,appProperties,ownedByMe,owners(permissionId)';
    const file = await request(`${DRIVE}/files/${id}?${new URLSearchParams({ fields })}`, connected.accessToken, connected.uid, version);
    if (file.id !== id || file.mimeType !== 'application/vnd.google-apps.document' || file.trashed !== false || file.appProperties?.glamBackup !== marker || file.ownedByMe !== true || !Array.isArray(file.owners) || !file.owners.some((owner: any) => owner?.permissionId === connected.accountId)) {
      throw new DriveError('A Drive document does not match this account, project, or backup type. No document content was changed. Your local save is safe.');
    }
    return id;
  }
  async function ensureDocument(input: DriveBackupInput, kind: 'brief' | 'continuity', key: string, receipt: Receipt, connected: Session, version: number) {
    const idKey = kind === 'brief' ? 'briefId' : 'continuityId';
    const pendingKey = kind === 'brief' ? 'briefPending' : 'continuityPending';
    const marker = await digest(`glam-camera-action-v1\0${connected.uid}\0${connected.accountId}\0${input.projectId}\0${kind}`);
    if (receipt[idKey]) return verifyDocument(receipt[idKey]!, marker, connected, version);
    const query = `trashed = false and mimeType = 'application/vnd.google-apps.document' and appProperties has { key='glamBackup' and value='${marker}' }`;
    const found = await request(`${DRIVE}/files?${new URLSearchParams({ q: query, fields: 'files(id),nextPageToken', pageSize: '10', spaces: 'drive' })}`, connected.accessToken, connected.uid, version);
    if (!Array.isArray(found.files) || found.files.length > 1 || found.nextPageToken) throw new DriveError('Multiple matching Drive backups need review. No duplicate will be created.');
    if (found.files.length === 1) {
      if (typeof found.files[0].id !== 'string' || !idPattern.test(found.files[0].id)) throw new DriveError('Google returned an invalid document reference.');
      receipt[idKey] = await verifyDocument(found.files[0].id, marker, connected, version);
      receipt[pendingKey] = false;
      writeReceipt(key, receipt, connected.uid, version);
      return receipt[idKey]!;
    }
    if (receipt[pendingKey]) throw new DriveError('A previous document creation is still unconfirmed. No duplicate was created. Try Save again later or review your Drive.');
    receipt[pendingKey] = true;
    writeReceipt(key, receipt, connected.uid, version);
    let created;
    try {
      created = await request(`${DRIVE}/files?fields=id`, connected.accessToken, connected.uid, version, 'POST', { name: `${input.title} — ${kind === 'brief' ? 'Project Brief' : 'Continuity Bible'}`, mimeType: 'application/vnd.google-apps.document', appProperties: { glamBackup: marker } }, false, () => {
        receipt[pendingKey] = false;
        writeReceipt(key, receipt, connected.uid, version);
      });
    } catch (error) {
      if (current(connected.uid, version) && error instanceof DriveError && error.providerStatus && error.providerStatus >= 400 && error.providerStatus < 500 && error.providerStatus !== 408) {
        receipt[pendingKey] = false;
        writeReceipt(key, receipt, connected.uid, version);
      }
      throw error;
    }
    if (typeof created.id !== 'string' || !idPattern.test(created.id)) throw new DriveError('Google did not confirm a valid document ID.');
    receipt[idKey] = await verifyDocument(created.id, marker, connected, version);
    receipt[pendingKey] = false;
    writeReceipt(key, receipt, connected.uid, version);
    return created.id as string;
  }
  async function documentState(id: string, connected: Session, version: number) {
    const doc = await request(`${DOCS}/${id}?fields=body(content(endIndex,paragraph(elements(textRun(content))))),revisionId`, connected.accessToken, connected.uid, version);
    const end = doc.body?.content?.at(-1)?.endIndex;
    if (!Number.isInteger(end) || end < 2 || typeof doc.revisionId !== 'string') throw new DriveError('The managed backup document structure changed. Your local save is safe.');
    const text = doc.body.content.map((item: any) => item.paragraph?.elements?.map((element: any) => element.textRun?.content || '').join('') || '').join('');
    const savedAt = /^Saved from Glam, Camera, Action! at (\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z)$/m.exec(text)?.[1];
    return { end, revisionId: doc.revisionId, savedAt };
  }
  async function backup(input: DriveBackupInput, connected: Session, version: number): Promise<DriveBackupResult> {
    const namespace = await digest(`${connected.uid}\0${connected.accountId}\0${input.projectId}`);
    return deps.withLock(`glam-drive-${namespace}`, async () => {
      guardSession(connected.uid, version, connected.accessToken);
      const key = `glam_drive_receipt_v1_${namespace}`;
      const receipt = readReceipt(key);
      if ((receipt.attemptedAt || receipt.savedAt || '') > input.savedAt) return cancelled();
      const fingerprint = await digest(JSON.stringify(input));
      const links = () => ({ briefUrl: `https://docs.google.com/document/d/${receipt.briefId}/edit`, continuityUrl: `https://docs.google.com/document/d/${receipt.continuityId}/edit` });
      delete receipt.digest;
      receipt.attemptedAt = input.savedAt;
      writeReceipt(key, receipt, connected.uid, version);
      const briefId = await ensureDocument(input, 'brief', key, receipt, connected, version);
      const continuityId = await ensureDocument(input, 'continuity', key, receipt, connected, version);
      if (briefId === continuityId) throw new DriveError('The project brief and continuity must use different managed documents. No document content was changed.');
      // Read both before mutations; revisions reject races, and saved timestamps reject older snapshots.
      const brief = await documentState(briefId, connected, version);
      const continuity = await documentState(continuityId, connected, version);
      if ([brief.savedAt, continuity.savedAt].some(date => date && date > input.savedAt)) return { status: 'superseded', message: 'A newer snapshot is already in Drive. This older save did not replace it.' };
      const content = renderDriveDocuments(input);
      for (const [id, state, text] of [[briefId, brief, content.brief], [continuityId, continuity, content.continuity]] as const) {
        const requests: unknown[] = [];
        if (state.end > 2) requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: state.end - 1 } } });
        requests.push({ insertText: { location: { index: 1 }, text } });
        await request(`${DOCS}/${id}:batchUpdate`, connected.accessToken, connected.uid, version, 'POST', { requests, writeControl: { requiredRevisionId: state.revisionId } });
      }
      receipt.digest = fingerprint;
      receipt.savedAt = input.savedAt;
      writeReceipt(key, receipt, connected.uid, version);
      return { status: 'synced', message: 'Both saved snapshot documents are backed up in your Google Drive.', savedAt: input.savedAt, ...links() };
    });
  }
  function enqueue(input: DriveBackupInput): Promise<DriveBackupResult> {
    const currentStatus = status();
    const uid = deps.uid(), version = epoch, connected = session;
    if (!uid || !connected || !currentStatus.connected) {
      const result: DriveBackupResult = { status: 'disconnected', message: reconnectMessage };
      publish({ status: currentStatus, result });
      return Promise.resolve(result);
    }
    let snapshot: DriveBackupInput;
    try { snapshot = validateDriveBackup(structuredClone(input)); }
    catch (error) { const result: DriveBackupResult = { status: 'failed', message: error instanceof Error ? error.message : 'Invalid backup snapshot.' }; publish({ result }); return Promise.resolve(result); }
    const previous = pending.get(snapshot.projectId);
    if (previous) { clearTimeout(previous.timer); previous.resolve(cancelled()); }
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        pending.delete(snapshot.projectId);
        const task = async () => {
          if (!current(uid, version)) return resolve(cancelled());
          if (session !== connected) { const result: DriveBackupResult = { status: 'disconnected', message: reconnectMessage }; publish({ busy: false, status: status(), result }); return resolve(result); }
          publish({ busy: true, result: null });
          let result: DriveBackupResult;
          let endedConnection = false;
          try { result = await backup(snapshot, connected, version); guardSession(uid, version, connected.accessToken); }
          catch (error) { endedConnection = error instanceof DriveError && error.endedConnection; result = { status: 'failed', message: error instanceof DriveError ? error.message : 'Drive backup did not complete. Your local save is safe.' }; }
          // Connection failure already clears the UI and cancels other work. Never republish a stale result.
          if (endedConnection) return resolve(result);
          if (!current(uid, version)) return resolve(cancelled());
          publish({ busy: false, status: session ? connectedStatus(session) : disconnectedStatus(), result });
          resolve(result);
        };
        serial = serial.then(task, task);
      }, deps.debounceMs ?? 350);
      pending.set(snapshot.projectId, { timer, resolve });
    });
  }
  return {
    subscribe(listener: (value: BrowserDriveView) => void) { listeners.add(listener); listener(view); return () => { listeners.delete(listener); }; },
    getStatus: async () => { const value = status(); publish({ status: value }); return value; },
    connect,
    disconnect: async () => { invalidate(); const value = { ...disconnectedStatus(), message: 'Drive disconnected on this page. Existing Google Docs stay in your Drive. Remove this app in Google Account connections to revoke its Google permission.' }; publish({ status: value }); return value; },
    cancel: invalidate,
    ownerChanged,
    enqueue,
  };
}
