import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import type { Root } from 'react-dom/client';
import type { User } from '../../src/lib/firebase';
import type { SavedPromptItem } from '../../src/types';

const require = createRequire(import.meta.url);
type Modules = {
  App: typeof import('../../src/App').default;
  AppWorkspace: typeof import('../../src/App').AppWorkspace;
  useCloudSession: typeof import('../../src/hooks/useCloudSession').useCloudSession;
} & typeof import('../../src/utils/workspaceStorage');

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
export const fixtureUser = (uid: string): User => ({
  uid, displayName: `Fixture ${uid}`, email: `${uid}@example.test`, photoURL: null,
} as User);

// Real App, AuthBar and all storage-consuming React components are mounted.
// Only external Firebase/Drive boundaries are replaced. No real account,
// network, existing browser profile or production storage is accessed.
export async function accountFixture() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
  const originalGlobals = new Map<string, PropertyDescriptor | undefined>();
  const globalValues = {
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    localStorage: dom.window.localStorage, HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement, HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    Event: dom.window.Event, MouseEvent: dom.window.MouseEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [name, value] of Object.entries(globalValues)) {
    originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  dom.window.confirm = () => true;
  const listeners = new Set<(user: User | null) => void>();
  const requests: { uid: string; pending: ReturnType<typeof deferred<SavedPromptItem[]>> }[] = [];
  const calls = { subscriptions: 0, unsubscriptions: 0, cloudSaves: [] as unknown[][], driveBackups: [] as unknown[][], outbound: 0 };
  const downloads: { filename: string; href: string }[] = [];
  const blobs: Blob[] = [];
  const errors: unknown[][] = [];
  const auth: { currentUser: User | null } = { currentUser: null };
  const dispatch = (user: User | null) => {
    auth.currentUser = user;
    for (const listener of [...listeners]) listener(user);
  };
  dom.window.HTMLAnchorElement.prototype.click = function () {
    downloads.push({ filename: this.download, href: this.href });
  };
  class FixtureURL extends URL {
    static createObjectURL(blob: Blob) { blobs.push(blob); return `blob:fixture/${blobs.length}`; }
    static revokeObjectURL(_url: string) {}
  }
  const firebase = {
    auth,
    onAuthStateChanged(_auth: unknown, listener: (user: User | null) => void) {
      calls.subscriptions++;
      listeners.add(listener);
      return () => { calls.unsubscriptions++; listeners.delete(listener); };
    },
    fetchStoriesFromCloud(uid: string) {
      const pending = deferred<SavedPromptItem[]>();
      requests.push({ uid, pending });
      return pending.promise;
    },
    signInWithGoogle: async () => { throw Error('Real login is forbidden in these tests'); },
    signOutUser: async () => { dispatch(null); },
    saveStoryToCloud: async (...args: unknown[]) => { calls.cloudSaves.push(args); },
  };
  const bundled = await build({
    stdin: {
      contents: `export { default as App, AppWorkspace } from './src/App'; export { useCloudSession } from './src/hooks/useCloudSession'; export * from './src/utils/workspaceStorage';`,
      resolveDir: process.cwd(), loader: 'tsx',
    },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    define: { 'import.meta.env.VITE_DRIVE_BACKUP_DISABLED': 'true' },
    plugins: [{ name: 'synthetic-account-boundaries', setup(builder) {
      builder.onResolve({ filter: /(?:^|\/)lib\/firebase$/ }, () => ({ path: 'firebase', namespace: 'account-fixture' }));
      builder.onResolve({ filter: /(?:^|\/)utils\/driveBackup$/ }, () => ({ path: 'drive', namespace: 'account-fixture' }));
      builder.onResolve({ filter: /(?:^|\/)components\/DriveBackupPanel$/ }, () => ({ path: 'drive-panel', namespace: 'account-fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'account-fixture' }, args => ({ contents: args.path === 'firebase'
        ? `export const { auth, onAuthStateChanged, fetchStoriesFromCloud, signInWithGoogle, signOutUser, saveStoryToCloud } = fixture.firebase;`
        : args.path === 'drive-panel'
          ? `import React from 'react'; export const DriveBackupPanel = () => React.createElement('aside', {'data-drive-fixture': true});`
          : `export const enqueueDriveBackup = async (...args) => { fixture.calls.driveBackups.push(args); return {status: 'not-configured'}; };`, loader: 'js', resolveDir: process.cwd() }));
    } }],
  });
  const module = { exports: {} as Modules };
  const timers = new Map<number, () => void>();
  let timerId = 0;
  runInNewContext(bundled.outputFiles[0].text, {
    module, exports: module.exports, require,
    fixture: { firebase, calls }, ...globalValues,
    crypto: globalThis.crypto, TextEncoder, TextDecoder, Blob, URL: FixtureURL,
    URLSearchParams, AbortController, structuredClone,
    console: { ...console, error: (...args: unknown[]) => errors.push(args) },
    fetch: () => { calls.outbound++; throw Error('Real network is forbidden in account tests'); },
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id: number) => { timers.delete(id); },
  });
  const { createRoot } = await import('react-dom/client');
  const root: Root = createRoot(dom.window.document.querySelector('#root')!);
  let mounted = true;
  return {
    ...module.exports, dom, root, auth, calls, requests, downloads, blobs, errors, dispatchAuth: dispatch,
    document: dom.window.document, storage: dom.window.localStorage,
    get listenerCount() { return listeners.size; },
    async render(element: React.ReactNode) { await act(async () => { root.render(element); }); },
    async emit(user: User | null) { await act(async () => { dispatch(user); }); },
    async resolve(index: number, stories: SavedPromptItem[]) { await act(async () => { requests[index].pending.resolve(stories); }); },
    async reject(index: number, error = Error('Synthetic cloud failure')) { await act(async () => { requests[index].pending.reject(error); }); },
    async click(element: Element | null) {
      if (!element) throw Error('The expected clickable element was not mounted');
      await act(async () => { (element as HTMLElement).click(); });
    },
    async change(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null, value: string) {
      if (!element) throw Error('The expected editable element was not mounted');
      await act(async () => {
        const prototype = element instanceof dom.window.HTMLTextAreaElement ? dom.window.HTMLTextAreaElement.prototype
          : element instanceof dom.window.HTMLSelectElement ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
        element.dispatchEvent(new dom.window.Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
      });
    },
    async submit(form: HTMLFormElement | null) {
      if (!form) throw Error('The expected form was not mounted');
      await act(async () => { form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); });
    },
    async unmount() {
      if (mounted) { await act(async () => { root.unmount(); }); mounted = false; }
    },
    async cleanup() {
      if (mounted) { await act(async () => { root.unmount(); }); mounted = false; }
      dom.window.close();
      for (const [name, descriptor] of originalGlobals) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      }
    },
  };
}
export type AccountFixture = Awaited<ReturnType<typeof accountFixture>>;
export function button(fixture: AccountFixture, text: string, within: ParentNode = fixture.document): HTMLButtonElement {
  const found = [...within.querySelectorAll('button')].find(element => element.textContent?.trim() === text || element.getAttribute('aria-label') === text);
  if (!found) throw Error(`Button not found: ${text}`);
  return found;
}
