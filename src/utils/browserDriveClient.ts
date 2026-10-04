import { GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { auth, onAuthStateChanged } from '../lib/firebase';
import { DRIVE_FILE_SCOPE } from './driveBackupTypes';
import { createBrowserDriveBackup } from './browserDriveBackup';

export const browserDriveClient = createBrowserDriveBackup({
  uid: () => auth.currentUser?.uid || null,
  // No changes to the existing sign-in provider or Firebase configuration.
  authorize: async () => {
    const user = auth.currentUser;
    if (!user) throw Error('Sign in with Google first, then connect Drive.');
    const provider = new GoogleAuthProvider();
    provider.addScope(DRIVE_FILE_SCOPE);
    provider.setCustomParameters({ prompt: 'select_account', login_hint: user.email || '' });
    try {
      const result = await reauthenticateWithPopup(user, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const googleAccount = result.user.providerData.find(item => item.providerId === 'google.com');
      if (!credential?.accessToken || !googleAccount?.email || result.user.uid !== user.uid) throw Error();
      return { uid: result.user.uid, accessToken: credential.accessToken, email: googleAccount.email };
    } catch (error) {
      // Never render/log Firebase error objects: they can contain provider credentials.
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') throw Error('Drive connection was cancelled. Your local saves are safe.');
      if (code === 'auth/popup-blocked') throw Error('Your browser blocked Google’s connection window. Allow this popup, then choose Connect Drive again.');
      if (code === 'auth/user-mismatch') throw Error('Choose the same Google account you used to sign in to this app.');
      throw Error('Google Drive connection was not completed. Check the Google account and app setup, then try again.');
    }
  },
  storage: {
    getItem: key => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  },
  withLock: (name, task) => {
    if (!navigator.locks) return Promise.reject(Error('Safe Drive backup needs a browser with Web Locks support. Local saves still work.'));
    return navigator.locks.request(name, task);
  },
});
onAuthStateChanged(auth, () => browserDriveClient.ownerChanged());
