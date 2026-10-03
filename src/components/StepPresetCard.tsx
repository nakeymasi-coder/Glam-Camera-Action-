import React, { useState } from 'react';
import { Check } from 'lucide-react';

interface StepPresetCardProps {
  stepNumber: string;
  title: string;
  controlsDescription: string;
  options: string[];
  selectedOptions: string[];
  onChange: (options: string[]) => void;
  allowMultiSelect?: boolean;
  customValue?: string;
  onCustomChange?: (val: string) => void;
  helperText?: string;
}

export const StepPresetCard: React.FC<StepPresetCardProps> = ({
  stepNumber,
  title,
  controlsDescription,
  options,
  selectedOptions,
  onChange,
  allowMultiSelect = false,
  customValue = '',
  onCustomChange,
  helperText,
}) => {
  const choiceKey='scene_script_preset_choices_v2_'+stepNumber;
  const [savedChoices,setSavedChoices]=useState<string[]>(()=>{try{const value=JSON.parse(localStorage.getItem(choiceKey)||'[]');return Array.isArray(value)?value.filter(item=>typeof item==='string'&&item.trim()):[]}catch{return []}});
  const [choiceMessage,setChoiceMessage]=useState('');
  const [removedChoice,setRemovedChoice]=useState<string|null>(null);
  const persistChoices=(next:string[])=>{try{localStorage.setItem(choiceKey,JSON.stringify(next));setSavedChoices(next);return true}catch{setChoiceMessage('This browser could not save your choice. Your current text is unchanged.');return false}};
  const visibleOptions=['None',...Array.from(new Set([...options,...savedChoices,...selectedOptions])).filter(value=>value!=='None'&&value!=='Custom'),'Custom'];
  const addChoice=()=>{const value=customValue.trim();if(!value)return;const duplicate=visibleOptions.find(option=>option.trim().toLocaleLowerCase()===value.toLocaleLowerCase());const chosen=duplicate||value;if(!duplicate&&!persistChoices([...savedChoices,value]))return;onChange(allowMultiSelect?[...selectedOptions.filter(value=>value!=='None'&&value!=='Custom'&&value!==chosen),chosen]:[chosen]);onCustomChange?.('');setChoiceMessage(duplicate?'Selected your existing choice.':'Choice saved in this browser.');};
  const isCustomSelected = selectedOptions.includes('Custom');

  const handleToggle = (opt: string) => {
    if (opt === 'None') {
      onChange(['None']);
      return;
    }

    if (!allowMultiSelect) {
      // Single select: clicking an active non-None toggles it off back to None, or replaces selection
      if (selectedOptions.includes(opt) && selectedOptions.length === 1) {
        onChange(['None']);
      } else {
        onChange([opt]);
      }
      return;
    }

    // Multi-select allowed:
    let next: string[];
    if (selectedOptions.includes('None')) {
      next = [opt];
    } else if (selectedOptions.includes(opt)) {
      next = selectedOptions.filter((item) => item !== opt);
      if (next.length === 0) {
        next = ['None'];
      }
    } else {
      next = [...selectedOptions.filter((item) => item !== 'None'), opt];
    }
    onChange(next);
  };

  return (
    <details className="gca-step">
      <summary className="gca-step-summary">
        <span className="gca-step-number">{stepNumber}</span>
        <span className="gca-step-heading"><h2>{title.replace('Choose ', '')}</h2><span>{selectedOptions.filter(option => option !== 'None').join(' · ') || 'Open to choose your direction'}</span></span>
        <span className="gca-step-toggle" aria-hidden="true">+</span>
      </summary>
      <div className="gca-step-content">
        <p className="gca-step-description">{controlsDescription} {allowMultiSelect && 'You can choose more than one.'}</p>
      {/* Checkbox Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5">
        {visibleOptions.map((opt) => {
          const isSelected = selectedOptions.includes(opt);
          const isNone = opt === 'None';

          return (
            <button
              type="button"
              aria-pressed={isSelected}
              key={opt}
              onClick={() => handleToggle(opt)}
              className={`gca-option text-left flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg border text-xs sm:text-sm font-medium cursor-pointer transition-all select-none min-h-[44px] ${
                isSelected
                  ? isNone
                    ? 'bg-neutral-100 border-neutral-300 text-neutral-700 font-semibold'
                    : 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                  : 'bg-neutral-50/60 border-neutral-200 text-neutral-800 hover:bg-neutral-100 hover:border-neutral-300'
              }`}
            >
              {/* Visible Checkbox box */}
              <div
                className={`w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0 ${
                  isSelected
                    ? isNone
                      ? 'bg-neutral-400 text-white'
                      : 'bg-[#C99C62] text-black font-bold'
                    : 'border border-neutral-300 bg-white'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className="leading-tight break-words">{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Custom Text Field under preset */}
      {isCustomSelected && onCustomChange && (
        <div className="mt-3.5 pt-3 border-t border-dashed border-neutral-200">
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Specify custom {title.replace('Choose ', '').toLowerCase()}:
          </label>
          <input
            type="text"
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder={`Enter your custom ${title.replace('Choose ', '').toLowerCase()} details...`}
            className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C99C62] focus:border-neutral-900 bg-white"
          />
        </div>
      )}

      {isCustomSelected&&<button type="button" disabled={!customValue.trim()} onClick={addChoice} className="mt-2 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold disabled:opacity-40">Add reusable choice</button>}
      {savedChoices.length>0&&<details className="mt-3 text-xs text-neutral-600"><summary className="cursor-pointer">Manage {savedChoices.length} saved choices</summary>{savedChoices.map(choice=><div key={choice} className="flex items-center gap-2 mt-2"><span className="flex-1 break-words">{choice}</span><button type="button" className="underline" aria-label={'Remove saved '+choice} onClick={()=>{if(persistChoices(savedChoices.filter(value=>value!==choice))){setRemovedChoice(choice);setChoiceMessage('Saved choice removed; the current selection is preserved.');}}}>Remove</button></div>)}</details>}
      {choiceMessage&&<p role="status" className="text-xs mt-2 text-neutral-600">{choiceMessage} {removedChoice&&<button type="button" className="underline" onClick={()=>{if(persistChoices([...savedChoices,removedChoice])){setRemovedChoice(null);setChoiceMessage('Choice restored.');}}}>Undo</button>}</p>}
      {/* Helper text / automatic creative behavior */}
      {helperText && (
        <div className="mt-3.5 pt-3 border-t border-neutral-100 flex items-start gap-2 text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-md">
          <span className="text-[#8A5036] font-bold shrink-0">Auto Behavior:</span>
          <span className="leading-relaxed">{helperText}</span>
        </div>
      )}
      </div>
    </details>
  );
};
