import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Copy, Check } from "lucide-react";
import { draftPost } from "@/lib/post-draft.functions";
import { plainText } from '@/lib/input-security';

const TONES = ["מקצועי", "חם ואישי", "מעורר השראה"];

export function PostDraftWriter() {
  const run = useServerFn(draftPost);
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState(TONES[0] ?? 'מקצועי');
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validated = plainText(2000).safeParse(description);
    if (!validated.success || validated.data.length < 10) { setError('יש להזין טקסט רגיל בלבד, בין 10 ל-2000 תווים'); return; }
    setLoading(true); setError("");
    try {
      const res = await run({ data: { description: validated.data, tone } });
      if (res.error) setError(res.error); else setDraft(res.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "יצירת הטיוטה נכשלה");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto bg-card rounded-[2rem] border border-border p-6 md:p-8 shadow-soft space-y-5 text-right" dir="rtl">
      <div>
        <h2 className="text-2xl font-black text-rose-glam inline-flex items-center gap-2"><Sparkles className="w-6 h-6 text-primary" />כתיבת פוסט חכמה</h2>
        <p className="text-xs text-muted-foreground mt-1">תארי את הטיפול או הטכניקה, ונכין לך טיוטת פוסט מקצועית לפרסום בקהילה.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <textarea required minLength={10} maxLength={2000} rows={5} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="לדוגמה: מבנה אנטומי בג'ל על ציפורניים קצרות וחלשות, עם פרנץ' לבן עדין. השתמשתי בבייס מחזק..."
          className="w-full px-4 py-3 rounded-2xl border border-input bg-card focus:ring-2 focus:ring-ring outline-none text-sm leading-relaxed" />
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-muted-foreground">סגנון:</span>
          {TONES.map((t) => (
            <button type="button" key={t} onClick={() => setTone(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${tone === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-accent"}`}>{t}</button>
          ))}
        </div>
        <button disabled={loading} className="w-full bg-rose-glam text-primary-foreground font-extrabold py-3.5 rounded-2xl text-sm shadow-glow disabled:opacity-60 inline-flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />{loading ? "כותבת לך טיוטה..." : "יצירת טיוטת פוסט"}
        </button>
      </form>
      {error && <p className="text-xs text-destructive bg-accent rounded-xl p-3 text-center">{error}</p>}
      {draft && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">הטיוטה שלך (אפשר לערוך):</span>
            <button onClick={() => { navigator.clipboard.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary">{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? "הועתק" : "העתקה"}</button>
          </div>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={12} className="w-full px-4 py-3 rounded-2xl border border-border bg-muted text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring" />
        </div>
      )}
    </div>
  );
}
