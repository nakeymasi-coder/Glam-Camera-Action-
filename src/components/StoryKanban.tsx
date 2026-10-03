import React, { useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, GripVertical } from 'lucide-react';
import type { CharacterSceneLink, PresetState, StoryCharacter } from '../types';
import { SCENES, incomingCharacterEmotion, sceneBeat } from '../utils/characterContinuity';
import { moveStoryScene, type SceneNumber } from '../utils/storySceneOrder';

const inputStyle = 'w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C99C62]';
const moveStyle = 'inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-neutral-300 bg-white px-2 text-xs font-semibold hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99C62] disabled:opacity-40 disabled:cursor-not-allowed';
const sceneRoles = ['Setup', 'Turning point', 'Payoff'];

export function StoryKanban({ state, onChange }: { state: PresetState; onChange?: (state: PresetState) => void }) {
  const id = useId();
  const dragSource = useRef<SceneNumber | null>(null);
  const columnRefs = useRef<Partial<Record<SceneNumber, HTMLElement>>>({});
  const [dragging, setDragging] = useState<SceneNumber | null>(null);
  const [dropTarget, setDropTarget] = useState<SceneNumber | null>(null);
  const [announcement, setAnnouncement] = useState({ text: '', revision: 0 });
  const characters = state.characters || [];

  const stopDrag = () => {
    dragSource.current = null;
    setDragging(null);
    setDropTarget(null);
  };
  const move = (from: SceneNumber, to: SceneNumber) => {
    if (!onChange || from === to) { stopDrag(); return; }
    onChange(moveStoryScene(state, from, to));
    setAnnouncement(previous => ({ text: `Scene ${from} moved to position ${to}. Its story event and every character's links and notes moved together. Generate to update your production.`, revision: previous.revision + 1 }));
    stopDrag();
    // Follow the moved event so keyboard users can keep arranging the timeline.
    requestAnimationFrame(() => columnRefs.current[to]?.querySelector<HTMLButtonElement>('[data-scene-drag-handle]')?.focus());
  };
  const updateLink = (character: StoryCharacter, scene: SceneNumber, change: Partial<CharacterSceneLink>) => {
    onChange?.({ ...state, characters: characters.map(c => c.id === character.id ? {
      ...c, scenes: c.scenes.map(link => link.scene === scene ? { ...link, ...change } : link),
    } : c) });
  };

  return <div className="space-y-4" aria-label="Character story board">
    <p id={`${id}-instructions`} className="text-sm text-neutral-600">
      {onChange
        ? 'One shared timeline for the whole cast. Drag a scene handle onto another column, or use Earlier / Later, to move its story event and all character links and notes together. Scene numbers update for everyone. Edit identities in List view. Generate to refresh the master prompt, six canvases and Story Bible.'
        : 'One shared timeline from your generated production. Each scene shows its linked characters and emotional handoffs.'}
    </p>
    <p role="status" aria-live="polite" aria-atomic="true" className={announcement.text ? 'rounded-lg border border-[#C99C62] bg-[#FBF6EF] px-3 py-2 text-sm text-neutral-800' : 'sr-only'}><span key={announcement.revision}>{announcement.text}</span></p>
    <div className="grid items-start gap-4 xl:grid-cols-3">
      {SCENES.map(scene => {
        const linked = characters.filter(c => c.scenes.some(link => link.scene === scene && link.linked));
        const beat = sceneBeat(state.optionalDetails, scene);
        return <section key={scene} ref={element => { if (element) columnRefs.current[scene] = element; }}
          tabIndex={-1} aria-labelledby={`${id}-scene-${scene}`} data-story-column={scene}
          className={`min-w-0 rounded-xl border-2 p-4 space-y-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99C62] ${dropTarget === scene && dragging !== scene ? 'border-[#A96735] bg-[#FBF0DE]' : 'border-neutral-200 bg-neutral-50'} ${dragging === scene ? 'opacity-60' : ''}`}
          onDragOver={event => {
            if (onChange && dragSource.current !== null) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(scene); }
          }}
          onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null); }}
          onDrop={event => {
            const from = dragSource.current;
            if (!onChange || from === null) return;
            event.preventDefault();
            move(from, scene);
          }}>
          <div className="flex items-start justify-between gap-2">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#8A5036]">{sceneRoles[scene - 1]}</p><h3 id={`${id}-scene-${scene}`} className="text-lg font-bold mt-1">Scene {scene}</h3><p className="text-xs text-neutral-600 mt-1">{linked.length} linked {linked.length === 1 ? 'character' : 'characters'}</p></div>
            {onChange && <button type="button" draggable data-scene-drag-handle aria-label={`Move Scene ${scene}; drag or use arrow keys`} aria-describedby={`${id}-instructions`}
              title="Drag to another scene, or use arrow keys" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600 cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99C62]"
              onDragStart={event => { dragSource.current = scene; setDragging(scene); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', `story-scene-${scene}`); }}
              onDragEnd={stopDrag}
              onKeyDown={event => {
                const earlier = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
                const later = event.key === 'ArrowRight' || event.key === 'ArrowDown';
                if (!earlier && !later) return;
                event.preventDefault();
                const to = scene + (earlier ? -1 : 1);
                if (to >= 1 && to <= 3) move(scene, to as SceneNumber);
              }}><GripVertical size={20} aria-hidden="true" /></button>}
          </div>
          {onChange && <div className="grid grid-cols-2 gap-2">
            <button type="button" className={moveStyle} aria-label={`Move Scene ${scene} earlier`} disabled={scene === 1} onClick={() => move(scene, (scene - 1) as SceneNumber)}><ArrowLeft size={14} aria-hidden="true" />Earlier</button>
            <button type="button" className={moveStyle} aria-label={`Move Scene ${scene} later`} disabled={scene === 3} onClick={() => move(scene, (scene + 1) as SceneNumber)}>Later<ArrowRight size={14} aria-hidden="true" /></button>
          </div>}
          <div>{onChange ? <><label htmlFor={`${id}-beat-${scene}`} className="block text-xs font-semibold mb-2">Story event</label><textarea id={`${id}-beat-${scene}`} data-board-beat={scene} rows={4} className={inputStyle} placeholder="What happens in this scene?" value={beat} onChange={event => onChange({ ...state, optionalDetails: { ...state.optionalDetails, [`scene${scene}Beat`]: event.target.value } })} /></> : <p className="text-sm whitespace-pre-wrap break-words">{beat || 'No story event written yet.'}</p>}</div>
          {onChange && characters.length > 0 && <details className="rounded-lg border border-neutral-200 bg-white p-3">
            <summary className="cursor-pointer text-xs font-semibold">Link characters to this event</summary>
            <div className="space-y-2 pt-3">{characters.map((c, index) => <label key={c.id} className="flex min-h-9 items-center gap-2 text-sm break-words"><input type="checkbox" checked={c.scenes.some(link => link.scene === scene && link.linked)} onChange={event => updateLink(c, scene, { linked: event.target.checked })} />{c.name || `Character ${index + 1}`}</label>)}</div>
            <p className="text-xs text-neutral-500 mt-2">Unlinking keeps that character’s notes for this event.</p>
          </details>}
          {!linked.length && <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-xs text-neutral-600">No linked characters. {onChange ? characters.length ? 'Choose characters above to add their scene cards.' : 'Add a character, then link them to this event.' : 'This scene has no linked character actions.'}</p>}
          {linked.map(c => {
            const link = c.scenes.find(link => link.scene === scene)!;
            const name = c.name || `Character ${characters.indexOf(c) + 1}`;
            return <article key={c.id} data-board-character={c.id} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3 shadow-sm">
              <h4 className="font-bold text-sm break-words">{name}</h4>
              <p className="text-xs text-neutral-600 whitespace-pre-wrap break-words"><span className="font-semibold">Incoming emotion:</span> {incomingCharacterEmotion(c, scene) || 'Not specified'}</p>
              {(['action', 'emotion'] as const).map(field => <div key={field}>{onChange ? <><label htmlFor={`${id}-${c.id}-${scene}-${field}`} className="block text-xs font-semibold mb-2">{field === 'action' ? 'Action / role in event' : 'Emotional state after event'}</label><textarea id={`${id}-${c.id}-${scene}-${field}`} data-board-arc-field={field} rows={2} className={inputStyle} value={link[field]} onChange={event => updateLink(c, scene, { [field]: event.target.value })} /></> : <p className="text-xs whitespace-pre-wrap break-words"><b>{field === 'action' ? 'Action' : 'Resulting emotion'}:</b> {link[field] || 'Not supplied'}</p>}</div>)}
              {!beat.trim() && <p className="text-xs text-[#8A5036]">{onChange ? 'Add a story event to anchor this character change.' : 'No story event supplied for this character change.'}</p>}
            </article>;
          })}
        </section>;
      })}
    </div>
  </div>;
}
