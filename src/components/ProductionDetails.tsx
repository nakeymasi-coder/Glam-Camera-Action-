import React from 'react';
import type { PresetState } from '../types';

export const PRODUCTION_FIELDS = [
  ['cameraDirection', 'Camera & composition', 'For example: locked camera, eye-level two-shot, 9:16; no orbiting.'],
  ['atmosphereDetails', 'Lighting, texture & sound', 'For example: warm window light, soft linen textures, distant rain; no music.'],
  ['continuityNotes', 'Continuity anchors & allowed changes', 'For example: Mira keeps her copper jacket; the cracked cup stays in her left hand. Only the cup is repaired in Scene 3.'],
  ['scene1Beat', 'Scene 1 · Setup / hook', 'What starts the story? Establish the goal, location and important prop.'],
  ['scene2Beat', 'Scene 2 · Complication / turning point', 'What happens because of Scene 1? Track what changes and what carries forward.'],
  ['scene3Beat', 'Scene 3 · Payoff / ending', 'How does Scene 2 lead to the ending? Resolve the goal or leave an intentional teaser.'],
] as const;

export function ProductionDetails({ state, onChange }: { state: PresetState; onChange: (state: PresetState) => void }) {
  return <section id="production-details" className="gca-brief bg-white rounded-xl border border-neutral-200 shadow-sm p-4 sm:p-6 scroll-mt-24">
    <h3 className="font-bold text-base">Shot details & connected scenes</h3>
    <p className="text-xs text-neutral-600 mt-2 mb-4">Optional, literal direction shared by your master prompt and six canvases. Define details once; scene beats stay in their own scene. Nothing is filled in or rewritten by AI.</p>
    <div className="grid gap-5 md:grid-cols-2">
      {PRODUCTION_FIELDS.map(([field, label, placeholder]) => <div key={field}>
        <label htmlFor={'production-' + field} className="block mb-1 text-sm font-semibold">{label}</label>
        <textarea id={'production-' + field} rows={3} value={state.optionalDetails[field] || ''} placeholder={placeholder}
          onChange={event => onChange({ ...state, optionalDetails: { ...state.optionalDetails, [field]: event.target.value } })}
          className="w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C99C62]" />
      </div>)}
    </div>
  </section>;
}
