import React from 'react';
import type { PresetState } from '../types';

export function BuilderGuidance({ state, hasPrompt, briefChanged, onGenerate }: {
  state: PresetState; hasPrompt: boolean; briefChanged: boolean; onGenerate: () => void;
}) {
  const details = state.optionalDetails;
  const checks = [
    ['Story idea', Boolean(state.storyIdea.trim()), '#story-idea-input'],
    ['Cast & setting', Boolean(details.characterNames.trim() && details.settingLocation.trim()), '#creative-brief'],
    ['Connected scene beats', Boolean(details.scene1Beat?.trim() && details.scene2Beat?.trim() && details.scene3Beat?.trim()), '#production-details'],
    ['Continuity anchors', Boolean(details.continuityNotes?.trim()), '#production-details'],
  ] as const;
  const count = checks.filter(([, ready]) => ready).length;
  return <section aria-label="Brief checklist" className="gca-brief bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-bold text-base">Your brief at a glance</h3><p className="text-xs text-neutral-600 mt-1">{count} of 4 detail groups supplied · suggestions, not requirements</p></div>
      <button type="button" onClick={onGenerate} className="rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm font-semibold">{briefChanged ? 'Update production from brief' : 'Generate Story Prompt'}</button>
    </div>
    <ul className="flex flex-wrap gap-2 mt-4">{checks.map(([label, ready, href]) => <li key={label}><a href={href} onClick={() => { if (href === '#creative-brief') document.getElementById('creative-brief')?.querySelector('details')?.setAttribute('open', ''); }} className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-xs"><span aria-hidden="true">{ready ? '✓' : '+'}</span>{label}<span className="sr-only">{ready ? ' supplied' : ' optional, add details'}</span></a></li>)}</ul>
    <p role="status" className="text-xs text-neutral-600 mt-3">{briefChanged ? 'Your output uses an earlier brief. Update when ready; your edits stay protected.' : hasPrompt ? 'Your output was generated from this brief. Review, edit, copy or save below.' : 'Start with an idea or Quick Seed, add any details you want, then generate. Ctrl / ⌘ + Enter works too.'}</p>
  </section>;
}
