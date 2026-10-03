import { buildDirectorPlan, formatDirectorPlan } from './director-plan';
// Master Prompt Generator Engine for Scene & Script Studio

export interface PresetOption {
  id: string;
  label: string;
  description?: string;
}

export interface PresetState {
  characterType: string[];
  customCharacter: string;
  genre: string[];
  customGenre: string;
  visualStyle: string[];
  customVisualStyle: string;
  videoFormat: string[];
  customVideoFormat: string;
  energyTone: string[];
  customEnergyTone: string;
  storyIdea: string;
  optionalDetails: {
    characterNames: string;
    storyGoal?: string;
    obstacle?: string;
    endingChange?: string;
    characterGoals?: string;
    duration?: string;
    era?: string;
    setting: string;
    dialogueMustHaves: string;
    onScreenText?: string;
    productService?: string;
    targetAudience: string;
    callToAction: string;
  };
}

export const CHARACTER_TYPE_OPTIONS: PresetOption[] = [
  { id: 'none', label: 'None' },
  { id: 'real_people', label: "Real People", description: "Human characters with consistent age, body type, skin tone, wardrobe, personality, and facial identity. This selects who they are; the visual style can make them live action, animated, illustrated, or another treatment." },
  { id: 'chibi_characters', label: "Chibi Characters", description: "Oversized head with a compact body, expressive brows and readable silhouettes, rich fabric detail, glossy eyes, and deliberate animated acting. Preserve requested body fullness." },
  { id: 'animals', label: "Animals", description: "Animals with species-appropriate anatomy, markings, weight, and gait. Tell the story through posture and motivated behavior; add speech or clothing only when requested. Their rendering comes from the visual style." },
  { id: 'fruit_food', label: "Fruit / Food Characters", description: "Preserve the recognizable food form, peel or crumb details, colors, and scale. Add controlled facial features, limbs, accessories, or anthropomorphic acting only when the written story requires them." },
  { id: 'mixed_cast', label: "Mixed Cast", description: "Define an internal continuity sheet for each cast member’s identity, scale, anatomy, and behavior. Match eyelines, light direction, contact shadows, and physical interactions so different character families belong to one coherent production." },
  { id: "character_type_options_5", label: "Anthropomorphic Animal Leads", description: "Species-specific muzzle, ears, paws and fur groom with intentional upright posture, tailored wardrobe, expressive facial rigs and believable body weight." },
  { id: "character_type_options_6", label: "Tiny Fantasy Creatures", description: "Original miniature creatures with distinctive silhouettes, expressive facial rigs, tactile skin and clothing, and consistent scale beside oversized real-world props." },
  { id: "character_type_options_7", label: "Living Everyday Objects", description: "Retain the object\u2019s recognizable construction and surface wear; anchor eyes and limbs consistently and make hinges, handles or flexible surfaces drive the performance." },
  { id: "character_type_options_8", label: "Mythic Creature Companions", description: "Original dragons, griffins or other specified creatures with coherent anatomy, layered scales or feathers, readable emotion and grounded interactions with the lead." },
  { id: "character_type_options_9", label: "Enchanted Forest Guardians", description: "Distinctive organic anatomy with bark, moss or mineral materials; subtle facial movement, strong silhouettes and environmental interaction that serves the story." },
  { id: "character_type_options_10", label: "Glam Fashion Doll Leads", description: "Stylized fashion-doll proportions with deliberate facial sculpting, glossy eyes, detailed hair strands, couture fabric and polished runway body language; preserve requested body type." },
  { id: "character_type_options_11", label: "Plush & Felt Characters", description: "Visible woven fibers, soft seams and compressed stuffing; believable soft-body deformation, gentle tactile gestures and readable embroidered facial expressions." },
  { id: "character_type_options_12", label: "Clay & Ceramic Characters", description: "Handcrafted sculpted silhouettes, fingerprints or glaze as appropriate, consistent material response, and deliberate pose-to-pose acting with physical weight." },
  { id: "character_type_options_13", label: "Crystal & Glass Beings", description: "Coherent translucent anatomy, controlled refraction and caustics, readable internal features and silhouettes; keep transparency consistent across shots." },
  { id: "character_type_options_14", label: "Elemental Beings", description: "Define one elemental anatomy and stable core silhouette; motivate flame, water, air or stone movement around performance without obscuring expressions." },
  { id: "character_type_options_15", label: "Insect-Scale Adventurers", description: "Species-informed limb count and body segments, readable face and tiny gestures; use grass, drops and terrain to establish a consistent miniature scale." },
  { id: "character_type_options_16", label: "Underwater Creature Leads", description: "Species-specific fins, scales and buoyancy; expressive body curves, water resistance, suspended particles and consistent underwater light response." },
  { id: "character_type_options_17", label: "Period Drama Ensemble", description: "Grounded human screen acting, era-specific costume construction and grooming, social-status blocking and precise wardrobe continuity." },
  { id: "character_type_options_18", label: "Stylized 3D Human Leads", description: "Designed human silhouettes and expressive facial rigs with believable cloth, hair and skin shading; appealing animation while preserving requested age and proportions." },
  { id: "character_type_options_19", label: "Live-Action & CG Creature Duo", description: "A real human lead with an original stylized 3D creature: shared eyelines, physical contact, matching lens perspective, believable occlusion and contact shadows." },
  { id: 'robots_machines', label: 'Robots & Machines', description: 'A machine or robot character with a consistent mechanism, joint limits, weight, and recognizable silhouette. Express personality through motion, posture, light, or voice; rendering comes from the selected visual style.' },
  { id: 'aliens_space', label: 'Aliens & Space Beings', description: 'An original extraterrestrial cast with internally consistent anatomy, sensory features, movement, and scale. Preserve the user’s descriptions; choose surface treatment from the visual style.' },
  { id: 'custom', label: 'Custom' },
];

