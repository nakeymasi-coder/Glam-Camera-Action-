import { CanvasItem, OptionalStoryDetails, PresetState } from '../types';
import { CHARACTER_CREATIVE_BEHAVIORS } from '../data/presetsData';

/**
 * Cleanly format multi-select values or custom inputs, filtering out 'None'.
 */
export function formatSelection(selections: string[], customValue?: string): string {
  const filtered = selections.filter((s) => s && s.toLowerCase() !== 'none');
  const items: string[] = [];

  for (const item of filtered) {
    if (item.toLowerCase() === 'custom' && customValue && customValue.trim()) {
      items.push(`Custom: ${customValue.trim()}`);
    } else if (item.toLowerCase() !== 'custom') {
      items.push(item);
    }
  }

  if (items.length === 0 && customValue && customValue.trim()) {
    return customValue.trim();
  }

  return items.join(' + ');
}

/**
 * Format optional details into a clean cohesive line, omitting blank properties.
 */
export function formatOptionalDetails(details: OptionalStoryDetails, includeDuration = true): string {
  const parts: string[] = [];
  if (details.characterNames?.trim()) {
    parts.push(`Characters: ${details.characterNames.trim()}`);
  }
  if (details.settingLocation?.trim()) {
    parts.push(`Setting: ${details.settingLocation.trim()}`);
  }
  if (details.dialogueMustHaves?.trim()) {
    parts.push(`Key Dialogue: ${details.dialogueMustHaves.trim()}`);
  }
  if (details.exactTextCaptions?.trim()) {
    parts.push(`On-screen Text: ${details.exactTextCaptions.trim()}`);
  }
  if (details.targetAudience?.trim()) {
    parts.push(`Audience: ${details.targetAudience.trim()}`);
  }
  if (includeDuration && details.targetDuration?.trim()) {
    parts.push(`Target Duration: ${details.targetDuration.trim()}`);
  }
  if (details.productServiceCTA?.trim()) {
    parts.push(`CTA/Goal: ${details.productServiceCTA.trim()}`);
  }
  const extra=details as unknown as Record<string,string>;
  for(const [field,label] of [['era','Era'],['storyGoal','Story goal'],['obstacle','Obstacle'],['endingChange','Ending/change'],['characterGoals','Character motivation'],['productService','Product/service'],['callToAction','Call to action']])if(extra[field]?.trim())parts.push(label+': '+extra[field].trim());
  return parts.join(' | ');
}

/**
 * Helper to calculate per-scene duration recommendations from total target duration.
 */
export function calculateSceneDurations(targetDuration?: string): {
  scene1: string;
  scene2: string;
  scene3: string;
} {
  if (!targetDuration || !targetDuration.trim()) {
    return {
      scene1: '5-8s',
      scene2: '8-12s',
      scene3: '6-10s',
    };
  }

  const trimmed = targetDuration.trim();
  const numMatch = trimmed.match(/(\d+)/);

  if (numMatch) {
    const totalSec = parseInt(numMatch[1], 10);
    if (totalSec > 0) {
      const s1 = Math.max(2, Math.round(totalSec * 0.28));
      const s2 = Math.max(3, Math.round(totalSec * 0.44));
      const s3 = Math.max(2, totalSec - s1 - s2);
      return {
        scene1: `~${s1}s (Target total: ${trimmed})`,
        scene2: `~${s2}s (Target total: ${trimmed})`,
        scene3: `~${s3}s (Target total: ${trimmed})`,
      };
    }
  }

  return {
    scene1: `Hook beat (Target: ${trimmed})`,
    scene2: `Escalation beat (Target: ${trimmed})`,
    scene3: `Payoff beat (Target: ${trimmed})`,
  };
}

/**
 * Build the exact Master Prompt following Page 8 specifications.
 */
