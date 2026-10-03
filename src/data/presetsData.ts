import { PresetState } from '../types';

export const CHARACTER_TYPE_OPTIONS = [
  'None',
  'Real People',
  'Chibi Characters',
  'Animals',
  'Fruit / Food Characters',
  'Mixed Cast',
  'Custom',
];

export const CHARACTER_CREATIVE_BEHAVIORS: Record<string, string> = {
  'Real People':
    'Believable anatomy, natural acting, realistic wardrobe/props, cinematic blocking, precise age/appearance continuity, realistic dialogue and camera direction.',
  'Chibi Characters':
    'Large-head / small-body proportions, expressive poses, readable silhouettes, simplified but premium environments, punchier expressions, stylized cinematic lighting.',
  Animals:
    'Species-appropriate movement unless anthropomorphic behavior is requested. Dialogue can be spoken, subtitled, narrated, or expressed through behavior depending on the typed idea.',
  'Fruit / Food Characters':
    'Anthropomorphic only when story logic requires it. Preserve recognizable food form while adding controlled facial features, limbs, accessories, and character acting.',
  'Mixed Cast':
    'Define a continuity sheet first so differences in realism, scale, and behavior feel intentional rather than visually inconsistent.',
  Custom:
    'Infer the closest production logic from the description, then preserve all explicitly requested traits.',
};

export const STORY_GENRE_OPTIONS = [
  'None',
  'Comedy',
  'Drama',
  'Dramedy',
  'Romance',
  'Mystery',
  'Suspense',
  'Action',
  'Inspirational',
  'Educational',
  'Slice of Life',
  'Custom',
];

export const VISUAL_STYLE_OPTIONS = [
  'None',
  'Cinematic Realism',
  'Premium 3D',
  'Animated Film',
  'Chibi 3D',
  'Editorial / Commercial',
  'Clay / Stop-Motion',
  'Illustrated',
  'Custom',
];

export const VIDEO_FORMAT_OPTIONS = [
  'None',
  'Short Skit',
  'Storytime',
  'Mini Episode',
  'Commercial / Ad',
  'Explainer',
  'Social Reel / TikTok',
  'Trailer / Teaser',
  'Custom',
];

export const ENERGY_TONE_OPTIONS = [
  'None',
  'Funny',
  'Sassy',
  'Emotional',
  'Heartwarming',
  'Dark',
  'Chaotic',
  'Cozy',
  'Luxury',
  'Cute',
  'Serious',
  'Motivational',
  'Custom',
];

export const INITIAL_PRESET_STATE: PresetState = {
  characterTypes: ['None'],
  customCharacter: '',
  genres: ['None'],
  customGenre: '',
  visualStyles: ['None'],
  customStyle: '',
  videoFormats: ['None'],
  customFormat: '',
  energyTones: ['None'],
  customTone: '',
  storyIdea: '',
  optionalDetails: {
    characterNames: '',
    settingLocation: '',
    dialogueMustHaves: '',
    exactTextCaptions: '',
    targetAudience: '',
    productServiceCTA: '',
    targetDuration: '',
  },
};

export interface CuratedExample {
  id: string;
  name: string;
  tagline: string;
  description: string;
  state: PresetState;
  threeBeatArc: [string, string, string];
}

