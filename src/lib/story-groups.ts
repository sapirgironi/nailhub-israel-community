// Groups active stories into one circle per author: own first, then by newest story; items oldest→newest.
export function groupStories<T extends {user_id:string;created_at:string}>(stories:T[],selfId:string){
 const map=new Map<string,T[]>();
 for(const s of [...stories].sort((a,b)=>a.created_at.localeCompare(b.created_at))){const l=map.get(s.user_id)??[];l.push(s);map.set(s.user_id,l);}
 return [...map.entries()].map(([userId,items])=>({userId,items})).sort((a,b)=>a.userId===selfId?-1:b.userId===selfId?1:b.items[b.items.length-1]!.created_at.localeCompare(a.items[a.items.length-1]!.created_at));
}
