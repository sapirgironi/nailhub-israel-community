import {useEffect,useRef,useState,type PointerEvent as RPointerEvent} from 'react';
import {Trash2,Type,X,Smile,Bold,Underline,Highlighter,Sparkles,Accessibility,Minus,Plus} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {supabase} from '@/integrations/supabase/client';
import {storyTextAssist,storyAltText} from '@/lib/story-ai.functions';
import {Button} from './ui/button';

export const STORY_STICKERS=['התפנה תור להיום ⏰','מחפשת מודליסטית 🔍','מבצע לספקים 🔥','השתלמות מקצועית 👑'];
export const STORY_FONTS=[
 {id:'assistant',label:'Assistant',desc:'דפוס נקי ומודרני',family:'Assistant',italic:false},
 {id:'heebo',label:'Heebo',desc:'דפוס קלאסי',family:'Heebo',italic:false},
 {id:'italic',label:'Rubik Italic',desc:'סגנון נטוי',family:'Rubik',italic:true},
 {id:'hand',label:'Amatic SC',desc:'כתב יד',family:'Amatic SC',italic:false},
 {id:'round',label:'Varela Round',desc:'סגנון עגול',family:'Varela Round',italic:false},
 {id:'playful',label:'Playpen Sans',desc:'כתב יד עגול',family:'Playpen Sans Hebrew',italic:false},
 {id:'serif',label:'Frank Ruhl Libre',desc:'סריפי מעוצב',family:'Frank Ruhl Libre',italic:false},
] as const;
type FontId=(typeof STORY_FONTS)[number]['id'];
const COLORS=['#FFFFFF','#000000','#5B0E2D','#E91E63','#F48FB1','#FCE4EC','#D7B19D','#C8A27A','#D4AF37','#B5EAD7','#C7CEEA','#FFDAC1','#E2F0CB','#FF6F61'];
const ROSE='#5B0E2D';const BASE=28;const IMG_BASE=110;
type El={id:number;kind:'text'|'pill'|'image';text:string;font:FontId;bold:boolean;underline:boolean;highlight:boolean;color:string;x:number;y:number;scale:number;z:number;src?:string|undefined};

const fontOf=(id:FontId)=>STORY_FONTS.find(f=>f.id===id)??STORY_FONTS[0];
function isLight(hex:string){const n=parseInt(hex.slice(1),16);return ((n>>16)*299+((n>>8)&255)*587+(n&255)*114)/1000>160;}
const highlightBg=(c:string)=>isLight(c)?'rgba(0,0,0,0.55)':'rgba(255,255,255,0.92)';
function isTrash(x:number,y:number){return y>86&&Math.abs(x-50)<18;}
function cssFont(e:El,px:number){const f=fontOf(e.font);return `${f.italic?'italic ':''}${e.bold?'700':'400'} ${px}px "${f.family}"`;}

async function loadImg(src:string){const img=new Image();img.src=src;await img.decode();return img;}
async function flatten(src:string,els:El[],frameW:number):Promise<File>{
 const img=await loadImg(src);
 const W=1080,H=1920,k=W/frameW,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!;
 const s=Math.max(W/img.width,H/img.height);g.drawImage(img,(W-img.width*s)/2,(H-img.height*s)/2,img.width*s,img.height*s);
 g.textAlign='center';g.textBaseline='middle';g.direction='rtl';
 for(const e of [...els].sort((a,b)=>a.z-b.z)){const x=e.x/100*W,y=e.y/100*H;
  if(e.kind==='image'&&e.src){const im=await loadImg(e.src);const w=IMG_BASE*e.scale*k,h=w*im.height/im.width;g.drawImage(im,x-w/2,y-h/2,w,h);continue;}
  if(e.kind==='pill'){const px=15*e.scale*k;g.font=`800 ${px}px "Heebo"`;await document.fonts.load(g.font);const w=g.measureText(e.text).width+px*1.6;g.fillStyle='#ffffff';g.beginPath();g.roundRect(x-w/2,y-px,w,px*2,px);g.fill();g.fillStyle=ROSE;g.fillText(e.text,x,y);continue;}
  const px=BASE*e.scale*k;g.font=cssFont(e,px);await document.fonts.load(g.font,e.text);
  const lines=e.text.split('\n');const lh=px*1.25;const top=y-(lines.length-1)*lh/2;
  lines.forEach((ln,i)=>{const ly=top+i*lh;const w=g.measureText(ln).width;
   if(e.highlight){g.fillStyle=highlightBg(e.color);g.beginPath();g.roundRect(x-w/2-px*0.35,ly-lh/2,w+px*0.7,lh,px*0.3);g.fill();}
   else{g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=px*0.25;}
   g.fillStyle=e.color;g.fillText(ln,x,ly);g.shadowBlur=0;
   if(e.underline)g.fillRect(x-w/2,ly+px*0.5,w,Math.max(2,px*0.07));});
 }
 const blob=await new Promise<Blob>((r,j)=>c.toBlob(b=>b?r(b):j(new Error('canvas')),'image/jpeg',0.9));
 return new File([blob],'story.jpg',{type:'image/jpeg'});
}
async function smallDataUrl(file:File){const url=URL.createObjectURL(file);try{const img=await loadImg(url);const s=Math.min(1,512/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d')!.drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',0.7);}finally{URL.revokeObjectURL(url);}}

