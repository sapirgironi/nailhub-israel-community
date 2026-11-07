import { useEffect, useState } from "react";
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

  useEffect(() => {
    setPublicUrl(`${window.location.origin}/request/${encodeURIComponent(technicianId)}`);
  }, [technicianId]);

  async function copyPublicLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setShareMessage("הקישור הועתק ללוח.");
    } catch (error) {
      console.error("Could not copy public client request link", error);
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
        className="mb-7 flex flex-col gap-4 rounded-3xl border border-primary/15 bg-gradient-to-l from-primary/5 to-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-5"
        aria-labelledby="public-request-link-title"
      >
        <div>
          <h2 id="public-request-link-title" className="font-extrabold">
            קישור הפנייה האישי ללקוחות
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            שתפי קישור לקבלת בקשות לתורים, לשינויים או לתיקונים.
          </p>
          {shareMessage && (
            <p role="status" className="mt-2 text-xs text-muted-foreground">
              {shareMessage}
            </p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl sm:w-auto"
            onClick={() => void copyPublicLink()}
            disabled={!publicUrl}
          >
            <Copy aria-hidden="true" />
            העתקת קישור
          </Button>
          <Button asChild className="h-11 w-full rounded-xl sm:w-auto" disabled={!publicUrl}>
            <a
              href={
                publicUrl
                  ? `https://wa.me/?text=${encodeURIComponent(`היי, אפשר לפנות אליי דרך הקישור: ${publicUrl}`)}`
                  : undefined
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle aria-hidden="true" />
              שיתוף בוואטסאפ
            </a>
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {clinicTools.map((tool) => (
          <DashboardToolCard key={tool.title} {...tool} />
        ))}
      </div>
    </section>
  );
}
