import { eraDirection } from './era-direction';
/** Local, deterministic creative defaults. Explicit user prose always has priority. */
export interface DirectionInput {
  characterType?: string | string[]; genre?: string | string[]; visualStyle?: string | string[];
  videoFormat?: string | string[]; energyTone?: string | string[]; storyIdea?: string;
  customCharacter?: string; customGenre?: string; customVisualStyle?: string; customVideoFormat?: string; customEnergyTone?: string;
  optionalDetails?: {storyGoal?:string;obstacle?:string;endingChange?:string;characterGoals?:string;duration?:string;era?:string;characterNames?:string;setting?:string;dialogueMustHaves?:string;onScreenText?:string;productService?:string;targetAudience?:string;callToAction?:string};
}
export interface SceneDirection {scene:number;seconds:number;storyCue?:string;shot:string;camera:string;blocking:string;rhythm:string;transition:string;}
export interface DirectorPlan {profile:string;format:string;duration:number;framing:string;lighting:string;performance:string;medium:string;continuity:string[];notes:string[];scenes:SceneDirection[];}
const activeSelections=(value:string|string[]|undefined,custom?:string)=> (Array.isArray(value)?value:value?[value]:[]).flatMap(item=>item.toLowerCase()==='none'?[]:item.toLowerCase()==='custom'?(custom?.trim()?[custom.trim()]:[]):[item]);
const profileFor=(text:string)=>{
 if(/dramedy/i.test(text))return 'dramedy';
 if(/educational|explainer|tutorial/i.test(text))return 'educational';
 if(/comedy|comic|heist|caper|satire|mockumentary/i.test(text))return 'comedy';
 if(/mystery|suspense|thriller|horror|noir/i.test(text))return 'suspense';
 if(/action|adventure|epic discovery|science fiction|western|survival|sports|disaster/i.test(text))return 'adventure';
 if(/magical realism/i.test(text))return 'magical';
 if(/drama|romance|slice of life|inspirational/i.test(text))return 'emotional';
 return 'balanced';
};
/** Parse simple and compound runtimes without confusing two alternative durations with a sum. */
export function readRuntimeSeconds(value:string):number|null {
 const text=value.trim().replace(/\s*\(\s*approx(?:\.|imately)?\s+\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?\s*(?:seconds?|secs?|s)\s+per\s+scene\s*\)\s*$/i,'').trim();if(!text)return null;
 const clock=text.match(/^(\d{1,3}):(\d{2})$/);if(clock)return Number(clock[2])<60?Number(clock[1])*60+Number(clock[2]):null;
 if(/^\d+(?:\.\d+)?$/.test(text))return Number(text);
 if(/\b(?:between|or|to)\b|\d\s*[-–]\s*\d/i.test(text))return null;
 const terms=[...text.matchAll(/(\d+(?:\.\d+)?)\s*[- ]?\s*(minutes?|mins?|m|seconds?|secs?|s)\b/gi)];
 if(!terms.length)return null;
 const units=terms.map(term=>/^m/i.test(term[2])?'m':'s');if(new Set(units).size!==units.length)return null;
 return terms.reduce((total,term)=>total+Number(term[1])*(/^m/i.test(term[2])?60:1),0);
}
export function buildDirectorPlan(input:DirectionInput):DirectorPlan{
 const details=input.optionalDetails||{},story=input.storyIdea||'';
 const genres=activeSelections(input.genre,input.customGenre),styles=activeSelections(input.visualStyle,input.customVisualStyle),formats=activeSelections(input.videoFormat,input.customVideoFormat);
 const characters=activeSelections(input.characterType,input.customCharacter),tones=activeSelections(input.energyTone,input.customEnergyTone).join(' | ');
 const userProse=[story,details.characterNames,details.setting,details.characterGoals,...characters,...genres,...styles,...formats,tones].filter(Boolean).join('\n');
 const genre=genres[0] || '';
 // Story cues are used only when there is no selected/custom genre. Arbitrary custom genre prose is preserved, not split into selections.
 const format=formats[0] || 'Short-form story';
 const profile=profileFor(genre || (format==='Explainer'?'Educational':story));
 const formatDefaults:Record<string,[number,number[]]>={'Social Reel / TikTok':[24,[5,11,8]],'Short Skit':[30,[7,13,10]],'Commercial / Ad':[30,[6,14,10]],'Trailer / Teaser':[30,[7,15,8]],'Explainer':[45,[10,25,10]],'Storytime':[60,[15,30,15]],'Mini Episode':[90,[20,45,25]]};
 const base=formatDefaults[format]||[30,[7,13,10]];
 const runtimePattern='(\\d+(?:\\.\\d+)?\\s*[- ]?\\s*(?:seconds?|secs?|s|minutes?|mins?|m)(?:\\s*(?:and\\s*)?\\d+(?:\\.\\d+)?\\s*(?:seconds?|secs?|s))?)';
 const storyRuntime=userProse.match(new RegExp('\\b(?:duration|runtime|length|total|make (?:it|this)|keep (?:it|this) to)\\s*[:=]?\\s*'+runtimePattern,'i'))?.[1]
   ||userProse.match(new RegExp('\\b'+runtimePattern+'\\s+(?:(?:long|horizontal|vertical)\\s+)?(?:video|clip|reel|film|trailer|episode|story)\\b','i'))?.[1];
 const runtimeText=details.duration?.trim() || (readRuntimeSeconds(format)!==null?format:'') || storyRuntime || '';
 const requested=readRuntimeSeconds(runtimeText);
 const duration=requested!==null&&requested>=0.3&&requested<=86400?requested:base[0];
 // Portable correction: reserve 0.1 seconds for each remaining scene before rounding.
 // Keep the exact requested total, including fractional seconds finer than one tenth.
 const clean=(value:number)=>Number(value.toFixed(10));
 const first=clean(Math.min(duration-0.2,Math.max(0.1,Math.round(duration*base[1][0]/base[0]*10)/10)));
 const second=clean(Math.min(duration-first-0.1,Math.max(0.1,Math.round(duration*base[1][1]/base[0]*10)/10)));
 const timings=[first,second,clean(duration-first-second)];
 const framingText=userProse.replace(/\b(?:not|no)\s+(?:a\s+)?(?:vertical|horizontal|square)\b/gi,'');
 const explicitRatio=framingText.match(/\b(9:16|16:9|1:1|4:5|2\.39:1)\b/)?.[1];
 const aspect=explicitRatio || (/\b(?:horizontal|landscape)\b/i.test(framingText)?'16:9':/\b(?:vertical|portrait format)\b/i.test(framingText)?'9:16':/\bsquare\b/i.test(framingText)?'1:1':format==='Social Reel / TikTok'?'9:16':'16:9');
 const framing=`${aspect} ${aspect==='9:16'?'vertical-first composition; keep faces, hands, and important props clear of interface-overlay edges':'composition with clear subject hierarchy and readable spatial geography'}. Preserve an explicitly requested aspect ratio.`;
 const primary=styles[0] || 'a coherent medium that fits the written idea';
 const allStyles=styles.join(' | ');
 const hybrid=/hybrid|live-action.*CG/i.test(primary);
 const stopMotion=/stop.motion|puppetry/i.test(primary);
 const drawn=/hand.drawn|illustrated|graphic novel|cel.shaded/i.test(primary);
 const staticCamera=/\b(?:static|locked.off|fixed|stationary|still)\s+(?:camera|shot)|\b(?:no|without)\s+(?:camera movement|camera motion|moving camera)|\btripod\b/i.test(userProse);
 const setting=[details.setting,story].filter(Boolean).join(' ');
 let lighting=/\b(daytime|daylight|sunlit|morning|afternoon|noon)\b/i.test(setting)?'Motivate the key from the stated daylight: sun, open sky, or a visible window. Keep time of day, shadow direction, and exposure consistent.'
  :/\b(night|nighttime|midnight|moonlit)\b/i.test(setting)?'Use the night sources justified by the setting, such as existing practical lights or moonlight. Retain readable faces and spatial landmarks; do not add arbitrary neon or haze.'
  :/\b(sunrise|sunset|golden hour|dusk)\b/i.test(setting)?'Use the stated low sun or dusk as the key motivation, with believable fill and consistent shadow direction. Keep the color transition stable across the sequence.'
  :'Choose a visible or plausible light source in the stated location. Keep its direction and color consistent; use fill only as needed for readable faces and action.';
 if(/cozy|heartwarming|cute|tender/i.test(tones))lighting+=' Favor soft transitions and gentle contrast without changing the setting or time of day.';
 else if(/dark|suspense|serious/i.test(tones)||profile==='suspense')lighting+=' Shape controlled contrast and purposeful negative space, while keeping essential story information legible.';
 if(/luxury/i.test(tones))lighting+=' Control reflections and highlights so important materials read cleanly rather than appearing uniformly glossy.';
 let performance='Use playable actions and clear eyelines. Show motivation through posture, breath, weight shifts, and a specific reaction rather than generic posing.';
 if(/deadpan|funny/i.test(tones))performance+=' Underplay the reaction and hold the beat long enough for the visual joke to land.';
 if(/chaotic|urgency/i.test(tones))performance+=' Accelerate purposeful gestures and cuts, but retain one readable action at a time.';
 if(/emotional|quiet|bittersweet/i.test(tones))performance+=' Favor restrained micro-expressions and breathing space; avoid exaggerated crying or explanatory dialogue.';
 if(/sassy|mischief/i.test(tones))performance+=' Use confident posture, a purposeful glance, and a short response beat.';
 if(/wonder/i.test(tones))performance+=' Let a brief stillness precede the reveal, then show the character processing its scale.';
 if(/motivational|triumphant/i.test(tones))performance+=' Build decisive movement into a held moment of earned release.';
 if(stopMotion)performance+=' Respect pose-to-pose construction, joint limits, and tactile material behavior; do not add fluid live-action motion by default.';
 const medium=`Primary look: ${primary}. ${hybrid?'Integrate stylized CG characters into the real-world environment with matched lens perspective, scale, eyelines, light direction, occlusion, and contact shadows.':drawn?'Keep linework, graphic shadow shapes, texture, and model-sheet proportions stable; express depth in the chosen illustrated medium.':'Keep one consistent rendering treatment, material response, and character design across all three scenes.'}`;
 const notes=['Explicit story, character, setting, camera, duration, and style instructions override these automatic starting directions. Preserve supplied identities and custom wording. Infer unspecified character details once when needed for a complete concept, then lock them across the sequence.'];
 if(details.era?.trim())notes.push(eraDirection(details.era));
 if(genres.length>1)notes.push(`Primary genre: ${genre}. Blend ${genres.slice(1).join('; ')} into the same story as secondary influences without replacing its main structure. Follow more specific written direction when supplied.`);
 if(styles.length>1)notes.push(`Use ${primary} as the base. Treat ${styles.slice(1).join('; ')} as compatible accents only. If a requested accent changes the rendering medium, retain the base rather than switching styles between scenes.`);
 if(staticCamera)notes.push('The user requested a still/locked camera: create progression through blocking, shot scale, focus, and editing, not camera travel.');
 if(runtimeText&&(requested===null||requested<0.3||requested>86400))notes.push(`Runtime note: The requested timing “${runtimeText}” could not be applied automatically. The displayed timings are provisional format defaults. Preserve the written request and revise them before production.`);
 const profileShots:Record<string,string[]>={
 comedy:['Readable medium-wide setup that shows the relationship between characters and the cause of the joke.','Action/reaction two-shot or matched coverage; reveal the escalation without hiding the physical gag.','Held reaction close-up or wider visual payoff, chosen according to where the punchline is visible.'],
 dramedy:['A readable medium-wide setup with an everyday detail that carries humor.','Move to emotionally motivated medium or closer coverage as the humorous situation reveals a real stake.','A shared two-shot or held reaction that pays off both the joke and the feeling.'],
 emotional:['Grounded medium or two-shot establishing the relationship and a meaningful action.','Closer coverage at the emotional turning point; prioritize eyes, hands, and the action causing the change.','A held close-up or shared two-shot that gives the emotional resolution room to register.'],
 suspense:['An establishing medium-wide that makes geography clear while leaving one deliberate information gap.','A closer clue, eyeline, or reaction shot; control what the audience can infer without misleading spatial continuity.','A motivated reveal and reaction in the same readable space; clarify why the earlier clue matters.'],
 adventure:['A wider establishing composition showing the character, destination, scale, and immediate obstacle.','Purposeful action coverage retaining travel direction and landmarks; stage one clear challenge or discovery.','A readable wide payoff with character response, showing the consequence of the action or discovery.'],
 educational:['A clear view of the subject and the problem or result the viewer will understand.','Closer process coverage: one step or detail at a time with unobstructed hands, tools, or diagrams.','A clean result composition and concise visual recap; make the outcome verifiable in-frame.'],
 magical:['Ground the ordinary world in a calm medium-wide and believable everyday behavior.','Give the extraordinary element one deliberate reveal while maintaining realistic reactions and world rules.','Return to a coherent wider or shared composition showing how the extraordinary event changed the ordinary moment.'],
 balanced:['A medium-wide setup establishing character, location, and immediate situation.','A medium action/reaction composition that shows a clear cause-and-effect turning point.','A closer payoff or resolved wider composition, selected for the information the ending must communicate.'],
 };
 const shots=profileShots[profile];
 const scenes=shots.map((shot,i):SceneDirection=>({scene:i+1,seconds:timings[i],storyCue:(i===0?details.storyGoal||details.characterGoals:i===1?details.obstacle:details.endingChange)?.trim(),shot,
  camera:staticCamera?'Locked camera. Use motivated cuts or in-frame action instead of tracking, orbiting, or handheld movement.':i===0?'Begin with stable framing and a natural-to-wide perspective that establishes scale; move only if it reveals necessary geography.':i===1?(profile==='adventure'?'Use one motivated follow or tracking move only when needed to keep the action readable; avoid spinning or losing landmarks.':'Use a restrained push-in or a motivated cut only when it reveals a clue, emotion, or change in power. Hold still when that serves the beat better.'):'Let the payoff settle. Favor a stable finish or one small reveal; avoid an unmotivated orbit or abrupt lens change.',
  blocking:i===0?'Establish relative heights, positions, prop ownership, and eyelines. Leave clear space for the central action.':i===1?'Stage the change in action so its cause is visible. Preserve screen direction, character scale, hand/prop continuity, and matched eyelines.':'Resolve the action with readable body language and an intentional final pose; carry through wardrobe, props, and spatial positions.',
  rhythm:`Suggested ${timings[i]} seconds. ${i===0?'Make the hook or situation legible immediately.':i===1?'Give the turning action room to register before the reaction.':'Hold the payoff long enough to understand it, then finish cleanly.'} ${/chaotic|urgency/i.test(tones)?'Keep transitions brisk without obscuring the action.':/cozy|emotional|quiet|bittersweet/i.test(tones)?'Allow a measured reaction beat; avoid unnecessary cuts.':''}`.trim(),
  transition:i===0?'Cut on a motivated look, action, or sound into the complication.':i===1?'Bridge the turning point into the final reveal or resolution with a clear visual or sound relationship.':format==='Trailer / Teaser'?'End on an earned teaser payoff or reveal; leave the central question open without adding an unrelated subplot.':'End cleanly on the resolved beat; include the supplied CTA only if it belongs to this format.',
 }));
 return {profile,format,duration,framing,lighting,performance,medium,notes,scenes,continuity:['Lock character identity, age, facial/body traits, skin/fur/peel colors and markings, hairstyle, wardrobe/accessories, and relative scale.','Track screen direction, eyelines, positions, each recurring prop’s state, and which hand or character holds it.','Keep the same architecture, environment details, location geography, time of day, light-source direction, color temperature, palette, and rendering treatment.','Use motivated changes only; describe any story-driven change explicitly before carrying it into the next scene.']};
}
export function formatSceneDirection(scene:SceneDirection){return [scene.storyCue?`Story cue: ${scene.storyCue}`:null,`Shot & perspective: ${scene.shot}`,`Camera: ${scene.camera}`,`Blocking: ${scene.blocking}`,`Pacing: ${scene.rhythm}`,`Transition: ${scene.transition}`].filter(Boolean).join('\n');}
export function formatDirectorPlan(plan:DirectorPlan){return [`AUTOMATIC FILM DIRECTION (CREATIVE DEFAULTS)`,`Format & timing: ${plan.format}; ${plan.duration} seconds total across three scenes.`,plan.framing,plan.medium,`Lighting: ${plan.lighting}`,`Performance: ${plan.performance}`,...plan.notes, ...plan.scenes.map(s=>`SCENE ${s.scene}\n${formatSceneDirection(s)}`)].join('\n');}
