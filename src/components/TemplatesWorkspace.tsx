import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PresetState } from '../types';
import {
  TEMPLATE_TYPES, TEMPLATE_LIMITS, STORY_TEMPLATE_STORAGE_KEY, createStoryTemplate,
  readStoryTemplateLibrary, previewStoryTemplateImport, commitStoryTemplateImport,
  storyTemplateId, downloadStoryTemplate, downloadStoryTemplateLibrary,
  type StoryTemplate, type TemplateKind, type TemplateImportPreview, type TemplateImportSource,
} from '../utils/storyTemplates';

const fieldStyle = 'w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm';
const buttonStyle = 'rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50';
const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export function TemplatesWorkspace({ state, onApply, onApplyMany }: {
  state: PresetState;
  onApply: (template: StoryTemplate, mode: 'fresh' | 'merge') => boolean;
  onApplyMany?: (templates: StoryTemplate[], mode: 'fresh' | 'merge') => boolean;
}) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<TemplateKind>('structure');
  const [templates, setTemplates] = useState<StoryTemplate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<StoryTemplate[] | null>(null);
  const [preview, setPreview] = useState<TemplateImportPreview | null>(null);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const importRun = useRef(0);
  const templateEntries = useMemo(() => templates.map(template => ({ template, id: storyTemplateId(template) })), [templates]);
  const selectedTemplates = templateEntries.filter(entry => selected.has(entry.id)).map(entry => entry.template);
  useEffect(() => { if (pending) dialog.current?.showModal(); else dialog.current?.close(); }, [pending]);
  useEffect(() => {
    const refresh = () => {
      try { setTemplates(readStoryTemplateLibrary(localStorage.getItem(STORY_TEMPLATE_STORAGE_KEY))); }
      catch (err) { setError(errorText(err, 'Saved templates could not be read.') + ' Existing files and drafts have not been changed.'); }
    };
    refresh();
    const onStorage = (event: StorageEvent) => { if (event.key === STORY_TEMPLATE_STORAGE_KEY || event.key === null) refresh(); };
    window.addEventListener('storage', onStorage);
    return () => { importRun.current++; window.removeEventListener('storage', onStorage); };
  }, []);
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const template = createStoryTemplate(title, kind, state);
      const candidate = previewStoryTemplateImport([{ name: 'Current draft', text: JSON.stringify(template) }], localStorage.getItem(STORY_TEMPLATE_STORAGE_KEY));
      if (candidate.errors.length) throw Error(candidate.errors.join(' '));
      if (!candidate.additions.length) {
        setMessage(`“${template.title}” is already in your library. An identical copy was not added.`);
      } else {
        setTemplates(commitStoryTemplateImport(candidate, localStorage));
        setMessage(`“${template.title}” saved in this browser. Download a JSON copy below for safekeeping.`);
      }
      setSelected(previous => new Set([...previous, storyTemplateId(template)]));
    } catch (err) { setError(errorText(err, 'Could not save this template. Existing templates have not been changed.')); }
  };
  const importFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const run = ++importRun.current;
    setReading(true);
    setPreview(null);
    setError('');
    setMessage('');
    try {
      if (files.length > TEMPLATE_LIMITS.files) throw Error(`Choose up to ${TEMPLATE_LIMITS.files} files at once.`);
      if (files.reduce((total, file) => total + file.size, 0) > TEMPLATE_LIMITS.totalBytes) throw Error('Selected files must total 16 MB or less. Nothing was imported.');
      const sources: TemplateImportSource[] = await Promise.all(files.map(async file => {
        if (file.size > TEMPLATE_LIMITS.fileBytes) return { name: file.name, error: 'Each file must be 8 MB or smaller.' };
        try { return { name: file.name, text: await file.text() }; }
        catch { return { name: file.name, error: 'This file could not be read. Choose it again.' }; }
      }));
      if (run !== importRun.current) return;
      setPreview(previewStoryTemplateImport(sources, localStorage.getItem(STORY_TEMPLATE_STORAGE_KEY)));
    } catch (err) {
      if (run === importRun.current) setError(errorText(err, 'Could not read these templates. Nothing was imported.'));
    } finally { if (run === importRun.current) setReading(false); }
  };
  const confirmImport = () => {
    if (!preview) return;
    setError('');
    try {
      const next = commitStoryTemplateImport(preview, localStorage);
      setTemplates(next);
      setSelected(previous => new Set([...previous, ...preview.additions.map(storyTemplateId)]));
      setMessage(`${preview.additions.length} template${preview.additions.length === 1 ? '' : 's'} imported. ${preview.duplicates ? `${preview.duplicates} duplicate${preview.duplicates === 1 ? '' : 's'} skipped. ` : ''}The new templates are selected below. Load selected to start a project or merge them into your draft.`);
      setPreview(null);
    } catch (err) { setError(errorText(err, 'Could not save this import. Existing templates and drafts have not been changed.')); }
  };
  const openLoad = (items: StoryTemplate[]) => { setLoadError(''); setPending(items); };
  const apply = (mode: 'fresh' | 'merge') => {
    if (!pending?.length) return;
    setLoadError('');
    try {
      const applied = pending.length === 1 ? onApply(pending[0], mode) : onApplyMany?.(pending, mode);
      if (applied) { setPending(null); setMessage(`${pending.length} template${pending.length === 1 ? '' : 's'} loaded ${mode === 'fresh' ? 'into a new project' : 'into your draft'}.`); }
      else setLoadError('The templates were not loaded. Check the project message or choose Cancel to review your draft.');
    } catch (err) { setLoadError(errorText(err, 'The templates could not be loaded. Your draft has not been changed.')); }
  };
  const downloadLibrary = () => {
    setError('');
    try { downloadStoryTemplateLibrary(templates); setMessage(`Download requested for your ${templates.length}-template library.`); }
    catch (err) { setError(errorText(err, 'Could not export the template library.')); }
  };
  return <section aria-label="Templates workspace" className="space-y-5">
    <div className="gca-section-intro"><span>YOUR REUSABLE STORY KIT</span><h2>Keep your best starting points.</h2><p>Save structures, character archetypes and complete briefs. Import a whole library and load your selected starting points into one project.</p></div>
    <div className="grid gap-5 md:grid-cols-2">
      <form onSubmit={save} className="gca-brief space-y-4">
        <h3 className="font-bold">Save from your current draft</h3>
        <div><label htmlFor="template-title" className="block text-xs font-semibold mb-2">Template name</label><input id="template-title" className={fieldStyle} value={title} onChange={event => setTitle(event.target.value)} maxLength={160} required placeholder="e.g. Reluctant hero / three-beat reveal" /></div>
        <div><label htmlFor="template-kind" className="block text-xs font-semibold mb-2">Template type</label><select id="template-kind" className={fieldStyle} value={kind} onChange={event => setKind(event.target.value as TemplateKind)}>{Object.entries(TEMPLATE_TYPES).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
        <p className="text-sm text-neutral-600">{kind === 'structure' ? 'Includes genre, goal, obstacle, ending, three scene events and duration. Leaves out your cast, setting and specific story idea.' : kind === 'characters' ? 'Includes your draft cast, identity, goals, relationships, continuity notes and intended emotional arcs. Scene links and event-specific changes reset for the new story.' : 'Includes all draft fields, cast and linked events. Generated output and manual prompt edits are not included.'}</p>
        <button type="submit" className={buttonStyle + ' !bg-neutral-900 text-white'}>Save template</button>
      </form>
      <div className="gca-brief space-y-4">
        <h3 className="font-bold">Import templates or a whole library</h3>
        <p className="text-sm text-neutral-600">Choose several .gca-template.json files or one exported .gca-templates.json library. Review the counts and any errors before confirming. Importing never changes your draft.</p>
        <label htmlFor="template-file" className="block text-xs font-semibold">Import template files or library JSON</label>
        <input id="template-file" type="file" accept=".json,application/json" multiple disabled={reading} onChange={importFiles} aria-describedby="template-import-limits" className="block w-full min-w-0 text-sm file:rounded-lg file:border file:border-neutral-300 file:bg-white file:p-2 file:mr-3" />
        <p id="template-import-limits" className="text-xs text-neutral-600">Up to 50 files, 500 templates, 8 MB per file and 16 MB total. Version 1 individual files, library files and JSON arrays of templates are supported. Identical templates are skipped.</p>
        <p className="text-xs text-neutral-600">Files are read locally, never uploaded. This library stays in this browser across sessions. Download the library to keep a backup or move it to another device.</p>
        {reading && <p role="status" className="text-sm">Reading and checking your files…</p>}
      </div>
    </div>
    {error && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">{error}</p>}
    {message && <p role="status" className="text-sm text-neutral-600">{message}</p>}
    {preview && <section aria-label="Template import preview" className="gca-brief space-y-3">
      <h3 className="font-bold">Review your import</h3>
      <p className="text-sm">{preview.sources} file{preview.sources === 1 ? '' : 's'} · {preview.found} template{preview.found === 1 ? '' : 's'} found · {preview.valid} valid · {preview.additions.length} new · {preview.duplicates} duplicate{preview.duplicates === 1 ? '' : 's'} skipped</p>
      <p className="text-sm text-neutral-600">New: {preview.counts.structure} story structures · {preview.counts.characters} archetype templates · {preview.counts.brief} complete briefs · {preview.characterCount} character cards</p>
      {!!preview.additions.length && <ul className="max-h-48 overflow-y-auto list-disc pl-5 text-sm space-y-1" aria-label="New templates to import">{preview.additions.map(template => <li key={storyTemplateId(template)} className="break-words">{template.title} · {TEMPLATE_TYPES[template.kind]}</li>)}</ul>}
      {!!preview.errors.length && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
        <p className="font-semibold">Nothing has been imported. Fix all {preview.errors.length} error{preview.errors.length === 1 ? '' : 's'} and choose the files again.</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">{preview.errors.map((issue, index) => <li key={index} className="break-words">{issue}</li>)}</ul>
      </div>}
      {!preview.errors.length && !preview.additions.length && <p className="text-sm">All of these templates are already in your library. Nothing needs to be imported.</p>}
      <div className="flex flex-wrap gap-2"><button type="button" className={buttonStyle + ' !bg-neutral-900 text-white'} disabled={!!preview.errors.length || !preview.additions.length} onClick={confirmImport}>Confirm import · {preview.additions.length} new</button><button type="button" className={buttonStyle} onClick={() => setPreview(null)}>Cancel import</button></div>
    </section>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-bold">Ready to reuse · {templates.length}</h3>
      <button type="button" className={buttonStyle} disabled={!templates.length} onClick={downloadLibrary}>Download library JSON</button>
    </div>
    {!!templates.length && <div className="flex flex-wrap items-center gap-2" aria-label="Template selection">
      <button type="button" className={buttonStyle} onClick={() => setSelected(new Set(templateEntries.map(entry => entry.id)))}>Select all</button>
      <button type="button" className={buttonStyle} disabled={!selectedTemplates.length} onClick={() => setSelected(new Set())}>Clear selection</button>
      <button type="button" className={buttonStyle + ' !bg-neutral-900 text-white'} disabled={!selectedTemplates.length || (selectedTemplates.length > 1 && !onApplyMany)} onClick={() => openLoad(selectedTemplates)}>Load selected · {selectedTemplates.length}</button>
      <span role="status" className="text-xs text-neutral-600">{selectedTemplates.length} selected</span>
    </div>}
    {!templates.length && <p className="rounded-xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-600">Save your first template or import a library to get started.</p>}
    <div className="grid gap-4 md:grid-cols-2">{templateEntries.map(({ template, id }) => {
      return <article key={id} data-template-card className="gca-brief space-y-3 min-w-0">
        <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600"><input type="checkbox" checked={selected.has(id)} onChange={event => setSelected(previous => { const next = new Set(previous); if (event.target.checked) next.add(id); else next.delete(id); return next; })} aria-label={`Select ${template.title}`} />{TEMPLATE_TYPES[template.kind]}</label>
        <h4 className="font-bold break-words">{template.title}</h4>
        <p className="text-xs text-neutral-600">{template.kind === 'characters' ? `${template.state.characters?.length || 0} character archetypes` : template.kind === 'structure' ? 'Three-scene structure' : 'Full draft and cast'} · local file template</p>
        <div className="flex flex-wrap gap-2"><button type="button" className={buttonStyle} onClick={() => openLoad([template])}>Load template</button><button type="button" className={buttonStyle} onClick={() => { try { downloadStoryTemplate(template); setMessage(`Download requested for “${template.title}”.`); } catch (err) { setError(errorText(err, 'Could not download this template.')); } }}>Download JSON</button></div>
      </article>;
    })}</div>
    <dialog ref={dialog} onCancel={() => setPending(null)} aria-labelledby="template-load-title" className="fixed inset-0 m-auto w-[calc(100%_-_24px)] max-w-xl max-h-[calc(100dvh-24px)] overflow-y-auto rounded-xl border border-neutral-300 bg-white p-6 text-neutral-900 shadow-xl backdrop:bg-black/50">
      <h3 id="template-load-title" className="text-lg font-bold">How would you like to load {pending?.length === 1 ? 'this template' : 'these templates'}?</h3>
      {pending?.length === 1 ? <p className="my-3 font-semibold break-words">{pending[0].title}</p> : <><p className="my-3 font-semibold">{pending?.length || 0} selected templates</p><ul className="max-h-36 overflow-y-auto list-disc pl-5 text-sm">{pending?.map(template => <li key={storyTemplateId(template)} className="break-words">{template.title}</li>)}</ul></>}
      <p className="mt-3 text-sm text-neutral-600">Start a new project combines the selection into one separate draft after backing up your current draft, generated output and manual edits. Restore your previous project below at any time. If validation or backup fails, nothing changes. Your saved prompt library is never changed.</p>
      <p className="my-3 text-sm text-neutral-600">Merge preserves existing text and adds template notes and new cast cards. Existing character-family, format and duration choices win. Generated output stays unchanged until you generate again; check scene links after merging.</p>
      {(pending?.length || 0) > 1 && <p className="my-3 text-sm text-neutral-600">Templates combine in library order. Notes from multiple structures are appended to the same three scenes; review them for competing story directions. The first selected template with a character-family, format or duration choice supplies that choice for a new project. Archetype scene links stay reset.</p>}
      {loadError && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">{loadError}</p>}
      <div className="flex flex-wrap gap-2 mt-5"><button type="button" className={buttonStyle + ' !bg-neutral-900 text-white'} onClick={() => apply('fresh')}>Start new project</button><button type="button" className={buttonStyle} onClick={() => apply('merge')}>Merge into draft</button><button type="button" className={buttonStyle} onClick={() => setPending(null)}>Cancel</button></div>
    </dialog>
  </section>;
}