export const CHARACTER_TYPE_HELPERS: Record<string, string> = {
  none: 'Character direction will be inferred automatically from your story idea or creative seed.',
  'Real People': 'Believable anatomy, natural acting, realistic wardrobe/props, cinematic blocking, precise age/appearance continuity, realistic dialogue and camera direction.',
  'Chibi Characters': 'Large-head / small-body proportions, expressive poses, readable silhouettes, simplified but premium environments, punchier expressions, stylized cinematic lighting.',
  'Animals': 'Species-appropriate movement unless anthropomorphic behavior is requested. Dialogue can be spoken, subtitled, narrated, or expressed through behavior depending on the typed idea.',
  'Fruit / Food Characters': 'Anthropomorphic only when story logic requires it. Preserve recognizable food form while adding controlled facial features, limbs, accessories, and character acting.',
  'Mixed Cast': 'Define a continuity sheet first so differences in realism, scale, and behavior feel intentional rather than visually inconsistent.',
  'Custom': 'Infer the closest production logic from the description, then preserve all explicitly requested traits.',
};

for (const option of CHARACTER_TYPE_OPTIONS) { if (option.description) CHARACTER_TYPE_HELPERS[option.label] = option.description; }

export const STORY_GENRE_OPTIONS: PresetOption[] = [
  { id: 'none', label: 'None' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'drama', label: 'Drama' },
  { id: 'dramedy', label: 'Dramedy' },
  { id: 'romance', label: 'Romance' },
  { id: 'mystery', label: 'Mystery' },
  { id: 'suspense', label: 'Suspense' },
  { id: 'action', label: 'Action' },
  { id: 'inspirational', label: 'Inspirational' },
  { id: 'educational', label: 'Educational' },
  { id: 'slice_of_life', label: 'Slice of Life' },
  { id: "story_genre_options_0", label: "Fantasy Adventure", description: "A clear quest, discovery, escalating obstacles and an earned visual payoff." },
  { id: "story_genre_options_1", label: "Heist Caper", description: "Establish a target and plan, complicate the execution, then reveal a clever reversal." },
  { id: "story_genre_options_2", label: "Buddy Adventure", description: "Contrasting leads create friction before solving a shared problem through cooperation." },
  { id: "story_genre_options_3", label: "Magical Realism", description: "An everyday situation gains one extraordinary element treated with grounded emotional honesty." },
  { id: "story_genre_options_4", label: "Creature Comedy", description: "Character-specific anatomy and behavior drive setup, escalating visual gags and payoff." },
  { id: "story_genre_options_5", label: "Psychological Thriller", description: "Restrained performances, uncertain information and motivated reveals build tension without random scares." },
  { id: "story_genre_options_6", label: "Fairytale Mystery", description: "A magical clue leads to a coherent discovery with consistent world rules." },
  { id: "story_genre_options_7", label: "Epic Discovery", description: "Build wonder through scale, a character reaction and an earned reveal." },
  { id: "story_genre_options_8", label: "Fish-Out-of-Water Comedy", description: "An unfamiliar world exposes a character\u2019s habits through escalating misunderstandings." },
  { id: "genre_science_fiction", label: "Science Fiction", description: "Explore a speculative technology or discovery through a clear human or character goal, consistent world rules, and a consequential payoff." },
  { id: "genre_horror", label: "Horror", description: "Build controlled dread through withheld information, sensory detail, motivated reveals, and a readable threat; do not rely on random gore." },
  { id: "genre_western", label: "Western", description: "Use frontier pressure, land or community stakes, deliberate standoffs, and a decisive moral choice within the selected era." },
  { id: "genre_historical_drama", label: "Historical Drama", description: "A personal conflict is shaped by the chosen place and period; costume, objects, social rules, and actions remain era-consistent." },
  { id: "genre_musical", label: "Musical", description: "Use a motivated song or rhythmic performance to advance the goal and emotional turn; stage bodies and eyelines so the action remains legible." },
  { id: "genre_documentary", label: "Documentary", description: "Build an observational sequence around a truthful process or clearly labeled fictional subject; avoid fabricated real-world evidence or testimonials." },
  { id: "genre_mockumentary", label: "Mockumentary", description: "Contrast documentary-style observation or interviews with character behavior, building a coherent comic reveal." },
  { id: "genre_satire", label: "Satire", description: "Expose one recognizable contradiction through pointed character choices and a specific payoff rather than unrelated jokes." },
  { id: "genre_noir_detective", label: "Noir Detective", description: "A morally complicated investigation uses clues, restrained dialogue, deliberate contrast, and a coherent reveal; match technology and wardrobe to the chosen era." },
  { id: "genre_survival", label: "Survival", description: "A concrete environmental constraint forces a sequence of practical decisions; preserve geography, physical effort, and cause and effect." },
  { id: "genre_sports_underdog", label: "Sports Underdog", description: "Establish a skill gap or competitive stake, show an earned adjustment, and resolve with a readable performance moment rather than an unexplained victory." },
  { id: "genre_family_adventure", label: "Family Adventure", description: "A shared challenge brings contrasting personalities together; keep stakes readable, humor character-based, and the payoff earned." },
  { id: "genre_road_story", label: "Road Story", description: "Movement through a specific journey reveals a changing relationship; maintain route, travel direction, vehicle, and prop continuity." },
  { id: "genre_romantic_comedy", label: "Romantic Comedy", description: "A relationship goal collides with a concrete misunderstanding, producing playful escalation and a meaningful change in connection." },
  { id: "genre_cozy_mystery", label: "Cozy Mystery", description: "An approachable small-scale puzzle unfolds through fair clues, a familiar community, and a satisfying non-gruesome reveal." },
  { id: "genre_period_comedy", label: "Period Comedy", description: "Let the constraints and everyday habits of the chosen era drive the comic situation, without inserting modern props or references accidentally." },
  { id: "genre_urban_fantasy", label: "Urban Fantasy", description: "One consistent magical rule changes an ordinary urban setting; the real and fantastic elements share coherent physical stakes." },
  { id: "genre_silent_visual_comedy", label: "Silent Visual Comedy", description: "Tell setup, escalation, and punchline through visible action and precise reaction timing without depending on spoken dialogue." },
  { id: "genre_disaster", label: "Disaster", description: "A sudden large-scale disruption creates a specific rescue or escape problem; prioritize clear geography, understandable stakes, and believable responses." },
  { id: "genre_nostalgic_drama", label: "Nostalgic Drama", description: "Use a period-specific everyday object or ritual to reveal a relationship and an earned emotional change; avoid generic nostalgia filters." },
  { id: 'custom', label: 'Custom' },
];

