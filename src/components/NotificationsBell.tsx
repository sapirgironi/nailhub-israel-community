import {useEffect,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Bell,Heart,MessageCircle,Handshake,X} from 'lucide-react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from './ui/button';

const labels:Record<string,string>={like:'אהבה את העבודה שלך',comment:'הגיבה על העבודה שלך',collab:'שלחה לך הצעת שיתוף פעולה'};
const icons:Record<string,typeof Heart>={like:Heart,comment:MessageCircle,collab:Handshake};

export function NotificationsBell(){
 const qc=useQueryClient();const [open,setOpen]=useState(false);const [uid,setUid]=useState<string|null>(null);
 useEffect(()=>{let alive=true;void supabase.auth.getUser().then(({data})=>{if(alive)setUid(data.user?.id??null);});return()=>{alive=false;};},[]);
 const list=useQuery({queryKey:['hub-notifications',uid],enabled:uid!==null,refetchInterval:30000,queryFn:async()=>{const {data,error}=await supabase.from('notifications').select('*').eq('user_id',uid!).order('created_at',{ascending:false}).limit(50);if(error)throw error;return data;}});
 const unread=(list.data??[]).filter(n=>!n.read).length;
 async function toggle(){
  const next=!open;setOpen(next);
  if(next&&unread>0&&uid){await supabase.from('notifications').update({read:true}).eq('user_id',uid).eq('read',false);await qc.invalidateQueries({queryKey:['hub-notifications',uid]});}
 }
 return <div className="relative">
  <Button size="icon" variant="ghost" aria-label="התראות" title="התראות" onClick={()=>void toggle()} className="relative">
   <Bell/>
   {unread>0&&<span className="absolute -top-1 -left-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black grid place-items-center">{unread}</span>}
  </Button>
  {open&&<div role="dialog" aria-label="התראות" className="absolute left-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-soft p-4 text-right">
   <div className="flex items-center justify-between mb-3"><h2 className="font-bold text-sm">התראות</h2><Button size="icon" variant="ghost" aria-label="סגירת התראות" onClick={()=>setOpen(false)}><X/></Button></div>
   {list.isError&&<p role="status" className="text-sm text-muted-foreground py-2">טעינת ההתראות נכשלה</p>}
   {list.isPending&&<p role="status" className="text-sm text-muted-foreground py-2">טוענת התראות...</p>}
   {list.data&&list.data.length===0&&<p role="status" className="text-sm text-muted-foreground py-2">אין התראות חדשות</p>}
   <ul className="space-y-3 max-h-80 overflow-y-auto">
    {(list.data??[]).map(n=>{const Icon=icons[n.type]??Bell;return <li key={n.id} className={`flex items-start gap-2 text-sm ${n.read?'opacity-70':''}`}>
     <span className="mt-0.5 w-7 h-7 shrink-0 rounded-full bg-accent text-primary grid place-items-center"><Icon className="w-3.5 h-3.5"/></span>
     <span className="min-w-0"><span className="font-bold">{n.actor_name}</span> {labels[n.type]??'עדכון חדש'}{n.body&&<span className="block text-xs text-muted-foreground truncate">{n.body}</span>}<time className="block text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString('he-IL')}</time></span>
    </li>;})}
   </ul>
  </div>}
 </div>;
}