export const CURATED_EXAMPLES: CuratedExample[] = [
  {
    id: 'chibi-bangs',
    name: 'Chibi Bangs Disaster (PDF Example)',
    tagline: 'Page 10 Reference Skit',
    description: 'A chibi salon owner discovers her best client trimmed her own bangs two days before a wedding.',
    state: {
      characterTypes: ['Chibi Characters'],
      customCharacter: '',
      genres: ['Dramedy'],
      customGenre: '',
      visualStyles: ['Premium 3D', 'Chibi 3D'],
      customStyle: '',
      videoFormats: ['Short Skit'],
      customFormat: '',
      energyTones: ['Sassy', 'Emotional'],
      customTone: '',
      storyIdea: 'A chibi salon owner discovers her best client has been secretly using kitchen scissors to trim her own bangs two days before a major event.',
      optionalDetails: {
        characterNames: 'Maya (stylist) and Chloe (bride-to-be)',
        settingLocation: 'Chic boutique pastel hair salon with oversized styling mirrors',
        dialogueMustHaves: '"Put the poultry shears down, Chloe."',
        exactTextCaptions: 'Rule #1: Never cut your own bangs.',
        targetAudience: 'Beauty & comedy lovers on TikTok / Reels',
        productServiceCTA: 'Book your bridal prep at least 3 weeks in advance.',
        targetDuration: '30s (approx. 10s per scene)',
      },
    },
    threeBeatArc: [
      'Hook: Client removes her hat. The stylist freezes when she sees the uneven jagged bangs. Visual comedy first, then creeping dread.',
      'Escalation: Client defensively explains why she did it at 2 AM while the stylist examines the damage and calculates an emergency rescue plan.',
      'Payoff: The finished salvaged look is revealed. The stylist hands over the kitchen scissors sealed inside a clear evidence bag with a deadpan warning.',
    ],
  },
  {
    id: 'artisan-bakery',
    name: 'The Croissant Heist',
    tagline: 'Whimsical Clay / Stop-Motion Skit',
    description: 'A meticulous pastry chef suspects someone is tasting the morning croissants before the bakery opens.',
    state: {
      characterTypes: ['Real People'],
      customCharacter: '',
      genres: ['Comedy'],
      customGenre: '',
      visualStyles: ['Clay / Stop-Motion'],
      customStyle: '',
      videoFormats: ['Social Reel / TikTok'],
      customFormat: '',
      energyTones: ['Chaotic', 'Funny'],
      customTone: '',
      storyIdea: 'A French master baker sets up a flour-dusted flour trap to catch the morning pastry thief, only to discover his golden retriever has learned to open the cooling rack.',
      optionalDetails: {
        characterNames: 'Chef Henri and Barnaby the Retriever',
        settingLocation: 'Rustic Parisian morning bakery, warm oven glow and powdered sugar dust',
        dialogueMustHaves: '"Non... not the 72-layer batch!"',
        exactTextCaptions: 'Caught red-pawed.',
        targetAudience: 'Foodies and pet owners',
        productServiceCTA: 'Fresh batch out every morning at 7 AM.',
        targetDuration: '20s (approx. 6-7s per scene)',
      },
    },
    threeBeatArc: [
      'Hook: Henri counts 11 golden croissants instead of 12. Close-up on the dusting of flour with suspicious paw prints.',
      'Escalation: Henri tiptoes behind the bread cooling tower with a wooden peel, watching the flour trail lead beneath the counter.',
      'Payoff: Barnaby sits calmly with white flour on his snout and a tiny pat of butter on his ear, unbothered and triumphant.',
    ],
  },
  {
    id: 'avocado-workout',
    name: 'Avocado Gym Transformation',
    tagline: 'Animated Fruit / Food Parody',
    description: 'An unripe, rock-hard avocado joins a smoothie gym to get perfectly soft and ripe before breakfast.',
    state: {
      characterTypes: ['Fruit / Food Characters'],
      customCharacter: '',
      genres: ['Inspirational'],
      customGenre: '',
      visualStyles: ['Animated Film'],
      customStyle: '',
      videoFormats: ['Commercial / Ad'],
      customFormat: '',
      energyTones: ['Motivational', 'Cute'],
      customTone: '',
      storyIdea: 'An overly firm Hass avocado tries extreme sauna wraps and weightlifting with lime dumbbells so he can reach peak ripeness without turning brown.',
      optionalDetails: {
        characterNames: 'Avi the Avocado and Coach Lime',
        settingLocation: 'Vibrant fruit-bowl fitness studio with juice bar dispensers',
        dialogueMustHaves: '"Patience is what turns good fats into great form."',
        exactTextCaptions: 'Never brown before your time.',
        targetAudience: 'Health & wellness enthusiasts',
        productServiceCTA: 'Eat ripe. Live balanced.',
        targetDuration: '30s',
      },
    },
    threeBeatArc: [
      'Hook: Avi looks in the mirror and thumps his hard green peel. He cannot even slice for toast.',
      'Escalation: Coach Lime puts Avi through banana-peel yoga and brown paper bag steam sessions.',
      'Payoff: Avi achieves perfect creamy green ripeness with a spotless golden pit, flexing on whole-grain sourdough.',
    ],
  },
  {
    id: 'cyberpunk-courier',
    name: 'Midnight Neon Delivery',
    tagline: 'Cinematic Realism Thriller',
    description: 'A rain-soaked hoverbike courier carries an overheating thermos through a futuristic metropolis.',
    state: {
      characterTypes: ['Real People'],
      customCharacter: '',
      genres: ['Suspense'],
      customGenre: '',
      visualStyles: ['Cinematic Realism'],
      customStyle: '',
      videoFormats: ['Mini Episode'],
      customFormat: '',
      energyTones: ['Dark', 'Serious'],
      customTone: '',
      storyIdea: 'A nocturnal drone-dodging courier has 90 seconds to deliver a pressurized container of synthetic dumplings to a skyscraper penthouse before it loses temperature.',
      optionalDetails: {
        characterNames: 'Ren (courier) and Madam Zhao (client)',
        settingLocation: 'Neon drenched rainy cyber-alleyways and an ultra-minimal high-rise penthouse',
        dialogueMustHaves: '"30 seconds to cold dumplings or your credits back."',
        exactTextCaptions: 'Speed is an art.',
        targetAudience: 'Sci-fi and cinematic video creators',
        productServiceCTA: 'Watch the full mini-series next Friday.',
        targetDuration: '45s (approx. 15s per scene)',
      },
    },
    threeBeatArc: [
      'Hook: Ren slams his hoverbike into second gear as a digital HUD timer flashes 01:29 remaining in heavy rain.',
      'Escalation: Flying through a narrow ventilation canyon, Ren narrowly evades a cleaning drone while guarding the thermal lock box.',
      'Payoff: Ren arrives at the glass penthouse elevator at 00:03. Madam Zhao takes one steaming bite and leaves a 5-star tip.',
    ],
  },
];

