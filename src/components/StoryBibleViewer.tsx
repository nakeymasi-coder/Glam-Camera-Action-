import React from 'react';
import { CHARACTER_TYPE_HELPERS } from '../studio-core/promptEngine';
import { PresetState } from '../types';
import { CHARACTER_CREATIVE_BEHAVIORS } from '../data/presetsData';
import { formatSelection, formatOptionalDetails } from '../utils/promptEngine';
import { ShieldCheck, Sparkles, CheckCircle2, Bookmark } from 'lucide-react';

interface StoryBibleViewerProps {
  state: PresetState;
}

export const StoryBibleViewer: React.FC<StoryBibleViewerProps> = ({ state }) => {
  const activeChar = state.characterTypes.find((t) => t !== 'None') || 'General';
  const charBehavior =
    CHARACTER_TYPE_HELPERS[activeChar] || CHARACTER_CREATIVE_BEHAVIORS[activeChar] ||
    'Standard cinematic continuity across scale, facial identity, wardrobe, and world logic.';

  const visualStyle = formatSelection(state.visualStyles, state.customStyle) || 'Cinematic Realism';
  const genre = formatSelection(state.genres, state.customGenre) || 'Drama';
  const tone = formatSelection(state.energyTones, state.customTone) || 'Neutral';
  const optSummary = formatOptionalDetails(state.optionalDetails);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-neutral-200/90 shadow-sm p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs font-bold text-black bg-[#C99C62] px-2 py-0.5 rounded">
            Invisible Continuity Engine
          </span>
          <span className="text-xs text-neutral-500 font-medium">Automatic Story Bible</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
          Production Story Bible &amp; Continuity Lock
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-3xl leading-relaxed">
          The user never has to re-enter character descriptions three times. The prompt engine automatically locks
          identity, wardrobe, lighting, props, and causal progression into one internal Story Bible applied to every scene.
        </p>
      </div>

      {/* Locked Elements Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Character & Anatomy */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-neutral-900 uppercase">
              <span className="w-2 h-2 rounded-full bg-[#8A5036]" />
              <span>Character Identity &amp; Scale</span>
            </div>
            <p className="text-xs text-neutral-600 mb-3 leading-relaxed">
              <strong>Active Logic:</strong> {charBehavior}
            </p>
          </div>
          <div className="pt-3 border-t border-neutral-100 text-[11px] text-neutral-500">
            Locked: Facial proportions, age/silhouette, fur/skin/peel color, scale relative to environment.
          </div>
        </div>

        {/* Card 2: Visual Style & Atmosphere */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-neutral-900 uppercase">
              <span className="w-2 h-2 rounded-full bg-[#C99C62]" />
              <span>Visual Style &amp; Lighting Logic</span>
            </div>
            <p className="text-xs text-neutral-600 mb-3 leading-relaxed">
              <strong>Art Direction:</strong> {visualStyle}
              <br />
              <strong>Atmosphere:</strong> {tone} mood with consistent directional key lighting, color temperature, and texture depth.
            </p>
          </div>
          <div className="pt-3 border-t border-neutral-100 text-[11px] text-neutral-500">
            Locked: Shared color grade, lens characteristics, ambient illumination across all 3 frames.
          </div>
        </div>

        {/* Card 3: Cause-and-Effect Narrative */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-neutral-900 uppercase">
              <span className="w-2 h-2 rounded-full bg-neutral-900" />
              <span>Cause-and-Effect Narrative</span>
            </div>
            <p className="text-xs text-neutral-600 mb-3 leading-relaxed">
              <strong>Genre Pacing:</strong> {genre}
              <br />
              <strong>Arc:</strong> Scene 2 strictly escalates Scene 1; Scene 3 delivers payoff or resolution to Scene 2.
            </p>
          </div>
          <div className="pt-3 border-t border-neutral-100 text-[11px] text-neutral-500">
            Locked: No random scene jumps. Every moment exists directly because of the previous second.
          </div>
        </div>
      </div>

      {/* Specific Story Parameters */}
      <div className="bg-white rounded-xl border border-neutral-200/90 shadow-sm p-5">
        <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-[#C99C62]" />
          <span>Active Story Parameters Applied to Prompt</span>
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-neutral-100">
            <span className="font-semibold text-neutral-700">Core Story Idea:</span>
            <span className="text-neutral-900 sm:max-w-xl text-right">{state.storyIdea || 'Not specified yet (Random seed will be used)'}</span>
          </div>
          {optSummary && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-neutral-100">
              <span className="font-semibold text-neutral-700">Locked Optional Details:</span>
              <span className="text-neutral-900 sm:max-w-xl text-right">{optSummary}</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-neutral-100">
            <span className="font-semibold text-neutral-700">Format &amp; Pacing:</span>
            <span className="text-neutral-900 sm:max-w-xl text-right">
              {formatSelection(state.videoFormats, state.customFormat) || 'Short Skit'}
            </span>
          </div>
          {state.optionalDetails.targetDuration && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-neutral-100">
              <span className="font-semibold text-neutral-700">Target Duration:</span>
              <span className="text-neutral-900 font-mono font-bold sm:max-w-xl text-right">
                {state.optionalDetails.targetDuration}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quality Rules Checklist from Page 9 */}
      <div className="bg-amber-100 text-neutral-900 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-[#C99C62]" />
          <h3 className="text-sm sm:text-base font-bold tracking-tight">
            Production Quality Standards (Page 9 Brief)
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-700">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C99C62] shrink-0 mt-0.5" />
            <span><strong>Specificity over clutter:</strong> 1 dominant story beat, 1 primary focal subject per scene.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C99C62] shrink-0 mt-0.5" />
            <span><strong>Visual change with continuity:</strong> Angles &amp; poses evolve while character identity remains locked.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C99C62] shrink-0 mt-0.5" />
            <span><strong>Hook &amp; Payoff discipline:</strong> Scene 1 creates instant curiosity; Scene 3 concludes intentionally.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C99C62] shrink-0 mt-0.5" />
            <span><strong>Script-image alignment:</strong> Script dialogue &amp; action describe what is visible in the paired image.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
