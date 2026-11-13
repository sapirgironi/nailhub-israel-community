import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Users, Ban, Flag, Inbox, FileSpreadsheet, Megaphone, Pin, BadgeCheck, Trash2, Plus, MessageCircle, ShoppingBag, Coins, Sticker } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { plainText, whatsappLink } from '@/lib/input-security';
import { useServerFn } from '@tanstack/react-start';
import { deleteContent, discardStickerUpload } from '@/lib/content-deletion.functions';
import { PhotoImage } from './PhotoImage';
import { ROLE_DEFINITIONS, type AccountRole } from '@/lib/roles';
import { PREVIEW_ROLES, type PreviewRole } from '@/lib/role-preview';
import { Pagination, PAGE_SIZE, pageRange } from './Pagination';

const field = 'text-right w-full border border-input rounded-lg bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring';
const TABS = [
  { id: 'users', label: 'משתמשות', icon: Users },
  { id: 'trade', label: 'תור אישורי יד שנייה', icon: ShoppingBag },
  { id: 'suppliers', label: 'ניהול ספקים וקרדיטים', icon: Coins },
  { id: 'words', label: 'מילים חסומות', icon: Ban },
  { id: 'reports', label: 'דיווחים', icon: Flag },
  { id: 'tickets', label: 'פניות', icon: Inbox },
  { id: 'leads', label: 'לידים', icon: FileSpreadsheet },
  { id: 'announce', label: 'הודעת מערכת', icon: Megaphone },
  { id: 'pins', label: 'נעיצת פוסטים', icon: Pin },
  { id: 'stickers', label: 'סטיקרים לסטורי', icon: Sticker },
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
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const profiles = useQuery({
    queryKey: ['admin-profiles', page],
    staleTime: 30_000,
    queryFn: async () => {
      const { from, to } = pageRange(page);
      const { data, error } = await supabase.from('profiles').select('id,display_name,business_name,phone,city,account_role,is_verified,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to);
      if (error) throw error;
      return data;
    },
  });
  const visibleProfiles = (profiles.data ?? []).slice(0, PAGE_SIZE);
  const profileIds = visibleProfiles.map(p => p.id);
  const sanctions = useQuery({
    queryKey: ['admin-sanctions', profileIds],
    enabled: profileIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_sanctions').select('*').in('user_id', profileIds).or(`until.is.null,until.gt.${new Date().toISOString()}`).limit(1000);
      if (error) throw error;
      if (data.length === 1000) throw new Error('רשימת החסימות גדולה מדי להצגה בטוחה');
      return data;
    },
  });
  const quotas = useQuery({
    queryKey: ['admin-quotas', profileIds],
    enabled: profileIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_quotas').select('*').in('user_id', profileIds).limit(PAGE_SIZE);
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
  async function banForever(id: string, name: string) {
    if (!window.confirm(`לחסום את ${name} לצמיתות? הגישה שלה לאפליקציה תיחסם.`)) return;
    setBusyUser(id);
    const { error } = await supabase.from('user_sanctions').insert({ user_id: id, kind: 'ban', until: null, reason: 'חסימה לצמיתות על ידי מנהלת' });
    setMsg(error ? 'החסימה נכשלה' : 'המשתמשת נחסמה לצמיתות');
    if (!error) await refresh();
    setBusyUser(null);
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
  if (profiles.isError || sanctions.isError || quotas.isError) return <Notice text="טעינת המשתמשות והרשאותיהן נכשלה" />;
  return (
    <div className="space-y-3">
      {msg && <Notice text={msg} />}
      {(profileIds.length && (sanctions.isPending || quotas.isPending)) ? <Notice text="טוענת הרשאות משתמשות..." /> : visibleProfiles.map((p) => {
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
                <p className="text-xs text-muted-foreground break-words">{p.business_name} • {p.city} • {ROLE_DEFINITIONS[p.account_role as AccountRole]?.label ?? 'חברת קהילה'}</p>
              </div>
              {s && <span className="text-[11px] font-bold bg-destructive/10 text-destructive px-2 py-1 rounded-lg">מושהית {s.until ? `עד ${new Date(s.until).toLocaleString('he-IL')}` : 'לצמיתות'}</span>}
              {q?.unlimited && <span className="text-[11px] font-bold bg-accent text-primary px-2 py-1 rounded-lg">פרסום ללא הגבלה</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => verify(p.id, !p.is_verified)}><BadgeCheck />{p.is_verified ? 'הסרת אימות' : 'אימות מקצועי'}</Button>
              {s
                ? <Button size="sm" variant="outline" onClick={() => unmute(p.id)}>{s.until ? 'ביטול השהיה' : 'ביטול חסימה'}</Button>
                : <><Button size="sm" variant="outline" onClick={() => mute(p.id, 24)}>השהיה ל־24 שעות</Button><Button size="sm" variant="outline" onClick={() => mute(p.id, 168)}>השהיה לשבוע</Button></>}
              {!(s?.kind === 'ban' && !s.until) && <Button size="sm" variant="destructive" disabled={busyUser === p.id} onClick={() => banForever(p.id, p.display_name)}><Ban />חסימה לצמיתות</Button>}
              <Button size="sm" variant="outline" onClick={() => setQuota(p.id, !q?.unlimited)}>{q?.unlimited ? 'החזרת מכסה' : 'ללא מכסה'}</Button>
            </div>
          </div>
        );
      })}
      <Pagination page={page} onPageChange={setPage} hasNext={(profiles.data?.length ?? 0) > PAGE_SIZE} loading={profiles.isFetching} />
    </div>
  );
}

function WordsTab() {
  const qc = useQueryClient();
  const [word, setWord] = useState('');
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(0);
  const words = useQuery({
    queryKey: ['admin-words', page],
    staleTime: 30_000,
    queryFn: async () => {
      const { from, to } = pageRange(page);
      const { data, error } = await supabase.from('blocked_words').select('*').order('created_at').order('id').range(from, to);
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
        {(words.data ?? []).slice(0, PAGE_SIZE).map((w) => (
          <span key={w.id} className="inline-flex items-center gap-1.5 bg-accent border border-border rounded-xl px-3 py-1.5 text-sm font-bold">
            {w.word}
            <button type="button" aria-label={`הסרת ${w.word}`} onClick={() => remove(w.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
          </span>
        ))}
        {words.data?.length === 0 && <Notice text="אין מילים חסומות" />}
      </div>
      <Pagination page={page} onPageChange={setPage} hasNext={(words.data?.length ?? 0) > PAGE_SIZE} loading={words.isFetching} />
    </div>
  );
}

function ReportsTab() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(0);
  const reports = useQuery({
    queryKey: ['admin-reports', page],
    staleTime: 30_000,
    queryFn: async () => {
      const { from, to } = pageRange(page);
      const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to);
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
      {(reports.data ?? []).slice(0, PAGE_SIZE).map((r) => (
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
      <Pagination page={page} onPageChange={setPage} hasNext={(reports.data?.length ?? 0) > PAGE_SIZE} loading={reports.isFetching} />
    </div>
  );
}

const TICKET_STATUS: Record<string, string> = { new: 'חדש', in_progress: 'בטיפול', closed: 'נפתר / נסגר' };

function TicketsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(0);
  const tickets = useQuery({
    queryKey: ['admin-tickets', filter, page],
    staleTime: 30_000,
    queryFn: async () => {
      const { from, to } = pageRange(page);
      let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to);
      if (filter !== 'all') query = query.eq('category', filter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', id);
    setMsg(error ? 'עדכון הסטטוס נכשל' : 'הסטטוס עודכן');
    if (!error) await qc.invalidateQueries({ queryKey: ['admin-tickets'] });
  }
  const list = (tickets.data ?? []).slice(0, PAGE_SIZE);
  if (tickets.isError) return <Notice text="טעינת הפניות נכשלה" />;
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {([['all', 'הכול'], ['bug', 'תקלות'], ['feature', 'הצעות'], ['collab', 'שת״פ עסקי'], ['other', 'אחר']] as const).map(([id, label]) => (
          <Button key={id} size="sm" variant={filter === id ? 'secondary' : 'ghost'} onClick={() => { setFilter(id); setPage(0); }}>{label}</Button>
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
      <Pagination page={page} onPageChange={setPage} hasNext={(tickets.data?.length ?? 0) > PAGE_SIZE} loading={tickets.isFetching} />
    </div>
  );
}

function LeadsTab() {
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const leads = useQuery({
    queryKey: ['admin-leads', page],
    staleTime: 30_000,
    queryFn: async () => {
      const { from, to } = pageRange(page);
      const { data, error } = await supabase.from('insurance_leads').select('id,full_name,phone,email,city_street,entity_type,equipment_value_nis,existing_insurance,notes,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to);
      if (error) throw error;
      return data;
    },
  });
  async function exportAll() {
    setExporting(true);
    setMessage('');
    try {
      const rows: NonNullable<typeof leads.data> = [];
      let cursor: { createdAt: string; id: string } | null = null;
      for (;;) {
        let query = supabase.from('insurance_leads').select('id,full_name,phone,email,city_street,entity_type,equipment_value_nis,existing_insurance,notes,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(500);
        if (cursor) query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
        const { data, error } = await query;
        if (error) throw error;
        rows.push(...data);
        const last = data.at(-1);
        if (data.length < 500 || !last) break;
        cursor = { createdAt: last.created_at, id: last.id };
      }
      if (!rows.length) { setMessage('אין לידים להורדה'); return; }
      csvDownload('insurance-leads.csv', rows);
    } catch {
      setMessage('הורדת הלידים נכשלה. נסי שוב.');
    } finally { setExporting(false); }
  }
  if (leads.isError) return <Notice text="טעינת הלידים נכשלה" />;
  return (
    <div className="space-y-3">
      <Button variant="outline" disabled={exporting || !leads.data?.length} onClick={() => void exportAll()}>
        <FileSpreadsheet />{exporting ? 'מכינה קובץ...' : 'הורדת כל הלידים (CSV)'}
      </Button>
      {message && <Notice text={message} />}
      {leads.data?.length === 0 && <Notice text="אין עדיין פניות ביטוח" />}
      {(leads.data ?? []).slice(0, PAGE_SIZE).map((l) => (
        <div key={l.id} className="bg-card border border-border rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between gap-2"><span className="font-bold text-sm">{l.full_name}</span><time className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString('he-IL')}</time></div>
          <p className="text-xs text-muted-foreground break-words">{l.phone} • {l.email} • {l.city_street}</p>
          {l.notes && <p className="text-sm break-words">{l.notes}</p>}
        </div>
      ))}
      <Pagination page={page} onPageChange={setPage} hasNext={(leads.data?.length ?? 0) > PAGE_SIZE} loading={leads.isFetching} />
    </div>
  );
}

function AnnounceTab() {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(0);
  const items = useQuery({
    queryKey: ['admin-announcements', page],
    staleTime: 30_000,
    queryFn: async () => {
      const { from, to } = pageRange(page);
      const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to);
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
      {items.isError && <Notice text="טעינת ההודעות נכשלה" />}
      {(items.data ?? []).slice(0, PAGE_SIZE).map((a) => (
        <div key={a.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
          <p className="text-sm break-words flex-1">{a.body}</p>
          <Button size="sm" variant={a.active ? 'secondary' : 'outline'} onClick={() => toggle(a.id, !a.active)}>{a.active ? 'פעילה — לכיבוי' : 'כבויה — להפעלה'}</Button>
        </div>
      ))}
      <Pagination page={page} onPageChange={setPage} hasNext={(items.data?.length ?? 0) > PAGE_SIZE} loading={items.isFetching} />
    </div>
  );
}

function PinsTab() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(0);
  const posts = useQuery({
    queryKey: ['admin-posts', page],
    staleTime: 30_000,
    queryFn: async () => {
      const { from, to } = pageRange(page);
      const { data, error } = await supabase.from('posts').select('id,caption,is_pinned,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to);
      if (error) throw error;
      return data;
    },
  });
  const pinned = useQuery({
    queryKey: ['admin-pinned-count'],
    staleTime: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase.from('posts').select('id', { count: 'exact', head: true }).eq('is_pinned', true);
      if (error || count === null) throw error ?? new Error('ספירת הפוסטים נכשלה');
      return count;
    },
  });
  const pinnedCount = pinned.data ?? 0;
  async function toggle(id: string, pin: boolean) {
    if (pinned.data === undefined) { setMsg('לא ניתן לבדוק את מספר הפוסטים הנעוצים'); return; }
    if (pin && pinnedCount >= 3) { setMsg('ניתן לנעוץ עד 3 פוסטים'); return; }
    const { error } = await supabase.from('posts').update({ is_pinned: pin }).eq('id', id);
    setMsg(error ? 'העדכון נכשל' : pin ? 'הפוסט ננעץ בראש הפיד' : 'הנעיצה בוטלה');
    if (!error) { await qc.invalidateQueries({ queryKey: ['admin-posts'] }); await qc.invalidateQueries({ queryKey: ['admin-pinned-count'] }); await qc.invalidateQueries({ queryKey: ['hub-posts'] }); }
  }
  if (posts.isError || pinned.isError) return <Notice text="טעינת הפוסטים נכשלה" />;
  return (
    <div className="space-y-3">
      <Notice text={`נעוצים כרגע: ${pinnedCount} מתוך 3`} />
      {msg && <Notice text={msg} />}
      {(posts.data ?? []).slice(0, PAGE_SIZE).map((p) => (
        <div key={p.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
          <p className="text-sm break-words flex-1 line-clamp-2">{p.caption || '(ללא כיתוב)'}</p>
          <Button size="sm" variant={p.is_pinned ? 'secondary' : 'outline'} onClick={() => toggle(p.id, !p.is_pinned)}><Pin />{p.is_pinned ? 'נעוץ — לביטול' : 'נעיצה'}</Button>
        </div>
      ))}
      <Pagination page={page} onPageChange={setPage} hasNext={(posts.data?.length ?? 0) > PAGE_SIZE} loading={posts.isFetching} />
    </div>
  );
}

function TradeQueueTab() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const items = useQuery({
    queryKey: ['admin-trade-queue', page],
    staleTime: 30_000,
    queryFn: async () => {
      const { from, to } = pageRange(page);
      const { data, error } = await supabase.from('nail_trade_items').select('id,title,category,condition,price_nis,city,description,status,created_at,photos,profiles!nail_trade_items_seller_id_fkey(display_name)').eq('status', 'pending').order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to);
      if (error) throw error;
      return data;
    },
  });
  async function decide(id: string, status: 'approved' | 'rejected') {
    setBusy(id);
    const { data, error } = await supabase.from('nail_trade_items').update({ status }).eq('id', id).eq('status', 'pending').select('id').single();
    if (!data || error) { setMsg('העדכון נכשל; ייתכן שהמודעה כבר טופלה'); setBusy(null); return; }
    setMsg(error ? 'העדכון נכשל' : status === 'approved' ? 'המודעה אושרה ופורסמה' : 'המודעה נדחתה');
    if (!error) { await qc.invalidateQueries({ queryKey: ['admin-trade-queue'] }); await qc.invalidateQueries({ queryKey: ['hub-trade'] }); }
    setBusy(null);
  }
  if (items.isError) return <Notice text="טעינת התור נכשלה" />;
  return (
    <div className="space-y-3">
      {msg && <Notice text={msg} />}
      {items.isPending && <Notice text="טוענת מודעות שממתינות לאישור..." />}
      {items.data && items.data.length === 0 && <Notice text="אין מודעות שממתינות לאישור" />}
      {(items.data ?? []).slice(0, PAGE_SIZE).map((t) => (
        <div key={t.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
          {t.photos?.[0] ? <PhotoImage src={t.photos[0]} alt={t.title} loading="lazy" className="w-full max-h-72 object-contain bg-muted rounded-lg" /> : <Notice text="אין תמונה זמינה" />}
          <div className="flex items-center justify-between gap-2"><span className="font-bold text-sm break-words">{t.title}</span><span className="text-sm font-bold">₪{t.price_nis}</span></div>
          <p className="text-xs text-muted-foreground">{t.profiles?.display_name ?? 'חברת קהילה'} • <time>{new Date(t.created_at).toLocaleString('he-IL')}</time></p>
          <p className="text-xs text-muted-foreground break-words">{t.category} • {t.condition} • {t.city}</p>
          <p className="text-sm break-words line-clamp-3">{t.description}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="success" disabled={busy === t.id} onClick={() => decide(t.id, 'approved')}>אשר מודעה</Button>
            <Button size="sm" variant="destructive" disabled={busy === t.id} onClick={() => decide(t.id, 'rejected')}>דחה מודעה</Button>
          </div>
        </div>
      ))}
      <Pagination page={page} onPageChange={setPage} hasNext={(items.data?.length ?? 0) > PAGE_SIZE} loading={items.isFetching} />
    </div>
  );
}

function SuppliersTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  useEffect(() => {
    const timer = window.setTimeout(() => { setSubmittedSearch(search.trim()); setPage(0); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const profiles = useQuery({
    queryKey: ['admin-supplier-profiles', submittedSearch, page],
    staleTime: 30_000,
    queryFn: async () => {
      const { from } = pageRange(page);
      const { data, error } = await supabase.rpc('admin_supplier_page', { search_text: submittedSearch, page_offset: from, page_size: PAGE_SIZE + 1 });
      if (error) throw error;
      return data;
    },
  });
  async function setRole(id: string, role: 'supplier' | 'nail_tech') {
    setBusy(id);
    const { error } = await supabase.from('profiles').update({ account_role: role, ...(role === 'supplier' ? { account_status: 'active' } : {}) }).eq('id', id).select('id').single();
    setMsg(error ? 'שינוי התפקיד נכשל' : role === 'supplier' ? 'החשבון הוגדר כספק' : 'החשבון הוחזר לנייליסטית');
    if (!error) { await qc.invalidateQueries({ queryKey: ['admin-supplier-profiles'] }); await qc.invalidateQueries({ queryKey: ['admin-profiles'] }); }
    setBusy(null);
  }
  async function setCredits(id: string, mode: 'set' | 'add') {
    const target = Number(amounts[id]);
    if (!amounts[id]?.trim() || !Number.isInteger(target) || target < 0 || target > 100000) { setMsg('הזיני מספר קרדיטים שלם בין 0 ל־100,000'); return; }
    setBusy(id);
    const { data, error } = await supabase.rpc('manage_supplier_credits', { target_user: id, quantity: target, credit_mode: mode, operation_id: crypto.randomUUID() });
    setMsg(error ? 'עדכון הקרדיטים נכשל' : `היתרה עודכנה ל־${data} קרדיטים`);
    if (!error) { setAmounts(prev => ({ ...prev, [id]: '' })); await qc.invalidateQueries({ queryKey: ['admin-supplier-profiles'] }); }
    setBusy(null);
  }
  if (profiles.isError) return <Notice text="טעינת הספקים נכשלה" />;
  return (
    <div className="space-y-3">
      <input type="search" aria-label="חיפוש משתמשת לפי שם או אימייל" placeholder="חיפוש לפי שם או אימייל" className={field} value={search} onChange={event => setSearch(event.target.value)} />
      {msg && <Notice text={msg} />}
      {profiles.isPending && <Notice text="טוענת משתמשות..." />}
      {profiles.data?.length === 0 && <Notice text="לא נמצאו משתמשות" />}
      {(profiles.data ?? []).slice(0, PAGE_SIZE).map((p) => {
        const isSupplier = p.account_role === 'supplier';
        return (
          <div key={p.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0"><span className="font-bold text-sm break-words">{p.display_name}</span><p className="text-xs text-muted-foreground break-words">{p.business_name} • {isSupplier ? 'ספק מאושר' : ROLE_DEFINITIONS[p.account_role as AccountRole]?.label ?? 'חברת קהילה'}</p><p dir="ltr" className="text-xs text-muted-foreground break-all text-right">{p.email}</p></div>
              {isSupplier && <span className="text-[11px] font-bold bg-accent text-primary px-2 py-1 rounded-lg">{p.balance} קרדיטים</span>}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => setRole(p.id, isSupplier ? 'nail_tech' : 'supplier')}>{isSupplier ? 'החזרה לנייליסטית' : 'הגדרה כספק מאושר'}</Button>
              {isSupplier && <>
                <input type="number" min={0} max={100000} aria-label="כמות קרדיטים" placeholder="כמות קרדיטים" value={amounts[p.id] ?? ''} onChange={(e) => setAmounts({ ...amounts, [p.id]: e.target.value })} className={`${field} w-36`} />
                <Button size="sm" disabled={busy === p.id} onClick={() => setCredits(p.id, 'set')}>הגדרת יתרה</Button>
                <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => setCredits(p.id, 'add')}><Plus />הוספת קרדיטים</Button>
              </>}
            </div>
          </div>
        );
      })}
      <Pagination page={page} onPageChange={setPage} hasNext={(profiles.data?.length ?? 0) > PAGE_SIZE} loading={profiles.isFetching} />
    </div>
  );
}

function StickersTab() {
  const qc = useQueryClient();
  const deleteOnServer = useServerFn(deleteContent);
  const discardUpload = useServerFn(discardStickerUpload);
  const [msg, setMsg] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: ['admin-story-stickers', page],
    staleTime: 60_000,
    queryFn: async () => {
      const { from, to } = pageRange(page);
      const { data, error } = await supabase.from('story_stickers').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to);
      if (error) throw error;
      const rows = data.slice(0, PAGE_SIZE);
      if (!rows.length) return { rows: [], hasNext: false };
      const { data: signed, error: signingError } = await supabase.storage.from('story-stickers').createSignedUrls(rows.map(s => s.image_path), 300);
      if (signingError || !signed || signed.length !== rows.length || signed.some(s => s.error || !s.signedUrl)) throw new Error('טעינת הסטיקרים נכשלה');
      return { rows: rows.map((s, i) => {
        const url = signed[i]?.signedUrl;
        if (!url) throw new Error('טעינת הסטיקרים נכשלה');
        return { ...s, url };
      }), hasNext: data.length > PAGE_SIZE };
    },
  });
  async function upload(file: File) {
    if (file.type !== 'image/png' || file.size > 2 * 1024 * 1024) { setMsg('יש לבחור קובץ PNG שקוף עד 2 מגה־בייט'); return; }
    const clean = plainText(40).safeParse(label);
    if (!clean.success) { setMsg('שם הסטיקר חייב להיות טקסט רגיל עד 40 תווים'); return; }
    setBusy(true); setMsg('');
    const path = `${crypto.randomUUID()}.png`;
    const { error: upErr } = await supabase.storage.from('story-stickers').upload(path, file, { contentType: 'image/png' });
    if (upErr) { setMsg('העלאת הסטיקר נכשלה'); setBusy(false); return; }
    const { error } = await supabase.from('story_stickers').insert({ image_path: path, label: clean.data });
    if (error) {
      try { await discardUpload({ data: { path } }); setMsg('שמירת הסטיקר נכשלה'); }
      catch { setMsg('שמירת הסטיקר נכשלה וגם ניקוי הקובץ לא הושלם. פני לתמיכה.'); }
    }
    else { setMsg('הסטיקר נוסף לבורר של כל המשתמשות'); setLabel(''); await Promise.all([qc.invalidateQueries({ queryKey: ['story-stickers'] }), qc.invalidateQueries({ queryKey: ['admin-story-stickers'] })]); }
    setBusy(false);
  }
  async function remove(id: string) {
    try { await deleteOnServer({ data: { kind: 'sticker', id } }); }
    catch { setMsg('המחיקה נכשלה'); return; }
    setMsg('הסטיקר נמחק'); await Promise.all([qc.invalidateQueries({ queryKey: ['story-stickers'] }), qc.invalidateQueries({ queryKey: ['admin-story-stickers'] })]);
  }
  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
        <input value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} placeholder="שם הסטיקר (לנגישות)" className={field} />
        <label className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-bold cursor-pointer">
          <Plus className="w-4 h-4" />{busy ? 'מעלה...' : 'העלאת סטיקר PNG'}
          <input type="file" accept="image/png" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f); }} />
        </label>
      </div>
      {msg && <Notice text={msg} />}
      {list.isError && <Notice text="טעינת הסטיקרים נכשלה" />}
      {list.data?.rows.length === 0 && <Notice text="עדיין אין סטיקרים מותאמים" />}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {(list.data?.rows ?? []).map((s) => (
          <div key={s.id} className="bg-muted rounded-2xl p-2 space-y-1 text-center">
            <img src={s.url} alt={s.label || 'סטיקר'} loading="lazy" decoding="async" className="w-full aspect-square object-contain" />
            <p className="text-xs truncate">{s.label || 'ללא שם'}</p>
            <Button size="sm" variant="ghost" aria-label="מחיקת סטיקר" onClick={() => remove(s.id)}><Trash2 /></Button>
          </div>
        ))}
      </div>
      <Pagination page={page} onPageChange={setPage} hasNext={list.data?.hasNext ?? false} loading={list.isFetching} />
    </div>
  );
}

export function AdminPanel({
  previewRole,
  onPreviewRoleChange,
}: {
  previewRole: PreviewRole;
  onPreviewRoleChange: (role: PreviewRole) => void;
}) {
  const [tab, setTab] = useState<Tab>('users');
  const activePreview = PREVIEW_ROLES.find((role) => role.id === previewRole);
  return (
    <div className="space-y-5">
      <h1 className="font-black text-2xl flex items-center gap-2"><ShieldCheck className="text-primary" />פאנל ניהול</h1>
      <section aria-label="תצוגת תפקיד לבדיקה" className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-1.5">👁️ סימולטור תצוגת תפקידים</h2>
          <p className="text-xs text-muted-foreground mt-1">
            בחירת תפקיד להצגת היקף הגישה המתאים. הבחירה אינה משנה את התפקיד, ההרשאות או פעולות הניהול בפועל.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {PREVIEW_ROLES.map(({ id, label }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={previewRole === id ? 'secondary' : 'outline'}
              aria-pressed={previewRole === id}
              onClick={() => onPreviewRoleChange(id)}
              className="h-auto min-h-9 whitespace-normal text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
        {activePreview && (
          <p role="status" className="text-xs text-muted-foreground">
            תפקיד נבחר לבדיקה: <strong>{activePreview.label}</strong> — {activePreview.scope}.
          </p>
        )}
      </section>
      {previewRole === 'SUPER_ADMIN' ? (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <Button key={id} size="sm" variant={tab === id ? 'secondary' : 'ghost'} className="whitespace-nowrap" onClick={() => setTab(id)}><Icon />{label}</Button>
            ))}
          </div>
          {tab === 'users' && <UsersTab />}
          {tab === 'trade' && <TradeQueueTab />}
          {tab === 'suppliers' && <SuppliersTab />}
          {tab === 'words' && <WordsTab />}
          {tab === 'reports' && <ReportsTab />}
          {tab === 'tickets' && <TicketsTab />}
          {tab === 'leads' && <LeadsTab />}
          {tab === 'announce' && <AnnounceTab />}
          {tab === 'pins' && <PinsTab />}
          {tab === 'stickers' && <StickersTab />}
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          במצב התצוגה של {activePreview?.label}, כלי הניהול מוסתרים. לא השתנו התפקיד או ההרשאות האמיתיים.
        </div>
      )}
    </div>
  );
}
