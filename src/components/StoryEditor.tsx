import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {Trash2,Type,X,Smile} from 'lucide-react';
import {Button} from './ui/button';

type Style='marker'|'clean'|'outline'|'rounded'|'print';
type El={id:number;kind:'text'|'sticker';text:string;style:Style;x:number;y:number};
const STYLES:{id:Style;label:string}[]=[{id:'marker',label:'מרקר'},{id:'clean',label:'נקי'},{id:'outline',label:'קו מתאר'},{id:'rounded',label:'עגול'},{id:'print',label:'דפוס'}];
export const STORY_STICKERS=['התפנה תור להיום ⏰','מחפשת מודליסטית 🔍','מבצע לספקים 🔥','השתלמות מקצועית 👑'];
const FONT:Record<Style,string>={marker:'900 sans-serif',clean:'600 sans-serif',outline:'900 sans-serif',rounded:'800 "Varela Round", "Arial Rounded MT Bold", sans-serif',print:'700 Georgia, "Frank Ruhl Libre", serif'};
const ROSE='#5B0E2D';

function isTrash(x:number,y:number){return y>86&&Math.abs(x-50)<18;}

async function flatten(src:string,els:El[]):Promise<File>{
 const img=new Image();img.src=src;await img.decode();
 const W=1080,H=1920,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!;
 const s=Math.max(W/img.width,H/img.height);g.drawImage(img,(W-img.width*s)/2,(H-img.height*s)/2,img.width*s,img.height*s);
 g.textAlign='center';g.textBaseline='middle';g.direction='rtl';
 for(const e of els){const x=e.x/100*W,y=e.y/100*H;
  if(e.kind==='sticker'){g.font='800 46px sans-serif';const w=g.measureText(e.text).width+64;g.fillStyle='#ffffff';g.beginPath();g.roundRect(x-w/2,y-48,w,96,48);g.fill();g.fillStyle=ROSE;g.fillText(e.text,x,y);continue;}
  g.font=FONT[e.style].replace(' ',' 64px ');const w=g.measureText(e.text).width;
  if(e.style==='marker'){g.fillStyle='#ffffff';g.beginPath();g.roundRect(x-w/2-28,y-50,w+56,100,22);g.fill();g.fillStyle=ROSE;g.fillText(e.text,x,y);}
  else if(e.style==='outline'){g.lineWidth=8;g.strokeStyle=ROSE;g.strokeText(e.text,x,y);g.fillStyle='#ffffff';g.fillText(e.text,x,y);}
  else{g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=12;g.fillStyle='#ffffff';g.fillText(e.text,x,y);g.shadowBlur=0;}
 }
 const blob=await new Promise<Blob>((r,j)=>c.toBlob(b=>b?r(b):j(new Error('canvas')),'image/jpeg',0.9));
 return new File([blob],'story.jpg',{type:'image/jpeg'});
}

function elClass(e:El){
 if(e.kind==='sticker')return 'bg-card text-[#5B0E2D] font-extrabold rounded-full px-4 py-2 text-sm shadow-soft';
 const base='text-xl whitespace-nowrap ';
 return base+({marker:'bg-card text-[#5B0E2D] font-black rounded-xl px-3 py-1',clean:'text-primary-foreground font-semibold drop-shadow-md',outline:'text-primary-foreground font-black [-webkit-text-stroke:1.5px_#5B0E2D]',rounded:'text-primary-foreground font-extrabold drop-shadow-md tracking-wide',print:'text-primary-foreground font-bold font-serif drop-shadow-md'} as const)[e.style];
}

