import {useEffect,useRef,useState} from 'react';
import {Link, useSearch} from '@tanstack/react-router';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Sparkles,Bookmark,Trash2,Plus,ImagePlus,Copy,Check,RotateCcw,Heart,MessageCircle,Handshake,X,Send,ChevronRight,ChevronLeft,Eye,Flag,Pin} from 'lucide-react';
import {supabase} from '@/integrations/supabase/client';
import {HebrewPhotoInput} from './HebrewPhotoInput';
import {takeStory,onStoryQueued} from '@/lib/story-handoff';
import {StoryEditor} from './StoryEditor';
import {Button} from './ui/button';
import type {HubSection} from './HubShell';
import {PostDraftWriter} from './PostDraftWriter';
import {plainText,whatsappLink} from '@/lib/input-security';
import {publishComment} from '@/lib/moderation.functions';
import {calculatePrice,healthSchema,insuranceSchema,priceItemSchema} from '@/lib/hub-tools';
import type {Database} from '@/integrations/supabase/types';

const field='text-right w-full border border-input rounded-lg bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring';
type Row<T extends keyof Database['public']['Tables']>=Database['public']['Tables'][T]['Row'];
type Person={id:string;fullName:string;businessName:string;phone:string;city:string;role:string};
function Entry({label,children}:{label:string;children:React.ReactNode}){return <label className="block space-y-1.5 text-xs font-bold"><span>{label}</span>{children}</label>}
function Notice({text}:{text:string}){return <p role="status" className="text-sm text-muted-foreground py-4">{text}</p>}
function Heading({title}:{title:string}){return <h1 className="font-black text-2xl mb-6">{title}</h1>}
export function HubWorkspace({section,user}:{section:HubSection;user:Person}){
 if(section==='draft')return <PostDraftWriter/>;
 if(section==='calculator')return <PricingCalculator/>;
 if(section==='health_form')return <HealthForm user={user}/>;
 if(section==='insurance')return <InsuranceForm user={user}/>;
 if(section==='pricelist')return <PriceList user={user}/>;
 if(section==='nailtrade')return <Trade user={user}/>;
 return <Feed user={user} savedOnly={section==='saved'}/>;
}
async function photoUrl(value:string){
 if(value.startsWith('community-work/')){const {data,error}=await supabase.storage.from('community-work').createSignedUrl(value.slice(15),3600);if(error)throw error;return data.signedUrl;}
 try{const url=new URL(value);return url.protocol==='https:'?url.href:'';}catch{return '';}
}
async function uploadPhoto(file:File,userId:string){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('בחרי תמונה בגודל של עד 5 מגה־בייט');
 const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
 const path=`${userId}/${crypto.randomUUID()}.${ext}`;
 const {error}=await supabase.storage.from('community-work').upload(path,file,{contentType:file.type});if(error)throw error;return `community-work/${path}`;
}
function StoriesBar({user}:{user:Person}){
 const qc=useQueryClient();const [viewer,setViewer]=useState<number|null>(null);const [progress,setProgress]=useState(0);const [paused,setPaused]=useState(false);const [msg,setMsg]=useState('');const [viewersFor,setViewersFor]=useState<string|null>(null);
 const stories=useQuery({queryKey:['hub-stories'],queryFn:async()=>{const {data,error}=await supabase.from('stories').select('*').order('created_at',{ascending:false});if(error)throw error;return Promise.all(data.map(async s=>({...s,displayUrl:await photoUrl(s.media_url)})));}});
 useEffect(()=>{if(viewer===null||paused)return;const total=stories.data?.length??0;const t=setInterval(()=>{setProgress(p=>{if(p>=100){if(viewer<total-1){setViewer(viewer+1);return 0;}setViewer(null);return 0;}return p+2;});},100);return()=>clearInterval(t);},[viewer,paused,stories.data?.length]);
 const [draft,setDraft]=useState<File|null>(null);
 async function addStory(f:File){setMsg('');const media_url=await uploadPhoto(f,user.id);const {error}=await supabase.from('stories').insert({user_id:user.id,media_url});if(error)throw error;setDraft(null);await qc.invalidateQueries({queryKey:['hub-stories']});}
 async function removeStory(id:string){const {error}=await supabase.from('stories').delete().eq('id',id);if(error){setMsg('מחיקת הסטורי נכשלה');return;}setViewer(null);await qc.invalidateQueries({queryKey:['hub-stories']});}
 const current=viewer!==null?stories.data?.[viewer]:null;
 useEffect(()=>{if(!current||current.user_id===user.id)return;void supabase.from('story_views').upsert({story_id:current.id,viewer_id:user.id,viewer_name:user.businessName||user.fullName},{onConflict:'story_id,viewer_id',ignoreDuplicates:true}).then(({error})=>{if(error)setMsg('רישום הצפייה נכשל');});},[current?.id]);
 const storyInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{const consume=()=>{const f=takeStory();if(f)setDraft(f);};consume();return onStoryQueued(consume);},[]);
 return <>{draft&&<StoryEditor file={draft} onCancel={()=>setDraft(null)} onPublish={addStory}/>}<section aria-label="סטוריז מהקהילה" className="flex items-start gap-4 overflow-x-auto pb-3 mb-6 bg-card rounded-3xl border border-border shadow-soft p-4">
  <input ref={storyInput} aria-label="העלאת סטורי" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)setDraft(f);}}/>
  <button type="button" aria-label="הוספת סטורי חדש" onClick={()=>storyInput.current?.click()} className="shrink-0 w-[4.5rem] flex flex-col items-center gap-1.5 text-center">
   <span className="relative w-[4.5rem] h-[4.5rem] rounded-full border-2 border-dashed border-primary/50 bg-primary/5 flex items-center justify-center"><Plus className="w-7 h-7 text-primary"/></span>
   <span className="text-[11px] font-bold leading-tight text-foreground">הסטורי שלי</span>
  </button>
  {(stories.data??[]).map((s,i)=><button type="button" key={s.id} aria-label="פתיחת סטורי" onClick={()=>{setViewer(i);setProgress(0);}} className="shrink-0 w-[4.5rem] flex flex-col items-center gap-1.5 text-center">
   <span className="w-[4.5rem] h-[4.5rem] rounded-full p-[3px] bg-gradient-to-tr from-primary via-ring to-accent"><span className="block w-full h-full rounded-full overflow-hidden border-2 border-card bg-muted">{s.displayUrl&&<img src={s.displayUrl} alt="סטורי מהקהילה" className="w-full h-full object-cover"/>}</span></span>
   <span className="w-full truncate text-[11px] font-bold leading-tight text-primary">{s.user_id===user.id?(user.businessName||'הסטורי שלך'):'חברת קהילה'}</span>
  </button>)}
  {stories.isError&&<Notice text="טעינת הסטוריז נכשלה"/>}{msg&&<Notice text={msg}/>}
 </section>
 {current&&<div role="dialog" aria-modal="true" aria-label="צפייה בסטורי" onPointerDown={()=>setPaused(true)} onPointerUp={()=>setPaused(false)} className="fixed inset-0 z-50 bg-black flex flex-col p-4">
  <div className="flex gap-1.5 w-full mb-3">{(stories.data??[]).map((s,i)=><div key={s.id} className="flex-1 bg-white/20 h-1 rounded-full overflow-hidden"><div className="bg-white h-full" style={{width:i===viewer?`${progress}%`:i<(viewer??0)?'100%':'0%'}}/></div>)}</div>
  <div className="flex items-center justify-between text-white">
   <span className="font-extrabold text-sm">{current.user_id===user.id?user.businessName:'חברת קהילה'}</span>
   <div className="flex items-center gap-1">
    {current.user_id===user.id&&<Button size="icon" variant="ghost" aria-label="רשימת הצופות בסטורי" title="מי צפתה" onClick={()=>setViewersFor(current.id)}><Eye className="text-white"/></Button>}
    {current.user_id===user.id&&<Button size="icon" variant="ghost" aria-label="מחיקת סטורי" title="מחיקת סטורי" onClick={()=>removeStory(current.id)}><Trash2 className="text-white"/></Button>}
    <Button size="icon" variant="ghost" aria-label="סגירת הסטורי" title="סגירה" onClick={()=>setViewer(null)}><X className="text-white"/></Button>
   </div>
  </div>
  <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden rounded-2xl">
   {current.displayUrl&&<img src={current.displayUrl} alt="סטורי" className="max-h-full max-w-full object-contain pointer-events-none"/>}
   {viewer!==null&&viewer>0&&<Button size="icon" variant="ghost" aria-label="סטורי קודם" className="absolute right-2" onClick={()=>{setViewer(viewer-1);setProgress(0);}}><ChevronRight className="text-white"/></Button>}
   {viewer!==null&&viewer<(stories.data?.length??0)-1&&<Button size="icon" variant="ghost" aria-label="סטורי הבא" className="absolute left-2" onClick={()=>{setViewer(viewer+1);setProgress(0);}}><ChevronLeft className="text-white"/></Button>}
  </div>
  {current.caption&&<p className="text-white text-sm text-center">{current.caption}</p>}
 </div>}
 {viewersFor&&<StoryViewersModal storyId={viewersFor} onClose={()=>setViewersFor(null)}/>}</>;
}
function StoryViewersModal({storyId,onClose}:{storyId:string;onClose:()=>void}){
 const views=useQuery({queryKey:['hub-story-views',storyId],queryFn:async()=>{const {data,error}=await supabase.from('story_views').select('*').eq('story_id',storyId).order('viewed_at',{ascending:false});if(error)throw error;return data;}});
 return <div className="fixed inset-0 z-[60] bg-overlay flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label="רשימת הצופות בסטורי" className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full space-y-4 text-right max-h-[80vh] overflow-y-auto">
  <div className="flex items-center justify-between"><h2 className="font-bold">מי צפתה בסטורי</h2><Button size="icon" variant="ghost" aria-label="סגירת רשימת הצופות" onClick={onClose}><X/></Button></div>
  {views.isError&&<Notice text="טעינת רשימת הצופות נכשלה"/>}
  {views.isPending&&<Notice text="טוענת צפיות..."/>}
  {views.data&&(views.data.length===0?<Notice text="עדיין אף אחת לא צפתה בסטורי"/>:<ul className="space-y-3">{views.data.map(v=><li key={v.id} className="flex items-center justify-between gap-2 text-sm border-b border-border pb-2"><span className="font-bold break-words">{v.viewer_name}</span><time className="text-xs text-muted-foreground shrink-0">{new Date(v.viewed_at).toLocaleString('he-IL')}</time></li>)}</ul>)}
 </div></div>;
}
function CommentsModal({post,user,onClose}:{post:Row<'posts'>;user:Person;onClose:()=>void}){
 const qc=useQueryClient();const [text,setText]=useState('');const [msg,setMsg]=useState('');const [checking,setChecking]=useState(false);
 const [blocked,setBlocked]=useState<{flagged:string[];suggestion:string}|null>(null);
 const comments=useQuery({queryKey:['hub-comments',post.id],queryFn:async()=>{const {data,error}=await supabase.from('post_comments').select('*').eq('post_id',post.id).order('created_at');if(error)throw error;return data;}});
 async function insertComment(body:string){if(checking)return false;setMsg('');setChecking(true);try{const result=await publishComment({data:{postId:post.id,body}});if(result.error){setMsg(result.error);return false;}if(!result.ok){setBlocked({flagged:result.flagged,suggestion:result.suggestion});return false;}setText('');setBlocked(null);await qc.invalidateQueries({queryKey:['hub-comments']});return true;}catch{setMsg('פרסום התגובה נכשל. נסי שוב');return false;}finally{setChecking(false);}}
 async function send(e:React.FormEvent){e.preventDefault();const parsed=plainText(500).safeParse(text);if(!parsed.success||!parsed.data){setMsg('התגובה חייבת להיות טקסט רגיל עד 500 תווים');return;}setMsg('');await insertComment(parsed.data);}
 async function remove(id:string){const {error}=await supabase.from('post_comments').delete().eq('id',id);if(error){setMsg('מחיקת התגובה נכשלה');return;}await qc.invalidateQueries({queryKey:['hub-comments']});}
 return <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label="תגובות לעבודה" className="bg-card border border-border rounded-3xl p-6 max-w-md w-full space-y-4 text-right max-h-[80vh] overflow-y-auto">
  <div className="flex items-center justify-between"><h2 className="font-bold">תגובות</h2><Button size="icon" variant="ghost" aria-label="סגירת התגובות" onClick={onClose}><X/></Button></div>
  {comments.isError&&<Notice text="טעינת התגובות נכשלה"/>}
  {(comments.data??[]).length===0?<Notice text="היי הראשונה להגיב"/>:comments.data?.map(c=><div key={c.id} className="border-b border-border pb-3 flex items-start justify-between gap-2"><div><span className="text-xs font-bold block">{c.user_id===user.id?user.businessName:'חברת קהילה'}</span><p className="text-sm whitespace-pre-wrap break-words">{c.body}</p></div>{c.user_id===user.id&&<Button size="icon" variant="ghost" aria-label="מחיקת תגובה" onClick={()=>remove(c.id)}><Trash2/></Button>}</div>)}
  <form onSubmit={send} className="flex gap-2"><input aria-label="כתיבת תגובה" disabled={checking||blocked!==null} placeholder="כתבי תגובה..." maxLength={500} value={text} onChange={e=>setText(e.target.value)} className={field}/><Button type="submit" size="icon" aria-label="שליחת תגובה" disabled={checking||blocked!==null}><Send/></Button></form>
  {checking&&<Notice text="בודקת את התגובה..."/>}
  {msg&&<Notice text={msg}/>}
  {blocked&&<div role="alertdialog" aria-label="התגובה נחסמה" className="border border-destructive/30 bg-destructive/5 rounded-2xl p-4 space-y-3">
   <p className="text-sm font-bold text-destructive">התגובה לא פורסמה עקב שימוש במילים שאינן תואמות את כללי הקהילה</p>
   {blocked.flagged.length>0&&<div className="flex flex-wrap gap-1.5">{blocked.flagged.map(w=><mark key={w} className="bg-destructive/15 text-destructive text-xs font-bold px-2 py-0.5 rounded-lg">{w}</mark>)}</div>}
   {blocked.suggestion&&<div className="bg-card border border-border rounded-xl p-3"><p className="text-[11px] font-bold text-muted-foreground mb-1">הצעה לנוסח מכבד:</p><p className="text-sm whitespace-pre-wrap break-words">{blocked.suggestion}</p></div>}
   <div className="flex flex-wrap gap-2">
    {blocked.suggestion&&<Button size="sm" disabled={checking} onClick={()=>void insertComment(blocked.suggestion)}>שליחת הנוסח החלופי</Button>}
    <Button size="sm" disabled={checking} variant="outline" onClick={()=>setBlocked(null)}>עריכה בעצמי</Button>
    <Button size="sm" disabled={checking} variant="ghost" onClick={()=>{setBlocked(null);setText('');}}>ביטול</Button>
   </div>
  </div>}
 </div></div>;
}
function CollabModal({post,user,onClose}:{post:Row<'posts'>;user:Person;onClose:()=>void}){
 const [note,setNote]=useState('');const [msg,setMsg]=useState('');const [sent,setSent]=useState(false);
 async function send(e:React.FormEvent){e.preventDefault();const parsed=plainText(500).safeParse(note);if(!parsed.success){setMsg('ההודעה חייבת להיות טקסט רגיל עד 500 תווים');return;}const {error}=await supabase.from('collab_offers').insert({post_id:post.id,sender_id:user.id,note:parsed.data});if(error){setMsg('שליחת ההצעה נכשלה');return;}if(post.author_id!==user.id)await supabase.from('notifications').insert({user_id:post.author_id,actor_id:user.id,actor_name:user.businessName||user.fullName,type:'collab',post_id:post.id,body:parsed.data.slice(0,120)});setSent(true);}
 return <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label="הצעת שיתוף פעולה" className="bg-card border border-border rounded-3xl p-6 max-w-md w-full space-y-4 text-right">
  <div className="flex items-center justify-between"><h2 className="font-bold">הצעת שת״פ</h2><Button size="icon" variant="ghost" aria-label="סגירה" onClick={onClose}><X/></Button></div>
  {sent?<Notice text="ההצעה נשלחה ליוצרת העבודה"/>:<form onSubmit={send} className="space-y-4"><Entry label="מה מציעים?"><textarea aria-label="תוכן ההצעה" maxLength={500} required rows={4} value={note} onChange={e=>setNote(e.target.value)} className={field} placeholder="לדוגמה: שיתוף פעולה בצילומים, חילופי טיפולים..."/></Entry><Button type="submit"><Handshake/>שליחת הצעה</Button></form>}
  {msg&&<Notice text={msg}/>}
 </div></div>;
}
function OffersModal({post,onClose}:{post:Row<'posts'>;onClose:()=>void}){
 const offers=useQuery({queryKey:['hub-offers',post.id],queryFn:async()=>{const {data,error}=await supabase.from('collab_offers').select('*').eq('post_id',post.id).order('created_at',{ascending:false});if(error)throw error;return data;}});
 return <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label="הצעות שיתוף פעולה שהתקבלו" className="bg-card border border-border rounded-3xl p-6 max-w-md w-full space-y-4 text-right max-h-[80vh] overflow-y-auto">
  <div className="flex items-center justify-between"><h2 className="font-bold">הצעות שת״פ שהתקבלו</h2><Button size="icon" variant="ghost" aria-label="סגירה" onClick={onClose}><X/></Button></div>
  {offers.isError&&<Notice text="טעינת ההצעות נכשלה"/>}
  {(offers.data??[]).length===0?<Notice text="עדיין לא התקבלו הצעות"/>:offers.data?.map(o=><div key={o.id} className="border-b border-border pb-3"><p className="text-sm whitespace-pre-wrap break-words">{o.note}</p><time className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('he-IL')}</time></div>)}
 </div></div>;
}
function Feed({user,savedOnly}:{user:Person;savedOnly:boolean}){
 const routeSearch=useSearch({strict:false});
 const qc=useQueryClient();const [caption,setCaption]=useState('');const [file,setFile]=useState<File|null>(null);const [search,setSearch]=useState('');const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('');const [open,setOpen]=useState(false);const [deleting,setDeleting]=useState<Row<'posts'>|null>(null);
 const [commentPost,setCommentPost]=useState<Row<'posts'>|null>(null);const [collabPost,setCollabPost]=useState<Row<'posts'>|null>(null);const [offersPost,setOffersPost]=useState<Row<'posts'>|null>(null);const [heartPost,setHeartPost]=useState<string|null>(null);
 useEffect(()=>{if('compose' in routeSearch && routeSearch.compose===true)setOpen(true);},[routeSearch]);
 const saved=useQuery({queryKey:['hub-saved',user.id],queryFn:async()=>{const {data,error}=await supabase.from('saved_posts').select('*').eq('user_id',user.id);if(error)throw error;return data;}});
 const posts=useQuery({queryKey:['hub-posts',user.id],queryFn:async()=>{const {data,error}=await supabase.from('posts').select('*').order('created_at',{ascending:false});if(error)throw error;return Promise.all(data.map(async p=>({...p,displayUrl:await photoUrl(p.image_url)})));}});
 const likes=useQuery({queryKey:['hub-likes'],queryFn:async()=>{const {data,error}=await supabase.from('post_likes').select('*');if(error)throw error;return data;}});
 const comments=useQuery({queryKey:['hub-comments'],queryFn:async()=>{const {data,error}=await supabase.from('post_comments').select('id,post_id');if(error)throw error;return data;}});
 async function publish(e:React.FormEvent){e.preventDefault();setMsg('');const parsed=plainText(2000).safeParse(caption);if(!parsed.success||!file){setMsg('נדרשים תמונה וטקסט רגיל עד 2000 תווים');return;}setBusy(true);try{const image_url=await uploadPhoto(file,user.id);const {error}=await supabase.from('posts').insert({author_id:user.id,image_url,caption:parsed.data});if(error){const m=error.message??'';setMsg(m.includes('מכסה')?'הגעת למכסה היומית של 2 פוסטים ב־24 שעות. מחר יהיה אפשר שוב 💖':m.includes('ספק')?'חשבון ספק אינו יכול לפרסם בפיד הקהילה הכללי':m.includes('מושהה')?'החשבון מושהה כרגע ולא ניתן לפרסם':'הפרסום נכשל. נסי שוב');return;}await qc.invalidateQueries({queryKey:['hub-posts']});setOpen(false);setCaption('');setFile(null);setMsg('העבודה פורסמה');}catch{setMsg('הפרסום נכשל. בדקי את התמונה ונסי שוב');}finally{setBusy(false);}}
 async function reportPost(p:Row<'posts'>){const {error}=await supabase.from('reports').insert({reporter_id:user.id,post_id:p.id,reason:''});setMsg(error?'שליחת הדיווח נכשלה':'הדיווח נשלח להנהלה. תודה ששומרת על הקהילה 💖');}
 async function toggle(id:string){const existing=saved.data?.find(s=>s.post_id===id);const result=existing?await supabase.from('saved_posts').delete().eq('id',existing.id):await supabase.from('saved_posts').insert({user_id:user.id,post_id:id});if(result.error){setMsg('עדכון השמורים נכשל');return;}await qc.invalidateQueries({queryKey:['hub-saved',user.id]});}
 async function remove(p:Row<'posts'>){const {error}=await supabase.from('posts').delete().eq('id',p.id);if(error){setMsg('המחיקה נכשלה');return;}setDeleting(null);await qc.invalidateQueries({queryKey:['hub-posts']});}
 const liked=(id:string)=>likes.data?.some(l=>l.post_id===id&&l.user_id===user.id)??false;
 async function toggleLike(p:Row<'posts'>){const mine=likes.data?.find(l=>l.post_id===p.id&&l.user_id===user.id);const result=mine?await supabase.from('post_likes').delete().eq('id',mine.id):await supabase.from('post_likes').insert({post_id:p.id,user_id:user.id});if(result.error){setMsg('עדכון הלייק נכשל');return;}if(!mine&&p.author_id!==user.id)await supabase.from('notifications').insert({user_id:p.author_id,actor_id:user.id,actor_name:user.businessName||user.fullName,type:'like',post_id:p.id});await Promise.all([qc.invalidateQueries({queryKey:['hub-likes']}),qc.invalidateQueries({queryKey:['hub-posts']})]);}
 function doubleTap(p:Row<'posts'>){setHeartPost(p.id);setTimeout(()=>setHeartPost(null),850);if(!liked(p.id))void toggleLike(p);}
 const list=(posts.data??[]).filter(p=>(!savedOnly||saved.data?.some(s=>s.post_id===p.id))&&(!search||(p.caption??'').includes(search))).sort((a,b)=>Number(b.is_pinned)-Number(a.is_pinned));
 return <>{!savedOnly&&<StoriesBar user={user}/>}<div className="grid grid-cols-[minmax(0,1fr)_auto] sm:flex items-start justify-between gap-3"><Heading title={savedOnly?'השמורים שלי':'הפיד המקצועי'}/>{!savedOnly&&<Button onClick={()=>setOpen(!open)}><Plus/>פרסום עבודה</Button>}</div>
 <input aria-label="חיפוש עבודות" placeholder="חיפוש עבודות וטכניקות..." value={search} onChange={e=>setSearch(e.target.value)} className={`${field} mb-6`}/>
 {open&&<form onSubmit={publish} className="border-y border-border py-5 mb-6 space-y-4"><Entry label="תמונת העבודה"><HebrewPhotoInput label="תמונת העבודה" onChange={setFile}/></Entry><Entry label="כיתוב לפוסט"><textarea aria-label="כיתוב לפוסט" maxLength={2000} required rows={3} value={caption} onChange={e=>setCaption(e.target.value)} className={field}/></Entry><Button disabled={busy} type="submit"><ImagePlus/>{busy?'מפרסמת...':'פרסום לפיד'}</Button></form>}
 {deleting&&<div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label="מחיקת עבודה" className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full space-y-4 text-right"><h2 className="font-bold">למחוק את העבודה?</h2><p className="text-sm text-muted-foreground">לא ניתן לשחזר עבודה שנמחקה.</p><div className="flex gap-2"><Button variant="destructive" onClick={()=>remove(deleting)}>מחיקה</Button><Button variant="outline" onClick={()=>setDeleting(null)}>ביטול</Button></div></div></div>}
 {commentPost&&<CommentsModal post={commentPost} user={user} onClose={()=>setCommentPost(null)}/>}
 {collabPost&&<CollabModal post={collabPost} user={user} onClose={()=>setCollabPost(null)}/>}
 {offersPost&&<OffersModal post={offersPost} onClose={()=>setOffersPost(null)}/>}
 {msg&&<Notice text={msg}/>} {(posts.isError||saved.isError||likes.isError)&&<Notice text="טעינת העבודות נכשלה"/>}{posts.isPending?<Notice text="טוענת עבודות..."/>:list.length===0?<div className="py-16 text-center border-y border-border"><Sparkles className="mx-auto text-primary mb-3"/><p className="font-bold">{savedOnly?'אין עדיין עבודות שמורות':'אין עדיין עבודות בפיד'}</p></div>:<div className="grid md:grid-cols-2 gap-6">{list.map(p=><article key={p.id} className="bg-card border border-border rounded-3xl shadow-soft overflow-hidden">{p.is_pinned&&<div className="bg-accent text-primary text-[11px] font-black px-4 py-1.5 flex items-center gap-1.5"><Pin className="w-3 h-3"/>נעוץ על ידי ההנהלה</div>}<div className="flex items-center justify-between p-4"><span className="text-xs font-bold">{p.author_id===user.id?user.businessName:'עבודה מהקהילה'}</span><div className="flex items-center gap-2"><time className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString('he-IL')}</time>{p.author_id!==user.id&&<Button size="icon" variant="ghost" aria-label="דיווח על הפוסט" title="דיווח" onClick={()=>reportPost(p)}><Flag/></Button>}{p.author_id!==user.id&&<Button size="sm" variant="outline" onClick={()=>setCollabPost(p)}><Handshake/>הצעת שת״פ</Button>}</div></div>
 <div onDoubleClick={()=>doubleTap(p)} className="relative cursor-pointer">{p.displayUrl&&<img src={p.displayUrl} alt="עבודת ציפורניים" className="w-full h-auto object-contain bg-card"/>}{heartPost===p.id&&<div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Heart className="w-20 h-20 text-primary fill-primary animate-ping opacity-90 drop-shadow-xl"/></div>}</div>
 <div className="p-5"><p className="text-sm whitespace-pre-wrap break-words mb-4">{p.caption}</p><div className="flex items-center justify-between"><div className="flex items-center gap-1"><Button size="icon" variant="ghost" aria-label="לייק לעבודה" title="לייק" onClick={()=>toggleLike(p)}><Heart className={liked(p.id)?'fill-primary text-primary':''}/></Button><span className="text-xs font-bold">{p.likes_count??0}</span><Button size="icon" variant="ghost" aria-label="תגובות לעבודה" title="תגובות" onClick={()=>setCommentPost(p)}><MessageCircle/></Button><span className="text-xs font-bold">{comments.data?.filter(c=>c.post_id===p.id).length??0}</span><Button size="icon" variant="ghost" aria-label="שמירת עבודה" title="שמירת עבודה" onClick={()=>toggle(p.id)}><Bookmark className={saved.data?.some(s=>s.post_id===p.id)?'fill-primary text-primary':''}/></Button></div><div className="flex items-center gap-1">{p.author_id===user.id&&<><Button size="sm" variant="ghost" onClick={()=>setOffersPost(p)}><Handshake/>הצעות</Button><Button size="icon" variant="ghost" aria-label="מחיקת עבודה" title="מחיקת עבודה" onClick={()=>setDeleting(p)}><Trash2/></Button></>}</div></div></div></article>)}</div>}</>;
}
function PricingCalculator(){const [c,setC]=useState({monthlyExpenses:2500,targetSalary:12000,monthlyHours:120,duration:1.5,materials:25});let result;try{result=calculatePrice(c);}catch{result=null;}
 return <><Heading title="מחשבון תמחור ורווחיות"/><div className="max-w-xl space-y-5">{([['monthlyExpenses','הוצאות קבועות בחודש (₪)'],['targetSalary','משכורת רצויה (₪)'],['monthlyHours','שעות עבודה בחודש'],['duration','משך טיפול בשעות'],['materials','עלות חומרים לטיפול (₪)']]as const).map(([key,label])=><Entry key={key} label={label}><input type="number" min={key==='monthlyHours'||key==='duration'?0.1:0} step="any" value={c[key]} onChange={e=>setC({...c,[key]:Number(e.target.value)})} className={field}/></Entry>)}{result?<div className="border-t border-border pt-6 flex justify-between items-center gap-4"><span className="font-bold text-sm">מחיר מינימום מומלץ לטיפול</span><output className="text-3xl font-black text-primary">{result.minimum} ₪</output></div>:<Notice text="הזיני שעות ומשך טיפול גדולים מאפס"/>}</div></>;
}
function HealthForm({user}:{user:Person}){
 const canvas=useRef<HTMLCanvasElement>(null);const pad=useRef<import('signature_pad').default|null>(null);const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);
 const [f,setF]=useState({full_name:'',id_number:'',phone:'',birth_date:'',has_allergies:false,allergies_details:'',has_diabetes:false,takes_blood_thinners:false,has_skin_or_nail_infections:false,is_pregnant:false,additional_notes:''});
 const qc=useQueryClient();const records=useQuery({queryKey:['hub-health',user.id],queryFn:async()=>{const {data,error}=await supabase.from('health_declarations').select('id,full_name,created_at').order('created_at',{ascending:false});if(error)throw error;return data;}});
 useEffect(()=>{let alive=true;let cleanup=()=>{};import('signature_pad').then(({default:SignaturePad})=>{if(!alive||!canvas.current)return;const el=canvas.current;const style=getComputedStyle(el);el.width=Math.round(el.getBoundingClientRect().width*2);el.height=320;el.getContext('2d')?.scale(2,2);pad.current=new SignaturePad(el,{penColor:style.color,minWidth:1,maxWidth:2});cleanup=()=>pad.current?.off();});return()=>{alive=false;cleanup();};},[]);
 async function submit(e:React.FormEvent){e.preventDefault();const parsed=healthSchema.safeParse(f);if(!parsed.success||!pad.current||pad.current.isEmpty()){setMsg('מלאי פרטים תקינים, תעודת זהות בת 9 ספרות וחתימה');return;}setBusy(true);const {error}=await supabase.from('health_declarations').insert({...parsed.data,birth_date:f.birth_date||null,user_id:user.id,signature_image:pad.current.toDataURL()});setBusy(false);if(error){setMsg('שמירת ההצהרה נכשלה');return;}setMsg('ההצהרה החתומה נשמרה בתיק הפרטי');pad.current.clear();await qc.invalidateQueries({queryKey:['hub-health']});}
 return <><Heading title="הצהרת בריאות חתומה"/><form onSubmit={submit} className="max-w-xl space-y-4"><div className="grid sm:grid-cols-2 gap-4">{([['full_name','שם הלקוחה'],['id_number','תעודת זהות'],['phone','טלפון']]as const).map(([key,label])=><Entry key={key} label={label}><input required maxLength={key==='id_number'?9:150} value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})} className={field}/></Entry>)}<Entry label="תאריך לידה"><input type="date" value={f.birth_date} onChange={e=>setF({...f,birth_date:e.target.value})} className={field}/></Entry></div>
 {([['has_allergies','אלרגיות ידועות'],['has_diabetes','סוכרת'],['takes_blood_thinners','נטילת מדללי דם'],['has_skin_or_nail_infections','זיהומים בעור או בציפורניים'],['is_pregnant','הריון']]as const).map(([key,label])=><label key={key} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={f[key]} onChange={e=>setF({...f,[key]:e.target.checked})}/>{label}</label>)}
 {f.has_allergies&&<Entry label="פירוט אלרגיות"><textarea maxLength={2000} value={f.allergies_details} onChange={e=>setF({...f,allergies_details:e.target.value})} className={field}/></Entry>}<Entry label="הערות נוספות"><textarea maxLength={2000} value={f.additional_notes} onChange={e=>setF({...f,additional_notes:e.target.value})} className={field}/></Entry>
 <p className="text-sm leading-relaxed">אני מצהירה כי כל הפרטים שמסרתי נכונים ומדויקים. הטיפול מבוצע על סמך הצהרה זו.</p><Entry label="חתימת הלקוחה"><canvas ref={canvas} aria-label="חתימת הלקוחה" className="w-full h-40 border border-input rounded-lg bg-card text-foreground touch-none"/></Entry><Button type="button" variant="ghost" onClick={()=>pad.current?.clear()}><RotateCcw/>ניקוי חתימה</Button><Button disabled={busy} type="submit"><Check/>{busy?'שומרת...':'שמירת הצהרה חתומה'}</Button>{msg&&<Notice text={msg}/>}</form><div className="border-t border-border mt-8 pt-5"><h2 className="font-bold mb-3">הצהרות שנשמרו</h2>{records.isError?<Notice text="טעינת ההצהרות נכשלה"/>:(records.data??[]).map(r=><div key={r.id} className="py-2 flex justify-between text-sm"><span>{r.full_name}</span><span>{new Date(r.created_at).toLocaleDateString('he-IL')}</span></div>)}</div></>;
}
function InsuranceForm({user}:{user:Person}){
 const qc=useQueryClient();const [f,setF]=useState({full_name:user.fullName,id_number:'',phone:user.phone,email:'',city_street:user.city,entity_type:'עוסק פטור',clinic_location:'חדר ייעודי בבית',equipment_value_nis:'35000',existing_insurance:'אין ביטוח כרגע',notes:''});const [consent,setConsent]=useState(false);const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);
 const leads=useQuery({queryKey:['hub-insurance',user.id],queryFn:async()=>{const {data,error}=await supabase.from('insurance_leads').select('id,created_at').eq('user_id',user.id);if(error)throw error;return data;}});
 async function submit(e:React.FormEvent){e.preventDefault();const parsed=insuranceSchema.safeParse(f);if(!parsed.success||!consent){setMsg('בדקי את הפרטים ואשרי שמירה פרטית של השאלון');return;}setBusy(true);const {error}=await supabase.from('insurance_leads').insert({...parsed.data,user_id:user.id,treatments:['טיפולי ציפורניים'],staff_status:'עובדת לבד',requested_coverages:['אחריות מקצועית']});setBusy(false);setMsg(error?'שמירת השאלון נכשלה':'השאלון נשמר באופן פרטי; לא נשלח לגורם חיצוני');if(!error)await qc.invalidateQueries({queryKey:['hub-insurance']});}
 return <><Heading title="שאלון ביטוח מקצועי"/><form onSubmit={submit} className="max-w-xl space-y-4">{([['full_name','שם מלא'],['id_number','ת.ז / מספר עוסק'],['phone','טלפון'],['email','אימייל'],['city_street','עיר וכתובת'],['entity_type','סוג עוסק'],['clinic_location','מיקום הקליניקה'],['equipment_value_nis','שווי ציוד (₪)'],['existing_insurance','ביטוח קיים']]as const).map(([key,label])=><Entry key={key} label={label}><input required type={key==='email'?'email':key==='equipment_value_nis'?'number':'text'} min="0" maxLength={key==='id_number'?9:255} value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})} className={field}/></Entry>)}<Entry label="הערות"><textarea maxLength={2000} value={f.notes} onChange={e=>setF({...f,notes:e.target.value})} className={field}/></Entry><label className="flex gap-2 text-sm"><input required type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>אני מסכימה לשמירת הפרטים בתיק הפרטי שלי</label><Button type="submit" disabled={busy}>{busy?'שומרת...':'שמירת השאלון'}</Button>{msg&&<Notice text={msg}/>}</form><p className="text-sm text-muted-foreground mt-6">שאלונים שנשמרו: {leads.data?.length??0}</p></>;
}
function PriceList({user}:{user:Person}){
 const qc=useQueryClient();const [service,setService]=useState('');const [price,setPrice]=useState('');const [msg,setMsg]=useState('');const list=useQuery({queryKey:['hub-prices',user.id],queryFn:async()=>{const {data,error}=await supabase.from('price_list_items').select('*').eq('user_id',user.id).order('created_at');if(error)throw error;return data;}});
 async function add(e:React.FormEvent){e.preventDefault();const p=priceItemSchema.safeParse({service_name:service,price_nis:price});if(!p.success){setMsg('הזיני שם טיפול ומחיר תקין');return;}const {error}=await supabase.from('price_list_items').insert({...p.data,user_id:user.id});if(error){setMsg('שמירת המחיר נכשלה');return;}setService('');setPrice('');setMsg('הטיפול נוסף למחירון');await qc.invalidateQueries({queryKey:['hub-prices']});}
 async function copy(){try{await navigator.clipboard.writeText(`${user.businessName}\n${(list.data??[]).map(p=>`${p.service_name} — ${p.price_nis} ₪`).join('\n')}`);setMsg('המחירון הועתק');}catch{setMsg('לא ניתן להעתיק כרגע');}}
 return <><Heading title="מחירון דיגיטלי ממותג"/><div className="max-w-xl"><h2 className="font-bold text-primary mb-4">{user.businessName}</h2>{list.isError&&<Notice text="טעינת המחירון נכשלה"/>}{(list.data??[]).map(p=><div key={p.id} className="border-b border-border py-4 flex items-center gap-3"><span className="flex-1 text-sm break-words">{p.service_name}</span><span className="font-black text-primary">{p.price_nis} ₪</span><Button size="icon" variant="ghost" aria-label="מחיקת טיפול" onClick={async()=>{const {error}=await supabase.from('price_list_items').delete().eq('id',p.id);if(error){setMsg('המחיקה נכשלה');return;}await qc.invalidateQueries({queryKey:['hub-prices']});}}><Trash2/></Button></div>)}<form onSubmit={add} className="space-y-4 mt-6"><Entry label="שם הטיפול"><input required maxLength={150} value={service} onChange={e=>setService(e.target.value)} className={field}/></Entry><Entry label="מחיר (₪)"><input required type="number" min="0" value={price} onChange={e=>setPrice(e.target.value)} className={field}/></Entry><Button type="submit"><Plus/>הוספת טיפול</Button><Button type="button" variant="outline" className="mr-2" disabled={!list.data?.length} onClick={copy}><Copy/>העתקת מחירון</Button></form>{msg&&<Notice text={msg}/>}</div></>;
}
function Trade({user}:{user:Person}){
 const qc=useQueryClient();const [open,setOpen]=useState(false);const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);const [f,setF]=useState({title:'',price:'',description:''});const [file,setFile]=useState<File|null>(null);
 const list=useQuery({queryKey:['hub-trade',user.id],queryFn:async()=>{const {data,error}=await supabase.from('nail_trade_items').select('*').order('created_at',{ascending:false});if(error)throw error;return Promise.all(data.map(async t=>({...t,photo:t.photos?.[0]?await photoUrl(t.photos[0]):''})));}});
 async function add(e:React.FormEvent){e.preventDefault();if(!plainText(150).safeParse(f.title).success||!plainText(2000).safeParse(f.description).success||!file||!Number.isFinite(Number(f.price))||Number(f.price)<0){setMsg('בדקי את פרטי הפריט ובחרי תמונה');return;}setBusy(true);try{const photo=await uploadPhoto(file,user.id);const {error}=await supabase.from('nail_trade_items').insert({title:f.title,price_nis:Number(f.price),description:f.description,seller_id:user.id,city:user.city,phone:user.phone,photos:[photo],category:'ציוד ציפורניים',condition:'משומש',delivery_type:'איסוף עצמי'});if(error)throw error;setOpen(false);setF({title:'',price:'',description:''});await qc.invalidateQueries({queryKey:['hub-trade']});setMsg('הפריט נשמר');}catch{setMsg('שמירת הפריט נכשלה');}finally{setBusy(false);}}
 return <><div className="flex justify-between gap-3"><div className="min-w-0"><Heading title="ציוד יד שנייה"/><Button asChild variant="outline" className="mb-4"><Link to="/boards">לוחות הקהילה</Link></Button></div><Button onClick={()=>setOpen(!open)}><Plus/>הוספת פריט</Button></div>{open&&<form onSubmit={add} className="space-y-4 border-y border-border py-5 mb-6">{([['title','שם הפריט'],['price','מחיר (₪)'],['description','תיאור ומצב']]as const).map(([key,label])=><Entry key={key} label={label}><input required type={key==='price'?'number':'text'} min="0" maxLength={2000} value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})} className={field}/></Entry>)}<Entry label="תמונת הפריט"><HebrewPhotoInput label="תמונת הפריט" onChange={setFile}/></Entry><Button type="submit" disabled={busy}>{busy?'שומרת...':'שמירת פריט'}</Button></form>}{msg&&<Notice text={msg}/>} {list.isError?<Notice text="טעינת הפריטים נכשלה"/>:!list.data?.length?<Notice text="אין עדיין פריטים"/>:<div className="grid md:grid-cols-2 gap-5">{list.data.map(t=><article key={t.id} className="rounded-3xl border border-border bg-card shadow-soft overflow-hidden">{t.photo&&<img src={t.photo} alt={t.title} className="w-full h-auto object-contain bg-card"/>}<div className="p-5 space-y-3"><h2 className="font-bold break-words">{t.title}</h2><p className="text-primary font-black">{t.price_nis} ₪</p><p className="text-sm whitespace-pre-wrap break-words">{t.description}</p>{whatsappLink(t.phone)&&<Button asChild variant="outline"><a href={whatsappLink(t.phone)??undefined} target="_blank" rel="noopener noreferrer">וואטסאפ למוכרת</a></Button>}</div></article>)}</div>}</>;
}
