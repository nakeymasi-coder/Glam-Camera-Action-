import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface DriveProject {
  briefId?: string;
  continuityId?: string;
  briefPending?: boolean;
  continuityPending?: boolean;
  digest?: string;
  savedAt?: string;
  attemptedAt?: string;
}
export interface DriveOwner {
  accountId?: string;
  refreshToken?: string;
  projects: Record<string, DriveProject>;
}

/** Single-process adapter. Requires an owner-only durable directory outside the app/static root. */
export class EncryptedDriveStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private directory: string, private key: Buffer) {
    if (key.length !== 32) throw Error('Drive encryption key must be 32 bytes.');
  }
  async initialize() {
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    const stat = await fs.lstat(this.directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) throw Error('Drive storage directory must be private (0700), not a symbolic link.');
    const realDirectory = await fs.realpath(this.directory);
    const realApp = await fs.realpath(process.cwd());
    const relative = path.relative(realApp, realDirectory);
    if (!relative.startsWith(`..${path.sep}`)) throw Error('Drive storage must be outside the app directory.');
    // Exclusive lease prevents two servers from racing file-creation journals. A stale lock
    // after a crash must be removed by an operator only after confirming the old process exited.
    const lock = await fs.open(path.join(this.directory, '.single-instance.lock'), 'wx', 0o600);
    await lock.writeFile(String(process.pid));
    await lock.close();
  }
  private filename(uid: string) { return path.join(this.directory, `${createHash('sha256').update(uid).digest('hex')}.enc`); }
  private seal(uid: string, value: DriveOwner) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(uid));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
  }
  private open(uid: string, bytes: Buffer): DriveOwner {
    const decipher = createDecipheriv('aes-256-gcm', this.key, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(uid));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
  }
  async read(uid: string): Promise<DriveOwner> {
    const file = this.filename(uid);
    try {
      const stat = await fs.lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) throw Error('Unsafe Drive token file.');
      return this.open(uid, await fs.readFile(file));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { projects: {} };
      throw error;
    }
  }
  async write(uid: string, value: DriveOwner) {
    const file = this.filename(uid);
    const temporary = `${file}.${randomBytes(8).toString('hex')}.tmp`;
    const handle = await fs.open(temporary, 'wx', 0o600);
    try { await handle.writeFile(this.seal(uid, value)); await handle.sync(); }
    finally { await handle.close(); }
    await fs.rename(temporary, file);
    const directory = await fs.open(this.directory, 'r');
    try { await directory.sync(); } finally { await directory.close(); }
  }
  // All token refreshes, journal writes and document updates are serialized. No body/token
  // content is logged. This bounded adapter deliberately does not claim multi-replica support.
  exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => undefined);
    return next;
  }
}
