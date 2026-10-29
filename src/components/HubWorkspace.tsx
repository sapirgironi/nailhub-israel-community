import {Component,useEffect,useRef,useState,type ErrorInfo,type ReactNode} from 'react';
import {Link, useSearch} from '@tanstack/react-router';
import {useInfiniteQuery,useQueries,useQuery,useQueryClient,type InfiniteData} from '@tanstack/react-query';
import {Sparkles,Bookmark,Trash2,Plus,ImagePlus,Copy,Check,RotateCcw,Heart,MessageCircle,Handshake,X,Send,ChevronRight,ChevronLeft,Eye,Flag,Pin,Palette,Type,Crown,Frame,ArrowUp,ArrowDown,AlignRight,AlignCenter,AlignLeft,Layers,Save,GripVertical} from 'lucide-react';
import {supabase} from '@/integrations/supabase/client';
import {HebrewPhotoInput} from './HebrewPhotoInput';
import {takeStory,onStoryQueued} from '@/lib/story-handoff';
import {StoryEditor} from './StoryEditor';
import {photoUrl,uploadPhoto} from '@/lib/media';
import {ImageUploadStatus} from './ImageUploadStatus';
import {FeedPostComposer} from './FeedPostComposer';
import {PhotoImage} from './PhotoImage';
import {PostCaption} from './PostCaption';
import {matchesPostSearch} from '@/lib/feed-post';
import {groupStories} from '@/lib/story-groups';
import {readMentions,type StoryMention} from '@/lib/story-layout';
import {Button} from './ui/button';
import type {HubSection} from './HubShell';
import {PostDraftWriter} from './PostDraftWriter';
import {ClinicHub} from './ClinicHub';
import {plainText,whatsappLink} from '@/lib/input-security';
import {publishComment} from '@/lib/moderation.functions';
import {healthSchema,insuranceSchema,priceItemSchema} from '@/lib/hub-tools';
import {calculateTreatment,TREATMENTS,LENGTHS,EFFECTS,EXPERIENCE,DEFAULT_OVERHEAD,type PricingInput,type LengthId} from '@/lib/pricing';
import {estimateMaterialCost} from '@/lib/pricing.functions';
import {useServerFn} from '@tanstack/react-start';
import type {Database} from '@/integrations/supabase/types';

