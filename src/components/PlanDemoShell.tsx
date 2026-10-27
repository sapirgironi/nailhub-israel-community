import {useEffect,useState,type ReactNode} from 'react';
import {Link} from '@tanstack/react-router';
import {ArrowRight,Crown,FlaskConical} from 'lucide-react';
import {Button} from './ui/button';
import {DEMO_STORAGE_KEY,isDemoPlan,PLAN_NAMES,type DemoPlan} from '@/lib/plan-demo';

export function PlanDemoShell({children}:{children:(plan:DemoPlan,setPlan:(plan:DemoPlan)=>void)=>ReactNode}){
 const [plan,setPlanState]=useState<DemoPlan>('free');
 useEffect(()=>{try{const saved=sessionStorage.getItem(DEMO_STORAGE_KEY);if(isDemoPlan(saved))setPlanState(saved);}catch{}},[]);
 const setPlan=(p:DemoPlan)=>{setPlanState(p);try{sessionStorage.setItem(DEMO_STORAGE_KEY,p);}catch{}};
 return <div dir="rtl" className="min-h-screen bg-background text-foreground pb-12">
 <header className="border-b border-border bg-card px-4 py-4"><div className="max-w-6xl mx-auto flex items-center justify-between gap-3"><Link to="/plans" className="text-primary font-black text-2xl">NailHub<span className="text-sm font-medium text-muted-foreground mr-2">המסלולים שלי</span></Link><Button asChild variant="ghost" size="sm"><Link to="/feed" search={{compose:false}}><ArrowRight/>לקהילה</Link></Button></div></header>
 <div className="bg-warn-soft border-b border-border"><div className="max-w-6xl mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div className="flex items-start gap-2 text-warn text-xs"><FlaskConical className="w-4 h-4 shrink-0"/><p><strong>מצב הדגמה</strong> · נתונים לדוגמה בלבד. ללא תשלום, שינוי מנוי אמיתי או הענקת הרשאות.</p></div><div role="group" aria-label="מסלול לבדיקה" className="flex flex-wrap gap-1">{(Object.keys(PLAN_NAMES) as DemoPlan[]).map(p=><Button key={p} size="sm" variant={plan===p?'secondary':'ghost'} aria-pressed={plan===p} onClick={()=>setPlan(p)}>{p!=='free'&&<Crown/>}{PLAN_NAMES[p]}</Button>)}</div></div></div>
 <nav aria-label="אזורי התנסות" className="border-b border-border overflow-x-auto"><div className="max-w-6xl mx-auto px-4 flex gap-2 py-2 min-w-max">{([{to:'/plans',label:'כל המסלולים'},{to:'/demo-pricelist',label:'מחולל מחירון'},{to:'/demo-health',label:'הצהרות בריאות'},{to:'/academy',label:'קורסים והשתלמויות'},{to:'/vendor-deals',label:'מבצעי ספקים'}] as const).map(item=><Button key={item.to} asChild size="sm" variant="ghost"><Link to={item.to} activeProps={{className:'text-primary bg-accent'}}>{item.label}</Link></Button>)}</div></nav>
 <main className="max-w-6xl mx-auto px-4 py-8 md:py-10">{children(plan,setPlan)}</main>
 </div>;
}