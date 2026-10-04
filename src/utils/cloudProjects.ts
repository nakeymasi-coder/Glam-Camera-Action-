import { createLocalId } from './projectIds';
import type { SavedPromptItem } from '../types';

/** This is client provenance, not a substitute for Firestore's owner rules. */
export const CLOUD_PROJECT_APP_ID = 'glam-camera-action';
export const CLOUD_PROJECT_PREFIX = 'gca_v1_';
const safeId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
export interface CloudDocument { id: string; data: Record<string, any>; }
export interface CloudReviewItem { id: string; title: string; createdAt: string; updatedAt: string; storyIdea: string; }
export interface CloudDeletionReview { uid: string; items: readonly CloudReviewItem[]; excludedCount: number; }
export interface CloudDeletionResult { deletedIds: string[]; missingIds: string[]; changedIds: string[]; failedIds: string[]; stoppedIds: string[]; cacheCleanupFailedIds: string[]; }
export type CloudMutation = { uid: string; deletedIds: readonly string[]; savedId?: string };
type TransactionAction = { kind: 'set'; data: Record<string, any> } | { kind: 'delete' } | { kind: 'none' };
export interface CloudProjectPort {
  currentUid(): string | null;
  removeCachedCopies(uid: string, ids: readonly string[]): void;
  listFromServer(uid: string): Promise<CloudDocument[]>;
  transact(uid: string, id: string, decide: (current: Record<string, any> | null) => TransactionAction): Promise<void>;
}
export class CloudProjectError extends Error {}
const canonical = (value: any): string => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object' && (Object.getPrototypeOf(value) === null || Object.getPrototypeOf(value)?.constructor?.name === 'Object')) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  throw new CloudProjectError('Unsupported cloud record.');
};
export function isEligibleCloudProject(uid: string, record: CloudDocument): boolean {
  const data = record.data;
  const marker = data?.cloudProvenance;
  return Boolean(safeId(uid) && marker?.appId === CLOUD_PROJECT_APP_ID && marker?.version === 1 && safeId(marker?.saveId)
    && safeId(marker?.revision) && record.id === CLOUD_PROJECT_PREFIX + marker.saveId && data.userId === uid
    && typeof data.title === 'string' && data.title.trim() && typeof data.masterPrompt === 'string'
    && typeof data.createdAt === 'string' && Number.isFinite(Date.parse(data.createdAt))
    && typeof data.updatedAt === 'string' && Number.isFinite(Date.parse(data.updatedAt))
    && data.state && typeof data.state === 'object' && !Array.isArray(data.state));
}

