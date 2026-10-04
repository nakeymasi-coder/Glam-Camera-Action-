import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocsFromServer,
  runTransaction,
} from 'firebase/firestore';

// Import configuration from provisioned file
import firebaseConfig from '../../firebase-applet-config.json';
import { createCloudProjectStore } from '../utils/cloudProjects';
import { createWorkspaceStorage } from '../utils/workspaceStorage';
import { CLOUD_LIBRARY_STORAGE_KEY } from '../utils/cloudLibrary';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Use specified custom database ID if present in the config
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  // Ensure user profile doc exists
  if (result.user) {
    const userRef = doc(db, 'users', result.user.uid);
    await setDoc(
      userRef,
      {
        userId: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || 'Creator',
        photoURL: result.user.photoURL || '',
        lastLogin: new Date().toISOString(),
      },
      { merge: true }
    );
  }
  return result.user;
};

export const signOutUser = async (): Promise<void> => {
  await signOut(auth);
};

export { onAuthStateChanged };
export type { User };

// All project mutation paths use this barrier; profiles/auth remain independent.
export const cloudProjects = createCloudProjectStore({
  currentUid: () => auth.currentUser?.uid ?? null,
  removeCachedCopies(uid, ids) {
    // Run even after an account switch/unmount, against the original account only.
    const storage = createWorkspaceStorage(uid);
    const raw = storage.getItem(CLOUD_LIBRARY_STORAGE_KEY);
    if (raw === null) return;
    const cached = JSON.parse(raw);
    if (!Array.isArray(cached) || cached.some(item => !item || typeof item.id !== 'string')) throw Error('The cloud cache could not be safely updated.');
    storage.setItem(CLOUD_LIBRARY_STORAGE_KEY, JSON.stringify(cached.filter(item => !ids.includes(item.id))));
  },
  async listFromServer(uid) {
    const snapshot = await getDocsFromServer(collection(db, 'users', uid, 'stories'));
    return snapshot.docs.map(document => ({ id: document.id, data: document.data() }));
  },
  async transact(uid, id, decide) {
    const reference = doc(db, 'users', uid, 'stories', id);
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(reference);
      const action = decide(snapshot.exists() ? snapshot.data() : null);
      if (action.kind === 'set') transaction.set(reference, action.data);
      else if (action.kind === 'delete') transaction.delete(reference);
    });
  },
});
export const saveStoryToCloud = (uid: string, story: any, isCurrent: () => boolean) => cloudProjects.save(uid, story, isCurrent);
export const fetchStoriesFromCloud = (uid: string) => cloudProjects.fetch(uid);
