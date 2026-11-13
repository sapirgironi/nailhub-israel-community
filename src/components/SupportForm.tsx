import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, LifeBuoy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { plainText } from '@/lib/input-security';
import { Pagination, PAGE_SIZE, pageRange } from './Pagination';

const field = 'text-right w-full border border-input rounded-lg bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring';
const CATEGORIES = [
  { id: 'bug', label: 'דיווח על תקלה טכנית באפליקציה' },
  { id: 'feature', label: 'הצעה לשיפור / פיצ׳ר חדש' },
  { id: 'collab', label: 'בקשה לשיתוף פעולה עסקי / ספקים' },
  { id: 'other', label: 'אחר / פנייה כללית להנהלה' },
] as const;
const STATUS_LABEL: Record<string, string> = { new: 'חדש', in_progress: 'בטיפול', closed: 'נפתר / נסגר' };

export function SupportForm({ user }: { user: { id: string; fullName: string; phone: string } }) {
  const qc = useQueryClient();
  const [category, setCategory] = useState<string>('bug');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const mine = useQuery({
    queryKey: ['my-tickets', user.id, page],
    staleTime: 30_000,
    queryFn: async () => {
      const { from, to } = pageRange(page);
      const { data, error } = await supabase.from('support_tickets').select('id,subject,category,status,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to);
      if (error) throw error;
      return data;
    },
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const s = plainText(150).safeParse(subject);
    const b = plainText(2000).safeParse(body);
    if (!s.success || !s.data || !b.success || !b.data) { setMsg('מלאי נושא ותיאור בטקסט רגיל'); return; }
    setBusy(true);
    const { error } = await supabase.from('support_tickets').insert({ user_id: user.id, category, subject: s.data, body: b.data, phone: user.phone, email: '' });
    setBusy(false);
    if (error) { setMsg('שליחת הפנייה נכשלה. נסי שוב'); return; }
    setMsg('הפנייה נשלחה להנהלה. נחזור אלייך בהקדם 💖');
    setSubject(''); setBody('');
    await qc.invalidateQueries({ queryKey: ['my-tickets'] });
  }
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-black text-2xl flex items-center gap-2"><LifeBuoy className="text-primary" />צרי קשר / דיווח על תקלה</h1>
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1.5 text-xs font-bold">
          <span>סוג הפנייה</span>
          <select aria-label="סוג הפנייה" value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="block space-y-1.5 text-xs font-bold">
          <span>נושא</span>
          <input required maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} className={field} />
        </label>
        <label className="block space-y-1.5 text-xs font-bold">
          <span>תיאור הפנייה</span>
          <textarea required maxLength={2000} rows={5} value={body} onChange={(e) => setBody(e.target.value)} className={field} />
        </label>
        <p className="text-xs text-muted-foreground">פרטי הקשר שלך (טלפון) נמשכים אוטומטית מהפרופיל.</p>
        <Button type="submit" disabled={busy}><Send />{busy ? 'שולחת...' : 'שליחת פנייה'}</Button>
        {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
      </form>
      <div className="border-t border-border pt-5 space-y-3">
        <h2 className="font-bold">הפניות שלי</h2>
        {mine.isError && <p className="text-sm text-muted-foreground">טעינת הפניות נכשלה</p>}
        {mine.data?.length === 0 && <p className="text-sm text-muted-foreground">עדיין לא שלחת פניות</p>}
        {(mine.data ?? []).slice(0, PAGE_SIZE).map((t) => (
          <div key={t.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold break-words">{t.subject}</p>
              <time className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('he-IL')}</time>
            </div>
            <span className="text-[11px] font-bold bg-accent text-primary px-2 py-1 rounded-lg shrink-0">{STATUS_LABEL[t.status] ?? t.status}</span>
          </div>
        ))}
        <Pagination page={page} onPageChange={setPage} hasNext={(mine.data?.length ?? 0) > PAGE_SIZE} loading={mine.isFetching} />
      </div>
    </div>
  );
}