/** A single tab's save/review barrier. Cross-device edits are checked transactionally. */
export function createCloudProjectStore(port: CloudProjectPort) {
  let busy = false;
  const listeners = new Set<(change: CloudMutation) => void>();
  const tombstones = new Map<string, Set<string>>();
  const reviews = new WeakMap<CloudDeletionReview, { active: boolean; running: boolean; sessionCurrent: () => boolean; records: CloudDocument[]; fingerprints: Map<string, string> }>();
  const notify = (change: CloudMutation) => {
    for (const listener of listeners) {
      try { listener(change); } catch { /* A UI listener cannot change a confirmed transaction outcome. */ }
    }
  };
  const assertSession = (uid: string, isCurrent: () => boolean) => {
    if (!safeId(uid) || port.currentUid() !== uid || !isCurrent()) throw new CloudProjectError('Your account changed. Close this dialog and review again.');
  };
  const acquire = () => {
    if (busy) throw new CloudProjectError('A cloud save or review is already open. Finish or cancel it first.');
    busy = true;
  };
  return {
    subscribe(listener: (change: CloudMutation) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    isBusy: () => busy,
    filterDeleted<T extends { id: string }>(uid: string, items: T[]): T[] { return items.filter(item => !tombstones.get(uid)?.has(item.id)); },
    async fetch(uid: string) {
      const records = await port.listFromServer(uid);
      // Fresh saves always have new IDs. Keep filtering every late read by confirmed absence.
      return records.filter(record => !tombstones.get(uid)?.has(record.id)).map(record => ({ ...record.data, id: record.id } as SavedPromptItem));
    },
    async save(uid: string, story: Record<string, any>, isCurrent: () => boolean) {
      assertSession(uid, isCurrent);
      const projectId = story?.projectId ?? story?.id;
      if (!safeId(projectId) || typeof story.title !== 'string' || !story.title.trim() || typeof story.masterPrompt !== 'string' || !story.state) throw new CloudProjectError('This project cannot be safely saved.');
      const saveId = createLocalId();
      const id = CLOUD_PROJECT_PREFIX + saveId;
      acquire();
      try {
        const now = new Date().toISOString();
        const data = { ...story, id, projectId, userId: uid, createdAt: now, updatedAt: now,
          cloudProvenance: { appId: CLOUD_PROJECT_APP_ID, version: 1, saveId, revision: createLocalId() } };
        canonical(data); // Reject unsupported records before any transaction.
        await port.transact(uid, id, current => {
          assertSession(uid, isCurrent);
          // Never turn an unmarked collision into an app-owned record.
          if (current) throw new CloudProjectError('A cloud record already uses this ID. It was left unchanged. Please save again.');
          return { kind: 'set', data };
        });
        tombstones.get(uid)?.delete(id);
        notify({ uid, deletedIds: [], savedId: id });
      } finally { busy = false; }
    },
    async review(uid: string, isCurrent: () => boolean, signal?: AbortSignal): Promise<CloudDeletionReview> {
      assertSession(uid, isCurrent);
      if (signal?.aborted) throw new CloudProjectError('Review cancelled.');
      acquire();
      let cancelled = false;
      const cancelPending = () => { cancelled = true; busy = false; };
      signal?.addEventListener('abort', cancelPending, { once: true });
      try {
        const all = await port.listFromServer(uid);
        if (cancelled) throw new CloudProjectError('Review cancelled.');
        assertSession(uid, isCurrent);
        const fingerprints = new Map<string, string>();
        const records = all.filter(record => {
          if (!isEligibleCloudProject(uid, record) || fingerprints.has(record.id)) return false;
          try { fingerprints.set(record.id, canonical(record.data)); return true; } catch { return false; }
        }).sort((a, b) => a.id.localeCompare(b.id));
        const review = Object.freeze({ uid, excludedCount: all.length - records.length,
          items: Object.freeze(records.map(({ id, data }) => Object.freeze({ id, title: data.title, createdAt: data.createdAt, updatedAt: data.updatedAt, storyIdea: typeof data.state.storyIdea === 'string' ? data.state.storyIdea : '' }))) });
        reviews.set(review, { active: true, running: false, sessionCurrent: isCurrent, records, fingerprints });
        return review;
      } catch (error) { if (!cancelled) busy = false; throw error; }
      finally { signal?.removeEventListener('abort', cancelPending); }
    },
    cancel(review: CloudDeletionReview) {
      const state = reviews.get(review);
      if (!state) return;
      state.active = false;
      if (!state.running) { reviews.delete(review); busy = false; }
    },
    async deleteReviewed(review: CloudDeletionReview, isCurrent: () => boolean): Promise<CloudDeletionResult> {
      const state = reviews.get(review);
      if (!state?.active || state.running) throw new CloudProjectError('This review has expired. Review the cloud projects again.');
      assertSession(review.uid, () => state.sessionCurrent() && isCurrent());
      state.running = true;
      const result: CloudDeletionResult = { deletedIds: [], missingIds: [], changedIds: [], failedIds: [], stoppedIds: [], cacheCleanupFailedIds: [] };
      try {
        for (const record of state.records) {
          if (!state.active || !state.sessionCurrent() || !isCurrent() || port.currentUid() !== review.uid) { result.stoppedIds.push(record.id); continue; }
          const status: { disposition: 'deletedIds' | 'missingIds' | 'changedIds' } = { disposition: 'changedIds' };
          try {
            await port.transact(review.uid, record.id, current => {
              assertSession(review.uid, () => state.sessionCurrent() && isCurrent());
              if (!state.active) throw new CloudProjectError('Review cancelled.');
              if (!current) { status.disposition = 'missingIds'; return { kind: 'none' }; }
              if (!isEligibleCloudProject(review.uid, { id: record.id, data: current }) || canonical(current) !== state.fingerprints.get(record.id)) {
                status.disposition = 'changedIds'; return { kind: 'none' };
              }
              status.disposition = 'deletedIds';
              return { kind: 'delete' };
            });
            result[status.disposition].push(record.id);
            if (status.disposition === 'deletedIds' || status.disposition === 'missingIds') {
              const deleted = tombstones.get(review.uid) ?? new Set<string>();
              deleted.add(record.id); tombstones.set(review.uid, deleted);
              try { port.removeCachedCopies(review.uid, [record.id]); } catch { result.cacheCleanupFailedIds.push(record.id); }
              notify({ uid: review.uid, deletedIds: [record.id] });
            }
          } catch {
            (state.active && state.sessionCurrent() && isCurrent() && port.currentUid() === review.uid ? result.failedIds : result.stoppedIds).push(record.id);
          }
        }
        return result;
      } finally { state.active = false; reviews.delete(review); busy = false; }
    },
  };
}
