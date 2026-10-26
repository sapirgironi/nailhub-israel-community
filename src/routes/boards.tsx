import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, CalendarClock, MessageCircle, Plus, X, Sparkles, Briefcase, Phone, Users, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from 'zod';
import { contactText, phoneText, plainText, whatsappLink } from '@/lib/input-security';

export const Route = createFileRoute("/boards")({
  head: () => ({
    meta: [
      { title: "לוחות קהילה — NailHub" },
      { name: "description", content: "לוח מודליסטיות, דרושות והשכרת עמדות לקהילת הציפורניים." },
      { property: "og:title", content: "לוחות קהילה — NailHub" },
      { property: "og:description", content: "לוח מודליסטיות, דרושות והשכרת עמדות לקהילת הציפורניים." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BoardsPage,
});

const TREATMENTS = ["מבנה אנטומי", "בנייה באקריל", "ג'ל", "השתלמות טכניקה"];
const REGIONS = ["צפון", "מרכז", "שרון", "דרום", "ירושלים"];
const COSTS: Record<string, string> = { free: "חינם", materials: "תשלום סמלי על חומרים" };
const JOB_TYPES: Record<string, string> = { hiring: "מחפשת עובדת", station: "השכרת עמדת עבודה" };

const field = "w-full px-3.5 py-2.5 rounded-xl border border-input bg-card focus:ring-2 focus:ring-ring outline-none text-sm";
const label = "block text-xs font-bold mb-1";
const chip = (a: boolean) => `px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border ${a ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-accent"}`;

function BoardsPage() {
  const [tab, setTab] = useState<"models" | "jobs">("models");
  return (
    <div className="min-h-screen bg-blush text-right" dir="rtl">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-9 h-9 bg-rose-glam text-primary-foreground rounded-xl flex items-center justify-center"><Sparkles className="w-5 h-5" /></span>
            <span className="font-black text-xl text-rose-glam">לוחות הקהילה ✨</span>
          </Link>
          <div className="flex bg-muted p-1 rounded-2xl text-xs font-bold">
            <button onClick={() => setTab("models")} className={`px-3 sm:px-4 py-2 rounded-xl transition ${tab === "models" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}><span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" />לוח מודליסטיות</span></button>
            <button onClick={() => setTab("jobs")} className={`px-3 sm:px-4 py-2 rounded-xl transition ${tab === "jobs" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}><span className="inline-flex items-center gap-1.5"><Briefcase className="w-4 h-4" />דרושות & השכרת עמדות</span></button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4 md:p-6">{tab === "models" ? <ModelsBoard /> : <JobsBoard />}</main>
    </div>
  );
}

function WhatsAppButton({ contact }: { contact: string }) {
  const href = whatsappLink(contact);
  if (!href) return <span className="text-xs text-muted-foreground">פרטי הקשר אינם תקינים</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-xl text-xs transition">
      <MessageCircle className="w-4 h-4" /> שליחת הודעה בוואטסאפ
    </a>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm" dir="rtl" onClick={onClose}>
      <div className="bg-card max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-soft border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} aria-label="סגירה" className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center text-sm text-muted-foreground bg-card border border-dashed border-border rounded-2xl py-12">{text}</div>;
}

function ModelsBoard() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState("all");
  const [treatment, setTreatment] = useState("all");
  const { data = [], isLoading } = useQuery({
    queryKey: ["model_calls"],
    queryFn: async () => {
      const { data, error } = await supabase.from("model_calls").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const list = data.filter((p) => (region === "all" || p.region === region) && (treatment === "all" || p.treatment_type === treatment));

  const [f, setF] = useState({ treatment_type: TREATMENTS[0] ?? 'מבנה אנטומי', region: REGIONS[0] ?? 'צפון', city: "", desired_at: "", cost_type: "free", requirements: "", contact: "", studio_name: "", cost_amount: "" });
  const add = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('יש להתחבר לפני פרסום מודעה');
      const validated = z.object({ treatment_type: plainText(100), region: plainText(100), city: plainText(100).refine(v => v.length > 0), requirements: plainText(1000), contact: contactText, studio_name: plainText(150), cost_amount: plainText(30), cost_type: z.enum(['free', 'materials']), desired_at: z.string().max(30) }).parse(f);
      const { error } = await supabase.from("model_calls").insert({ ...validated, user_id: auth.user.id, desired_at: f.desired_at ? new Date(f.desired_at).toISOString() : null, requirements: f.requirements || null, studio_name: f.studio_name || null, cost_amount: f.cost_type === "materials" && f.cost_amount ? f.cost_amount : null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["model_calls"] }); setOpen(false); setF({ ...f, city: "", desired_at: "", requirements: "", contact: "", studio_name: "", cost_amount: "" }); },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">לוח מודליסטיות</h1>
          <p className="text-xs text-muted-foreground">מצאי מודליסטית להשתלמות, תרגול או צילום עבודות</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-3 rounded-2xl text-sm shadow-soft"><Plus className="w-4 h-4" /> פרסום בקשת מודליסטית</button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-3 shadow-soft space-y-2">
        <div className="flex gap-1.5 overflow-x-auto"><span className="text-xs font-bold text-muted-foreground self-center ml-1">אזור:</span>
          <button onClick={() => setRegion("all")} className={chip(region === "all")}>הכול</button>
          {REGIONS.map((r) => <button key={r} onClick={() => setRegion(r)} className={chip(region === r)}>{r}</button>)}
        </div>
        <div className="flex gap-1.5 overflow-x-auto"><span className="text-xs font-bold text-muted-foreground self-center ml-1">טיפול:</span>
          <button onClick={() => setTreatment("all")} className={chip(treatment === "all")}>הכול</button>
          {TREATMENTS.map((t) => <button key={t} onClick={() => setTreatment(t)} className={chip(treatment === t)}>{t}</button>)}
        </div>
      </div>

      {isLoading ? <Empty text="טוען..." /> : list.length === 0 ? <Empty text="אין עדיין בקשות שמתאימות לסינון" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((p) => (
            <div key={p.id} className="bg-card rounded-2xl border border-border p-5 shadow-soft flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full">{p.treatment_type}</span>
                <span className="text-[11px] font-bold text-primary">{COSTS[p.cost_type] ?? p.cost_type}{p.cost_amount ? ` · ${p.cost_amount}` : ""}</span>
              </div>
              {p.studio_name && <div className="flex items-center gap-1 text-sm font-bold"><Building className="w-4 h-4 text-primary" />{p.studio_name}</div>}
              <div className="flex items-center gap-1 text-sm"><MapPin className="w-4 h-4 text-primary" />{p.city} · {p.region}</div>
              {p.desired_at && <div className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="w-4 h-4" />{new Date(p.desired_at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}</div>}
              {p.requirements && <p className="text-xs bg-muted rounded-xl p-3 leading-relaxed"><b>דרישות: </b>{p.requirements}</p>}
              <div className="mt-auto"><WhatsAppButton contact={p.contact} /></div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal title="פרסום בקשת מודליסטית" onClose={() => setOpen(false)}>
          <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-3">
            <div><label className={label}>סוג הטיפול</label><select className={field} value={f.treatment_type} onChange={(e) => setF({ ...f, treatment_type: e.target.value })}>{TREATMENTS.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>אזור בארץ</label><select className={field} value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></div>
              <div><label className={label}>עיר *</label><input required maxLength={100} className={field} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
            </div>
            <div><label className={label}>תאריך ושעה רצויים</label><input type="datetime-local" className={field} value={f.desired_at} onChange={(e) => setF({ ...f, desired_at: e.target.value })} /></div>
            <div><label className={label}>עלות</label>
              <div className="flex gap-2">{Object.entries(COSTS).map(([k, v]) => <button type="button" key={k} onClick={() => setF({ ...f, cost_type: k })} className={chip(f.cost_type === k)}>{v}</button>)}</div>
            </div>
            {f.cost_type === "materials" && <div><label className={label}>סכום</label><input maxLength={30} placeholder="לדוגמה: 50 ₪" className={field} value={f.cost_amount} onChange={(e) => setF({ ...f, cost_amount: e.target.value })} /></div>}
            <div><label className={label}>שם הסטודיו</label><input maxLength={150} className={field} value={f.studio_name} onChange={(e) => setF({ ...f, studio_name: e.target.value })} /></div>
            <div><label className={label}>דרישות</label><textarea rows={2} maxLength={1000} placeholder="לדוגמה: ללא מבנה קיים, ציפורניים טבעיות" className={field} value={f.requirements} onChange={(e) => setF({ ...f, requirements: e.target.value })} /></div>
            <div><label className={label}>טלפון או קישור וואטסאפ *</label><input required minLength={5} maxLength={200} dir="ltr" placeholder="050-0000000" className={`${field} text-left`} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} /></div>
            {add.isError && <p className="text-xs text-destructive">הפרסום נכשל. ודאי שאת מחוברת ושכל השדות מכילים טקסט רגיל ופרטי וואטסאפ תקינים. <Link to="/">כניסה לחשבון</Link></p>}
            <button disabled={add.isPending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl text-sm disabled:opacity-60">{add.isPending ? "מפרסם..." : "פרסום"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function JobsBoard() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("all");
  const { data = [], isLoading } = useQuery({
    queryKey: ["job_posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_posts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const list = data.filter((p) => type === "all" || p.post_type === type);
  const [f, setF] = useState({ post_type: "hiring", studio_name: "", city: "", description: "", phone: "" });
  const add = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('יש להתחבר לפני פרסום מודעה');
      const validated = z.object({ post_type: z.enum(['hiring', 'station']), studio_name: plainText(150).refine(v => v.length > 0), city: plainText(100).refine(v => v.length > 0), description: plainText(2000).refine(v => v.length > 0), phone: phoneText }).parse(f);
      const { error } = await supabase.from("job_posts").insert({ ...validated, user_id: auth.user.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job_posts"] }); setOpen(false); setF({ post_type: "hiring", studio_name: "", city: "", description: "", phone: "" }); },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">דרושות והשכרת עמדות</h1>
          <p className="text-xs text-muted-foreground">משרות בסטודיו ועמדות עבודה להשכרה</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-3 rounded-2xl text-sm shadow-soft"><Plus className="w-4 h-4" /> פרסום מודעה</button>
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => setType("all")} className={chip(type === "all")}>הכול</button>
        {Object.entries(JOB_TYPES).map(([k, v]) => <button key={k} onClick={() => setType(k)} className={chip(type === k)}>{v}</button>)}
      </div>
      {isLoading ? <Empty text="טוען..." /> : list.length === 0 ? <Empty text="אין עדיין מודעות" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((p) => (
            <div key={p.id} className="bg-card rounded-2xl border border-border p-5 shadow-soft flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{JOB_TYPES[p.post_type] ?? p.post_type}</span>
                <span className="text-[11px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("he-IL")}</span>
              </div>
              <div>
                <h3 className="font-bold">{p.studio_name}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3.5 h-3.5" />{p.city}</div>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line">{p.description}</p>
              <div className="mt-auto flex gap-2">
                <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 px-4 rounded-xl border border-border text-xs font-bold hover:bg-accent"><Phone className="w-3.5 h-3.5" />{p.phone}</a>
                <div className="flex-1"><WhatsAppButton contact={p.phone} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && (
        <Modal title="פרסום מודעה" onClose={() => setOpen(false)}>
          <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-3">
            <div><label className={label}>סוג המודעה</label>
              <div className="flex gap-2">{Object.entries(JOB_TYPES).map(([k, v]) => <button type="button" key={k} onClick={() => setF({ ...f, post_type: k })} className={chip(f.post_type === k)}>{v}</button>)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>שם הסטודיו *</label><input required maxLength={150} className={field} value={f.studio_name} onChange={(e) => setF({ ...f, studio_name: e.target.value })} /></div>
              <div><label className={label}>עיר *</label><input required maxLength={100} className={field} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
            </div>
            <div><label className={label}>{f.post_type === "hiring" ? "תיאור הדרישות" : "תנאי השכירות"} *</label><textarea required rows={4} maxLength={2000} className={field} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div><label className={label}>טלפון ליצירת קשר *</label><input required type="tel" minLength={5} maxLength={30} dir="ltr" placeholder="050-0000000" className={`${field} text-left`} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            {add.isError && <p className="text-xs text-destructive">הפרסום נכשל. ודאי שאת מחוברת ושכל השדות מכילים טקסט רגיל ומספר טלפון תקין. <Link to="/">כניסה לחשבון</Link></p>}
            <button disabled={add.isPending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl text-sm disabled:opacity-60">{add.isPending ? "מפרסם..." : "פרסום"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
