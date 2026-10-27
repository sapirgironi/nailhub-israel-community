import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Users, Ban, Flag, Inbox, FileSpreadsheet, Megaphone, Pin, BadgeCheck, Trash2, Plus, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { plainText, whatsappLink } from '@/lib/input-security';

const field = 'text-right w-full border border-input rounded-lg bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring';
const TABS = [
  { id: 'users', label: 'משתמשות', icon: Users },
  { id: 'words', label: 'מילים חסומות', icon: Ban },
  { id: 'reports', label: 'דיווחים', icon: Flag },
  { id: 'tickets', label: 'פניות', icon: Inbox },
  { id: 'leads', label: 'לידים', icon: FileSpreadsheet },
  { id: 'announce', label: 'הודעת מערכת', icon: Megaphone },
  { id: 'pins', label: 'נעיצת פוסטים', icon: Pin },
] as const;
type Tab = (typeof TABS)[number]['id'];

function Notice({ text }: { text: string }) { return <p role="status" className="text-sm text-muted-foreground py-3">{text}</p>; }

function csvDownload(filename: string, rows: Record<string, unknown>[]) {
  const first = rows[0];
  if (!first) return;
  const keys = Object.keys(first);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function UsersTab() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const profiles = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id,display_name,business_name,phone,city,account_role,is_verified,created_at').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const sanctions = useQuery({
    queryKey: ['admin-sanctions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_sanctions').select('*');
      if (error) throw error;
      return data;
    },
  });
  const quotas = useQuery({
    queryKey: ['admin-quotas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_quotas').select('*');
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['admin-profiles'] }), qc.invalidateQueries({ queryKey: ['admin-sanctions'] }), qc.invalidateQueries({ queryKey: ['admin-quotas'] })]);
  const activeSanction = (id: string) => sanctions.data?.find((s) => s.user_id === id && (!s.until || new Date(s.until) > new Date()));
  async function verify(id: string, value: boolean) {
    const { error } = await supabase.from('profiles').update({ is_verified: value }).eq('id', id);
    setMsg(error ? 'עדכון האימות נכשל' : value ? 'התג הכחול הוענק' : 'התג הוסר');
    if (!error) await refresh();
  }
  async function mute(id: string, hours: number) {
    const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    const { error } = await supabase.from('user_sanctions').insert({ user_id: id, kind: 'mute', until });
    setMsg(error ? 'ההשהיה נכשלה' : 'המשתמשת הושהתה');
    if (!error) await refresh();
  }
  async function unmute(id: string) {
    const { error } = await supabase.from('user_sanctions').delete().eq('user_id', id);
    setMsg(error ? 'ביטול ההשהיה נכשל' : 'ההשהיה בוטלה');
    if (!error) await refresh();
  }
  async function setQuota(id: string, unlimited: boolean) {
    const { error } = await supabase.from('user_quotas').upsert({ user_id: id, unlimited, daily_limit: 2 });
    setMsg(error ? 'עדכון המכסה נכשל' : unlimited ? 'הופעל פרסום ללא הגבלה' : 'המכסה הוחזרה ל־2 ביום');
    if (!error) await refresh();
  }
  if (profiles.isError) return <Notice text="טעינת המשתמשות נכשלה" />;
  return (
    <div className="space-y-3">
      {msg && <Notice text={msg} />}
      {(profiles.data ?? []).map((p) => {
        const s = activeSanction(p.id);
        const q = quotas.data?.find((x) => x.user_id === p.id);
        return (
          <div key={p.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm break-words">{p.display_name}</span>
                  {p.is_verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground break-words">{p.business_name} • {p.city} • {p.account_role}</p>
              </div>
              {s && <span className="text-[11px] font-bold bg-destructive/10 text-destructive px-2 py-1 rounded-lg">מושהית {s.until ? `עד ${new Date(s.until).toLocaleString('he-IL')}` : 'לצמיתות'}</span>}
              {q?.unlimited && <span className="text-[11px] font-bold bg-accent text-primary px-2 py-1 rounded-lg">פרסום ללא הגבלה</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => verify(p.id, !p.is_verified)}><BadgeCheck />{p.is_verified ? 'הסרת אימות' : 'אימות מקצועי'}</Button>
              {s
                ? <Button size="sm" variant="outline" onClick={() => unmute(p.id)}>ביטול השהיה</Button>
                : <><Button size="sm" variant="outline" onClick={() => mute(p.id, 24)}>השהיה ל־24 שעות</Button><Button size="sm" variant="outline" onClick={() => mute(p.id, 168)}>השהיה לשבוע</Button></>}
              <Button size="sm" variant="outline" onClick={() => setQuota(p.id, !q?.unlimited)}>{q?.unlimited ? 'החזרת מכסה' : 'ללא מכסה'}</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WordsTab() {
  const qc = useQueryClient();
  const [word, setWord] = useState('');
  const [msg, setMsg] = useState('');
  const words = useQuery({
    queryKey: ['admin-words'],
    queryFn: async () => {
      const { data, error } = await supabase.from('blocked_words').select('*').order('created_at');
      if (error) throw error;
      return data;
    },
  });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const parsed = plainText(50).safeParse(word);
    if (!parsed.success || !parsed.data) { setMsg('הזיני מילה תקינה'); return; }
    const { error } = await supabase.from('blocked_words').insert({ word: parsed.data });
    setMsg(error ? 'ההוספה נכשלה (ייתכן שהמילה כבר קיימת)' : 'המילה נוספה לרשימה');
    if (!error) { setWord(''); await qc.invalidateQueries({ queryKey: ['admin-words'] }); }
  }
  async function remove(id: string) {
    const { error } = await supabase.from('blocked_words').delete().eq('id', id);
    setMsg(error ? 'המחיקה נכשלה' : 'המילה הוסרה');
    if (!error) await qc.invalidateQueries({ queryKey: ['admin-words'] });
  }
  return (
    <div className="space-y-4 max-w-xl">
      <form onSubmit={add} className="flex gap-2">
        <input aria-label="מילה חסומה חדשה" placeholder="מילה או ביטוי לחסימה..." maxLength={50} value={word} onChange={(e) => setWord(e.target.value)} className={field} />
        <Button type="submit"><Plus />הוספה</Button>
      </form>
      {msg && <Notice text={msg} />}
      {words.isError && <Notice text="טעינת הרשימה נכשלה" />}
      <div className="flex flex-wrap gap-2">
        {(words.data ?? []).map((w) => (
          <span key={w.id} className="inline-flex items-center gap-1.5 bg-accent border border-border rounded-xl px-3 py-1.5 text-sm font-bold">
            {w.word}
            <button type="button" aria-label={`הסרת ${w.word}`} onClick={() => remove(w.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
          </span>
        ))}
        {words.data?.length === 0 && <Notice text="אין מילים חסומות" />}
      </div>
    </div>
  );
}

function ReportsTab() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const reports = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from('reports').update({ status }).eq('id', id);
    setMsg(error ? 'עדכון הסטטוס נכשל' : 'הסטטוס עודכן');
    if (!error) await qc.invalidateQueries({ queryKey: ['admin-reports'] });
  }
  if (reports.isError) return <Notice text="טעינת הדיווחים נכשלה" />;
  return (
    <div className="space-y-3">
      {msg && <Notice text={msg} />}
      {reports.data?.length === 0 && <Notice text="אין דיווחים פתוחים" />}
      {(reports.data ?? []).map((r) => (
        <div key={r.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-bold">{r.post_id ? 'דיווח על פוסט' : 'דיווח על תגובה'}</span>
            <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${r.status === 'open' ? 'bg-destructive/10 text-destructive' : 'bg-accent text-primary'}`}>{r.status === 'open' ? 'פתוח' : 'טופל'}</span>
          </div>
          {r.reason && <p className="text-sm break-words">{r.reason}</p>}
          <time className="text-xs text-muted-foreground block">{new Date(r.created_at).toLocaleString('he-IL')}</time>
          {r.status === 'open' && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, 'resolved')}>סימון כטופל</Button>}
        </div>
      ))}
    </div>
  );
}

const TICKET_STATUS: Record<string, string> = { new: 'חדש', in_progress: 'בטיפול', closed: 'נפתר / נסגר' };

function TicketsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [msg, setMsg] = useState('');
  const tickets = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', id);
    setMsg(error ? 'עדכון הסטטוס נכשל' : 'הסטטוס עודכן');
    if (!error) await qc.invalidateQueries({ queryKey: ['admin-tickets'] });
  }
  const list = (tickets.data ?? []).filter((t) => filter === 'all' || t.category === filter);
  if (tickets.isError) return <Notice text="טעינת הפניות נכשלה" />;
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {([['all', 'הכול'], ['bug', 'תקלות'], ['feature', 'הצעות'], ['collab', 'שת״פ עסקי'], ['other', 'אחר']] as const).map(([id, label]) => (
          <Button key={id} size="sm" variant={filter === id ? 'secondary' : 'ghost'} onClick={() => setFilter(id)}>{label}</Button>
        ))}
      </div>
      {msg && <Notice text={msg} />}
      {list.length === 0 && <Notice text="אין פניות בקטגוריה זו" />}
      {list.map((t) => (
        <div key={t.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-bold text-sm break-words">{t.subject}</span>
            <span className="text-[11px] font-bold bg-accent text-primary px-2 py-1 rounded-lg">{TICKET_STATUS[t.status] ?? t.status}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{t.body}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <select aria-label="סטטוס פנייה" value={t.status} onChange={(e) => setStatus(t.id, e.target.value)} className={field + ' !w-auto'}>
              {Object.entries(TICKET_STATUS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            {whatsappLink(t.phone) && <Button asChild size="sm" variant="outline"><a href={whatsappLink(t.phone) ?? undefined} target="_blank" rel="noopener noreferrer"><MessageCircle />וואטסאפ לפונה</a></Button>}
          </div>
          <time className="text-xs text-muted-foreground block">{new Date(t.created_at).toLocaleString('he-IL')}</time>
        </div>
      ))}
    </div>
  );
}

function LeadsTab() {
  const leads = useQuery({
    queryKey: ['admin-leads'],
    queryFn: async () => {
      const { data, error } = await supabase.from('insurance_leads').select('id,full_name,phone,email,city_street,entity_type,equipment_value_nis,existing_insurance,notes,created_at').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (leads.isError) return <Notice text="טעינת הלידים נכשלה" />;
  return (
    <div className="space-y-3">
      <Button variant="outline" disabled={!leads.data?.length} onClick={() => csvDownload('insurance-leads.csv', (leads.data ?? []) as unknown as Record<string, unknown>[])}>
        <FileSpreadsheet />הורדת אקסל (CSV)
      </Button>
      {leads.data?.length === 0 && <Notice text="אין עדיין פניות ביטוח" />}
      {(leads.data ?? []).map((l) => (
        <div key={l.id} className="bg-card border border-border rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between gap-2"><span className="font-bold text-sm">{l.full_name}</span><time className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString('he-IL')}</time></div>
          <p className="text-xs text-muted-foreground break-words">{l.phone} • {l.email} • {l.city_street}</p>
          {l.notes && <p className="text-sm break-words">{l.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function AnnounceTab() {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');
  const items = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  async function publish(e: React.FormEvent) {
    e.preventDefault();
    const parsed = plainText(300).safeParse(body);
    if (!parsed.success || !parsed.data) { setMsg('הזיני הודעה תקינה עד 300 תווים'); return; }
    const { error } = await supabase.from('announcements').insert({ body: parsed.data, active: true });
    setMsg(error ? 'הפרסום נכשל' : 'ההודעה פורסמה לכל המשתמשות');
    if (!error) { setBody(''); await qc.invalidateQueries({ queryKey: ['admin-announcements'] }); await qc.invalidateQueries({ queryKey: ['announcement'] }); }
  }
  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from('announcements').update({ active }).eq('id', id);
    setMsg(error ? 'העדכון נכשל' : active ? 'ההודעה הופעלה' : 'ההודעה כובתה');
    if (!error) { await qc.invalidateQueries({ queryKey: ['admin-announcements'] }); await qc.invalidateQueries({ queryKey: ['announcement'] }); }
  }
  return (
    <div className="space-y-4 max-w-xl">
      <form onSubmit={publish} className="space-y-3">
        <textarea aria-label="הודעת מערכת" placeholder="הודעה דחופה לכל המשתמשות..." maxLength={300} rows={3} value={body} onChange={(e) => setBody(e.target.value)} className={field} />
        <Button type="submit"><Megaphone />פרסום הודעה</Button>
      </form>
      {msg && <Notice text={msg} />}
      {(items.data ?? []).map((a) => (
        <div key={a.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
          <p className="text-sm break-words flex-1">{a.body}</p>
          <Button size="sm" variant={a.active ? 'secondary' : 'outline'} onClick={() => toggle(a.id, !a.active)}>{a.active ? 'פעילה — לכיבוי' : 'כבויה — להפעלה'}</Button>
        </div>
      ))}
    </div>
  );
}

function PinsTab() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const posts = useQuery({
    queryKey: ['admin-posts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('posts').select('id,caption,is_pinned,created_at').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });
  const pinnedCount = posts.data?.filter((p) => p.is_pinned).length ?? 0;
  async function toggle(id: string, pin: boolean) {
    if (pin && pinnedCount >= 3) { setMsg('ניתן לנעוץ עד 3 פוסטים'); return; }
    const { error } = await supabase.from('posts').update({ is_pinned: pin }).eq('id', id);
    setMsg(error ? 'העדכון נכשל' : pin ? 'הפוסט ננעץ בראש הפיד' : 'הנעיצה בוטלה');
    if (!error) { await qc.invalidateQueries({ queryKey: ['admin-posts'] }); await qc.invalidateQueries({ queryKey: ['hub-posts'] }); }
  }
  if (posts.isError) return <Notice text="טעינת הפוסטים נכשלה" />;
  return (
    <div className="space-y-3">
      <Notice text={`נעוצים כרגע: ${pinnedCount} מתוך 3`} />
      {msg && <Notice text={msg} />}
      {(posts.data ?? []).map((p) => (
        <div key={p.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
          <p className="text-sm break-words flex-1 line-clamp-2">{p.caption || '(ללא כיתוב)'}</p>
          <Button size="sm" variant={p.is_pinned ? 'secondary' : 'outline'} onClick={() => toggle(p.id, !p.is_pinned)}><Pin />{p.is_pinned ? 'נעוץ — לביטול' : 'נעיצה'}</Button>
        </div>
      ))}
    </div>
  );
}

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>('users');
  return (
    <div className="space-y-5">
      <h1 className="font-black text-2xl flex items-center gap-2"><ShieldCheck className="text-primary" />פאנל ניהול</h1>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Button key={id} size="sm" variant={tab === id ? 'secondary' : 'ghost'} className="whitespace-nowrap" onClick={() => setTab(id)}><Icon />{label}</Button>
        ))}
      </div>
      {tab === 'users' && <UsersTab />}
      {tab === 'words' && <WordsTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'tickets' && <TicketsTab />}
      {tab === 'leads' && <LeadsTab />}
      {tab === 'announce' && <AnnounceTab />}
      {tab === 'pins' && <PinsTab />}
    </div>
  );
}
