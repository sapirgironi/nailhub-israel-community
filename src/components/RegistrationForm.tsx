import { type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  GraduationCap,
  Heart,
  ShoppingBag,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
} from "lucide-react";
import { Button } from "./ui/button";
import { PasswordField } from "./PasswordField";

export type RegistrationDetails = {
  fullName: string;
  phone: string;
  city: string;
  businessName: string;
  role: string;
  specialties: string[];
  additionalServices: string[];
};

const roles = [
  {
    id: "nail_tech",
    title: "נייליסטית מקצועית",
    icon: ShoppingBag,
    headline: "הבית המקצועי שלך: לנהל עסק ולשתף את העבודות שלך עם הקהילה.",
    items: [
      "רשת חברתית מקצועית, פיד עבודות, סטוריז והשראה יומיומית בקהילה של מקצועיות שמבינות בדיוק את העולם שלך",
      "כרטיס עסק ללקוחות מהאזור: לקוחות מוצאות אותך במפה לפי מיקום ומגיעות ישר אלייך לקביעת תור מהיר.",
      "תבניות לפוסטים: בחרי נושא והוסיפי פרטים משלך ליצירת טיוטה שאפשר לערוך.",
      "מחשבון תמחור ומחירון דיגיטלי: חישוב עלות חומרים ורווח לכל טיפול בנפרד, ויצירת מחירון מעוצב שתוכלי לשלוח ישירות ללקוחות בוואטסאפ.",
      "הצהרות בריאות דיגיטליות: שולחת קישור מהיר, הלקוחה חותמת ישירות על המסך, והטופס נשמר מאובטח ומסודר בתיק האישי שלה.",
      "כוח קנייה קהילתי: הוזלה משמעותית בסלי חומרים ומארזי עבודה שוטפים דרך סקרי רכישה משותפת.",
      "מכרזי פרימיום בלעדיים: גישה מוקדמת לרכישת ציוד מקצועי כבד ומכשור מתקדם במחירי מכרז חסרי תקדים.",
    ],
  },
  {
    id: "client",
    title: "לקוחה",
    icon: Heart,
    headline: "למצוא את אשת המקצוע המתאימה לך, לשמור השראה ולהישאר מחוברת לקהילה.",
    items: [
      "אינדקס מקצועיות: חיפוש לפי אזור, צפייה בפרופילים ויצירת קשר בוואטסאפ.",
      "פיד מקצועי וסטוריז: צפייה בעבודות והשראה מקהילת הציפורניים.",
      "השמורים שלי: שמירת עבודות שאהבת וחזרה אליהן בקלות.",
      "לוחות הקהילה: פרסומי מודליסטיות, דרושות וציוד יד שנייה.",
    ],
  },
  {
    id: "model",
    title: "מודליסטית",
    icon: User,
    headline: "למצוא הזדמנויות להשתתף בהדגמות, תרגולים והשתלמויות בעולם הציפורניים.",
    items: [
      "לוח מודליסטיות: צפייה בפרסומים לאיתור מודליסטיות לטיפולים, השתלמויות וצילומים.",
      "יצירת קשר ישירה בוואטסאפ מול מי שמפרסמת בקשה.",
      "פיד מקצועי וסטוריז: צפייה בעבודות והשראה מקהילת המקצועיות.",
      "שמירת עבודות שאהבת וחזרה אליהן במרחב השמורים שלך.",
    ],
  },
  {
    id: "instructor",
    title: "מדריכה / מעבירת השתלמויות",
    icon: GraduationCap,
    headline: "לפרסם סדנאות וקורסים, לאתר מודליסטיות ולבנות מערכי שיעור.",
    items: [
      "חשיפה ישירה לתלמידות: פרסום סדנאות, השתלמויות ומאסטר-קלאס מול קהל היעד המדויק ביותר של מקצועיות שרוצות להתפתח.",
      "לוח מודליסטיות מהיר: מפרסמת תאריך וסוג טיפול, וסוגרת מודליסטית מתאימה להדגמה בלי ללכת לאיבוד בקבוצות.",
      "מחולל סילבוס: יצירת תוכנית לימודים ומערכי שיעור מתוך תבניות.",
      "פרופיל מדריכה מאומת: עמוד רשמי להצגת תעודות הסמכה, המלצות של בוגרות והוכחה מקצועית שבונה אמון מול תלמידות חדשות.",
      "רכש מרוכז לערכות תלמידות: הוזלה משמעותית של חבילות ההצטיידות והציוד להדרכות דרך כוח הקנייה של הפלטפורמה.",
      "מכרזי הצטיידות לאקדמיות: רכישת מכשור וציוד מתקדם לכיתות הלימוד במחירי קבוצה ייחודיים.",
    ],
  },
  {
    id: "supplier",
    title: "ספק / מותג מוצרים",
    icon: ShoppingBag,
    headline: "החיבור הישיר לרוכשות: למכור ליין מוצרים ומבצעים ישירות לאלפי מקצועיות פעילות.",
    items: [
      "קהל יעד מדויק וממוקד: חשיפת חומרי גלם, ציוד ומבצעים מול אלפי בונות ציפורניים שמחדשות מלאי מדי חודש.",
      "פרופיל ספק וקטלוג מקושר: הצגת קטלוג המוצרים עם קישור רכישה מהיר שמפנה ישירות לאתר החנות שלך.",
      "אזור ספקים ייעודי להצגת מוצרים ומבצעים לקהילה.",
      "מכרזי פרימיום סגורים: גישה בלעדית להגשת הצעות מחיר דיסקרטיות במכרזי רכש מרוכזים לקהילה.",
      "עסקאות נפח וכוח קנייה מרוכז: מכירת כמויות גדולות במכה אחת של מארזים וסלי צריכה שוטפים, ישירות לאלפי מקצועיות פעילות.",
    ],
  },
];

