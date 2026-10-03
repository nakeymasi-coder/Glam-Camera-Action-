import assert from 'node:assert/strict';
import {
  COORDINATED_STARTERS, STORY_STARTERS, normalizeStudioState, createProduction,
  serializeProductionSnapshot, parseProductionSnapshot, createLocalStarterRotation,
} from '../src/utils/studioAdapter.ts';
import { QUICK_STORY_SEEDS } from '../src/data/quickSeeds.ts';
import { normalizeCharacters, characterSceneContract } from '../src/utils/characterContinuity.ts';
import { createStoryTemplate, parseStoryTemplate, applyStoryTemplate } from '../src/utils/storyTemplates.ts';

globalThis.fetch = async () => { throw Error('UNEXPECTED NETWORK CALL'); };
let passed = 0;
const failures: {name: string; error: string}[] = [];
function test(name: string, action: () => void) { try { action(); passed++; console.log('PASS', name); } catch(error) { failures.push({name,error:String(error)}); console.log('FAIL',name,String(error)); } }
function freeze<T>(value:T):T { if(value && typeof value==='object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }
function six(production:any) {
  assert.equal(production.canvases.length,6);
  assert.deepEqual(production.canvases.map((c:any)=>[c.id,c.canvasNumber,c.sceneIndex,c.canvasType]),[[1,1,1,'image'],[2,2,1,'script'],[3,3,2,'image'],[4,4,2,'script'],[5,5,3,'image'],[6,6,3,'script']]);
  assert.equal(production.directorPlan.scenes.length,3);
  assert.equal(production.directorPlan.scenes.reduce((n:number,s:any)=>n+s.seconds,0),production.directorPlan.duration);
  assert.ok(production.prompt.length>100);
  production.canvases.forEach((c:any)=>assert.ok(c.content.length>100));
}

test('All 40 coordinated starters generate deterministic, ordered six-canvas productions without source mutation',()=>{
  assert.equal(STORY_STARTERS.length,40); assert.equal(COORDINATED_STARTERS.length,40);
  assert.equal(new Set(COORDINATED_STARTERS.map(s=>s.id)).size,40);
  for(const starter of COORDINATED_STARTERS) {
    const source=freeze(structuredClone(starter.state));
    const production=createProduction(source); six(production);
    assert.deepEqual(production,createProduction(source));
    assert.deepEqual(production.snapshot.state,source);
    assert.ok(production.prompt.includes(source.storyIdea));
    production.canvases.forEach(c=>assert.ok(c.content.includes(source.storyIdea)));
  }
});
test('All 23 idea-only seeds retain chosen presets and literal ideas across ordered outputs',()=>{
  assert.equal(QUICK_STORY_SEEDS.length,23); assert.equal(new Set(QUICK_STORY_SEEDS.map(s=>s.id)).size,23);
  for(const seed of QUICK_STORY_SEEDS) {
    const state=freeze(normalizeStudioState({storyIdea:seed.idea,genres:['Custom'],customGenre:'CUSTOM_GENRE_SENTINEL',visualStyles:['Custom'],customStyle:'CUSTOM_STYLE_SENTINEL'}));
    const result=createProduction(state); six(result);
    assert.deepEqual(result.snapshot.state,state);
    for(const out of [result.prompt,...result.canvases.map(c=>c.content)]) { assert.ok(out.includes(seed.idea)); assert.ok(out.includes('CUSTOM_GENRE_SENTINEL')); assert.ok(out.includes('CUSTOM_STYLE_SENTINEL')); }
  }
});
test('Local starter rotation covers all40 without repeat, survives storage recreation and avoids boundary repeat',()=>{
  const records=new Map<string,string>(); const storage={getItem:(k:string)=>records.get(k)||null,setItem:(k:string,v:string)=>{records.set(k,v);}};
  let rotation=createLocalStarterRotation({storage,seed:421}); const ids:string[]=[];
  for(let i=0;i<40;i++){if(i===17)rotation=createLocalStarterRotation({storage,seed:999}); const pick=rotation.next();ids.push(pick.starter.id);assert.equal(pick.persistence,'browser-local');}
  assert.equal(new Set(ids).size,40); const firstNext=rotation.next(); assert.notEqual(firstNext.starter.id,ids.at(-1));assert.equal(firstNext.cycle,1);assert.equal(firstNext.position,0);
});
test('Unavailable rotation storage falls back to memory without blocking generation',()=>{
  const rotation=createLocalStarterRotation({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},seed:88});
  const a=rotation.next(),b=rotation.next();assert.equal(a.persistence,'memory-only');assert.notEqual(a.starter.id,b.starter.id);six(createProduction(b.state));
});

const cast=normalizeCharacters([{id:'a',name:'Mara',appearance:'silver curls / blue coat',goal:'repair the clock',startingEmotion:'START_UNCERTAIN',endingEmotion:'ARC_CONFIDENT',relationships:'friend of Teo',continuityNotes:'red toolbox stays with Mara',scenes:[{scene:1,linked:true,action:'ACTION_ONE',emotion:'EMOTION_ONE'},{scene:2,linked:false,action:'UNLINKED_ACTION',emotion:'UNLINKED_EMOTION'},{scene:3,linked:true,action:'ACTION_THREE',emotion:'EMOTION_THREE'}]}]);
const brief=normalizeStudioState({characters:cast,characterTypes:['Realistic Humans'],genres:['Custom'],customGenre:'cozy mystery',visualStyles:['Cinematic'],videoFormats:['Short Film'],energyTones:['Hopeful'],storyIdea:'LITERAL_IDEA\n  preserved spacing',optionalDetails:{settingLocation:'Clock shop',storyGoal:'Repair timepiece',obstacle:'Missing spring',endingChange:'Clock runs',cameraDirection:'CAMERA_SENTINEL',atmosphereDetails:'ATMOSPHERE_SENTINEL',continuityNotes:'PROP_SENTINEL',scene1Beat:'BEAT_ONE_TOKEN',scene2Beat:'BEAT_TWO_TOKEN',scene3Beat:'BEAT_THREE_TOKEN',targetDuration:'90 seconds',dialogueMustHaves:'EXACT_DIALOGUE',exactTextCaptions:'EXACT_CAPTION'}});

test('Version1 current snapshot roundtrips all fields, multiline input, cast and manual override',()=>{
  const json=serializeProductionSnapshot(brief,'MANUAL_OVERRIDE\n  exact');const parsed=parseProductionSnapshot(json);
  assert.deepEqual(parsed.state,brief);assert.equal(parsed.overrideText,'MANUAL_OVERRIDE\n  exact');assert.equal(serializeProductionSnapshot(parsed),json);
  const p=createProduction(parsed);six(p);assert.equal(p.directorPlan.duration,90);
  for(const out of [p.prompt,...p.canvases.map(c=>c.content)])assert.ok(out.includes('MANUAL_OVERRIDE\n  exact'));
});
test('Legacy draft field aliases normalize without changing literal text or manufacturing CTA',()=>{
  const legacy={characterType:'Custom',customCharacter:'Legacy Cast',genre:['Comedy'],visualStyle:['Custom'],customVisualStyle:'Legacy Style',videoFormat:['Custom'],customVideoFormat:'Legacy Format',energyTone:['Custom'],customEnergyTone:'Legacy Tone',storyIdea:'OLD\nBRIEF',optionalDetails:{setting:'OLD PLACE',onScreenText:'OLD CAPTION',duration:'45 seconds',productServiceCTA:'legacy combined note'}};
  const normalized=normalizeStudioState(legacy);assert.deepEqual(normalized.characterTypes,['Custom']);assert.equal(normalized.customStyle,'Legacy Style');assert.equal(normalized.optionalDetails.settingLocation,'OLD PLACE');assert.equal(normalized.optionalDetails.exactTextCaptions,'OLD CAPTION');assert.equal(normalized.optionalDetails.targetDuration,'45 seconds');assert.equal(normalized.optionalDetails.callToAction,'');six(createProduction(legacy));
});
test('Legacy version1 snapshot accepts missing roster/new optional fields',()=>{
  const legacy:any=structuredClone(brief);delete legacy.characters; for(const key of ['cameraDirection','atmosphereDetails','continuityNotes','scene1Beat','scene2Beat','scene3Beat'])delete legacy.optionalDetails[key];
  const result=parseProductionSnapshot(JSON.stringify({version:1,state:legacy,overrideText:''}));assert.deepEqual(result.state.characters,[]);assert.equal(result.state.optionalDetails.scene1Beat,'');six(createProduction(result));
});
test('Snapshot parser rejects unsupported versions, unknown fields, wrong types and malformed roster',()=>{
  const valid:any={version:1,state:brief,overrideText:''};
  const variants=[{...valid,version:2},{...valid,extra:true},{...valid,overrideText:2},{...valid,state:{...brief,unknown:'x'}},{...valid,state:{...brief,genres:'Comedy'}},{...valid,state:{...brief,optionalDetails:{...brief.optionalDetails,unknown:'x'}}},{...valid,state:{...brief,characters:[cast[0],cast[0]]}},{...valid,state:{...brief,characters:[{...cast[0],scenes:[]}]}},{...valid,state:{...brief,characters:[{...cast[0],scenes:cast[0].scenes.map((s,i)=>i?{...s,scene:1}:s)}]}}];
  variants.forEach(value=>assert.throws(()=>parseProductionSnapshot(JSON.stringify(value))));assert.throws(()=>parseProductionSnapshot('not json'));
});
test('Explicit scene beats stay in their paired scene; previous beat is reference and future beats do not leak',()=>{
  const p=createProduction(brief);six(p);
  p.canvases.forEach(c=>{
    assert.ok(c.content.includes(['BEAT_ONE_TOKEN','BEAT_TWO_TOKEN','BEAT_THREE_TOKEN'][c.sceneIndex-1]));
    if(c.sceneIndex<2)assert.ok(!c.content.includes('BEAT_TWO_TOKEN'));
    if(c.sceneIndex<3)assert.ok(!c.content.includes('BEAT_THREE_TOKEN'));
    if(c.sceneIndex>1)assert.ok(c.content.includes('Previous beat — reference only, do not replay:'));
  });
  p.directorPlan.scenes.forEach((s,i)=>assert.ok(s.storyCue?.includes(['BEAT_ONE_TOKEN','BEAT_TWO_TOKEN','BEAT_THREE_TOKEN'][i])));
});
test('Character arcs carry last linked emotion and omit unlinked actions/future linked events',()=>{
  const one=characterSceneContract(cast,1),two=characterSceneContract(cast,2),three=characterSceneContract(cast,3);
  assert.ok(one.includes('Incoming emotional state: START_UNCERTAIN'));assert.ok(!one.includes('ACTION_THREE'));assert.ok(!one.includes('EMOTION_THREE'));
  assert.ok(two.includes('not linked to this event'));assert.ok(!two.includes('UNLINKED_ACTION'));assert.ok(!two.includes('UNLINKED_EMOTION'));
  assert.ok(three.includes('Incoming emotional state: EMOTION_ONE'));assert.ok(three.includes('ACTION_THREE'));
  const p=createProduction(brief);p.canvases.forEach(c=>{assert.ok(c.content.includes('Mara'));assert.ok(!c.content.includes('UNLINKED_ACTION'));if(c.sceneIndex<3)assert.ok(!c.content.includes('ACTION_THREE'));});
});
test('Generation snapshots own their data and do not follow subsequent unsaved draft edits',()=>{
  const current=structuredClone(brief);const p=createProduction(current);const old=structuredClone(p);
  current.storyIdea='UNSAVED_NEW_IDEA';current.optionalDetails.scene3Beat='UNSAVED_FUTURE_BEAT';current.characters![0].scenes[0].emotion='UNSAVED_EMOTION';current.characters![0].name='UNSAVED_CAST';
  assert.deepEqual(p,old);assert.equal(p.snapshot.state.storyIdea,brief.storyIdea);assert.ok(!p.canvases[0].content.includes('UNSAVED'));
});

test('Structure templates scope fields and roundtrip without cast, setting or specific story idea',()=>{
  const template=createStoryTemplate('  Structure  ','structure',freeze(structuredClone(brief)));assert.equal(template.title,'Structure');assert.equal(template.state.storyIdea,'');assert.equal(template.state.optionalDetails.settingLocation,'');assert.deepEqual(template.state.characters,[]);assert.equal(template.state.optionalDetails.scene3Beat,'BEAT_THREE_TOKEN');assert.equal(template.state.optionalDetails.targetDuration,'90 seconds');assert.deepEqual(parseStoryTemplate(JSON.stringify(template)),template);
});
test('Archetype templates retain identity/arc but clear scene participation/action/emotion',()=>{
  const template=createStoryTemplate('Cast','characters',brief);assert.equal(template.state.characters![0].name,'Mara');assert.equal(template.state.characters![0].endingEmotion,'ARC_CONFIDENT');template.state.characters![0].scenes.forEach(s=>assert.deepEqual([s.linked,s.action,s.emotion],[false,'','']));assert.equal(template.state.storyIdea,'');assert.deepEqual(parseStoryTemplate(JSON.stringify(template)),template);assert.throws(()=>createStoryTemplate('Empty','characters',normalizeStudioState()));
});
test('Complete-brief template roundtrips all draft fields without mutation',()=>{
  const source=freeze(structuredClone(brief));const template=createStoryTemplate('Complete','brief',source);assert.deepEqual(template.state,source);assert.deepEqual(parseStoryTemplate(JSON.stringify(template)),template);
});
test('Fresh application replaces only returned draft, assigns independent cast ids, preserves source objects',()=>{
  const current=freeze(normalizeStudioState({storyIdea:'OLD_CURRENT',optionalDetails:{targetDuration:'30 seconds'}}));const template=freeze(createStoryTemplate('Full','brief',brief));const before=JSON.stringify(template);const result=applyStoryTemplate(current,template,'fresh');assert.equal(result.storyIdea,brief.storyIdea);assert.notEqual(result.characters![0].id,template.state.characters![0].id);assert.equal(JSON.stringify(template),before);assert.equal(current.storyIdea,'OLD_CURRENT');assert.equal(result.optionalDetails.targetDuration,'90 seconds');
});
test('Merge preserves current notes and single-choice family/format/duration while adding independent template cast',()=>{
  const current=freeze(normalizeStudioState({characters:cast,characterTypes:['Anthropomorphic Objects'],videoFormats:['Music Video'],storyIdea:'CURRENT_IDEA',optionalDetails:{scene1Beat:'CURRENT_BEAT',targetDuration:'30 seconds'}}));const template=freeze(createStoryTemplate('Incoming','brief',brief));const before=JSON.stringify(current);const result=applyStoryTemplate(current,template,'merge');assert.deepEqual(result.characterTypes,current.characterTypes);assert.deepEqual(result.videoFormats,current.videoFormats);assert.equal(result.optionalDetails.targetDuration,'30 seconds');assert.ok(result.storyIdea.startsWith('CURRENT_IDEA'));assert.ok(result.storyIdea.includes(brief.storyIdea));assert.equal(result.optionalDetails.scene1Beat,'CURRENT_BEAT\n\nBEAT_ONE_TOKEN');assert.equal(result.characters!.length,2);assert.equal(new Set(result.characters!.map(c=>c.id)).size,2);assert.equal(JSON.stringify(current),before);
});
test('Template parser rejects malformed JSON, unsupported versions/types, unknown fields, invalid roster',()=>{
  const valid:any=createStoryTemplate('Valid','brief',brief);const cases=[{...valid,version:2},{...valid,kind:'other'},{...valid,title:''},{...valid,extra:1},{...valid,state:{...brief,characters:[{...cast[0],scenes:[]}]}}];cases.forEach(v=>assert.throws(()=>parseStoryTemplate(JSON.stringify(v))));assert.throws(()=>parseStoryTemplate('null'));assert.throws(()=>parseStoryTemplate('bad'));
});
test('Template merge/fresh does not modify an already generated production snapshot',()=>{
  const current=structuredClone(brief), production=createProduction(current,'SAVED_OVERRIDE'), saved=JSON.stringify(production);const template=createStoryTemplate('Structure','structure',normalizeStudioState({optionalDetails:{scene1Beat:'NEW_TEMPLATE_BEAT',scene3Beat:'NEW_FUTURE_BEAT'}}));
  const merged=applyStoryTemplate(current,template,'merge');const fresh=applyStoryTemplate(current,template,'fresh');assert.equal(JSON.stringify(production),saved);assert.ok(merged.optionalDetails.scene1Beat!.includes('NEW_TEMPLATE_BEAT'));assert.equal(fresh.optionalDetails.scene3Beat,'NEW_FUTURE_BEAT');assert.ok(!production.canvases[0].content.includes('NEW_FUTURE_BEAT'));
});

console.log(JSON.stringify({passed,failed:failures.length,failures},null,2));
process.exitCode=failures.length?1:0;
