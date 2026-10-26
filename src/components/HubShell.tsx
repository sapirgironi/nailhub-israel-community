import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Sparkles,Users,ShoppingBag,ShieldCheck,Calculator,FileSignature,Palette,Bookmark,User,Menu,X,PenLine,LogOut } from 'lucide-react';
import {Button} from './ui/button';
export type HubSection='feed'|'directory'|'boards'|'nailtrade'|'insurance'|'calculator'|'health_form'|'pricelist'|'saved'|'profile'|'draft';
const links=[{id:'feed',path:'/feed',label:'הפיד המקצועי',icon:Sparkles},{id:'directory',path:'/directory',label:'דירקטורי חברות',icon:Users},{id:'boards',path:'/boards',label:'לוחות הקהילה',icon:Users},{id:'nailtrade',path:'/nailtrade',label:'NailTrade • ציוד יד שנייה',icon:ShoppingBag},{id:'insurance',path:'/insurance',label:'ביטוח מקצועי לעסק',icon:ShieldCheck},{id:'calculator',path:'/calculator',label:'מחשבון תמחור ורווחיות',icon:Calculator},{id:'health_form',path:'/health',label:'הצהרת בריאות חתומה',icon:FileSignature},{id:'pricelist',path:'/pricelist',label:'מחירון דיגיטלי',icon:Palette},{id:'draft',path:'/draft',label:'כתיבת פוסט חכמה',icon:PenLine},{id:'saved',path:'/saved',label:'השמורים שלי',icon:Bookmark},{id:'profile',path:'/profile',label:'הפרופיל שלי',icon:User}] as const;
export function HubShell({section,children,name,onSignOut}:{section:HubSection;children:ReactNode;name?:string;onSignOut?:()=>void}){
 const [open,setOpen]=useState(false);
 return <div dir="rtl" className="min-h-screen bg-background text-foreground md:flex">
 {open&&<div className="fixed inset-0 z-40 bg-overlay md:hidden" onClick={()=>setOpen(false)}/>}
 <aside className={`fixed right-0 inset-y-0 z-50 w-64 border-l border-border bg-card p-5 flex flex-col md:sticky md:top-0 md:h-screen md:shrink-0 transition-transform ${open?'translate-x-0':'translate-x-full md:translate-x-0'}`}>
 <div className="flex items-center justify-between mb-6"><Link to="/feed" className="flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-primary text-primary-foreground grid place-items-center"><Sparkles/></span><span className="font-black text-2xl text-primary">NailHub</span></Link><Button aria-label="סגירת תפריט" variant="ghost" size="icon" className="md:hidden" onClick={()=>setOpen(false)}><X/></Button></div>
 <nav className="space-y-1 overflow-y-auto flex-1">{links.map(({id,path,label,icon:Icon})=><Button asChild key={id} variant={section===id?'default':'ghost'} className="w-full justify-start h-auto min-h-10 whitespace-normal text-right text-xs"><Link to={path} onClick={()=>setOpen(false)}><Icon/><span>{label}</span></Link></Button>)}</nav>
 <div className="border-t border-border mt-4 pt-4"><div className="text-sm font-bold break-words">{name??'NailHub'}</div>{onSignOut&&<Button variant="ghost" className="mt-2 text-muted-foreground text-xs" onClick={onSignOut}><LogOut/>התנתקות</Button>}</div>
 </aside>
 <div className="min-w-0 flex-1"><header className="sticky top-0 z-30 md:hidden bg-card border-b border-border flex items-center justify-between p-3"><Button size="icon" variant="ghost" aria-label="פתיחת תפריט" onClick={()=>setOpen(true)}><Menu/></Button><span className="font-black text-xl text-primary">NailHub</span><span className="w-9"/></header><main className="max-w-5xl mx-auto p-4 md:p-8 pb-12">{children}</main></div>
 </div>;
}
