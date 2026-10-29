import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {UserRound} from 'lucide-react';
import {findCommunityMembers} from '@/lib/community.functions';
import type {MentionMember} from '@/lib/story-layout';
import {Button} from './ui/button';
import {PhotoImage} from './PhotoImage';
export function StoryMentionPicker({query,onSelect}:{query:string;onSelect:(member:MentionMember)=>void}){
 const [term,setTerm]=useState(query);useEffect(()=>{const timer=setTimeout(()=>setTerm(query),200);return()=>clearTimeout(timer);},[query]);
 const find=useServerFn(findCommunityMembers);const members=useQuery({queryKey:['mention-members',term],queryFn:()=>find({data:{query:term}}),staleTime:30_000});
 return <div role="listbox" aria-label="חברות לתיוג" className="max-h-48 overflow-y-auto border border-border bg-popover rounded-lg shadow-soft p-1">
 {members.isPending&&<p className="text-sm p-2">טוענת חברות...</p>}{members.isError&&<p role="alert" className="text-sm p-2">טעינת חברות הקהילה נכשלה</p>}
 {members.data?.length===0&&<p className="text-sm p-2">לא נמצאו חברות</p>}
 {members.data?.map(m=><Button key={m.id} role="option" aria-selected={false} variant="ghost" className="w-full h-auto justify-start text-right py-2 whitespace-normal" onPointerDown={e=>e.preventDefault()} onClick={()=>onSelect(m)}>
 <span className="w-9 h-9 shrink-0 rounded-full overflow-hidden bg-accent grid place-items-center">{m.avatar_url?<PhotoImage src={m.avatar_url} alt="" className="w-full h-full object-cover"/>:<UserRound/>}</span><span>{m.display_name}{m.business_name&&<span className="block text-xs text-muted-foreground">{m.business_name}</span>}</span>
 </Button>)}
 </div>;
}