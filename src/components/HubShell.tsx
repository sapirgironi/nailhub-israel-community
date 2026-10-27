import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Sparkles,Users,ShoppingBag,ShieldCheck,Calculator,FileSignature,Palette,Bookmark,User,Home,Search,Plus,PenLine,LogOut,Menu,X,Camera,ImageIcon,LifeBuoy,Megaphone,BriefcaseBusiness } from 'lucide-react';
import {Button} from './ui/button';
import {NotificationsBell} from './NotificationsBell';
import {queueStory} from '@/lib/story-handoff';
import {supabase} from '@/integrations/supabase/client';
export type HubSection='feed'|'directory'|'boards'|'nailtrade'|'insurance'|'calculator'|'health_form'|'pricelist'|'saved'|'profile'|'draft'|'admin'|'support'|'clinic';
const links=[{id:'feed',path:'/feed',label:'הפיד המקצועי',icon:Sparkles},{id:'directory',path:'/directory',label:'אינדקס חברות',icon:Users},{id:'boards',path:'/boards',label:'לוחות הקהילה',icon:Users},{id:'nailtrade',path:'/nailtrade',label:'ציוד יד שנייה',icon:ShoppingBag},{id:'insurance',path:'/insurance',label:'ביטוח מקצועי לעסק',icon:ShieldCheck},{id:'calculator',path:'/calculator',label:'מחשבון תמחור ורווחיות',icon:Calculator},{id:'health_form',path:'/health',label:'הצהרת בריאות חתומה',icon:FileSignature},{id:'pricelist',path:'/pricelist',label:'מחירון דיגיטלי',icon:Palette},{id:'draft',path:'/draft',label:'כתיבת פוסט חכמה',icon:PenLine},{id:'saved',path:'/saved',label:'השמורים שלי',icon:Bookmark},{id:'support',path:'/support',label:'צרי קשר / דיווח על תקלה',icon:LifeBuoy},{id:'profile',path:'/profile',label:'הפרופיל שלי',icon:User}] as const;
const adminLink={id:'admin',path:'/admin',label:'ניהול מערכת',icon:ShieldCheck} as const;

function AnnouncementBar(){
 const {data}=useQuery({queryKey:['announcement'],queryFn:async()=>{const {data,error}=await supabase.from('announcements').select('id,body').eq('active',true).order('created_at',{ascending:false}).limit(1);if(error)return [];return data;},staleTime:60_000});
 const a=data?.[0];
 if(!a)return null;
 return <div role="status" className="bg-rose-glam text-primary-foreground text-center text-xs font-bold px-4 py-2 flex items-center justify-center gap-2"><Megaphone className="w-4 h-4 shrink-0"/>{a.body}</div>;
}

function NavLinks({section,onPick,isAdmin}:{section:HubSection;onPick?:()=>void;isAdmin?:boolean|undefined}){
  return <><Button asChild variant="secondary" className="w-full justify-start h-auto min-h-10 whitespace-normal text-right text-xs mb-2"><Link to="/plans" onClick={onPick}><Sparkles/>מסלולים ושדרוג</Link></Button>{links.map(({id,path,label,icon:Icon})=><Button asChild key={id} variant={section===id?'secondary':'ghost'} className="w-full justify-start h-auto min-h-10 whitespace-normal text-right text-xs"><Link to={path} onClick={onPick}><Icon/><span>{label}</span></Link></Button>)}{isAdmin&&<Button asChild variant={section==='admin'?'secondary':'ghost'} className="w-full justify-start h-auto min-h-10 whitespace-normal text-right text-xs font-bold text-primary"><Link to={adminLink.path} onClick={onPick}><adminLink.icon/><span>{adminLink.label}</span></Link></Button>}<Button asChild variant="ghost" className="mt-3 w-full justify-start h-auto min-h-10 whitespace-normal text-right text-xs text-muted-foreground"><Link to="/terms" onClick={onPick}>תנאי שימוש ומדיניות קהילה</Link></Button></>;
}

