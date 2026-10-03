import React from 'react';
import { Bookmark, BookOpen, Clapperboard } from 'lucide-react';
import { AuthBar } from './AuthBar';
import type { User } from '../lib/firebase';

interface HeaderProps {
  savedCount: number;
  onOpenLibrary: () => void;
  onOpenExamples: () => void;
  activeView: 'builder' | 'canvases' | 'bible' | 'characters' | 'templates';
  setActiveView: (view: 'builder' | 'canvases' | 'bible' | 'characters' | 'templates') => void;
  currentStory?: any;
  onToast: (msg: string) => void;
  user: User | null;
  recovery?: boolean;
  isSessionCurrent: () => boolean;
}

export const Header: React.FC<HeaderProps> = ({ savedCount, onOpenLibrary, onOpenExamples, activeView, setActiveView, currentStory, onToast, user, recovery, isSessionCurrent }) => {
  const views = [ ['builder','01','Story builder'], ['canvases','02','6-Canvas Flow'], ['bible','03','Story Bible'], ['characters','04','Characters'], ['templates','05','Templates'] ] as const;
  return <header className="gca-header">
    <div className="gca-header-top">
      <button className="gca-wordmark" onClick={() => setActiveView('builder')} aria-label="Glam, Camera, Action! Home">
        <span className="gca-mark" aria-hidden="true"><Clapperboard size={25} strokeWidth={1.5}/></span>
        <span>Glam, Camera, Action!<small>YOUR CREATIVE PRODUCTION STUDIO</small></span>
      </button>
      <div className="gca-header-actions">
        <button className="gca-utility" onClick={onOpenExamples} title="Load reference examples"><BookOpen size={16}/><span>Examples</span></button>
        <button className="gca-utility" onClick={onOpenLibrary} title="Saved Prompts Library"><Bookmark size={16}/><span>Library{savedCount > 0 && <span className="gca-count">{savedCount}</span>}</span></button>
        <div className="gca-account"><AuthBar currentStory={currentStory} onToast={onToast} user={user} recovery={recovery} isSessionCurrent={isSessionCurrent}/></div>
      </div>
    </div>
    <div className="gca-nav-wrap"><nav className="gca-nav" aria-label="Production workspace">
      {views.map(([view,num,label]) => <button key={view} onClick={() => setActiveView(view)} className={activeView === view ? 'is-active' : ''} aria-current={activeView === view ? 'page' : undefined}><span className="gca-nav-number">{num}</span>{label}</button>)}
    </nav><span className="gca-nav-note">One idea. Every detail connected.</span></div>
  </header>;
};