export const VISUAL_STYLE_OPTIONS: PresetOption[] = [
  { id: 'none', label: 'None' },
  { id: 'cinematic_realism', label: "Cinematic Realism", description: "Grounded feature-film photography with tactile skin, practical light sources, motivated shadows, natural color separation and shot-specific lens choices." },
  { id: 'premium_3d', label: "Premium 3D", description: "Feature-quality 3D rendering: sculpted silhouettes, physically based materials, strand-level hair or fur, controlled gloss, believable global illumination and contact shadows." },
  { id: 'animated_film', label: "Animated Film", description: "Fully animated feature aesthetic with expressive facial rigs, intentional shape language, designed environments, readable staging and coherent material treatment." },
  { id: 'chibi_3d', label: "Chibi 3D", description: "Premium stylized miniature rendering with glossy eyes, tactile clothing, clean rounded forms and cinematic depth; preserve head-to-body ratios and body fullness." },
  { id: 'editorial_commercial', label: "Editorial / Commercial", description: "Polished campaign cinematography with intentional product or wardrobe emphasis, controlled reflections, clean framing and motivated hero lighting." },
  { id: 'clay_stop_motion', label: "Clay / Stop-Motion", description: "Tactile handmade materials, visible sculpting detail, miniature sets and pose-to-pose motion; preserve physical imperfections and avoid fluid CGI movement." },
  { id: 'illustrated', label: "Illustrated", description: "Designed illustration with consistent linework, palette and texture; use composition and value hierarchy to create cinematic staging within the medium." },
  { id: "visual_style_options_7", label: "Live-Action / CG Hybrid (Smurfs 2 Look)", description: "Original stylized 3D characters integrated into photographed real-world settings: expressive faces, realistic skin or fur shading, shared practical lighting, matched lens perspective, eyelines, contact shadows and occlusion." },
  { id: "visual_style_options_8", label: "Glossy Fantasy Feature", description: "Luminous fantasy worlds with rich sapphire accents, reflective highlights, tactile couture and dimensional environments; use controlled shimmer and purposeful details." },
  { id: "visual_style_options_9", label: "Photoreal Creature Feature", description: "Detailed creature skin, fur or scales with anatomically grounded motion, believable mass, environmental contact and film-grade lighting." },
  { id: "visual_style_options_10", label: "Storybook 3D Adventure", description: "Stylized sculpted characters, oversized environmental shapes, lush color design, layered depth and warm expressive acting in a fully animated world." },
  { id: "visual_style_options_11", label: "Painterly 3D Feature", description: "Dimensional characters and cinematic camera staging with visible brush textures, designed color scripts and controlled painterly edges." },
  { id: "visual_style_options_12", label: "Graphic Novel / Cel-Shaded Film", description: "Bold ink contours, graphic shadow shapes and selective halftone texture on dimensional staging; preserve consistent outline weight and color blocks." },
  { id: "visual_style_options_13", label: "Hand-Drawn Feature Animation", description: "Expressive drawn linework, consistent model sheets, painted backgrounds and purposeful pose-to-pose animation with controlled secondary motion." },
  { id: "visual_style_options_14", label: "Miniature Macro Cinema", description: "Small-scale characters within tactile environments; macro perspective, shallow focus used intentionally and scale cues from familiar objects." },
  { id: "visual_style_options_15", label: "Luxury Fashion Cinema", description: "Sculptural couture, detailed fabric movement, controlled chrome and pearl highlights, poised performance and editorial camera staging." },
  { id: "visual_style_options_16", label: "Neo-Noir Cinema", description: "Motivated pools of practical light, deep but readable shadows, selective color accents, rain reflections where appropriate and tension-driven framing." },
  { id: "visual_style_options_17", label: "Bright Adventure Cinema", description: "Luminous natural light, rich readable color, layered landscape depth and clear action silhouettes with an energetic feature-film finish." },
  { id: "visual_style_options_18", label: "Practical Creature / Puppetry", description: "Tactile puppet construction, mechanical joint limits, physical sets and real contact shadows; use performance that respects the creature\u2019s build." },
  { id: "visual_style_options_19", label: "Surreal Dream Cinema", description: "Impossible spatial relationships grounded in consistent materials and light; deliberate visual metaphors, clear subject hierarchy and controlled transitions." },
  {id:"style_bw_cinema",label:"Black-and-White Cinema",description:"Use a deliberate monochrome value hierarchy, readable skin and material textures, and controlled contrast; preserve detail in bright highlights and deep shadows."},
  {id:"style_film_35mm",label:"35mm Film Texture",description:"Use photochemical-style grain, gentle highlight rolloff, tactile color separation, and a consistent emulsion-like texture without hiding fine character details."},
  {id:"style_film_16mm",label:"16mm Documentary Texture",description:"Use fine-grained, observational film texture, available-light realism, practical locations, and restrained framing; avoid fake archival damage or era assumptions."},
  {id:"style_anamorphic",label:"Anamorphic Widescreen",description:"Use wide frame geography, restrained horizontal flare only from justified light sources, oval bokeh, and intentional subject placement; respect the requested output aspect ratio."},
  {id:"style_observational",label:"Observational Documentary",description:"Favor patient framing, motivated handheld or stable observation, practical light, natural performance, and readable real-world textures rather than staged spectacle."},
  {id:"style_high_key_comedy",label:"Bright Studio Comedy",description:"Use soft controlled studio light, clean color separation, clear gesture silhouettes, and readable reaction coverage that supports timing."},
  {id:"style_watercolor",label:"Watercolor Storybook",description:"Use translucent washes, paper texture, controlled edges, and stable illustrated character designs with clear foreground/background value separation."},
  {id:"style_pop_art",label:"Pop-Art Animation",description:"Use bold flat colors, graphic patterns, clean silhouette-driven poses, and controlled comic visual punctuation that never obscures the story beat."},
  {id:"style_silhouette",label:"Silhouette Animation",description:"Use distinctive profiles, readable body language, layered cut-paper depth, and controlled backlighting; keep identifying shapes stable across scenes."},
  {id:"style_cel_anime",label:"Cinematic Anime",description:"Use coherent drawn model sheets, designed highlights and shadow shapes, expressive but controlled acting, and cinematic staging; maintain the same linework and proportions across scenes."},
  { id: 'custom', label: 'Custom' },
];

