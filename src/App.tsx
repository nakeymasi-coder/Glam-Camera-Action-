/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CharacterType,
  StoryGenre,
  VisualStyle,
  VideoFormat,
  EnergyTone,
  PresetState,
  SavedPromptItem,
} from './types';
import {
  CHARACTER_TYPE_OPTIONS,
  CHARACTER_CREATIVE_BEHAVIORS,
  STORY_GENRE_OPTIONS,
  VISUAL_STYLE_OPTIONS,
  VIDEO_FORMAT_OPTIONS,
  ENERGY_TONE_OPTIONS,
  INITIAL_PRESET_STATE,
  SURPRISE_ME_SEEDS,
  RANDOM_STORY_IDEAS,
  CuratedExample,
} from './data/presetsData';
import { buildMasterPrompt, createProduction, normalizeStudioState, createLocalStarterRotation, CHARACTER_TYPE_OPTIONS as STUDIO_CHARACTERS, STORY_GENRE_OPTIONS as STUDIO_GENRES, VISUAL_STYLE_OPTIONS as STUDIO_STYLES, VIDEO_FORMAT_OPTIONS as STUDIO_FORMATS, ENERGY_TONE_OPTIONS as STUDIO_TONES } from './utils/studioAdapter';
import { CreativeBriefFields } from './components/CreativeBriefFields';
import { BuilderGuidance } from './components/BuilderGuidance';
import { ProductionDetails } from './components/ProductionDetails';
import { CharacterPlanner } from './components/CharacterPlanner';
import { TemplatesWorkspace } from './components/TemplatesWorkspace';
import { applyStoryTemplate, type StoryTemplate } from './utils/storyTemplates';
import { LocalPlanningDesk } from './components/LocalPlanningDesk';

import { Header } from './components/Header';
import { StepPresetCard } from './components/StepPresetCard';
import { StoryIdeaInput } from './components/StoryIdeaInput';
import { OptionalDetailsCollapsible } from './components/OptionalDetailsCollapsible';
import { ButtonBar } from './components/ButtonBar';
import { MasterPromptPanel } from './components/MasterPromptPanel';
import { SixCanvasInspector } from './components/SixCanvasInspector';
import { StoryBibleViewer } from './components/StoryBibleViewer';
import { PromptLibraryModal } from './components/PromptLibraryModal';
import { ResetConfirmDialog } from './components/ResetConfirmDialog';
import { SavePromptDialog } from './components/SavePromptDialog';
import { ExamplesModal } from './components/ExamplesModal';

import { Sparkles, ArrowDownRight } from 'lucide-react';

const PRODUCTION_STORAGE_KEY = 'scene_script_production_v2';
const readProductionCache=()=>{try{return JSON.parse(localStorage.getItem(PRODUCTION_STORAGE_KEY)||'null')}catch{return null}};
const mergeOptions=(core:string[],legacy:string[])=>['None',...Array.from(new Set([...core,...legacy])).filter(value=>value!=='None'&&value!=='Custom'),'Custom'];
const DRAFT_STORAGE_KEY = 'scene_script_draft_state_v1';
const LIBRARY_STORAGE_KEY = 'scene_script_library_v1';

