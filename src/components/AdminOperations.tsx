import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { draftQuestionnaire } from '@/lib/questionnaire.functions';
import { questionnaireSchema, type Questionnaire } from '@/lib/questionnaire-schema';
import { plainText } from '@/lib/input-security';

const field = 'w-full border border-input rounded-lg bg-card p-3 text-sm text-right';
const statusLabels: Record<string,string> = { pending:'ממתינה', approved:'מאושרת', active:'מאושרת', rejected:'נדחתה', sold:'נמכרה' };

export function QuestionnairesTab() {
  const qc = useQueryClient();
  const [purpose,setPurpose] = useState('');
  const [count,setCount] = useState(5);
  const [draft,setDraft] = useState<Questionnaire|null>(null);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const saved = useQuery({queryKey:['admin-questionnaires'],queryFn:async()=>{
    const {data,error}=await supabase.from('ai_questionnaires').select('*').order('created_at',{ascending:false});
    if(error)throw error;return data;
  }});
  async function generate(e:React.FormEvent) {
    e.preventDefault();setMessage('');setBusy(true);
    try {const result=await draftQuestionnaire({data:{purpose,count}});if(result.error)setMessage(result.error);else setDraft(result.draft);}
    catch {setMessage('יצירת השאלון נכשלה');}finally{setBusy(false);}
  }
  async function save() {
    const parsed=questionnaireSchema.safeParse(draft);
    if(!parsed.success){setMessage('בדקי את כותרת השאלון ואת השאלות');return;}
    setBusy(true);
    const {error}=await supabase.from('ai_questionnaires').insert({...parsed.data,purpose});
    setBusy(false);setMessage(error?'שמירת השאלון נכשלה':'השאלון נשמר באופן פרטי');
    if(!error){setDraft(null);await qc.invalidateQueries({queryKey:['admin-questionnaires']});}
  }
  return <div className="space-y-5 max-w-2xl">
    <form onSubmit={generate} className="space-y-3">
      <label className="block text-sm font-bold">מטרת השאלון<textarea aria-label="מטרת השאלון" required minLength={10} maxLength={2000} rows={3} className={field} value={purpose} onChange={e=>setPurpose(e.target.value)}/></label>
      <label className="block text-sm">מספר שאלות<input aria-label="מספר שאלות" type="number" min={1} max={20} value={count} onChange={e=>setCount(Number(e.target.value))} className={field}/></label>
      <Button disabled={busy} type="submit"><Sparkles/>{busy?'יוצרת...':'יצירת שאלון'}</Button>
    </form>
    {message&&<p role="status" className="text-sm text-muted-foreground">{message}</p>}
    {draft&&<div className="border-y border-border py-5 space-y-4">
      <input aria-label="כותרת השאלון" className={field} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/>
      {draft.questions.map((q,i)=><div key={i} className="flex gap-2 items-start"><input aria-label={`שאלה ${i+1}`} className={field} value={q.label} onChange={e=>setDraft({...draft,questions:draft.questions.map((x,j)=>j===i?{...x,label:e.target.value}:x)})}/><select aria-label={`סוג שאלה ${i+1}`} className={field+' max-w-28'} value={q.kind} onChange={e=>setDraft({...draft,questions:draft.questions.map((x,j)=>j===i?{...x,kind:e.target.value==='yes_no'?'yes_no':'text'}:x)})}><option value="text">פתוחה</option><option value="yes_no">כן / לא</option></select><Button aria-label={`מחיקת שאלה ${i+1}`} size="icon" variant="ghost" onClick={()=>setDraft({...draft,questions:draft.questions.filter((_,j)=>i!==j)})}><Trash2/></Button></div>)}
      <Button variant="outline" disabled={draft.questions.length>=20} onClick={()=>setDraft({...draft,questions:[...draft.questions,{label:'',kind:'text'}]})}><Plus/>הוספת שאלה</Button>
      <Button disabled={busy} onClick={save}><Save/>שמירת שאלון</Button>
    </div>}
    <h2 className="font-bold">שאלונים שמורים</h2>
    {saved.isError&&<p role="alert">טעינת השאלונים נכשלה</p>}
    {saved.data?.length===0&&<p className="text-muted-foreground text-sm">אין עדיין שאלונים שמורים</p>}
    {saved.data?.map(item=><details key={item.id} className="border-b border-border py-3"><summary className="cursor-pointer font-bold">{item.title}</summary><ol className="list-decimal list-inside text-sm space-y-2 mt-3">{questionnaireSchema.safeParse(item).success&&(item.questions as Questionnaire['questions']).map((q,i)=><li key={i}>{q.label}</li>)}</ol><Button size="sm" variant="outline" onClick={()=>{const parsed=questionnaireSchema.safeParse(item);if(parsed.success){setPurpose(item.purpose);setDraft(parsed.data);}}}>עריכה כטיוטה חדשה</Button></details>)}
  </div>;
}