export const VIDEO_FORMAT_OPTIONS: PresetOption[] = [
  { id: 'none', label: 'None' },
  { id: 'short_skit', label: 'Short Skit' },
  { id: 'storytime', label: 'Storytime' },
  { id: 'mini_episode', label: 'Mini Episode' },
  { id: 'commercial_ad', label: 'Commercial / Ad' },
  { id: 'explainer', label: 'Explainer' },
  { id: 'social_reel_tiktok', label: 'Social Reel / TikTok' },
  { id: 'trailer_teaser', label: 'Trailer / Teaser' },
  { id: 'custom', label: 'Custom' },
];

export const ENERGY_TONE_OPTIONS: PresetOption[] = [
  { id: 'none', label: 'None' },
  { id: 'funny', label: 'Funny' },
  { id: 'sassy', label: 'Sassy' },
  { id: 'emotional', label: 'Emotional' },
  { id: 'heartwarming', label: 'Heartwarming' },
  { id: 'dark', label: 'Dark' },
  { id: 'chaotic', label: 'Chaotic' },
  { id: 'cozy', label: 'Cozy' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'cute', label: 'Cute' },
  { id: 'serious', label: 'Serious' },
  { id: 'motivational', label: 'Motivational' },
  { id: "energy_tone_options_0", label: "Deadpan Wit", description: "Underplay the reaction; hold an eyeline or pause so the visual contradiction delivers the joke." },
  { id: "energy_tone_options_1", label: "Comedic Urgency", description: "Quick purposeful gestures, interrupted dialogue, reaction beats and accelerating rhythm while keeping the action readable." },
  { id: "energy_tone_options_2", label: "Wide-Eyed Wonder", description: "A gradual reveal, a breath or stillness, lifted eyeline and restrained awe before the emotional payoff." },
  { id: "energy_tone_options_3", label: "Quiet Emotional Intensity", description: "Small shifts in gaze, breath and posture carry the feeling; avoid exaggerated crying or overexplaining." },
  { id: "energy_tone_options_4", label: "Playful Mischief", description: "Confident sneaking gestures, conspiratorial glances and rhythmic setup-and-payoff acting." },
  { id: "energy_tone_options_5", label: "Triumphant Resolve", description: "Grounded posture, decisive motion and an earned release of tension supported by the score." },
  { id: "energy_tone_options_6", label: "Elegant Suspense", description: "Measured movement, withheld information, quiet sound details and deliberate negative space." },
  { id: "energy_tone_options_7", label: "Tender Bittersweet", description: "Warm connection with a trace of loss; restrained dialogue and an unhurried closing image." },
  { id: 'custom', label: 'Custom' },
];

