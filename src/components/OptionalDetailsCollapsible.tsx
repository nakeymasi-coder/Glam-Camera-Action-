import React, { useState } from 'react';
import { ChevronDown, ChevronRight, SlidersHorizontal, Sparkles } from 'lucide-react';
import { OptionalStoryDetails } from '../types';

interface OptionalDetailsCollapsibleProps {
  details: OptionalStoryDetails;
  onChange: (details: OptionalStoryDetails) => void;
}

export const OptionalDetailsCollapsible: React.FC<OptionalDetailsCollapsibleProps> = ({
  details,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const filledCount = Object.values(details).filter((v) => v && v.trim().length > 0).length;

  const updateField = (field: keyof OptionalStoryDetails, val: string) => {
    onChange({
      ...details,
      [field]: val,
    });
  };

  const handleClear = () => {
    onChange({
      characterNames: '',
      settingLocation: '',
      dialogueMustHaves: '',
      exactTextCaptions: '',
      targetAudience: '',
      productServiceCTA: '',
      targetDuration: '',
    });
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200/90 shadow-sm overflow-hidden transition-all hover:border-neutral-300">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between text-left hover:bg-neutral-50/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-neutral-900">
                Optional Story Details
              </span>
              {filledCount > 0 && (
                <span className="text-[11px] font-semibold text-[#8A5036] bg-amber-50 px-2 py-0.5 rounded-full">
                  {filledCount} active
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              Names, setting, target duration (15s/30s/60s), dialogue must-haves, text captions, audience, or CTA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 hidden sm:inline">
            {isOpen ? 'Collapse' : 'Expand'}
          </span>
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-neutral-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-neutral-100 space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Character Names &amp; Roles
              </label>
              <input
                type="text"
                value={details.characterNames}
                onChange={(e) => updateField('characterNames', e.target.value)}
                placeholder="e.g. Maya (lead stylist) and Chloe (anxious bride)"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C99C62] bg-neutral-50/50"
              />
            </div>

            <div>
              <label htmlFor="target-duration" className="block text-xs font-semibold text-neutral-700 mb-1">
                Target Duration
              </label>
              <select
                id="target-duration"
                value={details.targetDuration || ''}
                onChange={(e) => updateField('targetDuration', e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C99C62] focus:border-neutral-900 bg-white text-neutral-900 cursor-pointer font-medium"
              >
                <option value="">Select target duration (optional)</option>
                <option value="15s">15s (~5s per scene)</option>
                <option value="30s">30s (~10s per scene)</option>
                <option value="60s">60s (~20s per scene)</option>
              </select>
              <p className="text-[11px] text-neutral-500 mt-1">
                Target overall duration across all three scenes (15s, 30s, 60s).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Specific Setting / Location
              </label>
              <input
                type="text"
                value={details.settingLocation}
                onChange={(e) => updateField('settingLocation', e.target.value)}
                placeholder="e.g. Chic minimalist salon with pastel pink chairs and huge mirrors"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C99C62] bg-neutral-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Dialogue Must-Haves / Key Lines
              </label>
              <input
                type="text"
                value={details.dialogueMustHaves}
                onChange={(e) => updateField('dialogueMustHaves', e.target.value)}
                placeholder='e.g. "Put the poultry shears down, Chloe."'
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C99C62] bg-neutral-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                On-Screen Text / Captions
              </label>
              <input
                type="text"
                value={details.exactTextCaptions}
                onChange={(e) => updateField('exactTextCaptions', e.target.value)}
                placeholder="e.g. 'Rule #1: Never cut your own bangs at 2 AM.'"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C99C62] bg-neutral-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Target Audience / Platform
              </label>
              <input
                type="text"
                value={details.targetAudience}
                onChange={(e) => updateField('targetAudience', e.target.value)}
                placeholder="e.g. TikTok / Reels viewers interested in salon humor"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C99C62] bg-neutral-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Product, Service, or Call to Action (CTA)
              </label>
              <input
                type="text"
                value={details.productServiceCTA}
                onChange={(e) => updateField('productServiceCTA', e.target.value)}
                placeholder="e.g. Book your bridal hair consultation at least 3 weeks prior"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C99C62] bg-neutral-50/50"
              />
            </div>
          </div>

          {filledCount > 0 && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition-colors"
              >
                Clear all optional details
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
