import React, { useEffect, useState } from 'react';
import { Cloud, Loader2, ExternalLink, Unplug } from 'lucide-react';
import { auth, onAuthStateChanged } from '../lib/firebase';
import { connectDriveBackup, disconnectDriveBackup, getDriveBackupStatus, subscribeDriveBackup, type DriveBackupView } from '../utils/driveBackup';

export function DriveBackupPanel() {
  const [view, setView] = useState<DriveBackupView>({ status: null, result: null, busy: false });
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const [signedIn, setSignedIn] = useState(Boolean(auth.currentUser));
  useEffect(() => {
    const unsubscribe = subscribeDriveBackup(setView);
    const authUnsubscribe = onAuthStateChanged(auth, user => {
      setSignedIn(Boolean(user));
      setNotice('');
      void getDriveBackupStatus().catch(() => setNotice('Drive status is unavailable. Local saves still work.'));
    });
    const result = new URLSearchParams(window.location.search).get('drive');
    if (result === 'cancelled') setNotice('Drive connection was cancelled. Local saves still work.');
    if (result === 'failed') setNotice('Drive connection was not completed. Try connecting again.');
    return () => { unsubscribe(); authUnsubscribe(); };
  }, []);
  async function perform(action: () => Promise<unknown>) {
    setWorking(true); setNotice('');
    try { await action(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Drive request did not complete.'); }
    finally { setWorking(false); }
  }
  const status = view.status;
  const message = notice || (view.busy ? 'Backing up the saved snapshot…' : view.result?.message) || status?.message || 'Checking private Drive backup…';
  return <section className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5 space-y-3" aria-labelledby="drive-backup-heading">
    <div className="flex items-center gap-2"><Cloud className="h-4 w-4 text-[#8A5036]" /><h2 id="drive-backup-heading" className="font-semibold text-sm">Private Google Drive backup</h2></div>
    <p className="text-xs text-neutral-600 leading-relaxed">After you connect, Save Prompt backs up your saved project brief and continuity as two Google Docs in your own Drive. If you changed fields after generating, Generate first to include those changes in the saved production snapshot.</p>
    {import.meta.env.VITE_DRIVE_BACKUP_MODE === 'browser' && <p className="text-xs text-neutral-600 leading-relaxed">Use the same Google account you signed in with. Keep this page open until both backups are confirmed. Reconnect after refreshing or when Google access expires. Disconnect stops this page’s access; revoke Google permission separately in your Google Account connections.</p>}
    <p className="text-xs text-neutral-600 leading-relaxed">The app requests access only to files it creates or you explicitly open with it. These app-managed documents are replaced on Save; keep personal edits in a separate copy. Drive backups support up to 100 cast members and 180,000 text characters per project.</p>
    <p className="text-sm text-neutral-700 flex items-center gap-2" role="status" aria-live="polite">{(working || view.busy) && <Loader2 className="w-4 h-4 shrink-0 animate-spin" />}{message}</p>
    <div className="flex flex-wrap items-center gap-2">
      {status?.configured && status.connected ? <button type="button" disabled={working} onClick={() => perform(disconnectDriveBackup)} className="px-3 py-2 rounded-lg border border-neutral-300 text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-50"><Unplug className="w-3.5 h-3.5" />Disconnect Drive</button> : <button type="button" disabled={working || !status?.configured || !signedIn} onClick={() => perform(connectDriveBackup)} className="px-3 py-2 rounded-lg bg-neutral-900 text-white text-xs font-semibold disabled:opacity-50">Connect Google Drive</button>}
      <button type="button" disabled={working || view.busy} onClick={() => perform(getDriveBackupStatus)} className="px-3 py-2 rounded-lg border border-neutral-300 text-xs disabled:opacity-50">Refresh status</button>
      {status?.configured && !signedIn && <span className="text-xs text-neutral-500">Sign in with Google above to connect</span>}
    </div>
    {view.result?.status === 'synced' && <div className="flex flex-wrap gap-4 text-xs">
      {view.result.briefUrl && <a className="underline inline-flex items-center gap-1" href={view.result.briefUrl} target="_blank" rel="noopener noreferrer">Project Brief <ExternalLink className="w-3 h-3" /></a>}
      {view.result.continuityUrl && <a className="underline inline-flex items-center gap-1" href={view.result.continuityUrl} target="_blank" rel="noopener noreferrer">Continuity Bible <ExternalLink className="w-3 h-3" /></a>}
    </div>}
  </section>;
}