// Rich curated seeds for "Surprise Me" and "Random"
export const STORY_SEEDS = [
  {
    characterType: ['Chibi Characters'],
    genre: ['Dramedy'],
    visualStyle: ['Premium 3D', 'Chibi 3D'],
    videoFormat: ['Short Skit'],
    energyTone: ['Sassy', 'Emotional'],
    storyIdea: 'A chibi salon owner discovers her best client has been secretly using kitchen scissors to trim her own bangs two days before a major event.',
    optionalDetails: {
      characterNames: 'Chloe (stylist), Maya (client)',
      setting: 'Pastel pink & gold luxury salon boutique',
      dialogueMustHaves: 'Put the kitchen shears down slowly.',
      targetAudience: 'Beauty lovers, TikTok comedy audience',
      callToAction: 'Tag a friend who shouldn’t touch scissors.',
    }
  },
  {
    characterType: ['Fruit / Food Characters'],
    genre: ['Suspense', 'Comedy'],
    visualStyle: ['Premium 3D'],
    videoFormat: ['Mini Episode'],
    energyTone: ['Chaotic', 'Funny'],
    storyIdea: 'An avocado detects that it has entered the precise 4-minute window of peak ripeness and desperately tries to alert the human before it turns brown.',
    optionalDetails: {
      characterNames: 'Avo the Avocado, Pete the Chef',
      setting: 'A sunlit marble kitchen counter next to a toast toaster',
      dialogueMustHaves: 'I have four minutes! FOUR MINUTES!',
      targetAudience: 'Foodies, millennial humor fans',
      callToAction: 'Eat your avocados on time.',
    }
  },
  {
    characterType: ['Animals'],
    genre: ['Mystery'],
    visualStyle: ['Cinematic Realism'],
    videoFormat: ['Trailer / Teaser'],
    energyTone: ['Serious', 'Dark'],
    storyIdea: 'A sophisticated golden retriever private investigator tracks down the clandestine syndicate that has been hiding tennis balls under the living room couch.',
    optionalDetails: {
      characterNames: 'Detective Barnaby, The Under-Couch Kingpin',
      setting: 'Noir dimly lit mahogany living room with rain against windowpane',
      dialogueMustHaves: 'The dust bunnies know more than they let on.',
      targetAudience: 'Dog lovers, cinematic film enthusiasts',
      callToAction: 'The full mystery drops this Friday.',
    }
  },
  {
    characterType: ['Real People'],
    genre: ['Comedy'],
    visualStyle: ['Editorial / Commercial'],
    videoFormat: ['Social Reel / TikTok'],
    energyTone: ['Chaotic', 'Sassy'],
    storyIdea: 'A remote worker tries to maintain a calm, corporate demeanor during an executive Zoom presentation while their robotic vacuum cleaner slowly pushes their desk chair out of the room.',
    optionalDetails: {
      characterNames: 'Jordan (Senior Strategist)',
      setting: 'Clean minimalist home office with ring light and plant',
      dialogueMustHaves: 'As you can see on slide four... I am experiencing logistical drift.',
      targetAudience: 'Corporate humor, Gen-Z / Millennial remote workers',
      callToAction: 'Follow for more work-from-home survival tips.',
    }
  },
  {
    characterType: ['Mixed Cast'],
    genre: ['Slice of Life'],
    visualStyle: ['Clay / Stop-Motion', 'Animated Film'],
    videoFormat: ['Storytime'],
    energyTone: ['Heartwarming', 'Cozy'],
    storyIdea: 'A tiny clay teacup rabbit and an introverted ceramicist prepare an evening cup of tea as the first winter snowfall gently blankets the studio windowsill.',
    optionalDetails: {
      characterNames: 'Bramble (little rabbit), Hannah (potter)',
      setting: 'Warm pottery workshop with woodstove glow and steaming kettle',
      dialogueMustHaves: 'Just a pinch of chamomile for courage.',
      targetAudience: 'Lo-fi lovers, cozy aesthetic community',
      callToAction: 'Save this when you need a gentle reset.',
    }
  }
];

