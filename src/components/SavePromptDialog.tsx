import React, { useState } from 'react';
import { Bookmark, X } from 'lucide-react';

interface SavePromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
  defaultTitle: string;
}

export const SavePromptDialog: React.FC<SavePromptDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultTitle,
}) => {
  const [title, setTitle] = useState(defaultTitle);

  // Sync title when opening
  React.useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle || 'My Three-Scene Story');
    }
  }, [isOpen, defaultTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(title.trim());
      onClose();
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Save prompt" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C99C62] text-black flex items-center justify-center">
              <Bookmark className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">Save to Prompt Library</h3>
              <p className="text-xs text-neutral-500">Stored safely in local browser storage</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose} aria-label="Close save prompt"
            className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Prompt Title / Production Name:
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chibi Salon Bangs Disaster"
              className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C99C62] focus:border-neutral-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-neutral-300 text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 rounded-lg bg-[#C99C62] hover:bg-[#B98A4D] disabled:opacity-50 text-xs sm:text-sm font-bold text-neutral-950 transition-colors shadow-xs"
            >
              Save Prompt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