function EditableText({initial,onChange,onDone}:{initial:string;onChange:(t:string)=>void;onDone:()=>void}){
 const ref=useRef<HTMLSpanElement>(null);
 useEffect(()=>{const n=ref.current;if(!n)return;n.textContent=initial;n.focus();const r=document.createRange();r.selectNodeContents(n);r.collapse(false);const s=getSelection();s?.removeAllRanges();s?.addRange(r);},[]);// eslint-disable-line react-hooks/exhaustive-deps
 return <span ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-label="טקסט הסטורי" onPointerDown={e=>e.stopPropagation()} onInput={e=>onChange((e.currentTarget.innerText||'').slice(0,120))} onBlur={onDone} className="outline-none min-w-[1ch] inline-block whitespace-pre-wrap caret-current"/>;
}

export function StoryEditor({file,onCancel,onPublish}:{file:File;onCancel:()=>void;onPublish:(f:File,alt:string)=>Promise<void>}){
 const [src]=useState(()=>URL.createObjectURL(file));useEffect(()=>()=>URL.revokeObjectURL(src),[src]);
 const [els,setEls]=useState<El[]>([]);const [sel,setSel]=useState<number|null>(null);const [editing,setEditing]=useState<number|null>(null);
 const [drag,setDrag]=useState<{id:number;dx:number;dy:number}|null>(null);const [over,setOver]=useState(false);
 const [panel,setPanel]=useState<'stickers'|null>(null);const [busy,setBusy]=useState(false);const [err,setErr]=useState('');
 const [alt,setAlt]=useState('');const [altBusy,setAltBusy]=useState(false);const [aiBusy,setAiBusy]=useState(false);
 const frame=useRef<HTMLDivElement>(null);const nid=useRef(1);const topZ=useRef(1);
 const pointers=useRef(new Map<number,{x:number;y:number}>());const pinch=useRef<{d:number;s:number}|null>(null);
 const assist=useServerFn(storyTextAssist);const describe=useServerFn(storyAltText);
 const stickers=useQuery({queryKey:['story-stickers'],staleTime:60_000,queryFn:async()=>{const {data,error}=await supabase.from('story_stickers').select('*').order('created_at',{ascending:false});if(error)throw error;
  return (await Promise.all(data.map(async s=>{const {data:b}=await supabase.storage.from('story-stickers').download(s.image_path);return b?{...s,url:URL.createObjectURL(b)}:null;}))).filter((s):s is NonNullable<typeof s>=>!!s);}});
 const selected=els.find(e=>e.id===sel)??null;
 const patch=(id:number,p:Partial<El>)=>setEls(v=>v.map(e=>e.id===id?{...e,...p}:e));
 const last=useRef<Pick<El,'font'|'bold'|'underline'|'highlight'|'color'>>({font:'assistant',bold:true,underline:false,highlight:false,color:'#FFFFFF'});
 function add(kind:El['kind'],text:string,src?:string){const id=nid.current++;const z=++topZ.current;setEls(v=>[...v,{id,kind,text,src,...last.current,x:50,y:kind==='text'?40:55,scale:1,z}]);setSel(id);setPanel(null);if(kind==='text')setEditing(id);}
 const pos=(ev:{clientX:number;clientY:number})=>{const r=frame.current!.getBoundingClientRect();return {x:(ev.clientX-r.left)/r.width*100,y:(ev.clientY-r.top)/r.height*100};};
 const clamp=(p:{x:number;y:number})=>({x:Math.min(97,Math.max(3,p.x)),y:Math.min(98,Math.max(2,p.y))});
 function down(ev:RPointerEvent,e:El){ev.stopPropagation();if(editing===e.id)return;frame.current?.setPointerCapture(ev.pointerId);pointers.current.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  const z=++topZ.current;patch(e.id,{z});setSel(e.id);if(editing!==null&&editing!==e.id)setEditing(null);const p=pos(ev);setDrag({id:e.id,dx:p.x-e.x,dy:p.y-e.y});}
 function frameDown(ev:RPointerEvent){pointers.current.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});if(pointers.current.size===2&&selected){const [a,b]=[...pointers.current.values()];pinch.current={d:Math.hypot(a!.x-b!.x,a!.y-b!.y),s:selected.scale};setDrag(null);}else if(pointers.current.size===1&&!drag){setSel(null);setEditing(null);}}
 function move(ev:RPointerEvent){if(!pointers.current.has(ev.pointerId))return;pointers.current.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(pinch.current&&sel!==null&&pointers.current.size>=2){const [a,b]=[...pointers.current.values()];const d=Math.hypot(a!.x-b!.x,a!.y-b!.y);patch(sel,{scale:Math.min(5,Math.max(0.4,pinch.current.s*d/pinch.current.d))});return;}
  if(!drag)return;const p=pos(ev);setOver(isTrash(p.x,p.y));patch(drag.id,clamp({x:p.x-drag.dx,y:p.y-drag.dy}));}
 function up(ev:RPointerEvent){pointers.current.delete(ev.pointerId);if(pointers.current.size<2)pinch.current=null;if(!drag)return;const p=pos(ev);if(isTrash(p.x,p.y)){setEls(v=>v.filter(e=>e.id!==drag.id));setSel(null);}setDrag(null);setOver(false);}
 function style(p:Partial<El>){if(!selected)return;Object.assign(last.current,p);patch(selected.id,p);}
 async function ai(mode:'improve'|'shorten'|'nikud'|'emoji'){if(!selected?.text.trim())return;setAiBusy(true);setErr('');const r=await assist({data:{text:selected.text,mode}}).catch(()=>({text:'',error:'הבינה המלאכותית לא הצליחה כרגע'}));setAiBusy(false);if(r.error||!r.text){setErr(r.error??'לא התקבל טקסט');return;}setEditing(null);patch(selected.id,{text:r.text});}
 async function makeAlt(){setAltBusy(true);setErr('');try{const f=await flatten(src,els,frame.current!.getBoundingClientRect().width);const r=await describe({data:{image:await smallDataUrl(f)}});if(r.error)setErr(r.error);else setAlt(r.alt);}catch{setErr('הפקת התיאור נכשלה');}setAltBusy(false);}
 async function publish(){setBusy(true);setErr('');setEditing(null);try{const clean=els.filter(e=>e.kind!=='text'||e.text.trim());await onPublish(await flatten(src,clean,frame.current!.getBoundingClientRect().width),alt.trim().replace(/[<>]/g,'').slice(0,400));}catch{setErr('פרסום הסטורי נכשל. נסי שוב.');setBusy(false);}}

 return <div dir="rtl" role="dialog" aria-label="עורך סטורי" className="fixed inset-0 z-[60] bg-foreground/95 flex flex-col items-center p-3 gap-2 overflow-y-auto">
  <div className="w-full max-w-sm flex items-center justify-between shrink-0"><Button size="icon" variant="ghost" className="text-primary-foreground" aria-label="ביטול" onClick={onCancel}><X/></Button>
   <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={()=>add('text','')}><Type/>טקסט</Button><Button size="sm" variant="secondary" onClick={()=>setPanel(panel==='stickers'?null:'stickers')}><Smile/>סטיקרים</Button></div></div>
  <div ref={frame} onPointerDown={frameDown} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{touchAction:'none',backgroundImage:`url(${src})`}} className="relative w-full max-w-sm aspect-[9/16] max-h-[64vh] shrink-0 rounded-3xl overflow-hidden bg-cover bg-center select-none">
   {els.map(e=>{const f=fontOf(e.font);const active=sel===e.id;
    return <div key={e.id} onPointerDown={ev=>down(ev,e)} onDoubleClick={()=>e.kind==='text'&&setEditing(e.id)} style={{left:e.x+'%',top:e.y+'%',zIndex:e.z,transform:`translate(-50%,-50%) scale(${e.scale})`,touchAction:'none'}} className={'absolute cursor-grab max-w-[90%] text-center '+(drag?.id===e.id&&over?'opacity-50 ':'')+(active?'outline outline-1 outline-dashed outline-primary-foreground/70 rounded-md':'')}>
     {e.kind==='image'&&e.src&&<img src={e.src} alt={e.text||'סטיקר'} draggable={false} style={{width:IMG_BASE}} className="pointer-events-none"/>}
     {e.kind==='pill'&&<span className="block bg-card text-[#5B0E2D] font-extrabold rounded-full px-4 py-2 text-[15px] whitespace-nowrap shadow-soft">{e.text}</span>}
     {e.kind==='text'&&<span style={{fontFamily:`"${f.family}"`,fontStyle:f.italic?'italic':'normal',fontWeight:e.bold?700:400,textDecoration:e.underline?'underline':'none',color:e.color,fontSize:BASE,lineHeight:1.25,background:e.highlight?highlightBg(e.color):'transparent',textShadow:e.highlight?'none':'0 1px 6px rgba(0,0,0,.35)'}} className="inline-block rounded-lg px-2 whitespace-pre-wrap break-words">
      {editing===e.id?<EditableText initial={e.text} onChange={t=>patch(e.id,{text:t})} onDone={()=>setEditing(null)}/>:(e.text||<span className="opacity-60">הקלידי כאן</span>)}</span>}
    </div>;})}
   {drag&&<div className={'absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full grid place-items-center transition z-[999] '+(over?'bg-destructive text-destructive-foreground scale-125':'bg-card/80 text-foreground')}><Trash2/></div>}
  </div>

  {selected&&<div className="w-full max-w-sm bg-card rounded-2xl p-3 space-y-2 shrink-0">
   <div className="flex items-center gap-2"><span className="text-xs font-bold">גודל</span><Button size="icon" variant="outline" aria-label="הקטנה" onClick={()=>patch(selected.id,{scale:Math.max(0.4,selected.scale-0.15)})}><Minus/></Button>
    <input aria-label="שינוי גודל" type="range" min={0.4} max={5} step={0.05} value={selected.scale} onChange={e=>patch(selected.id,{scale:Number(e.target.value)})} className="flex-1 accent-primary"/>
    <Button size="icon" variant="outline" aria-label="הגדלה" onClick={()=>patch(selected.id,{scale:Math.min(5,selected.scale+0.15)})}><Plus/></Button></div>
   {selected.kind==='text'&&<>
    <div className="flex gap-1.5 overflow-x-auto pb-1">{STORY_FONTS.map(f=><button key={f.id} type="button" onClick={()=>style({font:f.id})} className={'shrink-0 rounded-xl border px-3 py-1.5 text-right '+(selected.font===f.id?'border-primary bg-accent':'border-border')}>
     <span style={{fontFamily:`"${f.family}"`,fontStyle:f.italic?'italic':'normal'}} className="block text-base leading-tight">{f.desc}</span><span className="block text-[10px] text-muted-foreground">{f.label}</span></button>)}</div>
    <div className="flex gap-1.5 flex-wrap">
     <Button size="icon" variant={selected.bold?'default':'outline'} aria-label="עיבוי" aria-pressed={selected.bold} onClick={()=>style({bold:!selected.bold})}><Bold/></Button>
     <Button size="icon" variant={selected.underline?'default':'outline'} aria-label="קו תחתון" aria-pressed={selected.underline} onClick={()=>style({underline:!selected.underline})}><Underline/></Button>
     <Button size="icon" variant={selected.highlight?'default':'outline'} aria-label="רקע מרקר" aria-pressed={selected.highlight} onClick={()=>style({highlight:!selected.highlight})}><Highlighter/></Button>
     <Button size="sm" variant="outline" onClick={()=>setEditing(selected.id)}><Type/>עריכה</Button>
    </div>
    <div className="flex gap-1.5 flex-wrap items-center">{COLORS.map(c=><button key={c} type="button" aria-label={`צבע ${c}`} onClick={()=>style({color:c})} style={{background:c}} className={'w-7 h-7 rounded-full border-2 '+(selected.color===c?'border-primary scale-110':'border-border')}/>)}
     <label className="w-7 h-7 rounded-full overflow-hidden border-2 border-border relative bg-rose-glam" title="צבע חופשי"><input type="color" aria-label="בחירת צבע חופשי" value={selected.color} onChange={e=>style({color:e.target.value.toUpperCase()})} className="absolute inset-0 opacity-0 cursor-pointer"/></label></div>
    <div className="flex gap-1.5 flex-wrap items-center"><span className="text-xs font-bold flex items-center gap-1"><Sparkles className="w-4 h-4 text-primary"/>ניסוח חכם עם AI</span>
     {([['improve','שיפור'],['shorten','קיצור'],['nikud','ניקוד'],['emoji','אימוג׳ים']] as const).map(([m,l])=><Button key={m} size="sm" variant="secondary" disabled={aiBusy||!selected.text.trim()} onClick={()=>void ai(m)}>{l}</Button>)}
     {aiBusy&&<span className="text-xs text-muted-foreground">מנסחת...</span>}</div>
   </>}
  </div>}

  {panel==='stickers'&&<div className="w-full max-w-sm bg-card rounded-2xl p-3 space-y-2 shrink-0">
   <div className="grid grid-cols-2 gap-2">{STORY_STICKERS.map(s=><button key={s} type="button" onClick={()=>add('pill',s)} className="rounded-full bg-accent text-[#5B0E2D] font-bold text-xs px-3 py-2">{s}</button>)}</div>
   {(stickers.data?.length??0)>0&&<div className="grid grid-cols-4 gap-2">{stickers.data!.map(s=><button key={s.id} type="button" aria-label={s.label||'סטיקר'} onClick={()=>add('image',s.label,s.url)} className="aspect-square rounded-xl bg-muted p-1"><img src={s.url} alt={s.label||'סטיקר'} className="w-full h-full object-contain"/></button>)}</div>}
   {stickers.isError&&<p className="text-xs text-muted-foreground">טעינת הסטיקרים נכשלה</p>}
  </div>}

  <div className="w-full max-w-sm bg-card rounded-2xl p-3 space-y-2 shrink-0">
   <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold flex items-center gap-1"><Accessibility className="w-4 h-4"/>תיאור לקוראות מסך</span><Button size="sm" variant="secondary" disabled={altBusy} onClick={()=>void makeAlt()}><Sparkles/>{altBusy?'מפיקה...':'הפקה אוטומטית'}</Button></div>
   <textarea value={alt} maxLength={400} onChange={e=>setAlt(e.target.value)} rows={2} placeholder="תיאור קצר של התמונה (לא חובה)" className="w-full rounded-xl border border-border bg-accent px-3 py-2 text-sm text-right"/>
  </div>
  {err&&<p role="alert" className="text-xs text-primary-foreground">{err}</p>}
  <p className="text-[11px] text-primary-foreground/70">גררי להזזה, צביטה בשתי אצבעות או הסרגל לשינוי גודל, גרירה לפח מוחקת. לחיצה כפולה על טקסט לעריכה.</p>
  <Button disabled={busy} onClick={()=>void publish()} className="w-full max-w-sm shrink-0 bg-rose-glam text-primary-foreground font-black rounded-2xl py-3">{busy?'מפרסמת...':'פרסום סטורי לקהילה'}</Button>
 </div>;
}
