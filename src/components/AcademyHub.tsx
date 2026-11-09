import { BookOpen, FileBadge, FileText, GraduationCap } from "lucide-react";
import { DashboardToolCard } from "./DashboardToolCard";

const academyTools = [
  {
    to: "/academy/courses",
    title: "מאגר הקורסים והסדנאות שלי",
    description: "גישה לקורסים ששמרת ולניהול התוכן האקדמי שלך.",
    icon: BookOpen,
  },
  {
    to: "/academy/syllabus",
    title: "מחולל סילבוס ומערכי שיעור ב-AI",
    description: "בניית תוכנית לימודים לתלמידות ומערכי שיעור למדריכה.",
    icon: FileText,
  },
  {
    to: "/academy/calculator",
    title: "מחשבון תמחור ורווחיות קורסים",
    description: "תמחור קורסים לפי הוצאות, ערכות תלמידה, זמן עבודה ויעד רווח.",
    icon: GraduationCap,
  },
  {
    title: "מחולל תעודות הסמכה דיגיטליות",
    description: "יצירת תעודות אישיות לתלמידות — הכלי עדיין בפיתוח.",
    icon: FileBadge,
    badge: "בקרוב",
  },
] as const;

export function AcademyHub({ hasAccess }: { hasAccess: boolean }) {
  if (!hasAccess) {
    return (
      <section
        className="rounded-3xl border border-border bg-card p-6 text-center shadow-soft"
        dir="rtl"
        role="status"
      >
        <h1 className="text-xl font-black">האקדמיה שלי</h1>
        <p className="mt-2 text-sm text-muted-foreground">אזור האקדמיה זמין לחשבונות מדריכה.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="academy-title" dir="rtl">
      <div className="mb-6 flex items-center gap-3 border-b border-border pb-5">
        <GraduationCap aria-hidden="true" className="size-7 shrink-0 text-primary" />
        <div>
          <h1 id="academy-title" className="text-2xl font-black">
            האקדמיה שלי
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            מאגרי קורסים, תכנון לימודים ותמחור במקום אחד.
          </p>
        </div>
      </div>
      <div className="flex flex-col">
        {academyTools.map((tool) => (
          <DashboardToolCard key={tool.title} {...tool} />
        ))}
      </div>
    </section>
  );
}