export function CreditsTab() {
  const qc=useQueryClient();const [user,setUser]=useState('');const [amount,setAmount]=useState(1);const [reason,setReason]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  const profiles=useQuery({queryKey:['admin-profiles'],queryFn:async()=>{const {data,error}=await supabase.from('profiles').select('id,display_name');if(error)throw error;return data;}});
  const ledger=useQuery({queryKey:['admin-credit-ledger'],queryFn:async()=>{const {data,error}=await supabase.from('community_credit_ledger').select('*').order('created_at',{ascending:false});if(error)throw error;return data;}});
  async function adjust(e:React.FormEvent){e.preventDefault();if(!plainText(300).safeParse(reason).success||!reason.trim()||!user){setMessage('בחרי משתמשת ונימוק');return;}setBusy(true);const {error}=await supabase.rpc('adjust_community_credit',{target_user:user,delta:amount,explanation:reason,operation_id:crypto.randomUUID()});setBusy(false);setMessage(error?'עדכון היתרה נכשל; בדקי שהיתרה מספיקה לחיוב':'התנועה נרשמה');if(!error){setReason('');await qc.invalidateQueries({queryKey:['admin-credit-ledger']});}}
  const balance=(ledger.data??[]).filter(x=>x.user_id===user).reduce((sum,x)=>sum+x.amount,0);
  return <div className="space-y-4"><h2 className="font-bold">קרדיטי קהילה</h2><form onSubmit={adjust} className="max-w-xl space-y-3"><select required aria-label="משתמשת לזיכוי" className={field} value={user} onChange={e=>setUser(e.target.value)}><option value="">בחירת משתמשת</option>{profiles.data?.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select>{user&&<p>יתרה: {balance}</p>}<label className="block text-sm">תנועה: זיכוי חיובי / חיוב שלילי<input required aria-label="סכום הקרדיטים" type="number" min={-100000} max={100000} className={field} value={amount} onChange={e=>setAmount(Number(e.target.value))}/></label><input required aria-label="נימוק התנועה" placeholder="נימוק" maxLength={300} className={field} value={reason} onChange={e=>setReason(e.target.value)}/><Button disabled={busy||amount===0} type="submit">רישום תנועה</Button></form>{message&&<p role="status">{message}</p>}{ledger.isError&&<p role="alert">טעינת היומן נכשלה</p>}<div className="overflow-x-auto"><table className="w-full text-sm text-right"><thead><tr><th className="p-3">משתמשת</th><th>תנועה</th><th>נימוק</th><th>תאריך</th></tr></thead><tbody>{ledger.data?.map(x=><tr key={x.id} className="border-t border-border"><td className="p-3">{profiles.data?.find(p=>p.id===x.user_id)?.display_name??'משתמשת'}</td><td>{x.amount>0?'+':''}{x.amount}</td><td>{x.reason}</td><td>{new Date(x.created_at).toLocaleString('he-IL')}</td></tr>)}</tbody></table></div></div>;
}

export function TradeApprovalTab() {
  const qc=useQueryClient();const [filter,setFilter]=useState('pending');const [message,setMessage]=useState('');
  const items=useQuery({queryKey:['admin-trade'],queryFn:async()=>{const {data,error}=await supabase.from('nail_trade_items').select('*').order('created_at',{ascending:false});if(error)throw error;return data;}});
  async function decide(id:string,status:string){const {data,error}=await supabase.from('nail_trade_items').update({status}).eq('id',id).select('id').single();setMessage(error||!data?'עדכון האישור נכשל':'מצב המודעה עודכן');if(!error){await qc.invalidateQueries({queryKey:['admin-trade']});await qc.invalidateQueries({queryKey:['hub-trade']});}}
  return <div className="space-y-4"><select aria-label="סינון אישורי יד שנייה" className={field+' max-w-xs'} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">הכול</option><option value="pending">ממתינות לאישור</option><option value="approved">מאושרות</option><option value="rejected">נדחו</option></select>{message&&<p role="status">{message}</p>}{items.isError&&<p role="alert">טעינת המודעות נכשלה</p>}{items.data?.filter(x=>filter==='all'||x.status===filter).map(x=><article key={x.id} className="border border-border rounded-lg p-4 space-y-3"><h2 className="font-bold">{x.title} • {x.price_nis} ₪</h2><p className="whitespace-pre-wrap text-sm">{x.description}</p><p className="text-xs text-muted-foreground">{x.city} • {statusLabels[x.status??'pending']??'ממתינה'}</p><div className="flex gap-2"><Button size="sm" onClick={()=>decide(x.id,'approved')}>אישור</Button><Button size="sm" variant="outline" onClick={()=>decide(x.id,'rejected')}>דחייה</Button></div></article>)}</div>;
}

export function AnalyticsTab() {
  const stats=useQuery({queryKey:['admin-analytics'],queryFn:async()=>{
    const since=new Date(Date.now()-30*86400000).toISOString();
    const [activity,posts,stories,moderation,comments,likes]=await Promise.all([
      supabase.from('community_activity').select('user_id,activity_day').gte('activity_day',since.slice(0,10)),
      supabase.from('posts').select('created_at').gte('created_at',since),
      supabase.from('stories').select('created_at').gte('created_at',since),
      supabase.from('comment_moderation_events').select('outcome,created_at').gte('created_at',since),
      supabase.from('post_comments').select('id',{count:'exact',head:true}).gte('created_at',since),
      supabase.from('post_likes').select('id',{count:'exact',head:true}).gte('created_at',since),
    ]);for(const r of [activity,posts,stories,moderation,comments,likes])if(r.error)throw r.error;
    return {activity:activity.data??[],posts:posts.data??[],stories:stories.data??[],moderation:moderation.data??[],comments:comments.count??0,likes:likes.count??0};
  }});
  if(stats.isError)return <p role="alert">טעינת נתוני הפעילות נכשלה</p>;if(!stats.data)return <p>טוענת נתונים...</p>;
  const d=stats.data;const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});const week=new Date(Date.now()-6*86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});
  const daily=new Set(d.activity.filter(x=>x.activity_day===today).map(x=>x.user_id)).size;const weekly=new Set(d.activity.filter(x=>x.activity_day>=week).map(x=>x.user_id)).size;
  const graph=Array.from({length:14},(_,i)=>{const day=new Date(Date.now()-(13-i)*86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});return {day:day.slice(5),פעילות:new Set(d.activity.filter(x=>x.activity_day===day).map(x=>x.user_id)).size,פוסטים:d.posts.filter(x=>x.created_at.slice(0,10)===day).length,סטוריז:d.stories.filter(x=>x.created_at.slice(0,10)===day).length};});
  return <div className="space-y-6"><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[['פעילות היום',daily],['פעילות השבוע',weekly],['תגובות שנחסמו',d.moderation.filter(x=>x.outcome==='blocked').length],['פוסטים ב־30 ימים',d.posts.length],['תגובות ב־30 ימים',d.comments],['לייקים ב־30 ימים',d.likes]].map(([label,value])=><div key={label} className="border-b border-border py-4"><p className="text-muted-foreground text-sm">{label}</p><strong className="text-2xl">{value}</strong></div>)}</div><h2 className="font-bold">פעילות בשבועיים האחרונים</h2><div className="h-72 w-full min-w-0 text-primary"><ResponsiveContainer width="100%" height="100%"><BarChart data={graph}><XAxis dataKey="day"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="פעילות" fill="currentColor"/></BarChart></ResponsiveContainer></div></div>;
}