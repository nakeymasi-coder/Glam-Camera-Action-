import React from 'react';
import { Sparkles, Dices, Copy, Check, RotateCcw, BookmarkPlus, Wand2 } from 'lucide-react';

interface ButtonBarProps {
  onGenerate: () => void;
  onCopy: () => void;
  onRandom: () => void;
  onSurpriseMe: () => void;
  onReset: () => void;
  onSave: () => void;
  hasPrompt: boolean;
  isCopied: boolean;
}

export const ButtonBar: React.FC<ButtonBarProps> = ({
  onGenerate,
  onCopy,
  onRandom,
  onSurpriseMe,
  onReset,
  onSave,
  hasPrompt,
  isCopied,
}) => {
  return (
    <div className="gca-action-bar sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-neutral-300 py-3.5 px-4 sm:px-6 shadow-lg">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Left Side: Creative & Reset Helpers */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onRandom}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 text-xs sm:text-sm font-semibold transition-all shadow-xs min-h-[44px]"
            title="Randomizes the five presets and picks a usable story seed"
          >
            <Dices className="w-4 h-4 text-neutral-600" />
            <span>Random</span>
          </button>

          <button
            type="button"
            onClick={onSurpriseMe}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-neutral-900 bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs min-h-[44px]"
            title="Creates an expertly coordinated complete story concept instantly"
          >
            <Sparkles className="w-4 h-4 text-[#C99C62]" />
            <span>Surprise Me</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-neutral-200 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-neutral-600 text-xs sm:text-sm font-medium transition-colors min-h-[44px]"
            title="Reset all presets to None and clear text fields"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Clear / Reset</span>
            <span className="sm:hidden">Reset</span>
          </button>
        </div>

        {/* Right Side: Core Generation, Save, Copy Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {hasPrompt && (
            <>
              <button
                type="button"
                onClick={onSave}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 text-xs sm:text-sm font-semibold transition-all min-h-[44px]"
                title="Save this prompt to your local library"
              >
                <BookmarkPlus className="w-4 h-4 text-[#8A5036]" />
                <span>Save Prompt</span>
              </button>

              <button
                type="button"
                onClick={onCopy}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-xs min-h-[44px] ${
                  isCopied
                    ? 'bg-amber-600 text-white border border-amber-600'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300'
                }`}
                title="Copy master prompt to clipboard"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Primary Action Button: Golden Yellow #C99C62 */}
          <button
            type="button"
            onClick={onGenerate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#C99C62] hover:bg-[#B98A4D] active:scale-[0.98] text-neutral-950 text-sm sm:text-base font-extrabold tracking-tight transition-all shadow-md min-h-[44px]"
          >
            <Wand2 className="w-4 h-4 text-black" />
            <span>Generate Story Prompt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
