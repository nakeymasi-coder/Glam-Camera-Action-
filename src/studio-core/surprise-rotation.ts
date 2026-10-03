/** One full permutation per rotation. A new cycle never starts with the previous final item. */
export function shuffledIndices(length:number,seed:number,cycle:number):number[]{
 let state=(seed^(Math.imul(cycle+1,0x9e3779b1)))>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const result=Array.from({length},(_,index)=>index);
 for(let index=length-1;index>0;index--){const other=Math.floor(random()*(index+1));[result[index],result[other]]=[result[other],result[index]];}
 return result;
}
export function rotatedIndex(length:number,seed:number,cursor:number):number{
 if(length<1)throw Error('No story starters are available.');
 if(length===1)return 0;
 if(length===2)return shuffledIndices(length,seed,0)[cursor%2];
 const cycle=Math.floor(cursor/length),position=cursor%length,order=shuffledIndices(length,seed,cycle);
 if(cycle>0&&order[0]===shuffledIndices(length,seed,cycle-1)[length-1])[order[0],order[1]]=[order[1],order[0]];
 return order[position];
}