export function buildMasterPrompt(state: PresetState): string {
  const charStr = formatSelection(state.characterTypes, state.customCharacter);
  const genreStr = formatSelection(state.genres, state.customGenre);
  const styleStr = formatSelection(state.visualStyles, state.customStyle);
  const formatStr = formatSelection(state.videoFormats, state.customFormat);
  const toneStr = formatSelection(state.energyTones, state.customTone);
  const ideaStr = state.storyIdea?.trim() || '';
  const targetDurationStr = state.optionalDetails.targetDuration?.trim();
  const optStr = formatOptionalDetails(state.optionalDetails, false);

  // Build the Story Direction lines, removing unused lines
  const directionLines: string[] = [];
  if (charStr) directionLines.push(`Character Type: ${charStr}`);
  if (genreStr) directionLines.push(`Genre: ${genreStr}`);
  if (styleStr) directionLines.push(`Visual Style: ${styleStr}`);
  if (formatStr) directionLines.push(`Video Format: ${formatStr}`);
  if (toneStr) directionLines.push(`Energy / Tone: ${toneStr}`);
  if (targetDurationStr) directionLines.push(`Target Duration: ${targetDurationStr}`);
  if (ideaStr) directionLines.push(`Story Idea: ${ideaStr}`);
  if (optStr) directionLines.push(`Optional Details: ${optStr}`);

  // Base prompt template from Page 8
  const header = 'Create a premium, cohesive three-scene visual story designed to become a short-form video.';
  const storyDirectionSection = directionLines.length > 0
    ? `STORY DIRECTION\n${directionLines.join('\n')}`
    : 'STORY DIRECTION\nStory Idea: A compelling three-scene short narrative with distinct visual continuity and dialogue.';

  const productionRules = `PRODUCTION RULES
- Create exactly 3 connected scenes.
- Build one internal Story Bible before creating the scenes. Lock character identity, defining physical traits, wardrobe/accessories, scale, recurring props, location details, palette, lighting logic, and visual style.
- Preserve continuity across all three images unless the story explicitly requires a visible change.
- Scene 1 must establish the hook or situation. Scene 2 must escalate, complicate, reveal, or deepen it. Scene 3 must deliver a payoff, resolution, twist, punchline, reveal, emotional close, or CTA appropriate to the selected format.
- Adapt anatomy, acting, dialogue, environment, and visual language appropriately for the selected character type.
- Make each scene visually strong enough to stand alone while still reading as the same production.${targetDurationStr ? `\n- Budget dialogue and action to fit a total target duration of ${targetDurationStr} across the 3 scenes.` : ''}`;

  const outputOrder = `OUTPUT ORDER - DO NOT CHANGE
Canvas 1: Scene 1 Image
Canvas 2: Scene 1 Script
Canvas 3: Scene 2 Image
Canvas 4: Scene 2 Script
Canvas 5: Scene 3 Image
Canvas 6: Scene 3 Script`;

  const imageRules = `IMAGE CANVAS RULES
Each image canvas must contain one finished image only. No collage, grid, storyboard sheet, split-screen, contact sheet, multiple panels, or extra alternate versions. Use strong cinematic composition, intentional camera framing, expressive character acting, clear environment, depth, lighting, texture, and commercially polished visual quality.`;

  const scriptRules = `SCRIPT CANVAS RULES
For each scene, provide: scene objective, estimated duration${targetDurationStr ? ` (budgeted for ${targetDurationStr} total story length)` : ''}, action/performance direction, dialogue and/or voiceover, sound/music cues when useful, camera/edit notes, and the transition to the next scene. Keep scripts concise enough for video production and natural enough to perform. Scene 3 should end cleanly.`;

  const continuityCheck = `CONTINUITY CHECK
Before finalizing each new scene, compare it against all prior scenes and preserve all locked details. Only change elements that the story explicitly changes.`;

  return [header, storyDirectionSection, productionRules, outputOrder, imageRules, scriptRules, continuityCheck].join(
    '\n\n'
  );
}

/**
 * Breakdown the six canvases based on current presets to help the user visualize the production packet.
 */
