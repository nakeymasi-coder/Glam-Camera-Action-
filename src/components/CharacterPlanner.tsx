import React, { useId, useState } from 'react';
import { Columns3, List } from 'lucide-react';
import { StoryKanban } from './StoryKanban';
import type { PresetState, StoryCharacter } from '../types';
import { CHARACTER_FIELDS, SCENES, incomingCharacterEmotion, normalizeCharacters, sceneBeat } from '../utils/characterContinuity';
import { createLocalId } from '../utils/projectIds';

const inputStyle = 'w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C99C62]';
export function CharacterPlanner({ state, onChange }: { state: PresetState; onChange?: (state: PresetState) => void }) {
  const [view, setView] = useState<'list' | 'board'>('list');
  const viewId = useId();
  const characters = state.characters || [];
  const update = (id: string, change: Partial<StoryCharacter>) => onChange?.({ ...state, characters: characters.map(c => c.id === id ? { ...c, ...change } : c) });
  return <section aria-label="Character planner" className="space-y-5">
    <div className="gca-brief rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-3"><div><h2 className="text-lg font-bold">Characters & story arcs</h2><p className="text-xs text-neutral-600 mt-2">{characters.length} characters · one shared cast for the entire production</p></div>
        {onChange && <button type="button" className="rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm font-semibold" onClick={() => { onChange({ ...state, characters: [...characters, ...normalizeCharacters([{ id: createLocalId() }])] }); setView('list'); }}>Add character</button>}
      </div>
      <p className="text-sm text-neutral-600 mt-3">Link each character to the existing three scene events. Identity stays shared; actions and emotional changes apply only to linked scenes. These notes guide local prompts, not an AI continuity audit.</p>
      <div role="group" aria-label="Character view" className="mt-4 inline-flex rounded-lg border border-neutral-300 bg-neutral-50 p-1 gap-1">
        {(['list', 'board'] as const).map(option => <button key={option} type="button" aria-pressed={view === option} aria-controls={viewId} onClick={() => setView(option)} className={`inline-flex min-h-10 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99C62] ${view === option ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-white'}`}>{option === 'list' ? <List size={16} aria-hidden="true" /> : <Columns3 size={16} aria-hidden="true" />}{option === 'list' ? 'List' : 'Board'}</button>)}
      </div>
      {onChange && view === 'list' && <div className="grid gap-4 md:grid-cols-3 mt-5">{SCENES.map(scene => <div key={scene}><label htmlFor={'character-event-' + scene} className="block text-xs font-semibold mb-2">Scene {scene} story event</label><textarea id={'character-event-' + scene} rows={3} className={inputStyle} placeholder={['Setup / hook', 'Complication / turning point', 'Payoff / ending'][scene - 1]} value={sceneBeat(state.optionalDetails, scene)} onChange={e => onChange({ ...state, optionalDetails: { ...state.optionalDetails, ['scene' + scene + 'Beat']: e.target.value } })}/></div>)}</div>}
    </div>
    <div id={viewId} className="space-y-5">
    {view === 'board' ? <StoryKanban state={state} onChange={onChange} /> : <>
    {!characters.length && <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-600">No character cards yet. {onChange ? 'Add your first character; existing cast notes and saved stories will stay unchanged.' : 'Add characters in the Characters tab, then generate to include them here.'}</p>}
    {characters.map((c, index) => <article key={c.id} data-character-id={c.id} className="gca-brief rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-base">{c.name || `Character ${index + 1}`}</h3>{onChange && <button type="button" className="text-xs underline text-neutral-600" onClick={() => { if (window.confirm(`Remove ${c.name || 'this character'} and their event links from this draft? Saved library entries stay unchanged.`)) onChange({ ...state, characters: characters.filter(item => item.id !== c.id) }); }}>Remove character</button>}</div>
      <div className="grid gap-4 md:grid-cols-2">{CHARACTER_FIELDS.map(([field, label]) => <div key={field}>{onChange ? <><label htmlFor={`character-${c.id}-${field}`} className="block text-xs font-semibold mb-2">{label}</label><textarea data-character-field={field} id={`character-${c.id}-${field}`} rows={field === 'name' ? 1 : 2} className={inputStyle} value={c[field]} onChange={e => update(c.id, { [field]: e.target.value })}/></> : <><p className="font-semibold text-xs">{label}</p><p className="text-sm text-neutral-600 whitespace-pre-wrap break-words mt-1">{c[field] || 'Not supplied'}</p></>}</div>)}</div>
      <div className="grid gap-4 lg:grid-cols-3">{c.scenes.slice().sort((a, b) => a.scene - b.scene).map(link => {
        const beat = sceneBeat(state.optionalDetails, link.scene);
        return <div key={link.scene} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-3" data-character-scene={link.scene}>
          <h4 className="font-semibold text-sm">Scene {link.scene} · {['Setup', 'Turning point', 'Payoff'][link.scene - 1]}</h4>
          <p className="text-xs text-neutral-600 whitespace-pre-wrap break-words">{beat || 'No story event written yet.'}</p>
          {onChange ? <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={link.linked} onChange={e => update(c.id, { scenes: c.scenes.map(l => l.scene === link.scene ? { ...l, linked: e.target.checked } : l) })}/>Link character to this event</label> : <p className="text-xs font-semibold">{link.linked ? 'Linked to this event' : 'Not linked'}</p>}
          {link.linked && <><p className="text-xs text-neutral-600">Incoming emotion: {incomingCharacterEmotion(c, link.scene) || 'Not specified'}</p>{!beat && <p role="status" className="text-xs text-[#8A5036]">Add a story event above to anchor this change.</p>}
            {(['action', 'emotion'] as const).map(field => <div key={field}>{onChange ? <><label htmlFor={`character-${c.id}-${link.scene}-${field}`} className="block text-xs font-semibold mb-2">{field === 'action' ? 'Action / role in event' : 'Emotional state after event'}</label><textarea id={`character-${c.id}-${link.scene}-${field}`} data-arc-field={field} rows={2} className={inputStyle} value={link[field]} onChange={e => update(c.id, { scenes: c.scenes.map(l => l.scene === link.scene ? { ...l, [field]: e.target.value } : l) })}/></> : <p className="text-xs whitespace-pre-wrap break-words"><b>{field === 'action' ? 'Action' : 'Resulting emotion'}:</b> {link[field] || 'Not supplied'}</p>}</div>)}
          </>}
        </div>;
      })}</div>
      <p className="text-xs text-neutral-600">Arc intent: {c.startingEmotion || 'Starting state not supplied'} → {c.endingEmotion || 'Ending state not supplied'}. Scene changes carry forward in order; unlinking keeps your notes but excludes that event from generated direction.</p>
    </article>)}
    </>}
    </div>
  </section>;
}