export function HubShell({section,children,name,onSignOut,isAdmin}:{section:HubSection;children:ReactNode;name?:string|undefined;onSignOut?:()=>void;isAdmin?:boolean}){
 const [menu,setMenu]=useState(false);const [sheet,setSheet]=useState(false);const navigate=useNavigate();
 const mobileItems=[{path:'/feed',label:'בית',icon:Home,active:section==='feed'},{path:'/directory',label:'חיפוש',icon:Search,active:section==='directory'},{path:'/clinic',label:'הקליניקה שלי',icon:BriefcaseBusiness,active:['clinic','calculator','health_form','pricelist','draft'].includes(section)},{path:'/profile',label:'הפרופיל שלי',icon:User,active:section==='profile'}] as const;
 const item=(i:typeof mobileItems[number])=><Button key={i.path} asChild variant="ghost" className={'mx-auto w-11 h-11 p-0 '+(i.active?'text-primary bg-accent':'text-muted-foreground')}><Link to={i.path} aria-label={i.label} title={i.label}><i.icon/></Link></Button>;
 return <div dir="rtl" className="min-h-screen bg-background text-foreground text-right md:flex [&_svg]:stroke-[1.5]">
  <aside className="hidden md:flex md:sticky md:top-0 md:h-screen w-64 shrink-0 border-l border-border bg-card p-5 flex-col">
  <div className="flex items-center mb-6"><Link to="/feed" search={{compose:false}} className="flex items-center gap-3"><span className="w-10 h-10 rounded-2xl bg-accent text-primary grid place-items-center"><Sparkles/></span><span className="font-black text-2xl text-primary">NailHub</span></Link></div>
  <nav className="space-y-1 overflow-y-auto flex-1"><NavLinks section={section} isAdmin={isAdmin}/></nav>
  <div className="border-t border-border mt-4 pt-4"><div className="text-sm font-bold break-words">{name??'NailHub'}</div>{onSignOut&&<Button variant="ghost" className="mt-2 text-muted-foreground text-xs" onClick={onSignOut}><LogOut/>התנתקות</Button>}</div>
  </aside>
   <div className="min-w-0 flex-1"><AnnouncementBar/><header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-xl grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3"><div className="flex items-center gap-1 min-w-0"><Button size="icon" variant="ghost" className="md:hidden" aria-label="פתיחת תפריט" onClick={()=>setMenu(true)}><Menu/></Button><Link to="/feed" search={{compose:false}} className="min-w-0 font-black text-xl text-primary">NailHub</Link></div><div className="flex items-center gap-1 shrink-0">{isAdmin&&<Button asChild size="icon" variant="ghost" aria-label="פאנל ניהול" title="פאנל ניהול" className="text-primary"><Link to="/admin"><ShieldCheck/></Link></Button>}<NotificationsBell/></div></header><main className="max-w-5xl mx-auto p-4 md:p-8 pb-28 md:pb-12">{children}</main></div>
   {menu&&<div className="md:hidden fixed inset-0 z-50 bg-overlay" onClick={()=>setMenu(false)}><aside role="dialog" aria-label="תפריט ניווט" onClick={e=>e.stopPropagation()} className="absolute top-0 right-0 h-full w-72 max-w-[85vw] bg-card shadow-soft p-5 flex flex-col animate-in slide-in-from-right duration-200">
    <div className="flex items-center justify-between mb-4"><span className="font-black text-xl text-primary">NailHub</span><Button size="icon" variant="ghost" aria-label="סגירת תפריט" onClick={()=>setMenu(false)}><X/></Button></div>
    <nav className="space-y-1 overflow-y-auto flex-1"><NavLinks section={section} onPick={()=>setMenu(false)} isAdmin={isAdmin}/></nav>
   <div className="border-t border-border mt-4 pt-4"><div className="text-sm font-bold break-words">{name??'NailHub'}</div>{onSignOut&&<Button variant="ghost" className="mt-2 text-muted-foreground text-xs" onClick={()=>{setMenu(false);onSignOut();}}><LogOut/>התנתקות</Button>}</div>
  </aside></div>}
  {sheet&&<div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex flex-col justify-end" onClick={()=>setSheet(false)}><div role="dialog" aria-label="יצירה חדשה" onClick={e=>e.stopPropagation()} className="bg-card rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 max-w-lg w-full mx-auto shadow-soft animate-in slide-in-from-bottom duration-200">
   <div className="flex items-center justify-between border-b border-border pb-2"><span className="font-black text-sm">יצירה והעלאה חדשה</span><Button size="icon" variant="ghost" aria-label="סגירה" onClick={()=>setSheet(false)}><X/></Button></div>
   <div className="grid grid-cols-2 gap-3">
    <label className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border bg-accent/50 hover:bg-accent cursor-pointer text-center gap-2"><span className="w-10 h-10 rounded-full bg-rose-glam text-primary-foreground grid place-items-center"><Camera className="w-5 h-5"/></span><span className="text-xs font-black">סטורי ל־24 שעות</span><span className="text-[10px] text-primary font-bold">בחירת תמונה ופרסום</span><input type="file" aria-label="בחירת תמונה לסטורי" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;setSheet(false);queueStory(f);if(section!=='feed')void navigate({to:'/feed',search:{compose:false}});}}/></label>
     <Button type="button" variant="outline" onClick={()=>{setSheet(false);void navigate({to:'/feed',search:{compose:true}});}} className="h-auto flex flex-col items-center justify-center p-4 rounded-2xl border border-border bg-accent/50 hover:bg-accent text-center gap-2 whitespace-normal"><span className="w-10 h-10 rounded-full bg-rose-glam text-primary-foreground grid place-items-center"><ImageIcon className="w-5 h-5"/></span><span className="text-xs font-black">פוסט בפיד המקצועי</span><span className="text-[10px] text-primary font-bold">תמונה וכיתוב</span></Button>
   </div>
  </div></div>}
  <nav aria-label="ניווט ראשי במובייל" className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/85 backdrop-blur-xl grid grid-cols-5 items-center px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] h-auto min-h-16">
   {item(mobileItems[0])}{item(mobileItems[1])}
   <Button variant="ghost" aria-label="פרסום עבודה חדשה" title="פרסום עבודה חדשה" onClick={()=>setSheet(true)} className="mx-auto w-11 h-11 p-0 rounded-full bg-rose-glam text-primary-foreground shadow-glow hover:opacity-90"><Plus/></Button>
   {item(mobileItems[2])}{item(mobileItems[3])}
  </nav>
  </div>;
}
