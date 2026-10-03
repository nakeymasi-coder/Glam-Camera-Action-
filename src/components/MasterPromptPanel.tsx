import React, { useState } from 'react';
import { Copy, Check, Download, Edit3, Eye, FileText, Sparkles, RefreshCw } from 'lucide-react';

interface MasterPromptPanelProps {
  prompt: string;
  onPromptChange: (newPrompt: string) => void;
  onCopy: () => void;
  isCopied: boolean;
  onRegenerate: () => void;
}

export const MasterPromptPanel: React.FC<MasterPromptPanelProps> = ({
  prompt,
  onPromptChange,
  onCopy,
  isCopied,
  onRegenerate,
}) => {
  const [isEditing, setIsEditing] = useState(true);

  const wordCount = prompt ? prompt.trim().split(/\s+/).filter(Boolean).length : 0;
  const lineCount = prompt ? prompt.split('\n').length : 0;

  const handleDownload = () => {
    const blob = new Blob([prompt], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glam-camera-action-master-prompt-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="generated-prompt-section" data-gca-panel="master" className="bg-white rounded-xl border border-neutral-300 shadow-md overflow-hidden">
      {/* Header bar */}
      <div className="bg-neutral-900 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#C99C62]" />
          <h2 className="text-sm sm:text-base font-bold tracking-tight">
            Local Master Story Prompt
          </h2>
          <span className="text-[11px] font-mono text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded">
            Editable Canvas Engine
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white px-2.5 py-1.5 rounded hover:bg-neutral-800 transition-colors"
            title="Toggle between raw editor and preview mode"
          >
            {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            <span>{isEditing ? 'Preview View' : 'Edit Prompt'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white px-2.5 py-1.5 rounded hover:bg-neutral-800 transition-colors"
            title="Download as Markdown file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export .md</span>
          </button>

          <button
            type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white px-2.5 py-1.5 rounded hover:bg-neutral-800 transition-colors"
            title="Rebuild prompt from current selections"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={onCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
              isCopied
                ? 'bg-amber-600 text-white'
                : 'bg-[#C99C62] hover:bg-[#B98A4D] text-neutral-950 shadow-xs'
            }`}
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Prompt</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notice / Guidance */}
      <div className="bg-amber-50/80 border-b border-amber-200/80 px-4 sm:px-6 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#C99C62] shrink-0 fill-current" />
          <span>
            <strong>Local Planning Template:</strong> Edit, copy, or export your prompt. The 6-Canvas Flow shows coordinated image and script instructions, not rendered media or AI-written scenes.
          </span>
        </div>
        <div className="font-mono text-[11px] text-amber-800 shrink-0">
          {wordCount} words · {lineCount} lines
        </div>
      </div>

      {/* Editor / Preview Area */}
      <div className="p-4 sm:p-6 bg-neutral-950 text-neutral-100">
        {isEditing ? (
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            rows={18}
            className="w-full bg-neutral-950 text-neutral-100 font-mono text-xs sm:text-sm leading-relaxed p-3 rounded-lg border border-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#C99C62] focus:border-[#C99C62] resize-y selection:bg-[#C99C62] selection:text-black"
            placeholder="Generated master prompt will appear here..."
          />
        ) : (
          <div className="whitespace-pre-wrap font-mono text-xs sm:text-sm leading-relaxed p-4 rounded-lg bg-neutral-900/80 border border-neutral-800 text-neutral-200 max-h-[500px] overflow-y-auto selection:bg-[#C99C62] selection:text-black">
            {prompt}
          </div>
        )}
      </div>

      {/* Footer bar with quick usage instructions */}
      <div className="bg-neutral-50 px-4 sm:px-6 py-3 border-t border-neutral-200 text-xs text-neutral-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-neutral-900">Output structure: </span>
          <span>Canvas 1 (Scene 1 Image) &rarr; Canvas 2 (Scene 1 Script) &rarr; Canvas 3 (Scene 2 Image) &rarr; Canvas 4 (Scene 2 Script) &rarr; Canvas 5 (Scene 3 Image) &rarr; Canvas 6 (Scene 3 Script)</span>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs font-bold text-neutral-900 hover:text-black underline underline-offset-4 self-start sm:self-auto"
        >
          {isCopied ? 'Copied to clipboard' : 'Click to copy full prompt'}
        </button>
      </div>
    </div>
  );
};
