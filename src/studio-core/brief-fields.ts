import { ERA_CHOICES } from './era-direction';
import { STORY_STARTERS } from './story-starters';
export const BRIEF_CATEGORIES = ['storyIdea','characterDescription','storyGoal','obstacle','endingChange','characterGoals','setting','era','duration','targetAudience','productService','callToAction','dialogueMustHaves','onScreenText'] as const;
export type BriefCategory = typeof BRIEF_CATEGORIES[number];
export type BriefChoice = {label:string;value:string;group?:string};
const choices=(values:string[]):BriefChoice[]=>values.map(value=>({label:value,value}));
export const BRIEF_CHOICES:Record<BriefCategory,BriefChoice[]> = {
 storyIdea:STORY_STARTERS.map(item=>({label:item.title,value:item.idea,group:item.genre})),
 characterDescription:STORY_STARTERS.map(item=>({label:item.cast.split(';').map(person=>person.trim().split(',')[0]).join(' + ').slice(0,110),value:item.cast,group:item.family})),
 storyGoal:choices(['Solve a practical problem','Reach a meaningful goal before time runs out','Repair a strained relationship','Reveal the answer to a small mystery','Show a useful transformation','Make an everyday situation unexpectedly funny']),
 obstacle:choices(['A plan fails at the worst moment','Two characters want different things','Time or resources are running out','A small mistake creates a bigger problem','An important clue has been misunderstood','Fear or doubt makes the next step difficult']),
 endingChange:choices(['The problem is solved through cooperation','An unexpected twist changes what the audience believed','The character gains confidence or understanding','A relationship becomes stronger','A visual punchline pays off the setup','A satisfying reveal leaves one question open for the next episode']),
 characterGoals:choices(['Protect something important','Earn another character’s trust','Prove they can solve the problem','Help someone despite their own hesitation','Find the truth without causing harm','Accept help and work as a team']),
 setting:[...STORY_STARTERS.map(item=>({label:item.title,value:item.setting})),...choices(['A sunlit neighborhood shop with clear work surfaces and familiar props','A cozy home kitchen during a busy morning','A quiet park with a path, benches, and consistent afternoon light','A small workshop filled with tools and one central workbench','A lively city street just after rain','A miniature woodland village with tactile natural materials'])],
 era:choices(ERA_CHOICES),
 duration:choices(['15 seconds','30 seconds','45 seconds','60 seconds','90 seconds','2 minutes']),
 targetAudience:choices(['General audiences who enjoy short visual stories','Beginners learning the demonstrated skill','Viewers who enjoy warm character comedy','Viewers who enjoy mystery and discovery','Potential customers interested in the featured product or service']),
 productService:choices(['A handmade product shown through its real use','A practical service demonstrated through one clear benefit','A class or workshop shown through a small transformation','A digital resource shown solving one specific problem']),
 callToAction:choices(['Follow for the next chapter','Save this idea for later','Share this with someone who would enjoy it','Explore the featured product or service','Try the demonstrated technique']),
 dialogueMustHaves:[],onScreenText:[],
};