export const SURPRISE_ME_SEEDS = [
  {
    characterTypes: ['Chibi Characters'],
    genres: ['Comedy'],
    visualStyles: ['Chibi 3D'],
    videoFormats: ['Short Skit'],
    energyTones: ['Chaotic', 'Funny'],
    storyIdea: 'A tiny perfectionist barista wages war against a customer who ordered an iced espresso with "extra hot ice".',
    optionalDetails: {
      characterNames: 'Pip (barista) and Greg (customer)',
      settingLocation: 'Artisanal micro coffee kiosk with steam whistling loudly',
      dialogueMustHaves: '"Hot ice is just boiling water, sir!"',
      exactTextCaptions: 'Customer service: Level 99.',
      targetAudience: 'Coffee lovers and retail workers',
      productServiceCTA: 'Brew your own beans with our subscription.',
      targetDuration: '30s',
    },
  },
  {
    characterTypes: ['Animals'],
    genres: ['Mystery'],
    visualStyles: ['Animated Film'],
    videoFormats: ['Storytime'],
    energyTones: ['Cute', 'Cozy'],
    storyIdea: 'A tuxedo cat detective interrogates the household robot vacuum cleaner about a missing ball of yarn.',
    optionalDetails: {
      characterNames: 'Inspector Whiskers and Roomba-7',
      settingLocation: 'Sunlit living room with crime tape made of blue masking tape',
      dialogueMustHaves: '"Spill the lint trap, buddy."',
      exactTextCaptions: 'The Case of the Missing Merino Wool.',
      targetAudience: 'Cat owners and mystery lovers',
      productServiceCTA: 'Share this with someone whose cat runs the house.',
      targetDuration: '45s',
    },
  },
  {
    characterTypes: ['Real People'],
    genres: ['Dramedy'],
    visualStyles: ['Cinematic Realism'],
    videoFormats: ['Social Reel / TikTok'],
    energyTones: ['Heartwarming', 'Emotional'],
    storyIdea: 'An elderly tailor secretly repairs the worn-out lucky jacket of a nervous young violinist right before her first symphony audition.',
    optionalDetails: {
      characterNames: 'Mr. Vance (tailor) and Nina (musician)',
      settingLocation: 'Vintage golden-lit tailoring shop stacked with wool bolts',
      dialogueMustHaves: '"The stitches will hold your courage even when your hands shake."',
      exactTextCaptions: 'Every seam carries a story.',
      targetAudience: 'Creative artists and makers',
      productServiceCTA: 'Preserve what you love.',
      targetDuration: '60s',
    },
  },
  {
    characterTypes: ['Fruit / Food Characters'],
    genres: ['Action'],
    visualStyles: ['Premium 3D'],
    videoFormats: ['Trailer / Teaser'],
    energyTones: ['Chaotic', 'Motivational'],
    storyIdea: 'A spicy habanero pepper breaks out of a refrigerator crisper drawer to rescue a gentle mild bell pepper from a sizzling stir-fry wok.',
    optionalDetails: {
      characterNames: 'Blaze (Habanero) and Bella (Bell Pepper)',
      settingLocation: 'Stainless steel chef kitchen at midnight with ominous stove burners',
      dialogueMustHaves: '"Hold on, Bella, things are about to get Scoville!"',
      exactTextCaptions: 'Some like it hot.',
      targetAudience: 'Animation fans and food creators',
      productServiceCTA: 'Coming soon to a skillet near you.',
      targetDuration: '15s',
    },
  },
];

export const RANDOM_STORY_IDEAS = [
  'A grumpy grandfather learns to use augmented reality glasses to outsmart his grandkids at board games.',
  'An aspiring astronaut tests zero-gravity cake baking in an anti-gravity laundromat.',
  'Two competitive street food cart owners realize they are secretly using each other’s secret sauce.',
  'A vintage typewriter starts typing the next morning’s weather forecast before the local news.',
  'A ceramic garden gnome secretly travels the world and mails polaroids back to his bewildered owner.',
  'An introverted librarian finds an overdue book checked out in 1924 with a treasure map tucked in page 42.',
  'A dramatic opera singer loses her voice and must audition for a soap commercial using expressive eyebrow choreography.',
];

// Preserve the original four Surprise concepts as reusable, visible examples.
const originalConceptNames=['The Hot Ice Order','Inspector Whiskers and the Missing Yarn','The Tailor and the Lucky Jacket','The Pepper Rescue'];
SURPRISE_ME_SEEDS.forEach((seed,index)=>{CURATED_EXAMPLES.push({id:'original-surprise-'+index,name:originalConceptNames[index],tagline:'Original coordinated story concept',description:seed.storyIdea,state:{...INITIAL_PRESET_STATE,...seed,optionalDetails:{...INITIAL_PRESET_STATE.optionalDetails,...seed.optionalDetails}},threeBeatArc:['Opening situation: '+seed.storyIdea,'Escalation follows the selected genre and the character goals you choose.','The final beat follows your written ending or call to action.']});});
