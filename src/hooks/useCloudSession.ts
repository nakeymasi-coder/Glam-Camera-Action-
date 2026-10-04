import { useEffect, useState } from 'react';
import { auth, onAuthStateChanged, fetchStoriesFromCloud, cloudProjects, type User } from '../lib/firebase';
import type { SavedPromptItem } from '../types';

export interface CloudSession {
  ready: boolean;
  user: User | null;
  generation: number;
  cloudStories: SavedPromptItem[] | null;
  isCurrent: () => boolean;
}
/** One observer per App mount. Only an actual UID transition starts a cloud read. */
export function useCloudSession(): CloudSession {
  const [session, setSession] = useState<CloudSession>({ ready: false, user: null, generation: 0, cloudStories: null, isCurrent: () => false });
  useEffect(() => {
    let active = true;
    let uid: string | null | undefined;
    let generation = 0;
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      if (!active) return;
      const nextUid = currentUser?.uid ?? null;
      if (nextUid === uid) return;
      uid = nextUid;
      const requestGeneration = ++generation;
      setSession({ ready: true, user: currentUser, generation, cloudStories: null, isCurrent: () => active && requestGeneration === generation && uid === nextUid });
      if (nextUid === null) return;
      void fetchStoriesFromCloud(nextUid).then(stories => {
        if (!active || requestGeneration !== generation || uid !== nextUid || stories === null) return;
        setSession(previous => previous.generation === requestGeneration
          ? { ...previous, cloudStories: stories }
          : previous);
      }).catch(error => {
        if (active && requestGeneration === generation) console.error('Could not read this account’s cloud stories:', error);
      });
    });
    const unsubscribeMutations = cloudProjects.subscribe(change => {
      if (!active || change.uid !== uid || !change.deletedIds.length) return;
      setSession(previous => previous.user?.uid === change.uid && previous.cloudStories
        ? { ...previous, cloudStories: previous.cloudStories.filter(story => !change.deletedIds.includes(story.id)) }
        : previous);
    });
    return () => { active = false; ++generation; unsubscribe(); unsubscribeMutations(); };
  }, []);
  return session;
}