const field =
  "w-full pr-9 pl-2.5 py-2.5 rounded-xl border border-border bg-accent/40 text-right text-xs outline-none focus:ring-2 focus:ring-ring";

export function RegistrationForm({
  details,
  onChange,
  email,
  onEmail,
  password,
  onPassword,
  onSubmit,
  onLogin,
  busy,
  error,
  profileCompletion = false,
}: {
  details: RegistrationDetails;
  onChange: (details: RegistrationDetails) => void;
  email: string;
  onEmail: (value: string) => void;
  password: string;
  onPassword: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onLogin: () => void;
  busy: boolean;
  error: string;
  specialties: string[];
  services: string[];
  profileCompletion?: boolean;
}) {
  const selectedRole = roles.find(({ id }) => id === details.role) ?? roles[0]!;

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background px-4 py-8 text-right text-foreground md:py-12"
    >
      <div className="mx-auto max-w-3xl space-y-7">
        <header className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-2xl font-black text-primary">NailHub</span>
            {!profileCompletion && (
              <Button type="button" variant="outline" onClick={onLogin}>
                כבר רשומה? התחברי כאן
                <ArrowLeft />
              </Button>
            )}
          </div>
          <div>
            <h1 className="mb-2 text-3xl font-black">
              {profileCompletion ? "השלמת הפרופיל" : "נכיר אותך קצת"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {profileCompletion
                ? "בחרי את התפקיד שלך והוסיפי את שם העסק כדי להמשיך."
                : "ברוכה הבאה לקהילת הציפורניים המקצועית בישראל."}
            </p>
          </div>
        </header>

        <form onSubmit={onSubmit} className="space-y-7">
          <section className="space-y-3 border-y border-border py-5">
            <h2 className="text-sm font-bold">
              {profileCompletion ? "פרטי העסק" : "פרטי גישה ויצירת קשר"}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    key: "fullName",
                    label: details.role === "supplier" ? "שם החברה / המותג" : "שם מלא",
                    icon: User,
                    required: true,
                  },
                  {
                    key: "phone",
                    label: "טלפון וואטסאפ",
                    icon: Phone,
                    required: !profileCompletion,
                  },
                  {
                    key: "businessName",
                    label: "שם העסק / הסטודיו",
                    icon: Building2,
                    required: profileCompletion,
                  },
                  {
                    key: "city",
                    label: "עיר וכתובת פעילות",
                    icon: MapPin,
                    required: !profileCompletion,
                  },
                ] as const
              )
                .filter(
                  ({ key }) => !profileCompletion || key === "fullName" || key === "businessName",
                )
                .map(({ key, label, icon: Icon, required }) => (
                  <label className="block space-y-1 text-[11px] font-semibold" key={key}>
                    <span>
                      {label}
                      {required ? " *" : ""}
                    </span>
                    <div className="relative">
                      <input
                        required={required}
                        type={key === "phone" ? "tel" : "text"}
                        maxLength={150}
                        value={details[key]}
                        onChange={(event) => onChange({ ...details, [key]: event.target.value })}
                        className={field}
                      />
                      <Icon className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </label>
                ))}
              {!profileCompletion && (
                <>
                  <label className="block space-y-1 text-[11px] font-semibold">
                    <span>כתובת אימייל *</span>
                    <div className="relative">
                      <input
                        required
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => onEmail(event.target.value)}
                        className={field}
                      />
                      <Mail className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </label>
                  <PasswordField
                    value={password}
                    onChange={onPassword}
                    autoComplete="new-password"
                    compact
                  />
                </>
              )}
            </div>
          </section>

          <fieldset className="space-y-3">
            <legend className="mb-3 font-bold">בחרי את הפרופיל שלך</legend>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
              role="radiogroup"
              aria-describedby="profile-guidance"
            >
              {roles.map(({ id, title, icon: Icon }) => {
                const isSelected = details.role === id;

                return (
                  <label
                    key={id}
                    className={`flex min-h-20 cursor-pointer items-center gap-2 rounded-2xl border p-3 text-right text-xs font-bold shadow-soft transition-colors ${
                      isSelected
                        ? "border-primary/50 bg-accent/45 ring-1 ring-primary/20"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    {id === "nail_tech" ? (
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5 shrink-0 text-primary"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="10" y="2" width="4" height="6.5" rx="1.5" fill="currentColor" />
                        <path d="M6.5 8.5C5.8 8.5 5.2 9.2 5.5 10L7.2 20.2C7.3 20.8 7.8 21.5 8.5 21.5h7c.7 0 1.2-.7 1.3-1.3L18.5 10c.3-.8-.3-1.5-1-1.5H6.5Z" />
                      </svg>
                    ) : (
                      <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    )}
                    <span className="flex-1 leading-5">{title}</span>
                    <input
                      type="radio"
                      name="role"
                      aria-label={title}
                      value={id}
                      checked={isSelected}
                      onChange={() => onChange({ ...details, role: id })}
                      className="accent-primary"
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>

          <p
            id="profile-guidance"
            className="rounded-2xl border border-primary/15 bg-accent/40 px-4 py-3 text-center text-sm font-semibold text-primary"
          >
            גללי למטה כדי לראות את כל מה שיש לקהילה ולאפליקציה להציע עבור הפרופיל שבחרת ↓
          </p>

          <section
            id="profile-benefits"
            aria-labelledby="selected-profile-title"
            className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-soft md:p-7"
          >
            <div className="space-y-2">
              <span className="inline-flex rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-bold text-primary">
                הפרופיל שבחרת
              </span>
              <h2 id="selected-profile-title" className="text-xl font-black">
                {selectedRole.title}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">{selectedRole.headline}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {selectedRole.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 rounded-2xl bg-accent/35 p-3 text-sm leading-6"
                >
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {error && (
            <p role="alert" className="text-right text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="min-h-12 w-full rounded-3xl font-bold">
            {busy
              ? profileCompletion
                ? "שומרת את הפרופיל..."
                : "משלימה הרשמה..."
              : profileCompletion
                ? "שמירת הפרופיל וכניסה"
                : "סיום הרשמה"}
            <ArrowLeft />
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            <Link
              to="/terms"
              className="underline underline-offset-4 transition-colors hover:text-primary"
            >
              תנאי שימוש ומדיניות קהילה
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
