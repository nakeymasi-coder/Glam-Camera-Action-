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
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

// Import configuration from provisioned file
import firebaseConfig from '../../firebase-applet-config.json';

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

// Firestore story persistence functions
export async function saveStoryToCloud(userId: string, story: any) {
  const storyRef = doc(db, 'users', userId, 'stories', story.id);
  await setDoc(storyRef, {
    ...story,
    userId,
    updatedAt: new Date().toISOString(),
  });
}

export async function fetchStoriesFromCloud(userId: string) {
  const storiesRef = collection(db, 'users', userId, 'stories');
  const snapshot = await getDocs(storiesRef);
  const items: any[] = [];
  snapshot.forEach((d) => items.push(d.data()));
  return items;
}

export async function deleteStoryFromCloud(userId: string, storyId: string) {
  const storyRef = doc(db, 'users', userId, 'stories', storyId);
  await deleteDoc(storyRef);
}