export const INITIAL_PRESET_STATE: PresetState = {
  characterType: ['None'],
  customCharacter: '',
  genre: ['None'],
  customGenre: '',
  visualStyle: ['None'],
  customVisualStyle: '',
  videoFormat: ['None'],
  customVideoFormat: '',
  energyTone: ['None'],
  customEnergyTone: '',
  storyIdea: '',
  optionalDetails: {
    characterNames: '',
    storyGoal: '',
    obstacle: '',
    endingChange: '',
    characterGoals: '',
    duration: '',
    era: '',
    setting: '',
    dialogueMustHaves: '',
    onScreenText: '',
    productService: '',
    targetAudience: '',
    callToAction: '',
  }
};

/** Restore saved settings without modifying legacy records or discarding newer choices. */
export function normalizePresetState(saved?: Partial<Omit<PresetState, 'optionalDetails'>> & {optionalDetails?: Partial<PresetState['optionalDetails']>}): PresetState {
  const result = structuredClone(INITIAL_PRESET_STATE);
  if (!saved) return result;
  for (const key of ['characterType', 'genre', 'visualStyle', 'videoFormat', 'energyTone'] as const) {
    if (Array.isArray(saved[key]) && saved[key].length) result[key] = [...saved[key]];
  }
  for (const key of ['customCharacter', 'customGenre', 'customVisualStyle', 'customVideoFormat', 'customEnergyTone', 'storyIdea'] as const) {
    if (typeof saved[key] === 'string') result[key] = saved[key];
  }
  for (const key of Object.keys(result.optionalDetails) as (keyof PresetState['optionalDetails'])[]) {
    if (typeof saved.optionalDetails?.[key] === 'string') result.optionalDetails[key] = saved.optionalDetails[key];
  }
  return result;
}

/**
 * Resolves active selections for a preset, filtering out 'None' and appending custom input
 */
export function resolvePresetValues(selected: string[], customText?: string): string {
  const active = selected.filter(item => item.toLowerCase() !== 'none');
  const values: string[] = [];

  for (const item of active) {
    if (item.toLowerCase() === 'custom' && customText && customText.trim()) {
      values.push(customText.trim());
    } else if (item.toLowerCase() !== 'custom') {
      values.push(item);
    }
  }

  if (active.includes('Custom') && customText && customText.trim() && !values.includes(customText.trim())) {
    values.push(customText.trim());
  }

  return values.join(', ');
}

/** Whether the brief contains active creative direction, not an empty Custom placeholder. */
export function hasCreativeInput(state: PresetState): boolean {
  return !!state.storyIdea.trim() || Object.values(state.optionalDetails).some(value => !!value?.trim()) || [
    resolvePresetValues(state.characterType, state.customCharacter), resolvePresetValues(state.genre, state.customGenre),
    resolvePresetValues(state.visualStyle, state.customVisualStyle), resolvePresetValues(state.videoFormat, state.customVideoFormat),
    resolvePresetValues(state.energyTone, state.customEnergyTone),
  ].some(value => !!value.trim());
}

