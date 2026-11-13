import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const title = 'תנאי שימוש ומדיניות קהילת NailHub';
const description = 'תנאי השימוש ומדיניות קהילת NailHub: זכויות יוצרים, כללי התנהגות, דיווחים, ציוד יד שנייה וספקים.';
const url = 'https://nailhub-israel-community.lovable.app/terms';

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: url }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground text-right">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-black text-primary"><Sparkles className="size-5" />NailHub</Link>
          <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowRight />חזרה לאפליקציה</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <article aria-labelledby="terms-title" className="rounded-3xl border border-border bg-card px-5 py-7 shadow-soft sm:p-10">
          <h1 id="terms-title" className="border-b border-border pb-6 text-2xl font-extrabold leading-snug sm:text-3xl">{title}</h1>
          <div className="space-y-8 pt-7 text-base leading-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ps-1 [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:ps-5">
            <section>
              <h2>1. בעלות על הפלטפורמה וקניין רוחני</h2>
              <p>פלטפורמת NailHub, לרבות השם, הלוגו, העיצוב הגרפי, קוד המקור, הממשק, כלי העזר (מחשבוני תמחור, מנגנוני סינון תוכן, כלי חותמות מים) והסימנים המסחריים, הינם רכושה הבלעדי של הנהלת NailHub ומוגנים על פי דיני זכויות יוצרים בישראל ובעולם. חל איסור מוחלט להעתיק, לשכפל, להפיץ או לבצע הנדסה חוזרת לכל חלק מהשירות ללא אישור מראש ובכתב.</p>
            </section>
            <section>
              <h2>2. תוכן משתמשות וזכויות יוצרים</h2>
              <ul>
                <li>כל תמונה, סרטון או טקסט שמועלים על ידי משתמשת (כגון צילומי עבודות) נשארים בבעלותה המלאה.</li>
                <li>בהעלאת תוכן, המשתמשת מעניקה ל-NailHub רישיון שימוש מוגבל ובלתי-בלעדי להצגת התוכן במסגרת פעילות הפלטפורמה (בפיד, בסטורי ובחיפוש).</li>
                <li>חל איסור מוחלט להעלות עבודות שאינן שייכות למשתמשת ולהציגן כשלה. הפרה זו תגרור הסרת התוכן באופן מיידי והשעיית החשבון.</li>
              </ul>
            </section>
            <section>
              <h2>3. נוהל דיווח והסרת תוכן (Notice and Takedown)</h2>
              <p>הנהלת NailHub מכבדת זכויות יוצרים ופרטיות. במידה ופורסם תוכן המפר את זכויותייך או מהווה פגיעה, ניתן לדווח ישירות דרך כפתור הדיווח על גבי הפוסט/התגובה, או לפנות לפניות הנהלה דרך טופס יצירת קשר באפליקציה או במייל: <a href="mailto:sapiryedidia@gmail.com" dir="ltr" className="inline-block max-w-full break-all text-primary underline underline-offset-4">sapiryedidia@gmail.com</a>. התוכן ייבדק ויוסר במידת הצורך בהקדם.</p>
            </section>
            <section>
              <h2>4. כללי התנהגות, שיח מכבד וסינון אוטומטי</h2>
              <ul>
                <li>הפלטפורמה מחויבת לשיח מקצועי, מעצים ומכבד. חל איסור על שפה פוגענית, בוטה, לשון הרע, הטרדה, שיימינג מקצועי או התבטאויות בלתי הולמות.</li>
                <li>הפלטפורמה מפעילה סינון לפי רשימת מילים חסומות ופיקוח קהילתי. להנהלה שמורה הזכות הבלעדית לעצור פרסום, לערוך, להסיר תכנים ולהשעות או לחסום משתמשות (זמנית או לצמיתות) לפי שיקול דעתה.</li>
              </ul>
            </section>
            <section>
              <h2>5. לוח ציוד ויד שנייה (Nail Trade)</h2>
              <ul>
                <li>מודעות בלוח יד שנייה כפופות לאישור מוקדם של הנהלת המערכת טרם פרסומן.</li>
                <li>NailHub מהווה לוח מקשר בלבד ואינה צד בעסקה, אינה אחראית לתקינות המוצרים, לאיכותם, לאחריות היצרן, למחיר או להסדרי התשלום והמשלוח בין הצדדים.</li>
              </ul>
            </section>
            <section>
              <h2>6. ספקים, מודעות ממומנות והגבלת מסחר</h2>
              <p>שיווק מסחרי, קידום סדנאות ומכירת מוצרים מותרים אך ורק לחשבונות שהוגדרו רשמית כ"ספקים מאושרים" ובהתאם לחבילות הפרסום והקרדיטים המאושרות. חשבון אישי שיפרסם תוכן שיווקי מסחרי ללא הרשאה יושעה מהמערכת.</p>
            </section>
            <section>
              <h2>7. איסור איסוף מידע (No Scraping)</h2>
              <p>חל איסור מוחלט להשתמש בתוכנות, בוטים, סורקים או כלים אוטומטיים לאיסוף מידע, תמונות, עבודות או פרטי קשר של משתמשות מתוך הפלטפורמה.</p>
            </section>
            <section>
              <h2>8. הגבלת אחריות וסמכות שיפוט</h2>
              <p>השירות ניתן כפי שהוא ("AS IS"). הנהלת NailHub אינה נושאת באחריות לכל נזק ישיר או עקיף שייגרם כתוצאה משימוש בפלטפורמה או מהשבתה זמנית שלה. סמכות השיפוט הבלעדית בכל מחלוקת נתונה לבתי המשפט המוסמכים במחוז חיפה, לפי הדין הישראלי בלבד.</p>
            </section>
          </div>
          <div className="mt-8 border-t border-border pt-5">
            <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}><ArrowUp />חזרה למעלה</Button>
          </div>
        </article>
      </main>
    </div>
  );
}