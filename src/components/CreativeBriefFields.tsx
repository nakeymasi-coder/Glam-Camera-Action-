import React, { useState } from 'react';
import type { PresetState } from '../types';
import { BRIEF_CHOICES } from '../studio-core/brief-fields';

const STORAGE_KEY = 'scene_script_reusable_brief_v2';
const FIELDS = [
  ['storyIdea','Story idea','storyIdea'],
  ['characterDescription','Character names, appearance and identity','characterNames'],
  ['storyGoal','Story goal','storyGoal'],
  ['obstacle','Obstacle or complication','obstacle'],
  ['endingChange','Ending or change','endingChange'],
  ['characterGoals','Character motivation','characterGoals'],
  ['setting','Setting / location','settingLocation'],
  ['era','Era','era'],
  ['duration','Target duration','targetDuration'],
  ['targetAudience','Audience / platform','targetAudience'],
  ['productService','Product / service','productService'],
  ['callToAction','Call to action','callToAction'],
  ['dialogueMustHaves','Exact dialogue / voiceover','dialogueMustHaves'],
  ['onScreenText','Exact on-screen text','exactTextCaptions'],
] as const;
type SavedChoices = Record<string,string[]>;
const readSaved=():SavedChoices=>{try{const value:unknown=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');if(!value||typeof value!=='object'||Array.isArray(value))return {};return Object.fromEntries(Object.entries(value).filter(([category,items])=>Object.hasOwn(BRIEF_CHOICES,category)&&Array.isArray(items)).map(([category,items])=>[category,(items as unknown[]).filter((item):item is string=>typeof item==='string'&&!!item.trim())]));}catch{return {}}};
const key=(text:string)=>text.trim().replace(/\s+/g,' ').toLocaleLowerCase();
const box='w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C99C62]';

export function CreativeBriefFields({state,onChange}:{state:PresetState;onChange:(state:PresetState)=>void}) {
  const [saved,setSaved]=useState<SavedChoices>(readSaved);
  const [notice,setNotice]=useState('');
  const [pending,setPending]=useState<{field:string;value:string;label:string}|null>(null);
  const [undo,setUndo]=useState<SavedChoices|null>(null);
  const details=state.optionalDetails as unknown as Record<string,string>;
  const valueFor=(field:string)=>field==='storyIdea'?state.storyIdea:(details[field]||'');
  const setField=(field:string,value:string)=>onChange(field==='storyIdea'?{...state,storyIdea:value}:{...state,optionalDetails:{...state.optionalDetails,[field]:value}});
  const persist=(next:SavedChoices)=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));setSaved(next);return true}catch{setNotice('Your browser could not save this choice. Your current text is still here.');return false}};
  const save=(category:string,field:string)=>{const value=valueFor(field).trim();if(!value)return;if((saved[category]||[]).some(x=>key(x)===key(value))){setNotice('That choice is already saved.');return;}if(persist({...saved,[category]:[...(saved[category]||[]),value]}))setNotice('Choice saved in this browser.');};
  const choose=(field:string,value:string,label:string)=>{if(!value)return;if(valueFor(field).trim()&&key(valueFor(field))!==key(value)){setPending({field,value,label});return;}setField(field,value);};
  return <section className="gca-brief bg-white rounded-xl border border-neutral-200 shadow-sm p-4 sm:p-6">
    <details>
      <summary className="cursor-pointer font-bold text-base">Story details & reusable choices <span className="font-normal text-xs text-neutral-500">Optional director controls</span></summary>
      <p className="text-xs text-neutral-600 my-3">Your written direction takes priority. Saved choices stay in this browser; your existing local library and optional Google cloud sync are unchanged.</p>
      <div className="grid gap-5 md:grid-cols-2">
      {FIELDS.map(([category,label,field])=>{
        const suggestions=BRIEF_CHOICES[category]||[];
        const custom=saved[category]||[];
        const id='brief-'+category;
        return <div key={category}>
          <label htmlFor={id} className="block mb-1 text-sm font-semibold">{label}</label>
          {field==='storyIdea'?<p className="text-xs text-neutral-600 mb-2">Use the story box above, or choose a starting point here.</p>:<textarea id={id} rows={field==='characterNames'?3:2} value={valueFor(field)} onChange={e=>setField(field,e.target.value)} className={box} placeholder={field==='targetDuration'?'For example: 30s, 1m 30s, or 01:30':'Type your own direction...'} />}
          {(suggestions.length>0||custom.length>0)&&<select aria-label={'Choose '+label.toLowerCase()+' suggestion'} className={box+' mt-2'} value="" onChange={e=>choose(field,e.target.value,label)}>
            <option value="">Choose a suggestion or saved choice</option>
            {custom.length>0&&<optgroup label="Your saved choices">{custom.map((text,i)=><option key={'c'+i} value={text}>{text.length>110?text.slice(0,107)+'…':text}</option>)}</optgroup>}
            {suggestions.length>0&&<optgroup label="Studio starting points">{suggestions.map((choice,i)=><option key={'s'+i} value={choice.value}>{choice.label}</option>)}</optgroup>}
          </select>}
          <button type="button" onClick={()=>save(category,field)} disabled={!valueFor(field).trim()} className="mt-2 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-neutral-50">Save current {label.toLowerCase()}</button>
          {custom.length>0&&<details className="mt-2 text-xs"><summary className="cursor-pointer text-neutral-600">Manage {custom.length} saved {custom.length===1?'choice':'choices'}</summary>{custom.map((text,i)=><div key={i} className="flex items-start gap-2 mt-2"><span className="flex-1 whitespace-pre-wrap break-words">{text}</span><button type="button" aria-label={'Remove saved '+label.toLowerCase()+' '+(i+1)} className="underline shrink-0" onClick={()=>{const before=saved;if(persist({...saved,[category]:custom.filter((_,j)=>j!==i)})){setUndo(before);setNotice('Saved choice removed. You can undo this.');}}}>Remove</button></div>)}</details>}
        </div>
      })}
      </div>
      {details.productServiceCTA&&<div className="mt-4"><label htmlFor="legacy-cta" className="block text-sm font-semibold mb-1">Original combined product / CTA</label><textarea id="legacy-cta" className={box} value={details.productServiceCTA} onChange={e=>setField('productServiceCTA',e.target.value)} /><p className="text-xs text-neutral-500 mt-1">Preserved from this app's saved story. Separate product and CTA fields above are optional refinements.</p></div>}
      {notice&&<p role="status" className="mt-3 text-xs text-neutral-700">{notice} {undo&&<button type="button" className="underline font-semibold" onClick={()=>{if(persist(undo)){setUndo(null);setNotice('Saved choices restored.');}}}>Undo</button>}</p>}
    </details>
    {pending&&<div role="dialog" aria-modal="true" aria-label="Keep your written direction" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-w-lg w-full rounded-xl bg-white p-5 shadow-xl"><h3 className="font-bold">Keep your written {pending.label.toLowerCase()}?</h3><p className="text-sm mt-2 text-neutral-600">Choose how to use this suggestion. Your current text will stay unless you choose Replace.</p><p className="text-sm my-4 max-h-48 overflow-auto whitespace-pre-wrap">{pending.value}</p><div className="flex gap-2 flex-wrap">{['Replace','Append','Keep current'].map(action=><button type="button" key={action} className="rounded-lg border px-3 py-2 text-sm font-semibold" onClick={()=>{if(action==='Replace')setField(pending.field,pending.value);if(action==='Append')setField(pending.field,valueFor(pending.field)+'\n'+pending.value);setPending(null);}}>{action}</button>)}</div></div></div>}
  </section>;
}
