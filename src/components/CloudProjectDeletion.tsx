import React, { useEffect, useRef, useState } from 'react';
import { cloudProjects, auth, type User } from '../lib/firebase';
import type { CloudDeletionReview, CloudDeletionResult } from '../utils/cloudProjects';

interface Props { user: User; isSessionCurrent: () => boolean; onBusyChange: (busy: boolean) => void; }
export function CloudProjectDeletion({ user, isSessionCurrent, onBusyChange }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [review, setReview] = useState<CloudDeletionReview | null>(null);
  const [result, setResult] = useState<CloudDeletionResult | null>(null);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const live = useRef(true);
  const reviewRef = useRef<CloudDeletionReview | null>(null);
  const requestAbort = useRef<AbortController | null>(null);
  const operation = useRef(0);
  const submitting = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = () => live.current && isSessionCurrent() && auth.currentUser?.uid === user.uid;
  const close = () => {
    if (submitting.current) return;
    ++operation.current;
    requestAbort.current?.abort();
    if (reviewRef.current) cloudProjects.cancel(reviewRef.current);
    reviewRef.current = null;
    setReview(null); setOpen(false); setLoading(false); setConfirmation('');
    onBusyChange(false);
  };
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; ++operation.current; requestAbort.current?.abort(); if (reviewRef.current) cloudProjects.cancel(reviewRef.current); };
  }, []);
  useEffect(() => {
    // A→B→A may be batched without remounting this workspace. A review still expires.
    ++operation.current;
    requestAbort.current?.abort();
    if (reviewRef.current) cloudProjects.cancel(reviewRef.current);
    reviewRef.current = null;
    setReview(null); setOpen(false); setLoading(false); setDeleting(false); setConfirmation(''); onBusyChange(false);
  }, [isSessionCurrent]);
  useEffect(() => {
    if (open) { dialogRef.current?.showModal(); cancelRef.current?.focus(); wasOpen.current = true; }
    else { dialogRef.current?.close(); if (wasOpen.current) triggerRef.current?.focus(); wasOpen.current = false; }
  }, [open]);
  const begin = async () => {
    if (!current() || loading || reviewRef.current || submitting.current) return;
    const request = ++operation.current;
    const controller = new AbortController();
    requestAbort.current = controller;
    setOpen(true); setLoading(true); setReview(null); setResult(null); setError(''); setConfirmation(''); onBusyChange(true);
    try {
      const next = await cloudProjects.review(user.uid, () => current() && request === operation.current, controller.signal);
      if (!current() || request !== operation.current) { cloudProjects.cancel(next); return; }
      reviewRef.current = next; setReview(next);
    } catch (reason) {
      if (current() && request === operation.current) setError(reason instanceof Error ? reason.message : 'Cloud projects could not be checked. Nothing was deleted.');
    } finally {
      if (current() && request === operation.current) setLoading(false);
    }
  };
  const confirm = async () => {
    if (!current() || submitting.current || !review || confirmation !== 'DELETE' || !review.items.length) return;
    submitting.current = true; setDeleting(true); setError('');
    try {
      const outcome = await cloudProjects.deleteReviewed(review, current);
      if (current()) { setResult(outcome); setConfirmation(''); }
    } catch (reason) {
      if (current()) setError(reason instanceof Error ? reason.message : 'Deletion could not finish. Review again before retrying.');
    } finally {
      submitting.current = false;
      if (reviewRef.current) cloudProjects.cancel(reviewRef.current);
      reviewRef.current = null;
      if (current()) { setDeleting(false); onBusyChange(false); cancelRef.current?.focus(); }
    }
  };
  return <>
    <button ref={triggerRef} type="button" onClick={begin} className="px-2 py-1 text-xs text-red-700 rounded border border-red-200 hover:bg-red-50" disabled={open}>Delete cloud-saved projects</button>
    <dialog ref={dialogRef} aria-labelledby="cloud-delete-title" onCancel={event => { event.preventDefault(); close(); }} className="m-auto max-w-xl w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl backdrop:bg-black/60 text-neutral-900">
      {open && <>
        <h2 id="cloud-delete-title" className="text-lg font-bold">Delete cloud-saved projects</h2>
        <p className="mt-2 text-sm">Account: <strong>{user.email || user.displayName || user.uid}</strong></p>
        <p className="text-xs text-neutral-600 break-all">Account ID: {user.uid}</p>
        {loading && <p role="status" className="mt-4">Checking this account’s cloud records from the server…</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        {review && <>
          <p className="mt-4 text-sm font-semibold">{review.items.length} eligible cloud-saved {review.items.length === 1 ? 'project' : 'projects'} in this review</p>
          <p className="mt-2 text-sm">Only records created with this app’s new cloud-save marker are eligible. {review.excludedCount} unmarked, older, different-app or unsupported {review.excludedCount === 1 ? 'record is' : 'records are'} excluded and will stay. Older records cannot be reliably assigned to this app.</p>
          <ul className="mt-3 space-y-2 max-h-52 overflow-y-auto border rounded-lg p-3" aria-label="Eligible cloud projects">
            {review.items.map(item => <li key={item.id} className="text-sm border-b last:border-0 pb-2 break-words">
              <strong>{item.title}</strong><span className="block text-xs break-all">Cloud ID: {item.id}</span>
              <span className="block text-xs">Saved: {item.createdAt} · Updated: {item.updatedAt}</span>
              {item.storyIdea && <details className="mt-1"><summary>View story details</summary><p className="whitespace-pre-wrap">{item.storyIdea}</p></details>}
            </li>)}
            {!review.items.length && <li className="text-sm">No eligible cloud projects found. No cloud records will be deleted.</li>}
          </ul>
          <p className="mt-4 text-sm font-semibold">Deleting these cloud records is permanent and cannot be undone in this app.</p>
          <p className="mt-2 text-sm">Deleted cloud projects and their cached cloud copies in this browser are removed. Separately saved local copies and Google Drive documents stay. Your profile, sign-in account, other account data, drafts, templates and backups stay.</p>
          <p className="mt-2 text-sm">This affects only the listed records. A changed record is kept for another review. Saves from other tabs or devices and future saves may remain. Other open tabs or devices can keep cached copies; another tab can restore a stale browser cache. This does not delete all older cloud work.</p>
          {!result && review.items.length > 0 && <label className="block mt-4 text-sm">Type DELETE to confirm the {review.items.length} listed cloud {review.items.length === 1 ? 'project' : 'projects'}
            <input aria-label="Type DELETE to confirm cloud deletion" className="block border border-neutral-300 rounded px-3 py-2 mt-1 w-full" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={deleting} autoComplete="off" spellCheck={false} />
          </label>}
        </>}
        {result && <div role="status" className="mt-4 text-sm" aria-label="Cloud deletion result">
          <p><strong>{result.deletedIds.length} cloud {result.deletedIds.length === 1 ? 'project deleted' : 'projects deleted'}.</strong></p>
          <p>{result.missingIds.length} already absent; {result.changedIds.length} changed and kept; {result.failedIds.length} could not be confirmed deleted; {result.stoppedIds.length} stopped before completion.</p>
          {result.cacheCleanupFailedIds.length > 0 && <p role="alert" className="mt-2 text-red-700">The cloud originals are confirmed absent for {result.cacheCleanupFailedIds.length} records, but this browser could not remove their cached cloud copies. Those stale copies may appear after a reload; they are not proof that a cloud original still exists.</p>}
          <p className="mt-2">Separately saved local copies and Google Drive documents stay. Reopen this review to check remaining eligible cloud projects before another deletion.</p>
        </div>}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button ref={cancelRef} type="button" onClick={close} disabled={deleting} className="px-4 py-2 text-sm border rounded-lg">{result ? 'Close' : 'Cancel'}</button>
          {review && !result && <button type="button" onClick={confirm} disabled={deleting || confirmation !== 'DELETE' || !review.items.length} className="px-4 py-2 text-sm rounded-lg bg-red-700 text-white disabled:opacity-40">{deleting ? 'Deleting reviewed projects…' : `Permanently delete ${review.items.length} cloud ${review.items.length === 1 ? 'project' : 'projects'}`}</button>}
        </div>
      </>}
    </dialog>
  </>;
}
