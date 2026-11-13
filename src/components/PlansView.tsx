import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from '@tanstack/react-router';
import {Check,Crown,GraduationCap,ShoppingBag,Sparkles,ArrowLeft} from 'lucide-react';
import {Button} from './ui/button';
import {PlanDemoShell} from './PlanDemoShell';
import {PlanUpgradeDialog} from './PlanUpgradeDialog';
import {supabase} from '@/integrations/supabase/client';
import {hebrewError} from '@/lib/hebrew-errors';
import {PLAN_PRICES,canUpgradeProfession,type DemoPlan,type BillingPeriod} from '@/lib/plan-demo';

const features:Record<DemoPlan,string[]>={
 free:['צפייה בפיד ושמירת השראה','צפייה בסטוריז','תבניות לפוסטים למקצועיות','עד 5 הצהרות בריאות בחודש'],
 pro:['תבניות לניסוח פוסטים','מחשבון תמחור פר טיפול','מחולל מחירון דיגיטלי','הצהרות בריאות ללא הגבלה','עורך סטורי HD','תגית VIP: מקצועית מאומתת ✨'],
 academy:['כל יכולות Pro במלואן','סילבוסים ומערכי שיעור','תעודות ומכתבי סיום','לוח קורסים והשתלמויות','2 בוסטים חודשיים'],
 vendor:['מסחר ומבצעים בלעדיים','חנות רשמית, קטלוג וקודי קופון','2 בוסטים חודשיים','תגית ספק מאומת']};
const names={free:'חינם',pro:'פרו',academy:'מדריכות',vendor:'ספקים'};
const english={free:'Free',pro:'Pro',academy:'Academy',vendor:'Vendor'};
const ctas={free:'המסלול הנוכחי',pro:'שדרגי ל-Pro',academy:'הצטרפי כמדריכה',vendor:'הצטרף כספק'};
const icons={free:Sparkles,pro:Crown,academy:GraduationCap,vendor:ShoppingBag};
const requestedRoles={pro:'nail_tech',academy:'instructor',vendor:'supplier'};

export function PlansView(){
 const [billing,setBilling]=useState<BillingPeriod>('monthly');const [notice,setNotice]=useState('');const [requestRole,setRequestRole]=useState<string|null>(null);
 const account=useQuery({queryKey:['plans-account'],queryFn:async()=>{const {data:{user},error}=await supabase.auth.getUser();if(error&&!user)return null;if(!user)return null;const {data,error:failure}=await supabase.from('profiles').select('id,account_role').eq('id',user.id).single();if(failure)throw failure;return {id:data.id,role:data.account_role};},retry:false});
 return <PlanDemoShell compact>{(plan,setPlan)=>{
 const upgrade=(p:Exclude<DemoPlan,'free'>)=>{setNotice('');if(!account.data){setNotice(account.isError?hebrewError(account.error,'לא ניתן לבדוק את הפרופיל כרגע. נסי שוב.'): 'התחברי לקהילה כדי לבחור מסלול.');return;}if(!canUpgradeProfession(account.data.role)){setRequestRole(requestedRoles[p]);return;}setPlan(p);setNotice('נבחר מסלול להדגמה בלבד. לא בוצע חיוב ולא הופעל מנוי.');};
 return <><header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 mb-5"><div className="min-w-0"><h1 className="font-black text-2xl md:text-3xl">מסלולי NailHub</h1><p className="text-muted-foreground text-xs mt-1">המסלול שלך, השלב הבא בעסק.</p></div><div role="group" aria-label="תקופת תשלום" className="flex shrink-0 bg-muted p-1 rounded-lg">{(['monthly','yearly'] as const).map(b=><Button key={b} size="sm" variant={billing===b?'secondary':'ghost'} aria-pressed={billing===b} className="h-8 px-2.5 text-xs" onClick={()=>setBilling(b)}>{b==='monthly'?'חודשי':'שנתי'}</Button>)}</div></header>
 <div aria-label="מסלולי המנויים" className="grid grid-cols-2 gap-3 md:gap-5">{(['free','pro','academy','vendor'] as const).map(p=>{const Icon=icons[p];return <article key={p} aria-label={`מסלול ${names[p]}`} className={'min-w-0 rounded-xl border bg-card shadow-soft p-3 md:p-5 flex flex-col '+(p==='pro'?'border-primary':'border-border')}><div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-1"><div className="min-w-0"><h2 className="text-base md:text-xl font-bold">{names[p]}</h2><span className="text-[10px] md:text-xs text-muted-foreground" dir="ltr">NailHub {english[p]}</span></div><Icon className="size-4 md:size-5 text-primary shrink-0 mt-1"/></div><div className="my-3"><strong className="text-2xl md:text-3xl font-black inline-block" dir="ltr">₪{PLAN_PRICES[p][billing].toLocaleString('he-IL')}</strong><span className="text-[10px] md:text-xs text-muted-foreground mr-1">{billing==='monthly'?'לחודש':'לשנה'}</span></div><ul className="space-y-1.5 mb-4 flex-1">{features[p].map(f=><li className="flex items-start gap-1.5 text-[11px] md:text-sm leading-5" key={f}><Check className="size-3 text-primary shrink-0 mt-1"/><span className="min-w-0 break-words">{f}</span></li>)}</ul><Button disabled={p==='free'||account.isPending} variant={p==='free'?'outline':p==='pro'?'default':'secondary'} className="w-full min-h-10 h-auto py-2 px-1 text-[11px] md:text-sm whitespace-normal leading-4" onClick={()=>{if(p!=='free')upgrade(p);}}>{ctas[p]}</Button></article>;})}</div>
 {notice&&<p role="status" className="text-sm text-primary mt-3">{notice}</p>}<p className="text-[10px] md:text-xs text-muted-foreground leading-5 mt-3">המחירים וההטבות מוצגים להדגמה בלבד. רכישה, הפעלת מנוי ואימות מקצועי אינם זמינים כאן. מחיר Pro הוא מחיר השקה לשנה הראשונה.</p>
 <section className="mt-6"><h2 className="text-sm font-bold mb-3">התנסות בכלי העסק</h2><div className="grid grid-cols-2 gap-2">{([{to:'/demo-pricelist',label:'מחולל מחירון'},{to:'/demo-health',label:'הצהרות בריאות'},{to:'/academy',label:'קורסים והשתלמויות'},{to:'/vendor-deals',label:'מבצעי ספקים'}] as const).map(x=><Button key={x.to} asChild variant="ghost" className="justify-between text-right whitespace-normal h-auto min-h-10 px-2 text-xs"><Link to={x.to}>{x.label}<ArrowLeft className="size-3 shrink-0"/></Link></Button>)}</div></section>
 {requestRole&&account.data&&<PlanUpgradeDialog account={account.data} requestedRole={requestRole} onClose={()=>setRequestRole(null)}/>}
 </>;
 }}</PlanDemoShell>;
}
