import React, { useEffect, useRef, useState } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';
import { RANDOM_STORY_IDEAS } from '../data/presetsData';
import { QUICK_STORY_SEEDS } from '../data/quickSeeds';

const IDEA_SEED_POOL = [...new Set([...RANDOM_STORY_IDEAS, ...QUICK_STORY_SEEDS.map(seed => seed.idea)])];

interface StoryIdeaInputProps {
  value: string;
  onChange: (val: string) => void;
}

export const StoryIdeaInput: React.FC<StoryIdeaInputProps> = ({ value, onChange }) => {
  const [pendingSeed, setPendingSeed] = useState<string | null>(null);
  const keepIdeaButton = useRef<HTMLButtonElement>(null);
  const replaceIdeaButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!pendingSeed) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    keepIdeaButton.current?.focus();
    return () => previousFocus?.focus();
  }, [pendingSeed]);

  const handleInsertIdea = (seed: string) => {
    if (value.trim() && value !== seed) {
      setPendingSeed(seed);
      return;
    }
    onChange(seed);
  };

  const handlePickRandomSeed = () => {
    const randomSeed = IDEA_SEED_POOL[Math.floor(Math.random() * IDEA_SEED_POOL.length)];
    handleInsertIdea(randomSeed);
  };

  return (
    <div className="gca-story-input bg-white rounded-xl border border-neutral-200/90 shadow-sm p-4 sm:p-6 transition-all hover:border-neutral-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
        <label
          htmlFor="story-idea-input"
          className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight flex items-center gap-2"
        >
          <span>What do you want this story to be about?</span>
          <span className="text-xs font-normal text-neutral-500">(Your core concept)</span>
        </label>
        <button
          type="button"
          onClick={handlePickRandomSeed}
          className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-black py-1 px-2 rounded hover:bg-neutral-100 transition-colors self-start sm:self-auto"
        >
          <Sparkles className="w-3 h-3 text-[#8A5036]" />
          <span>Inspire me with an idea seed</span>
        </button>
      </div>

      <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
        Type naturally. Your written direction takes priority over automatic planning defaults.
        Generate creates a local production prompt and scene plan; it does not call an AI service.
      </p>

      <div className="relative">
        <textarea
          id="story-idea-input"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. A dramatic chibi hairstylist catches her client cutting her own bangs the night before a wedding."
          className="w-full text-sm sm:text-base px-3.5 py-3 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C99C62] focus:border-neutral-900 bg-neutral-50/40 text-neutral-900 placeholder:text-neutral-400 transition-all resize-y min-h-[96px]"
        />
        {value.length > 0 && (
          <div className="text-[11px] text-neutral-400 font-mono mt-1 text-right">
            {value.trim().split(/\s+/).filter(Boolean).length} words · {value.length} characters
          </div>
        )}
      </div>

      {/* Idea-only shortcuts; the coordinated starter catalogue stays independent. */}
      <section aria-label="Quick seeds" className="mt-4 border-t border-neutral-200 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-700 font-semibold">
            <Lightbulb className="w-3.5 h-3.5 text-[#8A5036]" />
            Quick seeds <span className="text-neutral-400 font-normal">· {QUICK_STORY_SEEDS.length} ideas</span>
          </span>
          <span className="text-[11px] text-neutral-500">Mysteries, promos, transformations & more</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_STORY_SEEDS.map(seed => (
            <button
              key={seed.id}
              type="button"
              title={`${seed.genre}: ${seed.idea}`}
              onClick={() => handleInsertIdea(seed.idea)}
              className="text-left text-[11px] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2.5 py-1.5 rounded transition-colors"
            >
              {seed.title}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
          Seeds change only your idea. Your other directions stay as you set them.
        </p>
      </section>
      {pendingSeed !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-seed-review-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); setPendingSeed(null); }
            if (event.key === 'Tab') {
              event.preventDefault();
              if (document.activeElement === keepIdeaButton.current) replaceIdeaButton.current?.focus();
              else keepIdeaButton.current?.focus();
            }
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl border border-neutral-200">
            <h2 id="quick-seed-review-title" className="font-bold text-lg text-neutral-900">Use this idea seed?</h2>
            <p className="text-sm text-neutral-700 my-3 max-h-[40vh] overflow-y-auto leading-relaxed">{pendingSeed}</p>
            <p className="text-xs text-neutral-500 mb-4">This replaces only your story idea. Character, setting, and other directions stay unchanged. Your generated prompt stays as it is until you select Generate.</p>
            <div className="flex flex-wrap gap-2">
              <button ref={replaceIdeaButton} type="button" className="rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm" onClick={() => { onChange(pendingSeed); setPendingSeed(null); }}>Replace idea</button>
              <button ref={keepIdeaButton} type="button" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700" onClick={() => setPendingSeed(null)}>Keep my idea</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
