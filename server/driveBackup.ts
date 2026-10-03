import express from 'express';
import type { Request, Response } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { EncryptedDriveStore } from './driveStore';
import { createFirebaseVerifier } from './driveFirebase';
import { createGoogleDriveService, GoogleBackupError } from './driveGoogle';
import { validateDriveBackup } from './driveContent';
import { DRIVE_FILE_SCOPE, DRIVE_NOT_CONFIGURED } from '../src/utils/driveBackupTypes';

export interface DriveConfig { origin: string; clientId: string; clientSecret: string; firebaseProjectId: string; directory: string; key: Buffer; }
export function readDriveConfig(env: NodeJS.ProcessEnv = process.env): DriveConfig | null {
  if (env.DRIVE_BACKUP_ENABLED !== 'true' || env.DRIVE_BACKUP_SINGLE_INSTANCE !== 'true') return null;
  const { DRIVE_BACKUP_ORIGIN: origin, GOOGLE_DRIVE_CLIENT_ID: clientId, GOOGLE_DRIVE_CLIENT_SECRET: clientSecret, DRIVE_BACKUP_FIREBASE_PROJECT_ID: firebaseProjectId, DRIVE_BACKUP_STORE_DIR: directory, DRIVE_BACKUP_ENCRYPTION_KEY: rawKey } = env;
  if (!origin || !clientId || !clientSecret || !firebaseProjectId || !directory || !rawKey) return null;
  try {
    const url = new URL(origin);
    const relative = path.relative(process.cwd(), directory);
    if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(firebaseProjectId) || !clientId.endsWith('.apps.googleusercontent.com') || !path.isAbsolute(directory) || !relative.startsWith(`..${path.sep}`) || !/^[A-Za-z0-9+/]{43}=$/.test(rawKey)) return null;
    const key = Buffer.from(rawKey, 'base64');
    return key.length === 32 ? { origin, clientId, clientSecret, firebaseProjectId, directory, key } : null;
  } catch { return null; }
}
const COOKIE = '__Host-glam-drive';
const opaque = () => randomBytes(32).toString('base64url');
export const equalOpaque = (a: unknown, b: unknown) => typeof a === 'string' && typeof b === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(a) && /^[A-Za-z0-9_-]{1,200}$/.test(b) && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
interface Session { uid: string; csrf: string; expires: number; count: number; window: number; pending?: { state: string; verifier: string; expires: number }; }
export function driveAuthorizationUrl(config: DriveConfig, state: string, verifier: string) {
  const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: `${config.origin}/api/drive/callback`, response_type: 'code', scope: DRIVE_FILE_SCOPE, access_type: 'offline', prompt: 'consent select_account', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** No credentials are created or OAuth grants initiated at server startup. */
export async function createDriveBackupRouter(options: { env?: NodeJS.ProcessEnv; fetcher?: typeof fetch; verifyIdentity?: (authorization: string | undefined) => Promise<string> } = {}) {
  const router = express.Router();
  router.use((_req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }); next(); });
  const config = readDriveConfig(options.env);
  let store: EncryptedDriveStore | null = null;
  if (config) {
    try { store = new EncryptedDriveStore(config.directory, config.key); await store.initialize(); }
    catch { store = null; console.error('Private Drive backup disabled: encrypted single-instance storage is not ready.'); }
  }
  if (!config || !store) {
    router.get('/status', (_req, res) => res.json({ configured: false, connected: false, message: DRIVE_NOT_CONFIGURED }));
    router.use((_req, res) => res.status(503).json({ status: 'not-configured', message: DRIVE_NOT_CONFIGURED }));
    return router;
  }
  const storage = store;
  const google = createGoogleDriveService(config, storage, options.fetcher);
  const verifyIdentity = options.verifyIdentity || createFirebaseVerifier(config.firebaseProjectId, options.fetcher);
  const sessions = new Map<string, Session>();
  const ownerGeneration = new Map<string, number>();
  const unconfirmedRevocations = new Set<string>();
  const cookieValue = (req: Request) => req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const currentSession = (req: Request) => {
    const id = cookieValue(req);
    const session = id ? sessions.get(id) : undefined;
    if (session && session.expires > Date.now()) return session;
    if (id) sessions.delete(id);
    return undefined;
  };
  const safe = (handler: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response) => { void handler(req, res).catch(error => {
    const known = error instanceof GoogleBackupError;
    res.status(known ? error.status : 500).json({ status: 'failed', message: known ? error.message : 'Drive backup could not be completed. Your local save is safe.' });
  }); };
  const identity = async (req: Request) => {
    try { return await verifyIdentity(req.headers.authorization); }
    catch { throw new GoogleBackupError('Sign in again to use your private Drive backup.', 401); }
  };
  const requireSession = async (req: Request) => {
    if (req.headers.origin !== config.origin || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin')) throw new GoogleBackupError('This backup request was not accepted.', 403);
    const uid = await identity(req);
    const session = currentSession(req);
    if (!session || session.uid !== uid || !equalOpaque(req.headers['x-drive-csrf'], session.csrf)) throw new GoogleBackupError('Refresh your Drive connection status and try again.', 403);
    if (Date.now() - session.window > 60_000) { session.count = 0; session.window = Date.now(); }
    if (++session.count > 30) throw new GoogleBackupError('Too many backup requests. Try again in a minute.', 429);
    return session;
  };
  router.get('/status', safe(async (req, res) => {
    if (!req.headers.authorization) return res.json({ configured: true, connected: false, message: 'Sign in to connect your private Google Drive.' });
    const uid = await identity(req);
    let session = currentSession(req);
    if (!session || session.uid !== uid) {
      for (const [key, item] of sessions) if (item.expires <= Date.now()) sessions.delete(key);
      if (sessions.size >= 1000) throw new GoogleBackupError('Drive connection is busy. Try again later.', 503);
      const old = cookieValue(req); if (old) sessions.delete(old);
      const id = opaque();
      session = { uid, csrf: opaque(), expires: Date.now() + 8 * 60 * 60_000, count: 0, window: Date.now() };
      sessions.set(id, session);
      res.cookie(COOKIE, id, { secure: true, httpOnly: true, sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60_000 });
    }
    const owner = await storage.read(uid);
    return res.json({ configured: true, connected: Boolean(owner.refreshToken), csrfToken: session.csrf, message: owner.refreshToken ? 'Connected. Save Prompt backs up the saved snapshot to your Google Drive.' : 'Connect Google Drive to back up your saved project brief and continuity.' });
  }));
  router.use(express.json({ limit: '256kb', strict: true }));
  router.post('/connect', safe(async (req, res) => {
    const session = await requireSession(req);
    session.pending = { state: opaque(), verifier: opaque(), expires: Date.now() + 10 * 60_000 };
    res.json({ authorizationUrl: driveAuthorizationUrl(config, session.pending.state, session.pending.verifier) });
  }));
  router.get('/callback', safe(async (req, res) => {
    const session = currentSession(req);
    const pending = session?.pending;
    if (!session || !pending || pending.expires <= Date.now() || !equalOpaque(req.query.state, pending.state)) return res.status(400).send('Drive connection expired or could not be verified. Return to the app and connect again.');
    delete session.pending;
    const generation = ownerGeneration.get(session.uid) || 0;
    const stillCurrent = () => generation === (ownerGeneration.get(session.uid) || 0);
    if (req.query.error) return res.redirect(303, `${config.origin}/?drive=cancelled`);
    if (typeof req.query.code !== 'string' || req.query.code.length > 4096) return res.status(400).send('Invalid Drive authorization response.');
    try {
      await storage.exclusive(async () => {
        if (!stillCurrent()) throw new Error('Connection cancelled.');
        const tokens = await google.exchange(req.query.code as string, pending.verifier);
        if (typeof tokens.access_token !== 'string' || typeof tokens.refresh_token !== 'string' || !String(tokens.scope || '').split(' ').includes(DRIVE_FILE_SCOPE)) throw new Error('Drive permission missing.');
        const accountId = await google.accountId(tokens.access_token);
        if (!stillCurrent()) {
          try { await google.revoke(tokens.refresh_token); } catch { unconfirmedRevocations.add(session.uid); }
          throw new Error('Connection cancelled.');
        }
        const owner = await storage.read(session.uid);
        if (owner.accountId && owner.accountId !== accountId) owner.projects = {};
        owner.accountId = accountId;
        owner.refreshToken = tokens.refresh_token;
        if (!stillCurrent()) {
          try { await google.revoke(tokens.refresh_token); } catch { unconfirmedRevocations.add(session.uid); }
          throw new Error('Connection cancelled.');
        }
        await storage.write(session.uid, owner);
      });
      res.redirect(303, `${config.origin}/?drive=connected`);
    } catch { res.redirect(303, `${config.origin}/?drive=failed`); }
  }));
  router.post('/disconnect', safe(async (req, res) => {
    const session = await requireSession(req);
    let revoked = true;
    ownerGeneration.set(session.uid, (ownerGeneration.get(session.uid) || 0) + 1);
    // Invalidate pending callbacks before queueing, not after another long backup.
    for (const item of sessions.values()) if (item.uid === session.uid) delete item.pending;
    await storage.exclusive(async () => {
      const owner = await storage.read(session.uid);
      const token = owner.refreshToken;
      delete owner.refreshToken;
      await storage.write(session.uid, owner);
      if (token) { try { await google.revoke(token); } catch { revoked = false; } }
      if (unconfirmedRevocations.delete(session.uid)) revoked = false;
    });
    res.json({ configured: true, connected: false, csrfToken: session.csrf, message: revoked ? 'Drive disconnected. Existing backup documents stay in your Drive.' : 'Local Drive access was removed. Google did not confirm revocation; remove this app in your Google Account connections too.' });
  }));
  router.post('/backup', safe(async (req, res) => {
    const session = await requireSession(req);
    let input;
    try { input = validateDriveBackup(req.body); } catch (error) { const message = error instanceof Error && error.message.startsWith('Drive backup supports') ? error.message : 'The saved snapshot is invalid. Local data has not been changed.'; throw new GoogleBackupError(message, 400); }
    const result = await google.backup(session.uid, input);
    res.json(result);
  }));
  router.use((_req, res) => res.status(404).json({ status: 'failed', message: 'Unknown Drive backup endpoint.' }));
  router.use((error: unknown, _req: Request, res: Response, _next: express.NextFunction) => res.status(400).json({ status: 'failed', message: 'Invalid or oversized Drive backup request.' }));
  return router;
}
