import { useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Coins,
  Copy,
  FileSignature,
  MessageCircle,
  PenLine,
  Tags,
} from "lucide-react";
import { Button } from "./ui/button";
import { DashboardToolCard } from "./DashboardToolCard";

const clinicTools = [
  {
    to: "/clinic/profit",
    title: "מחשבון הוצאות ורווח נקי",
    description: "חישוב הכנסות, הוצאות, גרף מגמה והפרשות חודשיות.",
    icon: Coins,
  },
  {
    to: "/calculator",
    title: "מחשבון תמחור טיפול",
    description: "חישוב עלות חומרים, זמן עבודה ותמחור מדעי לטיפול בודד",
    icon: Tags,
  },
  {
    title: "תור שיגור בטוח לוואטסאפ",
    description:
      "תכנון תפוצה מדורגת בכפוף לכללי WhatsApp. הכלי עדיין בפיתוח, ואין אפשרות להבטיח מניעת חסימות.",
    icon: MessageCircle,
    badge: "בקרוב",
  },
  {
    to: "/health",
    title: "הצהרות בריאות דיגיטליות",
    description: "יצירה וניהול של הצהרות הבריאות ללקוחות הקליניקה.",
    icon: FileSignature,
  },
  {
    to: "/pricelist",
    title: "מחירון הקליניקה ומחולל גרפי",
    description: "ניהול מחירי הטיפולים ועיצוב תמונת מחירון לשיתוף בסטורי ובאינסטגרם",
    icon: Tags,
  },
  {
    to: "/draft",
    title: "כתיבת פוסט חכמה ב-AI",
    description: "יצירת טיוטת תוכן לפיד המקצועי בעזרת כלי הכתיבה.",
    icon: PenLine,
  },
] as const;

export function ClinicHub({ technicianId }: { technicianId: string }) {
  const [publicUrl, setPublicUrl] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setPublicUrl(`${window.location.origin}/request/${encodeURIComponent(technicianId)}`);
  }, [technicianId]);

  useEffect(
    () => () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    },
    [],
  );

  async function copyPublicLink() {
    if (!publicUrl) return;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setShareMessage("");
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, 2000);
    } catch (error) {
      console.error("Could not copy public client request link", error);
      setCopied(false);
      setShareMessage("לא ניתן להעתיק את הקישור. בדקי הרשאת לוח העתקה בדפדפן.");
    }
  }

  return (
    <section aria-labelledby="clinic-title" dir="rtl">
      <div className="mb-6 flex items-center gap-3 border-b border-border pb-5">
        <BriefcaseBusiness aria-hidden="true" className="size-7 shrink-0 text-primary" />
        <h1 id="clinic-title" className="text-2xl font-black">
          הקליניקה שלי
        </h1>
      </div>

      <section
        className="mb-3 rounded-xl border border-primary/15 bg-gradient-to-l from-primary/5 to-card p-3 shadow-soft"
        aria-labelledby="public-request-link-title"
      >
        <div className="min-w-0">
          <h2 id="public-request-link-title" className="text-sm font-semibold">
            קישור הפנייה האישי ללקוחות
          </h2>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            שתפי קישור לקבלת בקשות לתורים, לשינויים או לתיקונים.
          </p>
          {shareMessage && (
            <p role="status" className="mt-1 text-xs text-muted-foreground">
              {shareMessage}
            </p>
          )}
        </div>
        <div className="mt-2 flex w-full flex-row gap-2">
          <Button
            asChild
            className="h-8 min-w-0 flex-1 rounded-lg px-3 py-1 text-xs font-medium"
            disabled={!publicUrl}
          >
            <a
              href={
                publicUrl
                  ? `https://wa.me/?text=${encodeURIComponent(`היי! מזמינה אותך לקבוע תור או לשלוח פנייה דרך הקישור האישי שלי: ${publicUrl}`)}`
                  : undefined
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
              שיתוף בוואטסאפ
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 min-w-0 flex-1 rounded-lg px-3 py-1 text-xs font-medium"
            onClick={() => void copyPublicLink()}
            disabled={!publicUrl}
          >
            <Copy aria-hidden="true" className="size-4 shrink-0" />
            {copied ? "הועתק! ✓" : "העתקת קישור"}
          </Button>
        </div>
      </section>

      <div className="flex flex-col">
        {clinicTools.map((tool) => (
          <DashboardToolCard key={tool.title} {...tool} />
        ))}
      </div>
    </section>
  );
}