/**
 * Formats optional details into a clean string without leaving empty keys
 */
export function formatOptionalDetails(details: PresetState['optionalDetails']): string {
  const parts: string[] = [];
  if (details.storyGoal?.trim()) parts.push(`Story Goal: ${details.storyGoal.trim()}`);
  if (details.obstacle?.trim()) parts.push(`Obstacle / Stakes: ${details.obstacle.trim()}`);
  if (details.endingChange?.trim()) parts.push(`Ending / What Changes: ${details.endingChange.trim()}`);
  if (details.characterGoals?.trim()) parts.push(`Character Goals: ${details.characterGoals.trim()}`);
  if (details.era?.trim()) parts.push(`Era / Time Period: ${details.era.trim()}`);
  if (details.duration?.trim()) parts.push(`Requested Duration: ${details.duration.trim()}`);
  
  if (details.setting?.trim()) parts.push(`Setting: ${details.setting.trim()}`);
  if (details.dialogueMustHaves?.trim()) parts.push(`Dialogue Must-Haves: "${details.dialogueMustHaves.trim()}"`);
  if (details.onScreenText?.trim()) parts.push(`Exact On-Screen Text: "${details.onScreenText.trim()}"`);
  if (details.productService?.trim()) parts.push(`Product / Service: ${details.productService.trim()}`);
  if (details.targetAudience?.trim()) parts.push(`Target Audience: ${details.targetAudience.trim()}`);
  if (details.callToAction?.trim()) parts.push(`CTA: ${details.callToAction.trim()}`);
  return parts.join(' | ');
}

export function describeProductionChoices(values: string[], options: PresetOption[]): string {
  return values.map(value => options.find(option => option.label === value)).filter(option => option?.description).map(option => `${option!.label}: ${option!.description}`).join('\n');
}
export function productionDirection(input: {characterType?: string; genre?: string; visualStyle?: string; energyTone?: string}): string {
  return [[input.characterType, CHARACTER_TYPE_OPTIONS], [input.genre, STORY_GENRE_OPTIONS], [input.visualStyle, VISUAL_STYLE_OPTIONS], [input.energyTone, ENERGY_TONE_OPTIONS]].map(([value, options]) => (options as PresetOption[]).filter(option => option.description && (String(value || '') === option.label || String(value || '').split(', ').includes(option.label))).map(option => `${option.label}: ${option.description}`).join('\n')).filter(Boolean).join('\n');
}

/**
 * Master Prompt Generator conforming to Page 8 of the brief.
 * Fills bracketed values from the five presets and story field, then removes unused lines.
 * Strictly avoids filler such as "None selected".
 */
