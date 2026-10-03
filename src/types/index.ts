export type CharacterType =
  | 'None'
  | 'Real People'
  | 'Chibi Characters'
  | 'Animals'
  | 'Fruit / Food Characters'
  | 'Mixed Cast'
  | 'Custom';

export type StoryGenre =
  | 'None'
  | 'Comedy'
  | 'Drama'
  | 'Dramedy'
  | 'Romance'
  | 'Mystery'
  | 'Suspense'
  | 'Action'
  | 'Inspirational'
  | 'Educational'
  | 'Slice of Life'
  | 'Custom';

export type VisualStyle =
  | 'None'
  | 'Cinematic Realism'
  | 'Premium 3D'
  | 'Animated Film'
  | 'Chibi 3D'
  | 'Editorial / Commercial'
  | 'Clay / Stop-Motion'
  | 'Illustrated'
  | 'Custom';

export type VideoFormat =
  | 'None'
  | 'Short Skit'
  | 'Storytime'
  | 'Mini Episode'
  | 'Commercial / Ad'
  | 'Explainer'
  | 'Social Reel / TikTok'
  | 'Trailer / Teaser'
  | 'Custom';

export type EnergyTone =
  | 'None'
  | 'Funny'
  | 'Sassy'
  | 'Emotional'
  | 'Heartwarming'
  | 'Dark'
  | 'Chaotic'
  | 'Cozy'
  | 'Luxury'
  | 'Cute'
  | 'Serious'
  | 'Motivational'
  | 'Custom';

export interface OptionalStoryDetails {
  characterNames: string;
  settingLocation: string;
  dialogueMustHaves: string;
  exactTextCaptions: string;
  targetAudience: string;
  productServiceCTA: string;
  targetDuration: string;
  era?: string;
  storyGoal?: string;
  obstacle?: string;
  endingChange?: string;
  characterGoals?: string;
  productService?: string;
  callToAction?: string;
  cameraDirection?: string;
  atmosphereDetails?: string;
  continuityNotes?: string;
  scene1Beat?: string;
  scene2Beat?: string;
  scene3Beat?: string;
}

export interface CharacterSceneLink {
  scene: 1 | 2 | 3;
  linked: boolean;
  action: string;
  emotion: string;
}

export interface StoryCharacter {
  id: string;
  name: string;
  appearance: string;
  goal: string;
  startingEmotion: string;
  endingEmotion: string;
  relationships: string;
  continuityNotes: string;
  scenes: CharacterSceneLink[];
}

export interface PresetState {
  characters?: StoryCharacter[];
  characterTypes: string[];
  customCharacter: string;
  genres: string[];
  customGenre: string;
  visualStyles: string[];
  customStyle: string;
  videoFormats: string[];
  customFormat: string;
  energyTones: string[];
  customTone: string;
  storyIdea: string;
  optionalDetails: OptionalStoryDetails;
}

export interface CanvasItem {
  id: number;
  canvasNumber: number;
  canvasType: 'image' | 'script';
  title: string;
  sceneIndex: 1 | 2 | 3;
  purpose: string;
  content: string;
}

export interface SavedPromptItem {
  projectId?: string;
  id: string;
  title: string;
  createdAt: string;
  state: PresetState;
  masterPrompt: string;
  overrideText?: string;
}
