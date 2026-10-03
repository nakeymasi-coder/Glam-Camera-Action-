import React, { useEffect, useRef, useState } from 'react';
import type { PresetState } from '../types';
import { TEMPLATE_TYPES, createStoryTemplate, parseStoryTemplate, downloadStoryTemplate, type StoryTemplate, type TemplateKind } from '../utils/storyTemplates';

const fieldStyle = 'w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm';
const buttonStyle = 'rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold whitespace-nowrap';

export function TemplatesWorkspace({ state, onApply }: {
  state: PresetState;
  onApply: (template: StoryTemplate, mode: 'fresh' | 'merge') => boolean;
}) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<TemplateKind>('structure');
  const [templates, setTemplates] = useState<StoryTemplate[]>([]);
  const [pending, setPending] = useState<StoryTemplate | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (pending) dialog.current?.showModal(); else dialog.current?.close(); }, [pending]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('scene_script_templates_v1') || '[]');
      if (!Array.isArray(saved)) throw Error('Saved templates could not be read.');
      setTemplates(saved.map(value => parseStoryTemplate(JSON.stringify(value))));
    } catch { setError('Saved templates could not be read. Existing files and drafts have not been changed.'); }
  }, []);
  const addToLibrary = (template: StoryTemplate) => {
    const saved = JSON.parse(localStorage.getItem('scene_script_templates_v1') || '[]');
    if (!Array.isArray(saved)) throw Error('Saved templates could not be read.');
    const next = [template, ...saved.map(value => parseStoryTemplate(JSON.stringify(value)))];
    localStorage.setItem('scene_script_templates_v1', JSON.stringify(next));
    setTemplates(next);
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const template = createStoryTemplate(title, kind, state);
      addToLibrary(template);
      setMessage(`“${template.title}” saved in this browser. Download a JSON copy below to use it on another device.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create this template.'); }
  };
  const importFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setMessage('');
    try {
      if (file.size > 2 * 1024 * 1024) throw Error('Choose a template smaller than 2 MB.');
      const template = parseStoryTemplate(await file.text());
      addToLibrary(template);
      setMessage(`“${template.title}” is ready. Choose Load template to decide how to apply it.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not read this template.'); }
  };
  const apply = (mode: 'fresh' | 'merge') => {
    if (!pending) return;
    if (onApply(pending, mode)) setPending(null);
  };
  return <section aria-label="Templates workspace" className="space-y-5">
    <div className="gca-section-intro"><span>YOUR REUSABLE STORY KIT</span><h2>Keep your best starting points.</h2><p>Save a structure, a cast archetype or a complete brief in this browser, with portable JSON copies.</p></div>
    <div className="grid gap-5 md:grid-cols-2">
      <form onSubmit={save} className="gca-brief space-y-4">
        <h3 className="font-bold">Save from your current draft</h3>
        <div><label htmlFor="template-title" className="block text-xs font-semibold mb-2">Template name</label><input id="template-title" className={fieldStyle} value={title} onChange={e => setTitle(e.target.value)} maxLength={160} required placeholder="e.g. Reluctant hero / three-beat reveal" /></div>
        <div><label htmlFor="template-kind" className="block text-xs font-semibold mb-2">Template type</label><select id="template-kind" className={fieldStyle} value={kind} onChange={e => setKind(e.target.value as TemplateKind)}>{Object.entries(TEMPLATE_TYPES).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
        <p className="text-sm text-neutral-600">{kind === 'structure' ? 'Includes genre, goal, obstacle, ending, three scene events and duration. Leaves out your cast, setting and specific story idea.' : kind === 'characters' ? 'Includes your draft cast, identity, goals, relationships, continuity notes and intended emotional arcs. Scene links and event-specific changes reset for the new story.' : 'Includes all draft fields, cast and linked events. Generated output and manual prompt edits are not included.'}</p>
        <button type="submit" className={buttonStyle + ' !bg-neutral-900 text-white'}>Save template</button>
      </form>
      <div className="gca-brief space-y-4">
        <h3 className="font-bold">Import a saved template</h3>
        <p className="text-sm text-neutral-600">Open a previously downloaded .gca-template.json file. Importing only adds a card below — it never changes your current draft.</p>
        <label htmlFor="template-file" className="block text-xs font-semibold">Import template file</label>
        <input id="template-file" type="file" accept=".json,application/json" onChange={importFile} className="block w-full min-w-0 text-sm file:rounded-lg file:border file:border-neutral-300 file:bg-white file:p-2 file:mr-3" />
        <p className="text-xs text-neutral-600">Files are read locally, not uploaded or cloud-synced. Saved templates stay in this browser across sessions. Download JSON copies for safekeeping or another device.</p>
      </div>
    </div>
    {error && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">{error}</p>}
    {message && <p role="status" className="text-sm text-neutral-600">{message}</p>}
    <h3 className="font-bold">Ready to reuse · {templates.length}</h3>
    {!templates.length && <p className="rounded-xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-600">Save your first template or import a saved file to get started.</p>}
    <div className="grid gap-4 md:grid-cols-2">{templates.map((template, index) => <article key={index} data-template-card className="gca-brief space-y-3 min-w-0">
      <p className="text-xs font-semibold text-neutral-600">{TEMPLATE_TYPES[template.kind]}</p>
      <h4 className="font-bold break-words">{template.title}</h4>
      <p className="text-xs text-neutral-600">{template.kind === 'characters' ? `${template.state.characters?.length || 0} character archetypes` : template.kind === 'structure' ? 'Three-scene structure' : 'Full draft and cast'} · local file template</p>
      <div className="flex flex-wrap gap-2"><button type="button" className={buttonStyle} onClick={() => setPending(template)}>Load template</button><button type="button" className={buttonStyle} onClick={() => { downloadStoryTemplate(template); setMessage(`Download requested for “${template.title}”.`); }}>Download JSON</button></div>
    </article>)}</div>
    <dialog ref={dialog} onCancel={() => setPending(null)} aria-labelledby="template-load-title" className="fixed inset-0 m-auto w-[calc(100%_-_24px)] max-w-xl max-h-[calc(100dvh-24px)] overflow-y-auto rounded-xl border border-neutral-300 bg-white p-6 text-neutral-900 shadow-xl backdrop:bg-black/50">
      <h3 id="template-load-title" className="text-lg font-bold">How would you like to load this template?</h3>
      <p className="my-3 font-semibold break-words">{pending?.title}</p>
      <p className="text-sm text-neutral-600">Start a new project loads this template into a separate draft after backing up your current draft, generated output and manual edits. Restore your previous project below at any time. If the backup cannot be saved, nothing changes. Your saved prompt library is never changed.</p>
      <p className="my-3 text-sm text-neutral-600">Merge preserves existing text and adds template notes and new cast cards. Existing character-family, format and duration choices win. Generated output stays unchanged until you generate again; check scene links after merging.</p>
      <div className="flex flex-wrap gap-2 mt-5"><button type="button" className={buttonStyle + ' !bg-neutral-900 text-white'} onClick={() => apply('fresh')}>Start new project</button><button type="button" className={buttonStyle} onClick={() => apply('merge')}>Merge into draft</button><button type="button" className={buttonStyle} onClick={() => setPending(null)}>Cancel</button></div>
    </dialog>
  </section>;
}