export function StoryEditor({file,onCancel,onPublish}:{file:File;onCancel:()=>void;onPublish:(f:File)=>Promise<void>}){
 const [src]=useState(()=>URL.createObjectURL(file));useEffect(()=>()=>URL.revokeObjectURL(src),[src]);
 const [els,setEls]=useState<El[]>([]);const [drag,setDrag]=useState<number|null>(null);const [over,setOver]=useState(false);
 const [text,setText]=useState('');const [style,setStyle]=useState<Style>('marker');const [panel,setPanel]=useState<'text'|'stickers'|null>(null);
 const [busy,setBusy]=useState(false);const [err,setErr]=useState('');const frame=useRef<HTMLDivElement>(null);const nid=useRef(1);
 const add=(kind:El['kind'],t:string)=>{if(!t.trim())return;setEls(v=>[...v,{id:nid.current++,kind,text:t.trim().slice(0,60),style,x:50,y:40}]);setPanel(null);setText('');};
 const pos=(ev:PointerEvent)=>{const r=frame.current!.getBoundingClientRect();return {x:Math.min(95,Math.max(5,(ev.clientX-r.left)/r.width*100)),y:Math.min(97,Math.max(3,(ev.clientY-r.top)/r.height*100))};};
 const move=(ev:PointerEvent)=>{if(drag===null)return;const p=pos(ev);setOver(isTrash(p.x,p.y));setEls(v=>v.map(e=>e.id===drag?{...e,...p}:e));};
 const up=(ev:PointerEvent)=>{if(drag===null)return;const p=pos(ev);if(isTrash(p.x,p.y))setEls(v=>v.filter(e=>e.id!==drag));setDrag(null);setOver(false);};
 async function publish(){setBusy(true);setErr('');try{await onPublish(await flatten(src,els));}catch{setErr('פרסום הסטורי נכשל. נסי שוב.');setBusy(false);}}
 return <div dir="rtl" role="dialog" aria-label="עורך סטורי" className="fixed inset-0 z-[60] bg-foreground/95 flex flex-col items-center justify-center p-3 gap-3">
  <div className="w-full max-w-sm flex items-center justify-between"><Button size="icon" variant="ghost" className="text-primary-foreground" aria-label="ביטול" onClick={onCancel}><X/></Button>
   <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={()=>setPanel(panel==='text'?null:'text')}><Type/>טקסט</Button><Button size="sm" variant="secondary" onClick={()=>setPanel(panel==='stickers'?null:'stickers')}><Smile/>סטיקרים</Button></div></div>
  <div ref={frame} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{touchAction:'none'}} className="relative w-full max-w-sm aspect-[9/16] max-h-[70vh] rounded-3xl overflow-hidden bg-muted select-none">
   <img src={src} alt="תמונת הסטורי" draggable={false} className="w-full h-full object-cover pointer-events-none"/>
   {els.map(e=><div key={e.id} onPointerDown={ev=>{ev.currentTarget.setPointerCapture(ev.pointerId);setDrag(e.id);}} style={{left:e.x+'%',top:e.y+'%',touchAction:'none'}} className={'absolute -translate-x-1/2 -translate-y-1/2 cursor-grab '+elClass(e)+(drag===e.id&&over?' opacity-50 scale-75':'')}>{e.text}</div>)}
   {drag!==null&&<div className={'absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full grid place-items-center transition '+(over?'bg-destructive text-destructive-foreground scale-125':'bg-card/80 text-foreground')}><Trash2/></div>}
  </div>
  {panel==='text'&&<div className="w-full max-w-sm bg-card rounded-2xl p-3 space-y-2"><input autoFocus value={text} maxLength={60} onChange={e=>setText(e.target.value)} placeholder="כתבי משהו..." className="w-full rounded-xl border border-border bg-accent px-3 py-2 text-sm text-right"/>
   <div className="flex flex-wrap gap-1">{STYLES.map(s=><Button key={s.id} size="sm" variant={style===s.id?'default':'outline'} className="text-xs" onClick={()=>setStyle(s.id)}>{s.label}</Button>)}</div>
   <Button className="w-full" onClick={()=>add('text',text)}>הוספה לסטורי</Button></div>}
  {panel==='stickers'&&<div className="w-full max-w-sm bg-card rounded-2xl p-3 grid grid-cols-2 gap-2">{STORY_STICKERS.map(s=><button key={s} type="button" onClick={()=>add('sticker',s)} className="rounded-full bg-accent text-[#5B0E2D] font-bold text-xs px-3 py-2">{s}</button>)}</div>}
  {err&&<p className="text-xs text-primary-foreground">{err}</p>}
  <p className="text-[11px] text-primary-foreground/70">גררי טקסט או סטיקר לפח כדי למחוק</p>
  <Button disabled={busy} onClick={()=>void publish()} className="w-full max-w-sm bg-rose-glam text-primary-foreground font-black rounded-2xl py-3">{busy?'מפרסמת...':'פרסום סטורי לקהילה'}</Button>
 </div>;
}