const field='text-right w-full border border-input rounded-lg bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring';
const FEED_PAGE_SIZE=12;
const COMMENT_PAGE_SIZE=15;
type PageCursor={createdAt:string;id:string};
type Row<T extends keyof Database['public']['Tables']>=Database['public']['Tables'][T]['Row'];
type FeedRow=Row<'posts'>&{displayUrl:Row<'posts'>['image_url']};
type FeedPage={rows:FeedRow[];nextCursor:PageCursor|null};
type Person={id:string;fullName:string;businessName:string;phone:string;city:string;role:string};
type StoryInsert=Database['public']['Tables']['stories']['Insert'];
class FeedErrorBoundary extends Component<{children:ReactNode;fallback?:ReactNode},{hasError:boolean}>{
 override state={hasError:false};
 static getDerivedStateFromError(){return {hasError:true};}
 override componentDidCatch(error:Error,info:ErrorInfo){console.error('Feed rendering failed',error,info);}
 override render(){if(this.state.hasError)return this.props.fallback??<div role="alert" className="rounded-2xl border border-destructive/30 bg-card p-5 text-sm text-destructive">אירעה תקלה בתצוגת הפיד. ניתן לנסות לטעון מחדש.<Button type="button" variant="outline" className="mr-3" onClick={()=>this.setState({hasError:false})}>ניסיון חוזר</Button></div>;return this.props.children;}
}
function FeedItemBoundary({children}:{children:ReactNode}){return <FeedErrorBoundary fallback={<div role="alert" className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">לא ניתן להציג את הפריט הזה.</div>}>{children}</FeedErrorBoundary>;}
function Entry({label,children}:{label:string;children:React.ReactNode}){return <label className="block space-y-1.5 text-xs font-bold"><span>{label}</span>{children}</label>}
function Notice({text}:{text:string}){return <p role="status" className="text-sm text-muted-foreground py-4">{text}</p>}
function Heading({title}:{title:string}){return <h1 className="font-black text-2xl mb-6">{title}</h1>}
export function HubWorkspace({section,user}:{section:HubSection;user:Person}){
 if(section==='clinic')return <ClinicHub/>;
 if(section==='draft')return <PostDraftWriter/>;
 if(section==='calculator')return <PricingCalculator user={user}/>;
 if(section==='health_form')return <HealthForm user={user}/>;
 if(section==='insurance')return <InsuranceForm user={user}/>;
 if(section==='pricelist')return <PriceList user={user}/>;
 if(section==='nailtrade')return <Trade user={user}/>;
 return <FeedErrorBoundary><Feed user={user} savedOnly={section==='saved'}/></FeedErrorBoundary>;
}
function StoriesBar({user}:{user:Person}){
 const qc=useQueryClient();const [open,setOpen]=useState<{g:number;i:number}|null>(null);const [progress,setProgress]=useState(0);const [paused,setPaused]=useState(false);const [msg,setMsg]=useState('');const [viewersFor,setViewersFor]=useState<string|null>(null);
 const stories=useInfiniteQuery({queryKey:['hub-stories'],initialPageParam:null as PageCursor|null,queryFn:async({pageParam})=>{let query=supabase.from('stories').select('*').gte('created_at',new Date(Date.now()-24*60*60*1000).toISOString()).order('created_at',{ascending:true}).order('id',{ascending:true}).limit(30);if(pageParam)query=query.or(`created_at.gt.${pageParam.createdAt},and(created_at.eq.${pageParam.createdAt},id.gt.${pageParam.id})`);const {data,error}=await query;if(error)throw error;const last=data.at(-1);const rows=data.filter(story=>typeof story?.id==='string'&&typeof story?.user_id==='string'&&typeof story?.created_at==='string'&&typeof story?.media_url==='string'&&Boolean(story.media_url)).map(story=>({...story,media_url:story.media_url??'',caption:story.caption??null,created_at:story.created_at??'',alt_text:story.alt_text??null,background_media_url:story.background_media_url??null,mentions:story.mentions??[]}));return {rows,nextCursor:data.length===30&&typeof last?.created_at==='string'&&typeof last?.id==='string'?{createdAt:last.created_at,id:last.id}:null};},getNextPageParam:lastPage=>lastPage?.nextCursor??undefined});
 const storyRows=stories.data?.pages?.flatMap(page=>page?.rows??[])??[];
 const validStories=storyRows.flatMap(story=>{
  if(typeof story?.id!=='string'||typeof story?.user_id!=='string'||typeof story?.created_at!=='string'||typeof story?.media_url!=='string'||!story.media_url)return [];
  return [{...story,media_url:story.media_url??'',caption:story.caption??null,created_at:story.created_at??'',alt_text:story.alt_text??null,background_media_url:story.background_media_url??null,mentions:story.mentions??[]}];
 });
 const groups=groupStories(validStories,user.id);
 const group=open?groups[open.g]:undefined;const current=open&&group?group.items?.[open.i]??null:null;
 const next=()=>{setProgress(0);setOpen(o=>{if(!o)return o;const gr=groups[o.g];if(gr&&o.i<gr.items.length-1)return {g:o.g,i:o.i+1};if(o.g<groups.length-1)return {g:o.g+1,i:0};return null;});};
 const prev=()=>{setProgress(0);setOpen(o=>{if(!o)return o;if(o.i>0)return {g:o.g,i:o.i-1};if(o.g>0)return {g:o.g-1,i:0};return o;});};
 const nextRef=useRef(next);nextRef.current=next;
 useEffect(()=>{if(!open||paused)return;const t=setInterval(()=>{setProgress(p=>{if(p>=100){queueMicrotask(()=>nextRef.current());return 0;}return p+2;});},100);return()=>clearInterval(t);},[open?.g,open?.i,paused]);
 const [draft,setDraft]=useState<File|null>(null);
 async function addStory(f:File,alt:string,background_media_url:string,mentions:StoryMention[]){setMsg('');const media_url=await uploadPhoto(f,user.id);if(!media_url)throw new Error('העלאת תמונת הסטורי נכשלה');const payload:StoryInsert={user_id:user.id,media_url,caption:null,background_media_url:background_media_url||null,alt_text:alt?.trim()||null,mentions:Array.isArray(mentions)?mentions:[]};const {error}=await supabase.from('stories').insert(payload);if(error)throw error;setDraft(null);await qc.invalidateQueries({queryKey:['hub-stories']});}
 async function removeStory(id:string){const {error}=await supabase.from('stories').delete().eq('id',id);if(error){setMsg('מחיקת הסטורי נכשלה');return;}setOpen(null);await qc.invalidateQueries({queryKey:['hub-stories']});}
 useEffect(()=>{if(!current?.id||!current.user_id||current.user_id===user.id)return;void supabase.from('story_views').upsert({story_id:current.id,viewer_id:user.id,viewer_name:user.businessName||user.fullName},{onConflict:'story_id,viewer_id',ignoreDuplicates:true}).then(({error})=>{if(error)setMsg('רישום הצפייה נכשל');});},[current?.id]);
 const storyInput=useRef<HTMLInputElement>(null);const downAt=useRef(0);
 useEffect(()=>{const consume=()=>{const f=takeStory();if(f)setDraft(f);};consume();return onStoryQueued(consume);},[]);
 const nameOf=(uid:string)=>uid===user.id?(user.businessName||'הסטורי שלך'):'חברת קהילה';
 function tap(e:React.PointerEvent<HTMLDivElement>){setPaused(false);if(Date.now()-downAt.current>250)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX-r.left<r.width/2)next();else prev();}
 return <>{draft&&<StoryEditor file={draft} onCancel={()=>setDraft(null)} onPublish={addStory}/>}<section aria-label="סטוריז מהקהילה" className="flex items-start gap-4 overflow-x-auto pb-3 mb-6 bg-card rounded-3xl border border-border shadow-soft p-4">
  <input ref={storyInput} aria-label="העלאת סטורי" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)setDraft(f);}}/>
  <button type="button" aria-label="הוספת סטורי חדש" onClick={()=>storyInput.current?.click()} className="shrink-0 w-[4.5rem] flex flex-col items-center gap-1.5 text-center">
   <span className="relative w-[4.5rem] h-[4.5rem] rounded-full border-2 border-dashed border-primary/50 bg-primary/5 flex items-center justify-center"><Plus className="w-7 h-7 text-primary"/></span>
   <span className="text-[11px] font-bold leading-tight text-foreground">הסטורי שלי</span>
  </button>
  {groups.map((gr,gi)=><FeedItemBoundary key={gr.userId}><button type="button" aria-label={`פתיחת הסטוריז של ${nameOf(gr.userId)} (${gr.items?.length??0})`} onClick={()=>{setOpen({g:gi,i:0});setProgress(0);}} className="shrink-0 w-[4.5rem] flex flex-col items-center gap-1.5 text-center">
   <span className="w-[4.5rem] h-[4.5rem] rounded-full p-[3px] bg-gradient-to-tr from-primary via-ring to-accent"><span className="block w-full h-full rounded-full overflow-hidden border-2 border-card bg-muted">{gr.items?.at(-1)?.media_url&&<PhotoImage src={gr.items.at(-1)?.media_url??''} alt={gr.items.at(-1)?.alt_text||'סטורי מהקהילה'} className="w-full h-full object-cover"/>}</span></span>
   <span className="w-full truncate text-[11px] font-bold leading-tight text-primary">{nameOf(gr?.userId??'')}</span>
  </button></FeedItemBoundary>)}
  {stories.hasNextPage&&<Button type="button" variant="ghost" className="shrink-0 self-center text-xs" disabled={stories.isFetchingNextPage} onClick={()=>void stories.fetchNextPage()}>{stories.isFetchingNextPage?'טוענת...':'עוד סטוריז'}</Button>}
  {stories.isError&&<Notice text="טעינת הסטוריז נכשלה"/>}{msg&&<Notice text={msg}/>}
 </section>
 {current?.id&&group&&open&&<div role="dialog" aria-modal="true" aria-label="צפייה בסטורי" className="fixed inset-0 z-50 bg-black flex flex-col p-4">
  <div className="flex gap-1.5 w-full mb-3" aria-label={`סטורי ${open.i+1} מתוך ${group.items.length}`}>{group.items.map((s,i)=><div key={s.id} className="flex-1 bg-white/20 h-1 rounded-full overflow-hidden"><div className="bg-white h-full" style={{width:i===open.i?`${progress}%`:i<open.i?'100%':'0%'}}/></div>)}</div>
  <div className="flex items-center justify-between text-white">
   <span className="font-extrabold text-sm">{nameOf(current?.user_id??'')}</span>
   <div className="flex items-center gap-1">
    {current?.user_id===user.id&&<Button size="icon" variant="ghost" aria-label="רשימת הצופות בסטורי" title="מי צפתה" onClick={()=>setViewersFor(current?.id??'')}><Eye className="text-white"/></Button>}
    {current?.user_id===user.id&&<Button size="icon" variant="ghost" aria-label="מחיקת סטורי" title="מחיקת סטורי" onClick={()=>removeStory(current?.id??'')}><Trash2 className="text-white"/></Button>}
    <Button size="icon" variant="ghost" aria-label="סגירת הסטורי" title="סגירה" onClick={()=>setOpen(null)}><X className="text-white"/></Button>
   </div>
  </div>
  <div onPointerDown={()=>{downAt.current=Date.now();setPaused(true);}} onPointerUp={tap} onPointerCancel={()=>setPaused(false)} className="relative flex-1 flex items-center justify-center my-4 overflow-hidden rounded-2xl select-none">
   {current?.media_url&&<div className="relative shrink-0" style={{width:'min(100%,calc((100dvh - 180px) * 9 / 16))',aspectRatio:'9 / 16'}}><PhotoImage src={current?.media_url??''} alt={current?.alt_text||'סטורי'} loading="eager" className="w-full h-full object-contain pointer-events-none"/>
    <div className="absolute inset-0 pointer-events-none">{readMentions(current?.mentions??[]).map((m,i)=><Button key={`${m.userId}-${i}`} asChild variant="ghost" className="absolute pointer-events-auto p-0 min-w-0 min-h-0 bg-transparent hover:bg-primary/10" style={{left:m.x+'%',top:m.y+'%',width:m.width+'%',height:m.height+'%'}}><Link to="/members/$memberId" params={{memberId:m.userId}} aria-label={`פרופיל ${m.label}`} onPointerDown={e=>{e.stopPropagation();setPaused(true);}} onPointerUp={e=>e.stopPropagation()}><span className="sr-only">{m.label}</span></Link></Button>)}</div>
   </div>}
   <span className="sr-only"><button type="button" onClick={prev}>סטורי קודם</button><button type="button" onClick={next}>סטורי הבא</button></span>
  </div>
  {current?.caption&&<p className="text-white text-sm text-center">{current?.caption??''}</p>}
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
 const comments=useInfiniteQuery({
  queryKey:['hub-comments',post.id],
  initialPageParam:null as PageCursor|null,
  queryFn:async({pageParam})=>{
   let query=supabase.from('post_comments').select('*').eq('post_id',post.id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(COMMENT_PAGE_SIZE);
   if(pageParam)query=query.or(`created_at.lt.${pageParam.createdAt},and(created_at.eq.${pageParam.createdAt},id.lt.${pageParam.id})`);
   const {data,error}=await query;if(error)throw error;
   const last=data.at(-1);
   return {rows:data,nextCursor:data.length===COMMENT_PAGE_SIZE&&last?{createdAt:last.created_at,id:last.id}:null};
  },
  getNextPageParam:lastPage=>lastPage.nextCursor??undefined,
 });
 async function insertComment(body:string){if(checking)return false;setMsg('');setChecking(true);try{const result=await publishComment({data:{postId:post.id,body}});if(result.error){setMsg(result.error);return false;}if(!result.ok){setBlocked({flagged:result.flagged,suggestion:result.suggestion});return false;}setText('');setBlocked(null);await Promise.all([qc.invalidateQueries({queryKey:['hub-comments',post.id]}),qc.invalidateQueries({queryKey:['hub-comment-counts']})]);return true;}catch{setMsg('פרסום התגובה נכשל. נסי שוב');return false;}finally{setChecking(false);}}
 async function send(e:React.FormEvent){e.preventDefault();const parsed=plainText(500).safeParse(text);if(!parsed.success||!parsed.data){setMsg('התגובה חייבת להיות טקסט רגיל עד 500 תווים');return;}setMsg('');await insertComment(parsed.data);}
 async function remove(id:string){const {error}=await supabase.from('post_comments').delete().eq('id',id);if(error){setMsg('מחיקת התגובה נכשלה');return;}await Promise.all([qc.invalidateQueries({queryKey:['hub-comments',post.id]}),qc.invalidateQueries({queryKey:['hub-comment-counts']})]);}
 return <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label="תגובות לעבודה" className="bg-card border border-border rounded-3xl p-6 max-w-md w-full space-y-4 text-right max-h-[80vh] overflow-y-auto">
  <div className="flex items-center justify-between"><h2 className="font-bold">תגובות</h2><Button size="icon" variant="ghost" aria-label="סגירת התגובות" onClick={onClose}><X/></Button></div>
  {comments.isError&&<Notice text="טעינת התגובות נכשלה"/>}
  {comments.isPending?<Notice text="טוענת תגובות..."/>:comments.data?.pages.flatMap(page=>page.rows).length===0?<Notice text="היי הראשונה להגיב"/>:comments.data?.pages.flatMap(page=>page.rows).reverse().map(c=><div key={c.id} className="border-b border-border pb-3 flex items-start justify-between gap-2"><div><span className="text-xs font-bold block">{c.user_id===user.id?user.businessName:'חברת קהילה'}</span><p className="text-sm whitespace-pre-wrap break-words">{c.body}</p></div>{c.user_id===user.id&&<Button size="icon" variant="ghost" aria-label="מחיקת תגובה" onClick={()=>remove(c.id)}><Trash2/></Button>}</div>)}
  {comments.hasNextPage&&<Button type="button" variant="outline" className="w-full" disabled={comments.isFetchingNextPage} onClick={()=>void comments.fetchNextPage()}>{comments.isFetchingNextPage?'טוענת תגובות...':'טעינת תגובות נוספות'}</Button>}
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
 const qc=useQueryClient();const [search,setSearch]=useState('');const [msg,setMsg]=useState('');const [open,setOpen]=useState(false);const [deleting,setDeleting]=useState<Row<'posts'>|null>(null);
 const [commentPost,setCommentPost]=useState<Row<'posts'>|null>(null);const [collabPost,setCollabPost]=useState<Row<'posts'>|null>(null);const [offersPost,setOffersPost]=useState<Row<'posts'>|null>(null);const [heartPost,setHeartPost]=useState<string|null>(null);
 useEffect(()=>{if('compose' in routeSearch && routeSearch.compose===true)setOpen(true);},[routeSearch]);
 const posts=useInfiniteQuery({
  queryKey:['hub-posts',user.id,savedOnly],
  initialPageParam:null as PageCursor|null,
  queryFn:async({pageParam})=>{
   let rawPosts:Row<'posts'>[]=[];
   let nextCursor:PageCursor|null=null;
   if(savedOnly){
    let query=supabase.from('saved_posts').select('id,post_id,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(FEED_PAGE_SIZE);
    if(pageParam)query=query.or(`created_at.lt.${pageParam.createdAt},and(created_at.eq.${pageParam.createdAt},id.lt.${pageParam.id})`);
    const {data:savedRows,error:savedError}=await query;
    if(savedError)throw savedError;
    const ids=savedRows.map(row=>row.post_id);
    if(ids.length){
     const {data,error}=await supabase.from('posts').select('*').in('id',ids);
     if(error)throw error;
     const byId=new Map(data.map(post=>[post.id,post]));
     rawPosts=ids.flatMap(id=>{const post=byId.get(id);return post?[post]:[];});
    }
    const last=savedRows.at(-1);
    if(savedRows.length===FEED_PAGE_SIZE&&last)nextCursor={createdAt:last.created_at,id:last.id};
   }else{
    let query=supabase.from('posts').select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(FEED_PAGE_SIZE);
    if(pageParam)query=query.or(`created_at.lt.${pageParam.createdAt},and(created_at.eq.${pageParam.createdAt},id.lt.${pageParam.id})`);
    const {data,error}=await query;
    if(error)throw error;
    rawPosts=data;
    const last=data.at(-1);
    if(data.length===FEED_PAGE_SIZE&&last)nextCursor={createdAt:last.created_at,id:last.id};
   }
   const rows=rawPosts.map(post=>({...post,displayUrl:post.image_url}));
   return {rows,nextCursor};
  },
  getNextPageParam:lastPage=>lastPage.nextCursor??undefined,
 });
 const pageRows=(posts.data?.pages?.flatMap(page=>page?.rows??[])??[]).flatMap(post=>{
  if(typeof post?.id!=='string'||typeof post?.author_id!=='string'||typeof post?.created_at!=='string')return [];
  return [{...post,image_url:typeof post.image_url==='string'?post.image_url:'',displayUrl:typeof post.image_url==='string'?post.image_url:null,caption:typeof post.caption==='string'?post.caption:null,service_tags:Array.isArray(post.service_tags)?post.service_tags.filter((tag):tag is string=>typeof tag==='string'):[],mentions:post.mentions??[],likes_count:typeof post.likes_count==='number'&&Number.isFinite(post.likes_count)?post.likes_count:0}];
 });
 const pagePostIds=posts.data?.pages.map(page=>page.rows.map(post=>post.id))??[];
 const savedPages=useQueries({queries:pagePostIds.map(ids=>({queryKey:['hub-saved',user.id,ids],enabled:ids.length>0,staleTime:30_000,queryFn:async()=>{const {data,error}=await supabase.from('saved_posts').select('id,post_id').eq('user_id',user.id).in('post_id',ids);if(error)throw error;return data;}}))});
 const likedPages=useQueries({queries:pagePostIds.map(ids=>({queryKey:['hub-likes',user.id,ids],enabled:ids.length>0,staleTime:30_000,queryFn:async()=>{const {data,error}=await supabase.from('post_likes').select('id,post_id').eq('user_id',user.id).in('post_id',ids);if(error)throw error;return data;}}))});
 const commentPages=useQueries({queries:pagePostIds.map(ids=>({queryKey:['hub-comment-counts',user.id,ids],enabled:ids.length>0,staleTime:30_000,queryFn:async()=>{const {data,error}=await supabase.rpc('post_comment_counts',{post_ids:ids});if(error)throw error;return Object.fromEntries(data.map(row=>[row.post_id,row.comment_count]));}}))});
 const savedRows=savedPages.flatMap(page=>page.data??[]);
 const likedRows=likedPages.flatMap(page=>page.data??[]);
 const commentCounts=Object.assign({},...commentPages.map(page=>page.data??{}));
 async function reportPost(p:Row<'posts'>){const {error}=await supabase.from('reports').insert({reporter_id:user.id,post_id:p.id,reason:''});setMsg(error?'שליחת הדיווח נכשלה':'הדיווח נשלח להנהלה. תודה ששומרת על הקהילה 💖');}
 async function toggle(id:string){const existing=savedRows.find(s=>s.post_id===id);const result=existing?await supabase.from('saved_posts').delete().eq('id',existing.id):await supabase.from('saved_posts').insert({user_id:user.id,post_id:id});if(result.error){setMsg('עדכון השמורים נכשל');return;}await Promise.all([qc.invalidateQueries({queryKey:['hub-saved',user.id]}),savedOnly?qc.invalidateQueries({queryKey:['hub-posts',user.id,true]}):Promise.resolve()]);}
 async function remove(p:Row<'posts'>){const {error}=await supabase.from('posts').delete().eq('id',p.id);if(error){setMsg('המחיקה נכשלה');return;}setDeleting(null);await qc.invalidateQueries({queryKey:['hub-posts']});}
 const liked=(id:string)=>likedRows.some(l=>l.post_id===id);
 async function toggleLike(p:Row<'posts'>){const mine=likedRows.find(l=>l.post_id===p.id);const result=mine?await supabase.from('post_likes').delete().eq('id',mine.id):await supabase.from('post_likes').insert({post_id:p.id,user_id:user.id});if(result.error){setMsg('עדכון הלייק נכשל');return;}if(!mine&&p.author_id!==user.id)await supabase.from('notifications').insert({user_id:p.author_id,actor_id:user.id,actor_name:user.businessName||user.fullName,type:'like',post_id:p.id});qc.setQueryData<InfiniteData<FeedPage>>(['hub-posts',user.id,savedOnly],old=>old?{...old,pages:old.pages.map(page=>({...page,rows:page.rows.map(post=>post.id===p.id?{...post,likes_count:Math.max(0,(post.likes_count??0)+(mine?-1:1))}:post)}))}:old);await qc.invalidateQueries({queryKey:['hub-likes',user.id]});}
 function doubleTap(p:Row<'posts'>){setHeartPost(p.id);setTimeout(()=>setHeartPost(null),850);if(!liked(p.id))void toggleLike(p);}
 const list=pageRows.filter(p=>matchesPostSearch(p,search)).sort((a,b)=>Number(b.is_pinned)-Number(a.is_pinned));
 return <>{!savedOnly&&<FeedErrorBoundary fallback={<Notice text="אירעה תקלה בתצוגת הסטוריז; הפיד עדיין זמין."/>}><StoriesBar user={user}/></FeedErrorBoundary>}<h1 className="font-black text-2xl mb-4">{savedOnly?'השמורים שלי':'הפיד המקצועי'}</h1>
 <input aria-label="חיפוש עבודות" placeholder="חיפוש עבודות, טכניקות או #תגיות..." value={search} onChange={e=>setSearch(e.target.value)} className={`${field} mb-6`}/>
 {open&&<FeedPostComposer userId={user.id} onClose={()=>setOpen(false)} onPublished={()=>{setOpen(false);setMsg('העבודה פורסמה');}}/>}
 {deleting&&<div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label="מחיקת עבודה" className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full space-y-4 text-right"><h2 className="font-bold">למחוק את העבודה?</h2><p className="text-sm text-muted-foreground">לא ניתן לשחזר עבודה שנמחקה.</p><div className="flex gap-2"><Button variant="destructive" onClick={()=>remove(deleting)}>מחיקה</Button><Button variant="outline" onClick={()=>setDeleting(null)}>ביטול</Button></div></div></div>}
 {commentPost&&<CommentsModal post={commentPost} user={user} onClose={()=>setCommentPost(null)}/>}
 {collabPost&&<CollabModal post={collabPost} user={user} onClose={()=>setCollabPost(null)}/>}
 {offersPost&&<OffersModal post={offersPost} onClose={()=>setOffersPost(null)}/>}
 {msg&&<Notice text={msg}/>}
 {(posts.isError||savedPages.some(page=>page.isError)||likedPages.some(page=>page.isError)||commentPages.some(page=>page.isError))&&<Notice text="טעינת העבודות נכשלה"/>}
 {posts.isPending?<Notice text="טוענת עבודות..."/>:list.length===0&&!posts.hasNextPage?<div className="py-16 text-center border-y border-border"><Sparkles className="mx-auto text-primary mb-3"/><p className="font-bold">{savedOnly?'אין עדיין עבודות שמורות':'אין עדיין עבודות בפיד'}</p></div>:list.length===0?<Notice text="לא נמצאו עבודות תואמות בעמודים שנטענו"/>:<div className="grid md:grid-cols-2 gap-6">{list.map(p=><article key={p.id} className="bg-card border border-border rounded-3xl shadow-soft overflow-hidden">{p.is_pinned&&<div className="bg-accent text-primary text-[11px] font-black px-4 py-1.5 flex items-center gap-1.5"><Pin className="w-3 h-3"/>נעוץ על ידי ההנהלה</div>}<div className="flex items-center justify-between p-4"><span className="text-xs font-bold">{p.author_id===user.id?user.businessName:'עבודה מהקהילה'}</span><div className="flex items-center gap-2"><time className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString('he-IL')}</time>{p.author_id!==user.id&&<Button size="icon" variant="ghost" aria-label="דיווח על הפוסט" title="דיווח" onClick={()=>reportPost(p)}><Flag/></Button>}{p.author_id!==user.id&&<Button size="sm" variant="outline" onClick={()=>setCollabPost(p)}><Handshake/>הצעת שת״פ</Button>}</div></div>
 <div onDoubleClick={()=>doubleTap(p)} className="relative cursor-pointer">{p.displayUrl&&<PhotoImage src={p.displayUrl} alt="עבודת ציפורניים" className="w-full h-auto object-contain bg-card"/>}{heartPost===p.id&&<div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Heart className="w-20 h-20 text-primary fill-primary animate-ping opacity-90 drop-shadow-xl"/></div>}</div>
 <div className="p-5"><PostCaption text={p.caption} mentions={p.mentions}/>{(p.service_tags??[]).length>0&&<div className="flex flex-wrap gap-2 mb-4">{p.service_tags?.map(t=><Button key={t} size="sm" variant="secondary" className="text-xs rounded-full h-auto min-h-8 whitespace-normal break-words" onClick={()=>setSearch('#'+t)}>#{t}</Button>)}</div>}<div className="flex items-center justify-between"><div className="flex items-center gap-1"><Button size="icon" variant="ghost" aria-label="לייק לעבודה" title="לייק" onClick={()=>toggleLike(p)}><Heart className={liked(p.id)?'fill-primary text-primary':''}/></Button><span className="text-xs font-bold">{p.likes_count??0}</span><Button size="icon" variant="ghost" aria-label="תגובות לעבודה" title="תגובות" onClick={()=>setCommentPost(p)}><MessageCircle/></Button><span className="text-xs font-bold">{commentCounts[p.id]??0}</span><Button size="icon" variant="ghost" aria-label="שמירת עבודה" title="שמירת עבודה" onClick={()=>toggle(p.id)}><Bookmark className={savedRows.some(s=>s.post_id===p.id)?'fill-primary text-primary':''}/></Button></div><div className="flex items-center gap-1">{p.author_id===user.id&&<><Button size="sm" variant="ghost" onClick={()=>setOffersPost(p)}><Handshake/>הצעות</Button><Button size="icon" variant="ghost" aria-label="מחיקת עבודה" title="מחיקת עבודה" onClick={()=>setDeleting(p)}><Trash2/></Button></>}</div></div></div></article>)}</div>}
 {posts.hasNextPage&&<Button type="button" variant="outline" disabled={posts.isFetchingNextPage} onClick={()=>void posts.fetchNextPage()} className="mx-auto mt-6 block">{posts.isFetchingNextPage?'טוענת עבודות...':'טעינת עבודות נוספות'}</Button>}
 </>;
}
function PricingCalculator({user}:{user:Person}){
 const [c,setC]=useState<PricingInput>({hourlyRate:120,minutes:120,length:'natural',effects:[],extraMinutes:0,materials:20,overhead:DEFAULT_OVERHEAD,vat:false,discountType:'percent',discount:0});
 const [treatment,setTreatment]=useState<string>(TREATMENTS[0][0]);const [exp,setExp]=useState<string>('experienced');const [brands,setBrands]=useState('');const [msg,setMsg]=useState('');const [aiNote,setAiNote]=useState('');const [busy,setBusy]=useState(false);
 const estimate=useServerFn(estimateMaterialCost);const qc=useQueryClient();
 let r:ReturnType<typeof calculateTreatment>|null;try{r=calculateTreatment(c);}catch{r=null;}
 const tName=TREATMENTS.find(t=>t[0]===treatment)![1];const num=(k:keyof PricingInput)=>(e:React.ChangeEvent<HTMLInputElement>)=>setC({...c,[k]:Number(e.target.value)});
 function pickTreatment(id:string){setTreatment(id);const t=TREATMENTS.find(x=>x[0]===id);if(t)setC({...c,minutes:t[2]});}
 async function ai(){setBusy(true);setMsg('');try{const res=await estimate({data:{treatment:tName,length:LENGTHS.find(l=>l[0]===c.length)![1],effects:c.effects.map(e=>EFFECTS.find(x=>x[0]===e)![1]).join(', '),materials:brands}});if(res.error){setMsg(res.error);return;}setC(v=>({...v,materials:res.cost}));setAiNote(res.note);}catch{setMsg('פרטי את החומרים בטקסט רגיל (לפחות 3 תווים)');}finally{setBusy(false);}}
 async function save(){if(!r)return;const {error}=await supabase.from('price_list_items').insert({service_name:tName,price_nis:r.price,user_id:user.id});if(error){setMsg('שמירת הטיפול נכשלה');return;}setMsg('הטיפול נשמר במחירון שלך');await qc.invalidateQueries({queryKey:['hub-prices']});}
 const card='bg-card border border-border rounded-3xl shadow-soft p-5 space-y-4';const row=(l:string,v:number)=><div className="flex justify-between text-sm"><span>{l}</span><span className="font-bold">{v.toLocaleString('he-IL')} ₪</span></div>;
 return <><Heading title="מחשבון תמחור חכם"/><div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start"><div className="space-y-6">
 <section className={card}><h2 className="font-black">הגדרות העסק</h2><div className="grid sm:grid-cols-2 gap-4"><Entry label="שכר שעתי נקי רצוי (₪)"><input type="number" min={0} value={c.hourlyRate} onChange={num('hourlyRate')} className={field}/></Entry><Entry label="הוצאות קבועות לטיפול — היגיינה ובלאי (₪)"><input type="number" min={0} value={c.overhead} onChange={num('overhead')} className={field}/></Entry><Entry label="ותק וניסיון"><select value={exp} onChange={e=>setExp(e.target.value)} className={field}>{EXPERIENCE.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></Entry><Entry label="סוג עוסק"><select value={c.vat?'1':'0'} onChange={e=>setC({...c,vat:e.target.value==='1'})} className={field}><option value="0">עוסק פטור — ללא מע״מ</option><option value="1">עוסק מורשה — תוספת מע״מ 18%</option></select></Entry></div><p className="text-xs text-muted-foreground">{EXPERIENCE.find(x=>x[0]===exp)![2]}</p></section>
 <section className={card}><h2 className="font-black">הטיפול</h2><div className="grid sm:grid-cols-2 gap-4"><Entry label="סוג הטיפול"><select value={treatment} onChange={e=>pickTreatment(e.target.value)} className={field}>{TREATMENTS.map(t=><option key={t[0]} value={t[0]}>{t[1]}</option>)}</select></Entry><Entry label="משך הטיפול (דקות)"><input type="number" min={1} value={c.minutes} onChange={num('minutes')} className={field}/></Entry><Entry label="אורך הציפורניים"><select value={c.length} onChange={e=>setC({...c,length:e.target.value as LengthId})} className={field}>{LENGTHS.map(l=><option key={l[0]} value={l[0]}>{l[1]}{l[2]?` (+${l[2]} דק׳, +${l[3]} ₪)`:''}</option>)}</select></Entry><Entry label="תוספת זמן ידנית (דקות)"><input type="number" min={0} value={c.extraMinutes} onChange={num('extraMinutes')} className={field}/></Entry></div>
 <fieldset><legend className="text-xs font-bold mb-2">אפקטים וקישוטים</legend><div className="grid sm:grid-cols-2 gap-2">{EFFECTS.map(e=><label key={e[0]} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.effects.includes(e[0])} onChange={ev=>setC({...c,effects:ev.target.checked?[...c.effects,e[0]]:c.effects.filter(x=>x!==e[0])})}/>{e[1]} <span className="text-muted-foreground text-xs">+{e[2]} דק׳</span></label>)}</div></fieldset></section>
 <section className={card}><h2 className="font-black">עלות חומרים</h2><Entry label="מותגים וסוגי חומרים"><textarea maxLength={1000} value={brands} onChange={e=>setBrands(e.target.value)} placeholder="לדוגמה: אקריל של CND, בייס קודי, טופ ללא ניגוב" className={field}/></Entry><Button type="button" variant="outline" disabled={busy||brands.trim().length<3} onClick={ai}><Sparkles/>{busy?'מעריכה...':'הערכת עלות חומרים עם AI'}</Button>{aiNote&&<p className="text-xs text-muted-foreground">{aiNote}</p>}<Entry label="עלות חומרים לטיפול (₪)"><input type="number" min={0} step="any" value={c.materials} onChange={num('materials')} className={field}/></Entry></section>
 <section className={card}><h2 className="font-black">הנחה</h2><div className="grid grid-cols-2 gap-4"><Entry label="סוג הנחה"><select value={c.discountType} onChange={e=>setC({...c,discountType:e.target.value as 'percent'|'nis'})} className={field}><option value="percent">אחוזים (%)</option><option value="nis">שקלים (₪)</option></select></Entry><Entry label="גובה ההנחה"><input type="number" min={0} value={c.discount} onChange={num('discount')} className={field}/></Entry></div></section></div>
 <aside className={`${card} lg:sticky lg:top-6`} aria-live="polite">{r?<><p className="text-xs font-bold text-muted-foreground">מחיר מומלץ לגבייה</p><output className="block text-4xl font-black text-primary">{r.price.toLocaleString('he-IL')} ₪</output><p className="text-xs text-muted-foreground">{tName} · {r.totalMinutes} דקות</p><div className="border-t border-border pt-4 space-y-2">{row('עלות שעות עבודה',r.labor)}{row('עלות חומרים',r.materials)}{row('הוצאות קליניקה',r.overhead)}{r.discountNis>0&&row('הנחה',-r.discountNis)}{c.vat&&row('מע״מ 18%',r.vat)}</div><div className="border-t border-border pt-4 flex justify-between"><span className="font-bold text-sm">רווח נקי לטיפול</span><span className="font-black">{r.profit.toLocaleString('he-IL')} ₪</span></div><Button className="w-full" onClick={save}><Bookmark/>שמירת טיפול למחירון שלי</Button></>:<Notice text="הזיני משך טיפול גדול מאפס וערכים חיוביים"/>}{msg&&<Notice text={msg}/>}</aside></div></>;
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
 const qc=useQueryClient();
 const [service,setService]=useState('');const [price,setPrice]=useState('');const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);
 const [rows,setRows]=useState<Row<'price_list_items'>[]>([]);const loaded=useRef(false);
 const [title,setTitle]=useState(user.businessName||user.fullName);const [target,setTarget]=useState<'background'|'text'|'title'|'border'>('background');
 const [colors,setColors]=useState({background:'nude',text:'black',title:'wine',border:'rose'});
 const [font,setFont]=useState('heebo');const [size,setSize]=useState(16);const [align,setAlign]=useState<'right'|'center'|'left'>('right');
 const [tab,setTab]=useState<'edit'|'preview'>('edit');const [bold,setBold]=useState(false);const [italic,setItalic]=useState(false);const [underline,setUnderline]=useState(false);const [highlight,setHighlight]=useState(false);const [marker,setMarker]=useState('white');
 const [logo,setLogo]=useState('');const [scale,setScale]=useState(45);const [opacity,setOpacity]=useState(25);const [front,setFront]=useState(false);const [position,setPosition]=useState({x:50,y:50});const [uploading,setUploading]=useState(false);
 const screen=useRef<HTMLDivElement>(null);const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);const movingRow=useRef<string|null>(null);
 const palette=[{id:'white',name:'לבן'},{id:'black',name:'שחור'},{id:'nude',name:'ורוד בהיר'},{id:'rose',name:'ורוד כהה'},{id:'wine',name:'בורדו עמוק'}];
 const services=['מבנה אנטומי',"מניקור לק ג׳ל",'בנייה באקריל','מילוי אקריל',"בנייה בג׳ל",'השלמת ציפורן','קישוטים וציורים','פדיקור רפואי','פדיקור אקספרס'];
 const list=useQuery({queryKey:['hub-prices',user.id],queryFn:async()=>{const {data,error}=await supabase.from('price_list_items').select('*').eq('user_id',user.id).order('created_at');if(error)throw error;return data;}});
 useEffect(()=>{if(list.data&&!loaded.current){setRows(list.data);loaded.current=true;}},[list.data]);
 function move(id:string,to:number){setRows(current=>{const from=current.findIndex(r=>r.id===id);if(from<0||to<0||to>=current.length)return current;const result=[...current];const [row]=result.splice(from,1);if(!row)return current;result.splice(to,0,row);return result;});}
 async function add(e:React.FormEvent){e.preventDefault();const parsed=priceItemSchema.safeParse({service_name:service,price_nis:price});if(!parsed.success||price.trim()===''){setMsg('הזיני שם טיפול ומחיר תקין');return;}setBusy(true);try{const {data,error}=await supabase.from('price_list_items').insert({...parsed.data,user_id:user.id}).select().single();if(error)throw error;setRows(current=>[...current,data]);setService('');setPrice('');setMsg('הטיפול נוסף למחירון');await qc.invalidateQueries({queryKey:['hub-prices']});}catch{setMsg('שמירת הטיפול נכשלה. נסי שוב.');}finally{setBusy(false);}}
 async function save(){if(!plainText(150).safeParse(title).success||!title.trim()||rows.some(r=>!priceItemSchema.safeParse(r).success)){setMsg('בדקי את הכותרת, שמות הטיפולים והמחירים');return;}setBusy(true);try{const results=await Promise.all(rows.map(r=>supabase.from('price_list_items').update({service_name:r.service_name.trim(),price_nis:r.price_nis}).eq('id',r.id).eq('user_id',user.id)));if(results.some(r=>r.error))throw new Error();await qc.invalidateQueries({queryKey:['hub-prices']});setMsg('שמות הטיפולים והמחירים נשמרו. העיצוב והסדר בתצוגה זו בלבד.');}catch{setMsg('לא כל השינויים נשמרו. נסי שוב.');}finally{setBusy(false);}}
 async function remove(id:string){setBusy(true);try{const {error}=await supabase.from('price_list_items').delete().eq('id',id).eq('user_id',user.id);if(error)throw error;setRows(current=>current.filter(r=>r.id!==id));await qc.invalidateQueries({queryKey:['hub-prices']});setMsg('הטיפול נמחק');}catch{setMsg('מחיקת הטיפול נכשלה');}finally{setBusy(false);}}
 async function uploadLogo(file:File|null){if(!file||uploading)return;setUploading(true);try{const url=await uploadPhoto(file,user.id);setLogo(await photoUrl(url));setMsg('הלוגו הועלה');}catch{setMsg('העלאת הלוגו נכשלה. בחרי תמונת לוגו תקינה ונסי שוב.');}finally{setUploading(false);}}
 const sectionTitle=(text:string)=><h2 className="font-bold text-sm mb-4">{text}</h2>;
 return <div className="pricelist-editor" dir="rtl">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,400;0,700;1,400;1,700&display=swap"/>
  <style>{`
   .pricelist-editor { --pl-white:#FFFFFF; --pl-black:#111111; --pl-nude:#FDE2E4; --pl-rose:#E11D48; --pl-wine:#581845; }
   .pricelist-editor .pl-phone { width:320px; max-width:100%; aspect-ratio:9/16; border:7px solid var(--pl-black); border-radius:36px; overflow:hidden; position:relative; isolation:isolate; box-shadow:0 12px 32px -16px var(--overlay); }
   .pricelist-editor .pl-screen { position:absolute; inset:0; overflow-y:auto; scrollbar-width:thin; background:var(--pl-background); color:var(--pl-text); }
   .pricelist-editor .pl-sheet { min-height:100%; padding:42px 18px 24px; position:relative; border:3px solid var(--pl-border); border-radius:27px; display:flex; flex-direction:column; }
   .pricelist-editor .pl-title { color:var(--pl-title); font-size:1.75em; line-height:1.35; overflow-wrap:anywhere; }
   .pricelist-editor .pl-notch { position:absolute; top:9px; left:50%; transform:translateX(-50%); width:72px; height:15px; background:var(--pl-black); border-radius:20px; z-index:40; pointer-events:none; }
   .pricelist-editor .pl-row { line-height:1.35; }
   .pricelist-editor .pl-row-controls { position:absolute; inset-inline-end:0; top:0; opacity:0; transition:opacity .15s; background:var(--pl-background); border-radius:6px; }
   .pricelist-editor .pl-row:hover .pl-row-controls,.pricelist-editor .pl-row:focus-within .pl-row-controls {opacity:1;}
   .pricelist-editor .pl-logo {position:absolute; height:auto; max-height:75%; object-fit:contain; transform:translate(-50%,-50%); touch-action:none; cursor:move; user-select:none;}
   .pricelist-editor .pl-font-heebo {font-family:"Heebo",sans-serif;}
   .pricelist-editor .pl-font-rubik {font-family:"Rubik",sans-serif;}
   .pricelist-editor .pl-font-assistant {font-family:"Assistant",sans-serif;}
   .pricelist-editor .pl-font-frank {font-family:"Frank Ruhl Libre",serif;}
   .pricelist-editor .pl-font-comic {font-family:"Playpen Sans Hebrew",cursive;}
   .pricelist-editor .pl-mark {background:var(--pl-marker);box-decoration-break:clone;-webkit-box-decoration-break:clone;border-radius:3px;}
   .pricelist-editor .pl-preview-copy {flex:1;display:flex;flex-direction:column;}
   .pricelist-editor .pl-credit {margin-top:auto;padding-top:24px;font-size:10px;font-style:normal;font-weight:400;text-decoration:none;text-align:center;}
   @media (hover:none) { .pricelist-editor .pl-row-controls {position:static;opacity:1;justify-content:flex-end;margin-top:0;} .pricelist-editor .pl-row {display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px;} }
   @media (prefers-reduced-motion:reduce) { .pricelist-editor .pl-row-controls {transition:none;} }
  `}</style>
  <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-6"><div className="min-w-0"><p className="text-xs text-primary font-bold mb-2">הקליניקה שלי</p><h1 className="font-black text-xl sm:text-2xl break-words">מחולל מחירון דיגיטלי ממותג</h1></div><Button size="icon" className="shrink-0" title="שמירת הטיפולים" aria-label="שמירת הטיפולים" disabled={busy||!rows.length} onClick={()=>void save()}><Save/></Button></header>
  <div role="tablist" aria-label="תצוגת המחולל" className="grid grid-cols-2 gap-2 mb-6 md:hidden"><Button id="pl-edit-tab" role="tab" aria-selected={tab==='edit'} aria-controls="pl-edit-panel" variant={tab==='edit'?'secondary':'outline'} onClick={()=>setTab('edit')}>✏️ עריכת מחירון</Button><Button id="pl-preview-tab" role="tab" aria-selected={tab==='preview'} aria-controls="pl-preview-panel" variant={tab==='preview'?'secondary':'outline'} onClick={()=>setTab('preview')}>👁️ תצוגה מקדימה</Button></div>
  <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,320px)] gap-6 lg:gap-8 items-start">
   <div id="pl-edit-panel" aria-labelledby="pl-edit-tab" className={'min-w-0 divide-y divide-border '+(tab==='edit'?'block':'hidden')+' md:block'}>
    <section className="pb-6">{sectionTitle('כותרת המחירון')}<Entry label="שם הקליניקה / המחירון"><input aria-label="שם הקליניקה / המחירון" value={title} maxLength={150} className={field} onChange={e=>setTitle(e.target.value)}/></Entry></section>
    <section className="py-6">{sectionTitle('טיפולים ומחירים')}
     <form onSubmit={add} className="space-y-3 mb-5"><Entry label="בחירה מהירה"><select aria-label="בחירה מהירה" className={field} value={services.includes(service)?service:''} onChange={e=>setService(e.target.value)}><option value="">בחירת טיפול נפוץ</option>{services.map(s=><option key={s}>{s}</option>)}</select></Entry><div className="grid grid-cols-[minmax(0,1fr)_90px] gap-3"><Entry label="שם טיפול"><input aria-label="שם טיפול" maxLength={150} value={service} onChange={e=>setService(e.target.value)} className={field}/></Entry><Entry label="מחיר (₪)"><input aria-label="מחיר טיפול חדש" type="number" min="0" step="any" value={price} onChange={e=>setPrice(e.target.value)} className={field}/></Entry></div><Button type="submit" variant="outline" disabled={busy||list.isPending}><Plus/>הוספת טיפול</Button></form>
     <div className="space-y-3">{rows.map((r,i)=><div key={r.id} className="grid grid-cols-[minmax(0,1fr)_76px_32px] gap-2 items-center"><input aria-label={'שם טיפול '+(i+1)} value={r.service_name} maxLength={150} className={field} onChange={e=>setRows(current=>current.map(v=>v.id===r.id?{...v,service_name:e.target.value}:v))}/><input aria-label={'מחיר טיפול '+(i+1)} type="number" min="0" step="any" value={r.price_nis} className={field} onChange={e=>setRows(current=>current.map(v=>v.id===r.id?{...v,price_nis:Number(e.target.value)}:v))}/><Button size="icon" variant="ghost" disabled={busy} className="size-8" aria-label={'מחיקת '+r.service_name} title="מחיקת טיפול" onClick={()=>void remove(r.id)}><Trash2 className="size-4"/></Button></div>)}</div>
     {list.isPending&&<Notice text="טוענת מחירון…"/>}{list.isError&&<Notice text="טעינת המחירון נכשלה"/>}
    </section>
    <section className="py-6">{sectionTitle('צבעי המותג')}<div role="group" aria-label="האזור לצביעה" className="flex flex-wrap gap-2 mb-4">{([{id:'background',label:'צבע רקע',Icon:Palette},{id:'text',label:'צבע טקסט טיפולים',Icon:Type},{id:'title',label:'צבע כותרת',Icon:Crown},{id:'border',label:'צבע מסגרת',Icon:Frame}] as const).map(t=><Button key={t.id} variant={target===t.id?'secondary':'ghost'} size="icon" title={t.label} aria-label={t.label} aria-pressed={target===t.id} onClick={()=>setTarget(t.id)}><t.Icon/></Button>)}</div><div role="group" aria-label="פלטת צבעים" className="flex gap-3">{palette.map(c=><Button key={c.id} size="icon" variant="outline" aria-label={c.name} title={c.name} aria-pressed={colors[target]===c.id} onClick={()=>setColors(v=>({...v,[target]:c.id}))} className={'rounded-full border-input '+(colors[target]===c.id?'ring-2 ring-ring ring-offset-2 ring-offset-background':'')} style={{backgroundColor:`var(--pl-${c.id})`}}><span className="sr-only">{c.name}</span></Button>)}</div></section>
    <section className="py-6">{sectionTitle('עיצוב הטקסט')}<div className="grid sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-4"><Entry label="גופן"><select aria-label="גופן" className={field} value={font} onChange={e=>setFont(e.target.value)}><option value="heebo">היבו</option><option value="rubik">רוביק</option><option value="assistant">אסיסטנט</option><option value="frank">פרנק רוהל</option><option value="comic">קומיק · כתב יד עברי</option></select></Entry><Entry label={'גודל טקסט · '+size}><input aria-label="גודל טקסט" className="w-full accent-primary mt-3" type="range" min="12" max="24" value={size} onChange={e=>setSize(Number(e.target.value))}/></Entry></div><div role="group" aria-label="עיצוב והדגשה" className="flex flex-wrap gap-1 mt-4"><Button size="icon" variant={bold?'secondary':'ghost'} title="מודגש" aria-label="מודגש" aria-pressed={bold} onClick={()=>setBold(v=>!v)}><span className="font-bold text-lg" aria-hidden="true">B</span></Button><Button size="icon" variant={italic?'secondary':'ghost'} title="נטוי" aria-label="נטוי" aria-pressed={italic} onClick={()=>setItalic(v=>!v)}><span className="italic font-serif text-lg" aria-hidden="true">I</span></Button><Button size="icon" variant={underline?'secondary':'ghost'} title="קו תחתון" aria-label="קו תחתון" aria-pressed={underline} onClick={()=>setUnderline(v=>!v)}><span className="underline text-lg" aria-hidden="true">U</span></Button><Button size="icon" variant={highlight?'secondary':'ghost'} title="מרקר" aria-label="מרקר" aria-pressed={highlight} onClick={()=>setHighlight(v=>!v)}><Palette/></Button></div>{highlight&&<fieldset className="mt-4"><legend className="text-xs font-bold mb-3">צבע המרקר</legend><div className="flex flex-wrap gap-3">{palette.map(c=><Button key={c.id} size="icon" variant="outline" title={'מרקר '+c.name} aria-label={'מרקר '+c.name} aria-pressed={marker===c.id} onClick={()=>setMarker(c.id)} className={'rounded-full border-input '+(marker===c.id?'ring-2 ring-ring ring-offset-2 ring-offset-background':'')} style={{backgroundColor:`var(--pl-${c.id})`}}/>)}</div></fieldset>}<div role="group" aria-label="יישור טקסט" className="flex gap-1 mt-4">{([{id:'right',label:'יישור לימין',Icon:AlignRight},{id:'center',label:'יישור למרכז',Icon:AlignCenter},{id:'left',label:'יישור לשמאל',Icon:AlignLeft}] as const).map(a=><Button size="icon" variant={align===a.id?'secondary':'ghost'} key={a.id} title={a.label} aria-label={a.label} aria-pressed={align===a.id} onClick={()=>setAlign(a.id)}><a.Icon/></Button>)}</div></section>
    <section className="py-6">{sectionTitle('לוגו / סימן מים')}<div aria-busy={uploading}><HebrewPhotoInput label="העלאת לוגו" onChange={f=>void uploadLogo(f)}/>{uploading&&<ImageUploadStatus/>}</div>{logo&&<><div className="grid grid-cols-2 gap-4 mt-5"><Entry label={'גודל לוגו · '+scale+'%'}><input aria-label="גודל לוגו" type="range" min="10" max="90" value={scale} className="w-full accent-primary" onChange={e=>setScale(Number(e.target.value))}/></Entry><Entry label={'אטימות לוגו · '+opacity+'%'}><input aria-label="אטימות לוגו" type="range" min="0" max="100" value={opacity} className="w-full accent-primary" onChange={e=>setOpacity(Number(e.target.value))}/></Entry></div><div className="flex flex-wrap gap-2 mt-4"><Button variant="outline" onClick={()=>setFront(v=>!v)} aria-pressed={front}><Layers/>{front?'לפני הטקסט':'מאחורי הטקסט'}</Button><Button variant="ghost" onClick={()=>setLogo('')}><Trash2/>הסרת לוגו</Button></div></>}</section>
   </div>
   <aside id="pl-preview-panel" aria-labelledby="pl-preview-tab" className={'md:sticky md:top-6 flex-col items-center gap-4 min-w-0 '+(tab==='preview'?'flex':'hidden')+' md:flex'}><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><span className="size-2 rounded-full bg-success"/>תצוגה מקדימה חיה</div>
    <div className="pl-phone" aria-label="תצוגת מחירון בטלפון"><div className="pl-notch"/><div ref={screen} className={'pl-screen pl-font-'+font} style={{'--pl-background':`var(--pl-${colors.background})`,'--pl-text':`var(--pl-${colors.text})`,'--pl-title':`var(--pl-${colors.title})`,'--pl-border':`var(--pl-${colors.border})`,'--pl-marker':highlight?`var(--pl-${marker})`:'transparent',fontSize:size,textAlign:align,fontWeight:bold?700:400,fontStyle:italic?'italic':'normal'} as React.CSSProperties}>
     <div className="pl-sheet">
      {logo&&<img src={logo} alt="לוגו הקליניקה" loading="lazy" decoding="async" draggable={false} className="pl-logo" style={{left:position.x+'%',top:position.y+'%',width:scale+'%',opacity:opacity/100,zIndex:front?20:0}} onPointerDown={e=>{const rect=screen.current?.getBoundingClientRect();if(!rect)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,left:position.x,top:position.y};}} onPointerMove={e=>{const d=drag.current;const rect=screen.current?.getBoundingClientRect();if(!d||!rect)return;setPosition({x:Math.max(scale/2,Math.min(100-scale/2,d.left+(e.clientX-d.x)/rect.width*100)),y:Math.max(5,Math.min(95,d.top+(e.clientY-d.y)/rect.height*100))});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}/>}
      <div className="pl-preview-copy relative z-10 pointer-events-none"><p className="text-[10px] mb-4" dir="ltr">NailHub</p><h2 className="pl-title whitespace-pre-wrap mb-2" style={{fontWeight:bold?700:400,textDecoration:underline?'underline':'none'}}><span className="pl-mark">{title||'שם הקליניקה'}</span></h2><p className="text-xs mb-4">מחירון טיפולים</p><div>{rows.map((r,i)=><div key={r.id} data-service-id={r.id} draggable className="pl-row relative pointer-events-auto cursor-grab py-1.5" onDragStart={()=>{movingRow.current=r.id;}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(movingRow.current)move(movingRow.current,i);movingRow.current=null;}} onDragEnd={()=>{movingRow.current=null;}}><div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3" style={{textDecoration:underline?'underline':'none'}}><span className="min-w-0 whitespace-pre-wrap break-words"><span className="pl-mark">{r.service_name||'שם טיפול'}</span></span><span className="pl-mark shrink-0" dir="ltr">₪{r.price_nis.toLocaleString('he-IL')}</span></div><div className="pl-row-controls flex gap-1"><GripVertical className="size-3 self-center"/><Button size="icon" variant="ghost" className="size-6 text-inherit hover:text-inherit" title="הזזה למעלה" aria-label={'הזזת '+r.service_name+' למעלה'} disabled={i===0} onClick={()=>move(r.id,i-1)}><ArrowUp className="size-3"/></Button><Button size="icon" variant="ghost" className="size-6 text-inherit hover:text-inherit" title="הזזה למטה" aria-label={'הזזת '+r.service_name+' למטה'} disabled={i===rows.length-1} onClick={()=>move(r.id,i+1)}><ArrowDown className="size-3"/></Button></div></div>)}</div>{rows.length===0&&<p className="text-sm py-12">הטיפולים שלך יופיעו כאן</p>}<footer className="pl-credit">נוצר באמצעות NailHub ✨</footer></div>
     </div></div></div>
   </aside>
  </div>{msg&&<Notice text={msg}/>}
 </div>;
}
export function Trade({user,embedded=false}:{user:Person;embedded?:boolean}){
 const qc=useQueryClient();const [open,setOpen]=useState(false);const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);const [f,setF]=useState({title:'',price:'',description:''});const [file,setFile]=useState<File|null>(null);
 const list=useInfiniteQuery({queryKey:['hub-trade',user.id],initialPageParam:null as PageCursor|null,queryFn:async({pageParam})=>{let query=supabase.from('nail_trade_items').select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(12);if(pageParam)query=query.or(`created_at.lt.${pageParam.createdAt},and(created_at.eq.${pageParam.createdAt},id.lt.${pageParam.id})`);const {data,error}=await query;if(error)throw error;const last=data.at(-1);return {rows:data,nextCursor:data.length===12&&last?{createdAt:last.created_at,id:last.id}:null};},getNextPageParam:lastPage=>lastPage.nextCursor??undefined});
 const tradeItems=list.data?.pages.flatMap(page=>page.rows.map(item=>({...item,photo:item.photos?.[0]??''})))??[];
 async function add(e:React.FormEvent){e.preventDefault();if(!plainText(150).safeParse(f.title).success||!plainText(2000).safeParse(f.description).success||!file||!Number.isFinite(Number(f.price))||Number(f.price)<0){setMsg('בדקי את פרטי הפריט ובחרי תמונה');return;}setBusy(true);try{const photo=await uploadPhoto(file,user.id);const {error}=await supabase.from('nail_trade_items').insert({title:f.title,price_nis:Number(f.price),description:f.description,seller_id:user.id,city:user.city,phone:user.phone,photos:[photo],category:'ציוד ציפורניים',condition:'משומש',delivery_type:'איסוף עצמי'});if(error)throw error;setOpen(false);setF({title:'',price:'',description:''});await qc.invalidateQueries({queryKey:['hub-trade']});setMsg('הפריט נשמר');}catch{setMsg('שמירת הפריט נכשלה');}finally{setBusy(false);}}
 return <>{embedded?null:<div className="flex justify-between gap-3"><div className="min-w-0"><Heading title="ציוד יד שנייה"/><Button asChild variant="outline" className="mb-4"><Link to="/boards">לוחות הקהילה</Link></Button></div></div>}<div className="flex justify-end mb-4"><Button onClick={()=>setOpen(!open)}><Plus/>הוספת פריט</Button></div>{open&&<form onSubmit={add} className="space-y-4 border-y border-border py-5 mb-6">{([['title','שם הפריט'],['price','מחיר (₪)'],['description','תיאור ומצב']]as const).map(([key,label])=><Entry key={key} label={label}><input required type={key==='price'?'number':'text'} min="0" maxLength={2000} value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})} className={field}/></Entry>)}<Entry label="תמונת הפריט"><HebrewPhotoInput label="תמונת הפריט" onChange={setFile}/></Entry><Button type="submit" disabled={busy}>{busy?<ImageUploadStatus/>:'שמירת פריט'}</Button></form>}{msg&&<Notice text={msg}/>} {list.isError?<Notice text="טעינת הפריטים נכשלה"/>:!tradeItems.length?<Notice text="אין עדיין פריטים"/>:<div className="grid md:grid-cols-2 gap-5">{tradeItems.map(t=><article key={t.id} className="rounded-3xl border border-border bg-card shadow-soft overflow-hidden">{t.photo&&<PhotoImage src={t.photo} alt={t.title} className="w-full h-auto object-contain bg-card"/>}<div className="p-5 space-y-3"><h2 className="font-bold break-words">{t.title}</h2><p className="text-primary font-black">{t.price_nis} ₪</p><p className="text-sm whitespace-pre-wrap break-words">{t.description}</p>{whatsappLink(t.phone)&&<Button asChild variant="outline"><a href={whatsappLink(t.phone)??undefined} target="_blank" rel="noopener noreferrer">וואטסאפ למוכרת</a></Button>}</div></article>)}</div>}{list.hasNextPage&&<Button type="button" variant="outline" className="w-full" disabled={list.isFetchingNextPage} onClick={()=>void list.fetchNextPage()}>{list.isFetchingNextPage?'טוענת פריטים...':'טעינת פריטים נוספים'}</Button>}</>;
}
