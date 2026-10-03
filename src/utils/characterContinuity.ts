import type { StoryCharacter, OptionalStoryDetails } from '../types';

export const SCENES = [1, 2, 3] as const;
export const CHARACTER_FIELDS = [
  ['name', 'Name / identity'], ['appearance', 'Appearance & wardrobe'],
  ['goal', 'Goal / motivation'], ['startingEmotion', 'Starting emotional state'],
  ['endingEmotion', 'Intended arc / final emotional state'],
  ['relationships', 'Relationships'], ['continuityNotes', 'Continuity notes / allowed changes'],
] as const;
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' ? value : '';

export function normalizeCharacters(value: unknown): StoryCharacter[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  return value.filter(item => item && typeof item === 'object' && !Array.isArray(item)).map((item, index) => {
    const source = record(item);
    let id = text(source.id) || `character-${index + 1}`;
    while (used.has(id)) id += '-copy';
    used.add(id);
    const links = Array.isArray(source.scenes) ? source.scenes : [];
    return { id, ...Object.fromEntries(CHARACTER_FIELDS.map(([key]) => [key, text(source[key])])),
      scenes: SCENES.map(scene => {
        const link = record(links.find(item => record(item).scene === scene));
        return { scene, linked: link.linked === true, action: text(link.action), emotion: text(link.emotion) };
      }),
    } as StoryCharacter;
  });
}

export function validateCharacters(value: unknown) {
  if (value === undefined) return; // Legacy snapshots have no roster.
  if (!Array.isArray(value)) throw Error('characters must be an array.');
  const ids = new Set<string>();
  for (const item of value) {
    const c = record(item);
    if (Object.keys(c).some(key => !['id', 'scenes', ...CHARACTER_FIELDS.map(([field]) => field)].includes(key))) throw Error('Unknown character field.');
    if (typeof c.id !== 'string' || !c.id || ids.has(c.id)) throw Error('Character ids must be non-empty and unique.');
    ids.add(c.id);
    if (CHARACTER_FIELDS.some(([field]) => typeof c[field] !== 'string')) throw Error('Character details must be strings.');
    if (!Array.isArray(c.scenes) || c.scenes.length !== 3) throw Error('Each character needs three scene links.');
    const scenes = new Set<number>();
    for (const item of c.scenes) {
      const link = record(item);
      if (Object.keys(link).some(key => !['scene', 'linked', 'action', 'emotion'].includes(key)) || !SCENES.includes(link.scene as 1 | 2 | 3) || scenes.has(Number(link.scene)) || typeof link.linked !== 'boolean' || typeof link.action !== 'string' || typeof link.emotion !== 'string') throw Error('Invalid character scene link.');
      scenes.add(Number(link.scene));
    }
  }
}

export function sceneBeat(details: OptionalStoryDetails, scene: number): string {
  return [details.scene1Beat, details.scene2Beat, details.scene3Beat][scene - 1] || '';
}
export function characterIdentityContract(characters: StoryCharacter[]): string {
  if (!characters.length) return '';
  return ['CHARACTER ROSTER — STABLE IDENTITY & ARC INTENT',
    'Use these as the character source of truth where legacy cast notes differ. This is reference context, not an instruction to include every character in every scene. Preserve identity; reach emotional changes through the linked events, not unexplained resets. Final emotional states are targets, not the starting state of every scene.',
    ...characters.map((c, index) => [`Character ${index + 1}: ${c.name || 'Unnamed character'}`, ...CHARACTER_FIELDS.filter(([key]) => key !== 'name' && c[key].trim()).map(([key, label]) => `${label}:\n${c[key]}`)].join('\n')),
  ].join('\n\n');
}
export function characterSceneContract(characters: StoryCharacter[], scene: number): string {
  if (!characters.length) return '';
  return [`SCENE ${scene} — LINKED CHARACTER ARCS`, ...characters.map(c => {
    const link = c.scenes.find(l => l.scene === scene);
    if (!link?.linked) return `${c.name || 'Unnamed character'}: not linked to this event. Do not invent participation in this scene.`;
    const previous = c.scenes.filter(l => l.linked && l.scene < scene && l.emotion.trim()).at(-1);
    return [c.name || 'Unnamed character', `Incoming emotional state: ${previous?.emotion || c.startingEmotion || 'Unspecified; preserve previously established state.'}`,
      link.action.trim() ? `Action / contribution to this event:\n${link.action}` : 'Contribution unspecified; follow the scene beat without inventing a new goal.',
      link.emotion.trim() ? `Emotional state after this event:\n${link.emotion}` : 'No explicit emotional change; carry forward the incoming state.',
      'Show the event causing any emotional change. Retain established relationships, appearance and continuity anchors.',
    ].join('\n');
  })].join('\n\n');
}