export default function App() {
  // Load draft from localStorage if present
  const [presetState, setPresetState] = useState<PresetState>(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        return normalizeStudioState(JSON.parse(savedDraft));
      }
    } catch (err) {
      console.error('Error loading draft state:', err);
    }
    return normalizeStudioState(INITIAL_PRESET_STATE);
  });

  // Saved prompt library
  const [savedLibrary, setSavedLibrary] = useState<SavedPromptItem[]>(() => {
    try {
      const saved = localStorage.getItem(LIBRARY_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('Error loading library:', err);
    }
    return [];
  });

  // Master Prompt state (editable by user)
  const [generatedPrompt, setGeneratedPrompt] = useState<string>(()=>readProductionCache()?.prompt||'');
  const [productionState,setProductionState]=useState<PresetState>(()=>normalizeStudioState(readProductionCache()?.state||presetState));
  const [manualOverride,setManualOverride]=useState<string>(()=>readProductionCache()?.overrideText||'');
  const [starterRotation]=useState(()=>createLocalStarterRotation());
  const [automaticFingerprint,setAutomaticFingerprint]=useState<string|null>(null);
  const [starterSuggestion,setStarterSuggestion]=useState<any>(null);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState<boolean>(()=>Boolean(readProductionCache()?.prompt));
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Active view: 'builder' | 'canvases' | 'bible'
  const [activeView, setActiveView] = useState<'builder' | 'canvases' | 'bible' | 'characters' | 'templates'>('builder');

  // Modals state
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isExamplesOpen, setIsExamplesOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  // Status toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Save draft state to localStorage on modification
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(presetState));
    } catch (err) {
      console.error('Failed to save draft to localStorage:', err);
    }
  }, [presetState]);

  useEffect(()=>{try{if(hasGeneratedOnce)localStorage.setItem(PRODUCTION_STORAGE_KEY,JSON.stringify({state:productionState,prompt:generatedPrompt,overrideText:manualOverride}));else localStorage.removeItem(PRODUCTION_STORAGE_KEY);}catch{showToast('This browser could not save the current output. Copy or export it before leaving.');}},[productionState,generatedPrompt,manualOverride,hasGeneratedOnce,showToast]);

  // Save library to localStorage on modification
  useEffect(() => {
    try {
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(savedLibrary));
    } catch (err) {
      console.error('Failed to save library to localStorage:', err);
    }
  }, [savedLibrary]);

  // Keyboard shortcut: Cmd/Ctrl + Enter to generate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Update specific preset state fields
  const handleUpdate = <K extends keyof PresetState>(key: K, value: PresetState[K]) => {
    setPresetState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applyProduction=(state:PresetState,prompt?:string,overrideText='')=>{
    const normalized=normalizeStudioState(state);
    const result=createProduction(normalized,overrideText);
    setProductionState(normalized);setGeneratedPrompt(prompt??result.prompt);setManualOverride(overrideText);setHasGeneratedOnce(true);
  };
  const hasBrief=(state:PresetState)=>Boolean(state.characters?.length||state.storyIdea.trim()||Object.values(state.optionalDetails).some(v=>typeof v==='string'&&v.trim())||[state.customCharacter,state.customGenre,state.customStyle,state.customFormat,state.customTone].some(v=>v.trim())||[state.characterTypes,state.genres,state.visualStyles,state.videoFormats,state.energyTones].some(values=>values.some(v=>v!=='None')));

  // Generate one shared production snapshot. No external AI call.
  const handleGenerate = () => {
    if(manualOverride&&!window.confirm('Rebuild from your current story fields? This replaces your manual master-prompt edits. Copy or export them first if you want to keep them.'))return;
    let currentState=normalizeStudioState(presetState);
    if(!hasBrief(currentState)){const pick=starterRotation.next();currentState=pick.state;setPresetState(currentState);setAutomaticFingerprint(JSON.stringify(currentState));showToast(pick.notice);}
    applyProduction(currentState);
    if (activeView === 'characters') setActiveView('builder');
    setTimeout(()=>document.getElementById('generated-prompt-section')?.scrollIntoView({behavior:'smooth',block:'start'}),100);
  };

  // Copy the current prompt and report actual clipboard success.
  const handleCopyPrompt = async () => {
    const text=generatedPrompt||buildMasterPrompt(presetState);
    if(!generatedPrompt)applyProduction(presetState);
    try{await navigator.clipboard.writeText(text);setIsCopied(true);showToast('Prompt copied to clipboard.');setTimeout(()=>setIsCopied(false),2500);}catch{showToast('Copy was blocked. Select the prompt text and copy it manually.');}
  };

  const applyStarter=(pick:any,generate:boolean)=>{
    const next=normalizeStudioState(pick.state);setPresetState(next);setAutomaticFingerprint(JSON.stringify(next));setStarterSuggestion(null);setManualOverride('');
    if(generate)applyProduction(next);else{setProductionState(next);setGeneratedPrompt('');setHasGeneratedOnce(false);}
    showToast(pick.notice+' '+(generate?'Production ready.':'Starting point ready. Select Generate when you are ready.'));
  };
  const suggestStarter=(generate:boolean,previewOnly=false)=>{
    const pick=starterRotation.next();
    const untouched=automaticFingerprint===JSON.stringify(normalizeStudioState(presetState))&&!manualOverride;
    if(!previewOnly&&(!hasBrief(presetState)||untouched))applyStarter(pick,generate);else setStarterSuggestion({pick,generate});
  };
  const handleRandom=()=>suggestStarter(false);
  const handleSurpriseMe=()=>suggestStarter(true);
  const appendStarter=()=>{if(!starterSuggestion)return;const next=normalizeStudioState({...presetState,storyIdea:[presetState.storyIdea,'Adapt this alternative idea to the established cast, setting, and era without replacing their explicit details: '+starterSuggestion.pick.starter.idea].filter(Boolean).join('\n\n')});setPresetState(next);setAutomaticFingerprint(null);if(starterSuggestion.generate)applyProduction(next);setStarterSuggestion(null);};

  const handleApplyTemplate = (template: StoryTemplate, mode: 'fresh' | 'merge') => {
    const next = applyStoryTemplate(presetState, template, mode);
    setPresetState(next);
    setAutomaticFingerprint(null);
    setStarterSuggestion(null);
    if (mode === 'fresh') {
      setProductionState(next);
      setGeneratedPrompt('');
      setManualOverride('');
      setHasGeneratedOnce(false);
    }
    setActiveView(template.kind === 'characters' ? 'characters' : 'builder');
    showToast(`Template “${template.title}” ${mode === 'fresh' ? 'loaded into a fresh draft' : 'merged into your draft'}. Generate when ready.`);
  };

  // Reset Everything
  const handleConfirmReset = () => {
    setPresetState(normalizeStudioState(INITIAL_PRESET_STATE));
    setProductionState(normalizeStudioState(INITIAL_PRESET_STATE));setManualOverride('');setAutomaticFingerprint(null);setStarterSuggestion(null);
    setGeneratedPrompt('');
    setHasGeneratedOnce(false);
    setIsResetConfirmOpen(false);
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
    showToast('All presets and inputs reset to defaults.');
  };

  // Save prompt to local library
  const handleSavePrompt = (title: string) => {
    const currentPrompt = generatedPrompt || buildMasterPrompt(presetState);
    const newItem: SavedPromptItem = {
      id: `prompt-${Date.now()}`,
      title,
      createdAt: new Date().toISOString(),
      state: normalizeStudioState(hasGeneratedOnce?productionState:presetState),
      overrideText: manualOverride,
      masterPrompt: currentPrompt,
    };

    setSavedLibrary((prev) => [newItem, ...prev]);
    showToast(`Saved "${title}" to your Prompt Library!`);
  };

  // Load prompt from library
  const handleLoadFromLibrary = (item: SavedPromptItem) => {
    const loaded=normalizeStudioState(item.state);setPresetState(loaded);setAutomaticFingerprint(null);
    applyProduction(loaded,item.masterPrompt,(item as SavedPromptItem & {overrideText?:string}).overrideText??(item.masterPrompt!==buildMasterPrompt(loaded)?item.masterPrompt:''));
    setActiveView('builder');
    showToast(`Loaded prompt "${item.title}".`);
  };

  // Delete item from library
  const handleDeleteFromLibrary = (id: string) => {
    setSavedLibrary((prev) => prev.filter((i) => i.id !== id));
    showToast('Prompt removed from library.');
  };

  // Clear library
  const handleClearLibrary = () => {
    if (window.confirm('Are you sure you want to delete all saved prompts in your library?')) {
      setSavedLibrary([]);
      showToast('Library cleared.');
    }
  };

  // Curated example
  const handleSelectExample = (ex: CuratedExample) => {
    if(hasBrief(presetState)&&!window.confirm('Load this example in place of the current story? Your saved library will stay unchanged.'))return;
    const example=normalizeStudioState(ex.state);setPresetState(example);setAutomaticFingerprint(null);applyProduction(example);
    setActiveView('builder');
    showToast(`Loaded "${ex.name}" reference setup!`);
  };

  // Cloud sync handler from Firebase
  const handleSyncCloudStories = (cloudStories: any[]) => {
    if (!cloudStories || cloudStories.length === 0) return;
    setSavedLibrary((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const newItems = cloudStories.filter((c) => !existingIds.has(c.id));
      return [...newItems, ...prev];
    });
    showToast(`Synced ${cloudStories.length} cloud stories from Firebase Firestore!`);
  };

  const activeCharType = presetState.characterTypes.find((t) => t !== 'None') || '';
  const characterHelperText = activeCharType ? CHARACTER_CREATIVE_BEHAVIORS[activeCharType] : undefined;

  const production=useMemo(()=>createProduction(hasGeneratedOnce?productionState:presetState,manualOverride),[productionState,presetState,manualOverride,hasGeneratedOnce]);
  const sixCanvases=production.canvases;
  const briefChanged=hasGeneratedOnce&&JSON.stringify(normalizeStudioState(presetState))!==JSON.stringify(normalizeStudioState(productionState));

  const currentStoryObject = useMemo(() => {
    const activeState=hasGeneratedOnce?productionState:presetState;
    return {
      id: `story-${Date.now()}`,
      title: activeState.storyIdea ? activeState.storyIdea.slice(0, 40) : 'My Three-Scene Story',
      masterPrompt: generatedPrompt || buildMasterPrompt(presetState),
      targetDuration: activeState.optionalDetails.targetDuration || '',
      state: hasGeneratedOnce?productionState:presetState,
      overrideText: manualOverride,
      createdAt: new Date().toISOString(),
    };
  }, [presetState, productionState, manualOverride, hasGeneratedOnce, generatedPrompt]);

  return (
    <div className="gca-app min-h-screen flex flex-col antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs sm:text-sm font-medium flex items-center gap-2 border border-neutral-700 animate-in fade-in slide-in-from-top-2 duration-150">
          <Sparkles className="w-4 h-4 text-[#C99C62]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        savedCount={savedLibrary.length}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenExamples={() => setIsExamplesOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
        currentStory={currentStoryObject}
        onToast={showToast}
        onSyncCloudStories={handleSyncCloudStories}
      />

      <section className={'gca-hero ' + (activeView !== 'builder' ? 'gca-hero-compact' : '')} aria-label="Glam, Camera, Action! studio">
        <div className="gca-hero-copy">
          <p className="gca-eyebrow"><span aria-hidden="true"/> GLAM, CAMERA, ACTION!</p>
          <h1>{activeView === 'builder' ? <>Your idea.<br/>Ready for its <em>close-up.</em></> : activeView === 'canvases' ? <>Six canvases.<br/><em>One connected story.</em></> : activeView === 'bible' ? <>Every detail.<br/><em>In the same world.</em></> : activeView === 'characters' ? <>Your cast.<br/><em>Every arc connected.</em></> : <>Your story kit.<br/><em>Ready to reuse.</em></>}</h1>
          <p className="gca-hero-description">Build your brief, shape three connected scenes, and take your story from first spark to production-ready prompts.</p>
          <a className="gca-start-link" href="#studio-workspace">{activeView === 'builder' ? 'Start shaping your story' : 'Go to your workspace'} <ArrowDownRight size={18} className="text-[#C99C62]" aria-hidden="true"/></a>
          <div className="gca-sequence" aria-label="Production structure"><span>01 <b>THE IDEA</b></span><i aria-hidden="true"/><span>03 <b>SCENES</b></span><i aria-hidden="true"/><span>06 <b>CANVASES</b></span></div>
        </div>
        <LocalPlanningDesk onOpenCanvases={() => setActiveView('canvases')} onOpenBible={() => setActiveView('bible')} />
      </section>

      <div className="gca-notices max-w-6xl mx-auto w-full px-4 sm:px-6 pt-3 text-xs text-neutral-600">
        <p>Prompt and story planning run locally in your browser. No AI API, credits or key required.</p>
        {hasGeneratedOnce&&<p className="mt-2">{production.notice}</p>}
        {briefChanged&&<p role="status" className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-950">Your brief has changed. Generate again to update the master prompt, shot direction and six canvases together. Saving keeps the settings used for the current output.</p>}
        {manualOverride&&<p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-neutral-800">Manual prompt edits are carried verbatim into every scene as priority direction. The app does not automatically interpret arbitrary prose into the structured fields. Rebuild from fields to replace this override.</p>}
      </div>
      {/* Main Content Area */}
      <main id="studio-workspace" className="gca-main flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeView === 'builder' && (
          <div className="gca-builder space-y-6 sm:space-y-8">
            <div className="gca-section-intro"><span>THE STORY ROOM</span><h2>Make it yours.</h2><p>Start with an idea, then open each direction below to shape its world.</p></div>
            <BuilderGuidance state={presetState} hasPrompt={hasGeneratedOnce} briefChanged={briefChanged} onGenerate={handleGenerate} />
            <StoryIdeaInput value={presetState.storyIdea} onChange={(val) => handleUpdate('storyIdea', val)} />
            {/* Step 1: Character Type */}
            <StepPresetCard
              stepNumber="01"
              title="Choose Character Type"
              controlsDescription="Controls character behavior, anatomy, visual language, dialogue style, and scene realism."
              options={mergeOptions(STUDIO_CHARACTERS,CHARACTER_TYPE_OPTIONS)}
              selectedOptions={presetState.characterTypes}
              onChange={(opts) => handleUpdate('characterTypes', opts)}
              allowMultiSelect={false}
              customValue={presetState.customCharacter}
              onCustomChange={(val) => handleUpdate('customCharacter', val)}
              helperText={characterHelperText}
            />

            {/* Step 2: Story Genre */}
            <StepPresetCard
              stepNumber="02"
              title="Choose Story Genre"
              controlsDescription="Controls pacing, emotional arc, stakes, dialogue rhythm, and camera energy."
              options={mergeOptions(STUDIO_GENRES,STORY_GENRE_OPTIONS)}
              selectedOptions={presetState.genres}
              onChange={(opts) => handleUpdate('genres', opts)}
              allowMultiSelect={true}
              customValue={presetState.customGenre}
              onCustomChange={(val) => handleUpdate('customGenre', val)}
            />

            {/* Step 3: Visual Style */}
            <StepPresetCard
              stepNumber="03"
              title="Choose Visual Style"
              controlsDescription="Controls the image-generation art direction while preserving continuity across all three scenes."
              options={mergeOptions(STUDIO_STYLES,VISUAL_STYLE_OPTIONS)}
              selectedOptions={presetState.visualStyles}
              onChange={(opts) => handleUpdate('visualStyles', opts)}
              allowMultiSelect={true}
              customValue={presetState.customStyle}
              onCustomChange={(val) => handleUpdate('customStyle', val)}
            />

            {/* Step 4: Video Format */}
            <StepPresetCard
              stepNumber="04"
              title="Choose Video Format"
              controlsDescription="Controls script length, hook structure, scene timing, CTA behavior, and shot intensity."
              options={mergeOptions(STUDIO_FORMATS,VIDEO_FORMAT_OPTIONS)}
              selectedOptions={presetState.videoFormats}
              onChange={(opts) => handleUpdate('videoFormats', opts)}
              allowMultiSelect={false}
              customValue={presetState.customFormat}
              onCustomChange={(val) => handleUpdate('customFormat', val)}
            />

            {/* Step 5: Energy + Tone */}
            <StepPresetCard
              stepNumber="05"
              title="Choose Energy + Tone"
              controlsDescription="Controls performance, facial expression, dialogue, music cues, and overall mood."
              options={mergeOptions(STUDIO_TONES,ENERGY_TONE_OPTIONS)}
              selectedOptions={presetState.energyTones}
              onChange={(opts) => handleUpdate('energyTones', opts)}
              allowMultiSelect={true}
              customValue={presetState.customTone}
              onCustomChange={(val) => handleUpdate('customTone', val)}
            />


            {/* Optional Story Details Collapsible with Target Duration Dropdown */}
            <CreativeBriefFields state={presetState} onChange={setPresetState} />
            <ProductionDetails state={presetState} onChange={setPresetState} />

            {/* Master Prompt Output Panel */}
            {hasGeneratedOnce && (
              <MasterPromptPanel
                prompt={generatedPrompt}
                onPromptChange={(text)=>{setGeneratedPrompt(text);setManualOverride(text===buildMasterPrompt(productionState)?'':text);}}
                onCopy={handleCopyPrompt}
                isCopied={isCopied}
                onRegenerate={handleGenerate}
              />
            )}
          </div>
        )}

        {activeView === 'characters' && <CharacterPlanner state={presetState} onChange={setPresetState} />}

        <div hidden={activeView !== 'templates'}>
          <TemplatesWorkspace state={presetState} onApply={handleApplyTemplate} />
        </div>

        {activeView === 'canvases' && (
          <SixCanvasInspector canvases={sixCanvases} />
        )}

        {activeView === 'bible' && (
          <StoryBibleViewer state={hasGeneratedOnce?productionState:presetState} />
        )}

      </main>

      {/* Bottom Button Bar */}
      <ButtonBar
        onGenerate={handleGenerate}
        onCopy={handleCopyPrompt}
        onRandom={handleRandom}
        onSurpriseMe={handleSurpriseMe}
        onReset={() => setIsResetConfirmOpen(true)}
        onSave={() => setIsSaveDialogOpen(true)}
        hasPrompt={hasGeneratedOnce || Boolean(generatedPrompt)}
        isCopied={isCopied}
      />

      {starterSuggestion&&<div role="dialog" aria-modal="true" aria-label="Protect your current story" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-w-xl w-full rounded-xl bg-white p-5 shadow-2xl"><h2 className="font-bold text-lg">A coordinated starting point</h2><p className="font-semibold mt-2">{starterSuggestion.pick.starter.title}</p><p className="text-sm my-3 max-h-52 overflow-auto">{starterSuggestion.pick.starter.idea}</p><p className="text-xs text-neutral-600 mb-4">Your current writing is protected. Replace the full brief, append an idea adapted to your established cast and setting, or keep your work.</p><div className="flex gap-2 flex-wrap"><button className="rounded-lg bg-neutral-900 text-white p-2 text-sm" onClick={()=>applyStarter(starterSuggestion.pick,starterSuggestion.generate)}>Use full starting point</button><button className="rounded-lg border p-2 text-sm" onClick={appendStarter}>Append adapted idea</button><button className="rounded-lg border p-2 text-sm" onClick={()=>suggestStarter(starterSuggestion.generate,true)}>Another idea</button><button className="rounded-lg border p-2 text-sm" onClick={()=>setStarterSuggestion(null)}>Keep current story</button></div></div></div>}
      {/* Dialogs and Modals */}
      <PromptLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        items={savedLibrary}
        onLoadItem={handleLoadFromLibrary}
        onDeleteItem={handleDeleteFromLibrary}
        onClearAll={handleClearLibrary}
      />

      <ExamplesModal
        isOpen={isExamplesOpen}
        onClose={() => setIsExamplesOpen(false)}
        onSelectExample={handleSelectExample}
      />

      <ResetConfirmDialog
        isOpen={isResetConfirmOpen}
        onConfirm={handleConfirmReset}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      <SavePromptDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onSave={handleSavePrompt}
        defaultTitle={
          presetState.storyIdea
            ? presetState.storyIdea.slice(0, 36) + '...'
            : 'My 3-Scene Production'
        }
      />

    </div>
  );
}