export function generateMasterPrompt(state: PresetState): string {
  const charVal = resolvePresetValues(state.characterType, state.customCharacter);
  const genreVal = resolvePresetValues(state.genre, state.customGenre);
  const visualVal = resolvePresetValues(state.visualStyle, state.customVisualStyle);
  const formatVal = resolvePresetValues(state.videoFormat, state.customVideoFormat);
  const energyVal = resolvePresetValues(state.energyTone, state.customEnergyTone);
  const ideaVal = state.storyIdea.trim();
  const directorPlan = buildDirectorPlan(state);
  const optVal = formatOptionalDetails(state.optionalDetails);

  // Construct STORY DIRECTION section lines dynamically
  const storyDirectionLines: string[] = [];
  if (ideaVal) storyDirectionLines.push(`Story Idea: ${ideaVal}`);
  if (state.optionalDetails.characterNames?.trim()) storyDirectionLines.push(`Character Names & Descriptions: ${state.optionalDetails.characterNames.trim()}`);
  if (charVal) storyDirectionLines.push(`Character Family: ${charVal}`);
  if (genreVal) storyDirectionLines.push(`Genre: ${genreVal}`);
  if (visualVal) storyDirectionLines.push(`Visual Style: ${visualVal}`);
  if (formatVal) storyDirectionLines.push(`Video Format: ${formatVal}`);
  if (energyVal) storyDirectionLines.push(`Energy / Tone: ${energyVal}`);
  if (optVal) storyDirectionLines.push(`Optional Details: ${optVal}`);

  // Base prompt template from Page 8
  const productionNotes = productionDirection({characterType:charVal, genre:genreVal, visualStyle:visualVal, energyTone:energyVal});
  if (productionNotes) storyDirectionLines.push(`ART & PERFORMANCE DIRECTION\n${productionNotes}`);

  const storyDirectionBlock = storyDirectionLines.length > 0 
    ? `\nSTORY DIRECTION\n${storyDirectionLines.join('\n')}\n`
    : '';

  const masterPrompt = `Create a premium, cohesive three-scene visual story designed to become a short-form video.${storyDirectionBlock}
${formatDirectorPlan(directorPlan)}

PRODUCTION RULES
- Create exactly 3 connected scenes.
- Build one internal Story Bible and reuse it across all scenes. Lock each character’s identity, age, facial/body traits, skin/fur/peel colors and markings, hairstyle, wardrobe/accessories, and scale; recurring props and their state/position; architecture and environment details; light direction, time of day, color temperature, palette, and visual style. Do not ask the user to re-enter characters for each scene.
- Preserve continuity across all three images unless the story explicitly requires a visible change.
- Scene 1 must establish the hook, situation, and the characters’ goals. Scene 2 must use the supplied obstacle to escalate, complicate, reveal, or deepen Scene 1. Scene 3 must deliver the requested ending/change through a payoff, resolution, twist, punchline, reveal, emotional close, or format-appropriate CTA. If a story-shaping field is blank, infer a coherent choice once rather than leaving a hole in the sequence.
- Adapt anatomy, acting, dialogue, environment, and visual language appropriately for the selected character family. For a custom family, infer the closest production logic while preserving every explicit trait. Animals use species-appropriate movement unless anthropomorphism is requested; choose spoken, subtitled, narrated, or behavioral communication from the idea. Food characters become anthropomorphic only when the story requires it.
- Use the written idea to refine selected presets rather than ignoring either source: Comedy with dry sarcastic humor should become dry sarcastic comedy. If presets are supplied without an idea, develop a complete original concept within those directions.
- Keep one dominant beat and one primary focal subject per scene, with only supportive details. Vary angle, pose, action, or composition across scenes while preserving the same identities and world.
- Direct each scene like a feature-film sequence: name the shot size, camera height, lens perspective and motivated camera movement; explain what the framing reveals emotionally. Use establishing geography, an escalating action or reaction shot, and a decisive payoff composition as the story requires.
- Specify the key light’s visible or implied source, fill contrast, separation light, material response, foreground/midground/background staging, and intentional focus placement. Maintain screen direction and eyelines between cuts.
- Give actors or animated characters playable actions, micro-expressions, anticipation, weight shifts and reaction holds. For animation, specify appropriate secondary motion and follow-through rather than generic “movement”.
- Preserve requested age, skin tone, body type, facial features and proportions. Do not slim plus-size characters. No crowns, tiaras or unrelated filler unless explicitly requested.
- If several selected visual styles conflict, choose one coherent primary rendering treatment and use the others only as compatible accents; explain the choice rather than alternating styles between scenes.
- Make each scene visually strong enough to stand alone while still reading as the same production. The emotion and dominant action must remain understandable with audio muted. Avoid malformed anatomy, accidental text, muddy lighting, generic clip-art, and crowded backgrounds.

OUTPUT ORDER - DO NOT CHANGE
Deliver six separate canvases/artifacts in this exact order, not one combined document or sheet.
Canvas 1: Scene 1 Image
Canvas 2: Scene 1 Script
Canvas 3: Scene 2 Image
Canvas 4: Scene 2 Script
Canvas 5: Scene 3 Image
Canvas 6: Scene 3 Script

IMAGE CANVAS RULES
Each image canvas must contain one finished image only. No collage, grid, storyboard sheet, split-screen, contact sheet, multiple panels, or extra alternate versions. For each image, apply the exact locked continuity description and identify only the story-driven changes since the prior scene. Specify setting/background, pose, expression, eyeline, interactions, framing, lens feel, camera angle, composition, lighting, mood, palette, texture, depth, props, and spatial relationships. Use one dominant beat and one primary focal subject, with polished, readable cinematic composition.

SCRIPT CANVAS RULES
For each scene, provide: scene objective, estimated duration, action/performance direction, dialogue and/or voiceover, exact on-screen text only when supplied or useful, sound/music/SFX cues when useful, shot size and lens perspective, motivated camera movement, blocking and eyelines, lighting motivation, camera/edit notes, and the transition to the next scene. Keep scripts concise enough for video production and natural enough to perform. Every script must match the visible or imminent action in its paired image. Keep required spoken words separate from on-screen text; preserve supplied wording exactly. A product/service is story context, not automatically the CTA. Do not invent claims or add a sales pitch unless requested. Scene 3 should end cleanly. For a trailer/teaser, an earned teaser payoff may leave the main story question open.

CONTINUITY CHECK
Before finalizing each new scene, compare it against all prior scenes and preserve all locked details. Only change elements that the story explicitly changes.`;

  return masterPrompt.trim();
}
