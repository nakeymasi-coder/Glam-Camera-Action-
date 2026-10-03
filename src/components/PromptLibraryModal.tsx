import React, { useState } from 'react';
import { SavedPromptItem } from '../types';
import {
  X,
  Bookmark,
  Copy,
  Check,
  Trash2,
  Download,
  FolderOpen,
  Calendar,
  AlertCircle,
  HardDrive,
} from 'lucide-react';

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SavedPromptItem[];
  onLoadItem: (item: SavedPromptItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({
  isOpen,
  onClose,
  items,
  onLoadItem,
  onDeleteItem,
  onClearAll,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const handleCopy = (item: SavedPromptItem) => {
    navigator.clipboard.writeText(item.masterPrompt);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportAll = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glam-camera-action-library-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredItems = items.filter(
    (i) =>
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.masterPrompt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Library" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C99C62] flex items-center justify-center text-neutral-950">
              <Bookmark className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold">Saved Prompt Library</h2>
              <p className="text-xs text-neutral-400">
                {items.length} {items.length === 1 ? 'production prompt' : 'production prompts'} saved
              </p>
            </div>
          </div>
          <button
            onClick={onClose} aria-label="Close library"
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Storage Location Explainer */}
        <div className="px-6 py-2.5 bg-neutral-100 border-b border-neutral-200 text-xs text-neutral-600 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-neutral-500 shrink-0" />
            <span>
              <strong>Storage Location:</strong> Stored locally in your browser&apos;s <code className="font-mono bg-neutral-200 px-1 py-0.5 rounded text-[11px]">LocalStorage</code>. 100% private to this device.
            </span>
          </div>
          {items.length > 0 && (
            <button
              onClick={handleExportAll}
              className="text-xs font-semibold text-neutral-800 hover:text-black flex items-center gap-1 shrink-0"
              title="Export all saved prompts as JSON backup"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          )}
        </div>

        {/* Search bar */}
        {items.length > 0 && (
          <div className="px-6 pt-3 pb-2 border-b border-neutral-100">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search saved prompts..."
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#C99C62]"
            />
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-neutral-700">No saved prompts yet</p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                Configure your presets, click &quot;Generate Story Prompt&quot;, then click &quot;Save Prompt&quot; in the bottom bar to keep it here.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-xs text-neutral-500">
              No prompts match &quot;{searchTerm}&quot;
            </div>
          ) : (
            filteredItems.map((item) => {
              const isCopied = copiedId === item.id;
              const snippet = item.state.storyIdea || 'Custom 3-scene concept';

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50/50 hover:bg-neutral-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-neutral-900 truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] font-mono text-neutral-400 shrink-0 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                      {snippet}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => {
                        onLoadItem(item);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Load this prompt into the builder"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Load</span>
                    </button>

                    <button
                      onClick={() => handleCopy(item)}
                      className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-colors"
                      title="Copy prompt"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-2 rounded-lg border border-neutral-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-neutral-400 transition-colors"
                      title="Delete prompt"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          {items.length > 0 ? (
            <button
              onClick={onClearAll}
              className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors"
            >
              Clear entire library
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
