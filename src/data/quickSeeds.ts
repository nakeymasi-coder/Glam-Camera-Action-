export interface QuickStorySeed {
  id: string;
  title: string;
  /** Canonical genre for browsing inspiration; choosing a seed does not change presets. */
  genre: string;
  idea: string;
}

/** Idea-only shortcuts, separate from the 40 full coordinated Random/Surprise starters. */
export const QUICK_STORY_SEEDS: readonly QuickStorySeed[] = [
  {
    id: 'chibi-bangs-disaster', title: 'Chibi Bangs Disaster', genre: 'Dramedy',
    idea: 'A chibi salon owner discovers her best client has been secretly using kitchen scissors to trim her own bangs two days before a major event.',
  },
  {
    id: 'croissant-thief', title: 'Croissant Thief', genre: 'Comedy',
    idea: 'A perfectionist pastry chef sets a flour trap to catch the morning croissant thief, discovering his golden retriever.',
  },
  {
    id: 'avocado-gym', title: 'Avocado Gym', genre: 'Comedy',
    idea: 'An unripe rock-hard avocado joins a high-intensity gym to become creamy and ready for avocado toast.',
  },
  {
    id: 'museum-moving-portrait', title: 'The Moving Portrait', genre: 'Mystery',
    idea: 'Scene 1: A museum attendant notices that one small portrait is crooked every morning. Scene 2: Watching from the gallery doorway, the attendant spots a loose wall panel shifting whenever the adjacent service door closes. Scene 3: The attendant secures the panel, straightens the same portrait, and smiles as the door closes without disturbing it.',
  },
  {
    id: 'florist-blue-ribbon', title: 'The Blue Ribbon Clue', genre: 'Cozy Mystery',
    idea: 'Scene 1: A florist finds an unfinished bouquet with a blue ribbon but no customer name. Scene 2: The florist matches the ribbon to a scrap tied around an old delivery bicycle outside and asks its returning rider about the flowers. Scene 3: The rider produces the missing order card from a coat pocket, and together they finish the bouquet for a neighborhood anniversary.',
  },
  {
    id: 'theater-hidden-applause', title: 'Applause Next Door', genre: 'Mystery',
    idea: 'Scene 1: An adult dancer rehearsing in an apparently empty theater hears applause after every attempt. Scene 2: Following the sound through a backstage corridor, the dancer finds a retired stagehand watching through an open rehearsal-room door. Scene 3: The dancer invites the stagehand to the front row and performs the newly finished sequence for one delighted audience member.',
  },
  {
    id: 'planner-three-priorities', title: 'Planner Reset', genre: 'Educational',
    idea: 'Create a grounded planner product demo. Scene 1: An adult creator stares at scattered sticky notes on one crowded desk. Scene 2: The creator transfers three priorities into a paper planner and moves the transferred sticky notes into a tray. Scene 3: Reveal the same desk, now clearly organized, with the open planner and the creator beginning the first task. Show the actual layout without invented productivity statistics or a sales claim.',
  },
  {
    id: 'candle-gift-wrap', title: 'Candle Gift Reveal', genre: 'Slice of Life',
    idea: 'Create a handmade candle gift promo. Scene 1: A maker places one unlit amber-glass candle beside an empty gift box. Scene 2: The maker fits the candle into a protective insert, adds a handwritten note, and ties the box with ribbon. Scene 3: The adult recipient unties the same ribbon, lifts the candle, and holds the note with a warm smile. Keep the candle unlit throughout and make no health or fragrance-performance claims.',
  },
  {
    id: 'tote-pocket-reveal', title: 'The Tote Pocket Test', genre: 'Comedy',
    idea: 'Create a playful tote-bag product demo. Scene 1: An adult commuter searches a tote for a transit card while standing safely beside a station bench. Scene 2: The commuter discovers the bag\'s visible inner pocket and places the card there before repacking the same everyday items. Scene 3: At the next departure, the commuter retrieves the card in one smooth motion and gives the camera a relieved little nod. Show only the bag features visible on screen.',
  },
  {
    id: 'denim-stitch-transformation', title: 'Denim Second Act', genre: 'Inspirational',
    idea: 'Scene 1: An adult maker discovers a stubborn stain on a favorite denim jacket. Scene 2: At the same sewing table, the maker sketches a small leaf motif over the stain and stitches an embroidered patch onto that spot. Scene 3: The maker wears the repaired jacket outside and proudly turns to reveal the new detail. Preserve the jacket\'s cut, buttons, and existing wear across the transformation.',
  },
  {
    id: 'reading-corner-makeover', title: 'The Reading Nook', genre: 'Slice of Life',
    idea: 'Scene 1: An adult reader tries to settle into a neglected corner crowded with storage boxes. Scene 2: The reader moves the boxes to a shelf, turns the existing chair toward the window, and adds a cushion and a small side table. Scene 3: Reveal the same modest corner as the reader opens a book in the afternoon light. Keep the room dimensions and window position consistent; the change comes from arrangement rather than a magically larger room.',
  },
  {
    id: 'silver-curls-confidence', title: 'Silver Curls, Big Entrance', genre: 'Dramedy',
    idea: 'Scene 1: An older adult with silver curls hesitates in front of a mirror before a reunion, holding a plain cardigan. Scene 2: The same person swaps it for a favorite bright jacket, adjusts one familiar accessory, and practices a confident greeting. Scene 3: At the reunion doorway, a friend recognizes that signature jacket and greets them with open arms. Preserve the person\'s age, face, body shape, and silver curls throughout.',
  },
  {
    id: 'paper-crane-bookmark', title: 'Paper Crane Rescue', genre: 'Fantasy Adventure',
    idea: 'Create a short paper animation. Scene 1: A tiny folded crane watches a loose bookmark slide toward the edge of a desk in a breeze. Scene 2: The crane braces its paper feet against a pencil and catches the ribbon with its folded beak. Scene 3: It pulls the bookmark back into the open book and settles onto the page as a new companion. Keep the crane made from one patterned sheet with the same folds and scale.',
  },
  {
    id: 'marshmallow-mug-bridge', title: 'Marshmallow Detour', genre: 'Creature Comedy',
    idea: 'Create a playful animated short. Scene 1: A tiny marshmallow character tries to cross a gap between two cool empty mugs to join a friend. Scene 2: Its short legs cannot span the gap, so it rolls a teaspoon across both rims as a bridge. Scene 3: It waddles over the spoon, rejoins its friend, and both celebrate with a soft squishy high-five. Keep the mugs empty and the marshmallows\' size and simple arms and legs consistent.',
  },
  {
    id: 'button-spool-finish', title: 'The Runaway Button', genre: 'Silent Visual Comedy',
    idea: 'Create a silent stop-motion short. Scene 1: A loose red button rolls away from an open sewing kit across a tabletop. Scene 2: A sentient thread spool unwinds a loop into the button\'s path, but the first loop falls flat. Scene 3: The spool tips the thread around a pencil to form a standing loop that catches the button, leaving both tucked safely beside the kit. Use readable object movement with no added faces or limbs.',
  },
  {
    id: 'space-greenhouse-droplet', title: 'One Drop in Orbit', genre: 'Science Fiction',
    idea: 'Scene 1: An adult orbital-station botanist notices a single water droplet floating away from a plant experiment in microgravity. Scene 2: A gentle ventilation current carries the droplet beyond the watering nozzle, so the botanist positions a clear collection pouch downstream instead of chasing it. Scene 3: The droplet enters the pouch, and the botanist returns the water to the plant\'s sealed root reservoir. Keep the plant anchored and the station\'s microgravity consistent.',
  },
  {
    id: 'western-gate-whistle', title: 'The Whistling Gate', genre: 'Western',
    idea: 'Scene 1: An adult ranch hand hears an eerie whistle from an empty corral at sunset. Scene 2: Following the sound, the ranch hand finds wind passing through a loose gap in the gate\'s wooden slats. Scene 3: The ranch hand fixes the slat, enjoys a moment of silence, and then hears a nearby companion playfully copy the whistle. Keep the same corral, gate, and sunset direction through all three scenes.',
  },
  {
    id: 'cafe-cup-rhythm', title: 'The Café Cup Beat', genre: 'Musical',
    idea: 'Scene 1: An adult café worker taps an empty cup while waiting for the last customer to finish. Scene 2: The customer answers with a gentle tabletop rhythm, and the worker builds a short call-and-response using a spoon and saucer. Scene 3: They land the final beat together, exchange a grin, and quietly stack the dishes. Use an original percussive rhythm without lyrics and keep the sound sources visible.',
  },
  {
    id: 'umbrella-mixup-meet', title: 'Umbrella Mix-Up', genre: 'Romantic Comedy',
    idea: 'Scene 1: Two adult strangers reach for identical navy umbrellas in a café stand and each insists theirs is the dry one. Scene 2: They inspect the handles and discover one carries a small star charm while the other has a handwritten name tag. Scene 3: With the umbrellas correctly returned, they step outside together and discover the rain has stopped, laughing as they fold both umbrellas again. Keep the charm and name tag attached to their original umbrellas.',
  },
  {
    id: 'bowling-last-pin', title: 'One Pin Left', genre: 'Sports Underdog',
    idea: 'Scene 1: An adult beginner bowler leaves a single pin standing and droops with disappointment. Scene 2: The bowler pauses, watches that pin, and makes a calmer second attempt while a friend waits quietly in the seating area behind the bowler. Scene 3: The ball knocks down the final pin, and the pair celebrate the small improvement rather than an invented championship win. Keep the same lane, ball color, and remaining pin position continuous.',
  },
  {
    id: 'laundry-shadow-ghost', title: 'The Laundry Ghost', genre: 'Horror',
    idea: 'Create a gentle spooky short with a comic reveal. Scene 1: An adult hears scratching in a dim laundry room and sees a tall sheet-shaped shadow swaying behind a clothes rack. Scene 2: The person cautiously turns on the room light and notices a tail poking beneath the hanging sheet. Scene 3: A household cat steps out, dragging a snagged clothespin, and the person relaxes while the ordinary sheet sways to a stop. Keep the cat realistically proportioned and avoid injury or gore.',
  },
  {
    id: 'old-photo-bench-reunion', title: 'The Bench in the Photo', genre: 'Nostalgic Drama',
    idea: 'Scene 1: Two older adult friends bring a decades-old photo of themselves on a park bench to the same park. Scene 2: They search the changed paths and recognize the old bench from its carved sunflower on one armrest. Scene 3: They sit in their original positions and take a new photo, holding the old picture between them. Preserve each person\'s current age and appearance; show the younger versions only inside the old photograph.',
  },
  {
    id: 'lantern-ferry-crossing', title: 'The Lantern Ferry', genre: 'Buddy Adventure',
    idea: 'Create an animated fantasy adventure. Scene 1: An upright fox ferryman prepares to cross a misty pond, but the boat lantern flickers out as a tiny winged moth asks for passage. Scene 2: The moth reveals a magical soft glow and flies beside the bow, illuminating the familiar marker posts while the fox rows. Scene 3: They reach the opposite dock safely, and the fox offers the moth a sheltered perch beside the lantern for future crossings. Preserve the same small wooden boat, fox coat, and moth wing markings; the glow is explicitly magical.',
  },
];
