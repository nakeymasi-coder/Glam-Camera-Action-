import React from 'react';
import { CURATED_EXAMPLES, CuratedExample } from '../data/presetsData';
import { X, Sparkles, ArrowRight, BookOpen, Layers } from 'lucide-react';
import { formatSelection } from '../utils/promptEngine';

interface ExamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExample: (ex: CuratedExample) => void;
}

export const ExamplesModal: React.FC<ExamplesModalProps> = ({
  isOpen,
  onClose,
  onSelectExample,
}) => {
  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Examples" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C99C62] flex items-center justify-center text-black">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Curated Story Examples</h2>
              <p className="text-xs text-neutral-400">
                Explore pre-built 3-scene setups from the design specification
              </p>
            </div>
          </div>
          <button
            onClick={onClose} aria-label="Close examples"
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of examples */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {CURATED_EXAMPLES.map((ex) => (
            <div
              key={ex.id}
              className="p-5 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50/50 hover:bg-neutral-50 transition-all flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-neutral-900">{ex.name}</h3>
                    <span className="text-[11px] font-semibold text-[#8A5036] bg-amber-50 px-2 py-0.5 rounded">
                      {ex.tagline}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-neutral-600 mb-3 leading-relaxed">
                  {ex.description}
                </p>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-neutral-600 mb-3">
                  <span className="bg-neutral-200/80 px-2 py-0.5 rounded">
                    Char: {formatSelection(ex.state.characterTypes, ex.state.customCharacter)}
                  </span>
                  <span className="bg-neutral-200/80 px-2 py-0.5 rounded">
                    Genre: {formatSelection(ex.state.genres, ex.state.customGenre)}
                  </span>
                  <span className="bg-neutral-200/80 px-2 py-0.5 rounded">
                    Style: {formatSelection(ex.state.visualStyles, ex.state.customStyle)}
                  </span>
                  <span className="bg-neutral-200/80 px-2 py-0.5 rounded">
                    Format: {formatSelection(ex.state.videoFormats, ex.state.customFormat)}
                  </span>
                  <span className="bg-neutral-200/80 px-2 py-0.5 rounded">
                    Tone: {formatSelection(ex.state.energyTones, ex.state.customTone)}
                  </span>
                </div>

                {/* 3-beat arc breakdown */}
                <div className="bg-white p-3 rounded-lg border border-neutral-200/80 text-xs space-y-1.5">
                  <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#C99C62]" />
                    <span>Three-Beat Arc Preview:</span>
                  </div>
                  <p className="text-neutral-600 pl-4 border-l-2 border-neutral-200">
                    <strong className="text-neutral-800">1. Hook: </strong>
                    {ex.threeBeatArc[0]}
                  </p>
                  <p className="text-neutral-600 pl-4 border-l-2 border-neutral-200">
                    <strong className="text-neutral-800">2. Escalation: </strong>
                    {ex.threeBeatArc[1]}
                  </p>
                  <p className="text-neutral-600 pl-4 border-l-2 border-neutral-200">
                    <strong className="text-neutral-800">3. Payoff: </strong>
                    {ex.threeBeatArc[2]}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectExample(ex);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs"
                >
                  <span>Load this Example</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end">
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
