import React, { useState, useEffect } from 'react';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  onAuthStateChanged,
  User,
  saveStoryToCloud,
  fetchStoriesFromCloud,
} from '../lib/firebase';
import {
  LogIn,
  LogOut,
  User as UserIcon,
  Cloud,
  CloudCheck,
  Loader2,
  HardDrive,
} from 'lucide-react';

interface AuthBarProps {
  onSyncCloudStories?: (stories: any[]) => void;
  currentStory?: any;
  onToast: (msg: string) => void;
}

export const AuthBar: React.FC<AuthBarProps> = ({
  onSyncCloudStories,
  currentStory,
  onToast,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser && onSyncCloudStories) {
        try {
          const cloudItems = await fetchStoriesFromCloud(currentUser.uid);
          if (cloudItems.length > 0) {
            onSyncCloudStories(cloudItems);
          }
        } catch (e) {
          console.error('Error fetching initial cloud stories:', e);
        }
      }
    });

    return () => unsubscribe();
  }, [onSyncCloudStories]);

  const handleSignIn = async () => {
    try {
      setIsAuthLoading(true);
      const loggedUser = await signInWithGoogle();
      onToast(`Signed in as ${loggedUser.displayName || loggedUser.email}!`);
    } catch (err: any) {
      console.error(err);
      onToast(`Sign in error: ${err.message || 'Popup closed'}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      onToast('Signed out of Google account.');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSaveToFirestore = async () => {
    if (!user) {
      handleSignIn();
      return;
    }
    if (!currentStory) {
      onToast('Generate or configure a story prompt first before saving.');
      return;
    }

    setIsSyncing(true);
    try {
      await saveStoryToCloud(user.uid, currentStory);
      onToast('Saved to Firebase Firestore cloud database!');
    } catch (err: any) {
      console.error(err);
      onToast(`Firestore save error: ${err.message || 'Permission denied'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-neutral-500 py-1">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="hidden sm:inline">Firebase...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 transition-colors shadow-xs"
        title="Sign in with Google using Firebase Auth"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span className="hidden sm:inline">Sign in with Google</span>
        <span className="sm:hidden">Sign in</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Save to Firestore button */}
      <button
        type="button"
        onClick={handleSaveToFirestore}
        disabled={isSyncing}
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-xs"
        title="Save active story to your Firestore account"
      >
        {isSyncing ? (
          <Loader2 className="w-3 h-3 animate-spin text-[#C99C62]" />
        ) : (
          <Cloud className="w-3 h-3 text-[#C99C62]" />
        )}
        <span className="hidden md:inline">Save to Cloud</span>
      </button>

      {/* User profile dropdown / avatar */}
      <div className="flex items-center gap-1.5 pl-1.5 border-l border-neutral-200">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User'}
            className="w-6 h-6 rounded-full border border-neutral-300"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
        )}
        <span className="text-xs font-semibold text-neutral-800 hidden lg:inline max-w-[100px] truncate">
          {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          className="p-1 rounded text-neutral-400 hover:text-red-600 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