export function generateSixCanvases(state: PresetState): CanvasItem[] {
  const char = formatSelection(state.characterTypes, state.customCharacter) || 'Subject';
  const genre = formatSelection(state.genres, state.customGenre) || 'Drama';
  const style = formatSelection(state.visualStyles, state.customStyle) || 'Cinematic Realism';
  const format = formatSelection(state.videoFormats, state.customFormat) || 'Short Skit';
  const tone = formatSelection(state.energyTones, state.customTone) || 'Engaging';
  const idea = state.storyIdea || 'A cohesive three-scene production with unified character, environment, and story arc.';

  const charGuidance =
    CHARACTER_CREATIVE_BEHAVIORS[state.characterTypes.find((t) => t !== 'None') || ''] ||
    'Maintain strict identity, silhouette, palette, and wardrobe continuity.';

  const durations = calculateSceneDurations(state.optionalDetails.targetDuration);

  return [
    {
      id: 1,
      canvasNumber: 1,
      canvasType: 'image',
      title: 'Canvas 1: Scene 1 Image',
      sceneIndex: 1,
      purpose: 'Opening visual / hook. Establish character, location, conflict or curiosity within first seconds.',
      content: `[Visual Prompt for Scene 1]
Style: ${style}
Subject: Initial establishing shot of ${char}.
Continuity Rules: ${charGuidance}
Setting: Key environment setup based on "${idea}".
Composition: High-impact cinematic framing, clear depth of field, directional lighting establishing time and mood (${tone}).
Instruction: ONE finished image only. No collage, contact sheet, or split panels.`,
    },
    {
      id: 2,
      canvasNumber: 2,
      canvasType: 'script',
      title: 'Canvas 2: Scene 1 Script',
      sceneIndex: 1,
      purpose: 'Dialogue, action, voiceover, sound cues, camera notes, and transition to Scene 2.',
      content: `[Script Canvas 1 - Hook]
Format: ${format} | Genre: ${genre} | Estimated Duration: ${durations.scene1}
Scene Objective: Grab viewer curiosity immediately with the opening situation.
Action / Performance: Character begins primary action. Expressions align with ${tone} tone.
Dialogue / Voiceover: Crisp opening line establishing the hook and core stakes.
Audio / SFX: Ambient room tone, subtle opening sting or music bed.
Camera Notes: Smooth push-in or intentional lock-off emphasizing character reaction.
Transition: Cut or sharp beat leading directly into the complication of Scene 2.`,
    },
    {
      id: 3,
      canvasNumber: 3,
      canvasType: 'image',
      title: 'Canvas 3: Scene 2 Image',
      sceneIndex: 2,
      purpose: 'Escalation or development. Clearly connected to Scene 1 with visual progression.',
      content: `[Visual Prompt for Scene 2]
Style: ${style} (Strict continuity match with Canvas 1)
Subject: ${char} in heightened reaction or mid-conflict.
What Changed: Character pose, facial tension, and prop interaction escalated from Scene 1 while wardrobe, lighting temperature, and room architecture remain identical.
Composition: Tighter medium shot or dynamic angle highlighting rising stakes.
Instruction: ONE finished image only. Maintain exact character model identity.`,
    },
    {
      id: 4,
      canvasNumber: 4,
      canvasType: 'script',
      title: 'Canvas 4: Scene 2 Script',
      sceneIndex: 2,
      purpose: 'Continuation of dialogue/action, rising stakes, transition to Scene 3.',
      content: `[Script Canvas 2 - Escalation]
Format: ${format} | Estimated Duration: ${durations.scene2}
Scene Objective: Escalate the situation introduced in Scene 1; create tension or humorous friction.
Action / Performance: Reactive body language, fast-paced character exchange.
Dialogue / Voiceover: Rapid dialogue or revelation showing why the problem is urgent or funny.
Audio / SFX: Music tempo increases, Foley sound accentuating the prop or movement.
Camera Notes: Subtle camera shake or angled framing matching heightened emotion.
Transition: Rapid visual/audio beat into the final payoff moment.`,
    },
    {
      id: 5,
      canvasNumber: 5,
      canvasType: 'image',
      title: 'Canvas 5: Scene 3 Image',
      sceneIndex: 3,
      purpose: 'Payoff, twist, resolution, reveal, punchline, CTA, or emotional closing.',
      content: `[Visual Prompt for Scene 3]
Style: ${style} (Unified production look)
Subject: ${char} at the climactic moment or aftermath of the story.
What Changed: The resolved state or punchline reveal is front-and-center. Character expression reflects resolution (${tone}).
Composition: Intentional final hero frame, memorable visual silhouette, clean negative space for potential on-screen text or CTA.
Instruction: ONE finished image only. Professional commercial grade.`,
    },
    {
      id: 6,
      canvasNumber: 6,
      canvasType: 'script',
      title: 'Canvas 6: Scene 3 Script',
      sceneIndex: 3,
      purpose: 'Final dialogue/action, ending beat, optional CTA, and clean ending for editing.',
      content: `[Script Canvas 3 - Payoff]
Format: ${format} | Estimated Duration: ${durations.scene3}
Scene Objective: Deliver the satisfying resolution, twist, or closing call to action.
Action / Performance: Final decisive gesture or memorable closing reaction.
Dialogue / Voiceover: Punchline, final moral, or smooth call to action.
Audio / SFX: Resolving musical chord, signature sound logo, or clean audio tail.
Camera Notes: Pull-out shot or decisive static hold.
Transition: Clean stop suitable for seamless social looping or final title card.`,
    },
  ];
}
