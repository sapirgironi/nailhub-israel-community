import { useState } from "react";

const formatCurrency = (amount) => Math.round(amount).toLocaleString("he-IL");

export default function PricingAdvisorCard({
  totalExpenses = 0,
  totalRevenue = 0,
  clientCount = 0,
}) {
  const [targetNetProfit, setTargetNetProfit] = useState(8000);
  const [showTemplate, setShowTemplate] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  const safeClients = Math.max(1, Number.isFinite(clientCount) ? clientCount : 0);
  const expenses = Math.max(0, Number.isFinite(totalExpenses) ? totalExpenses : 0);
  const revenue = Math.max(0, Number.isFinite(totalRevenue) ? totalRevenue : 0);
  const currentAvgPrice = Math.round(revenue / safeClients);
  const costPerClient = Math.round(expenses / safeClients);
  const recommendedAvgPrice = Math.round((targetNetProfit + expenses) / safeClients);
  const priceIncrease = Math.max(0, recommendedAvgPrice - currentAvgPrice);
  const increasePct = currentAvgPrice > 0 ? Math.round((priceIncrease / currentAvgPrice) * 100) : 0;
  const updateDate = new Date();
  updateDate.setMonth(updateDate.getMonth() + 1);
  const formattedDate = new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(updateDate);

  const recommendedPricing = [
    {
      service: "מבנה אנטומי / לק ג׳ל משודרג",
      current: currentAvgPrice,
      recommended: recommendedAvgPrice,
    },
    {
      service: "בנייה חדשה / הארכה",
      current: currentAvgPrice + 60,
      recommended: recommendedAvgPrice + 60,
    },
    {
      service: "מילוי בנייה",
      current: currentAvgPrice + 20,
      recommended: recommendedAvgPrice + 20,
    },
    { service: "תיקון ציפורן בודדת", current: 25, recommended: 30 },
  ];

  const whatsappMessage = `היי אהובה 💖
רציתי לעדכן אותך שבמהלך החודשים האחרונים השקעתי בהשתלמויות מקצועיות, במכשור ובחומרים איכותיים לשמירה על בריאות הציפורן והעור.

כדי להמשיך להעניק לך טיפול מקצועי ואיכותי, החל מתאריך ${formattedDate} יתעדכן מחירון הטיפולים בקליניקה.
למשל, מחיר מבנה אנטומי יהיה ${formatCurrency(recommendedAvgPrice)} ₪.

מצרפת לך את המחירון המלא והמעודכן.
תודה על האמון והדרך המשותפת שלנו, ומחכה לראותך בטיפול הקרוב! ✨💅`;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopyMessage("הנוסח הועתק ללוח.");
    } catch (error) {
      console.error("Could not copy pricing update message", error);
      setCopyMessage("לא ניתן להעתיק את הנוסח. בדקי את הרשאת הלוח בדפדפן.");
    }
  }

  return (
    <section
      className="space-y-5 rounded-3xl border border-primary/15 bg-card p-5 shadow-soft"
      dir="rtl"
      aria-labelledby="pricing-advisor-title"
    >
      <header className="flex flex-col items-start justify-between gap-3 border-b border-border pb-3 sm:flex-row sm:items-center">
        <div>
          <h3 id="pricing-advisor-title" className="text-base font-black">
            יועץ תמחור חכם ובניית מחירון 🏷️
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            חישוב מחיר ממוצע לפי ההוצאות, מספר הלקוחות ויעד הרווח שהגדרת.
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs font-bold">
          יעד רווח נקי
          <span className="text-primary">₪</span>
          <input
            type="number"
            min="0"
            step="500"
            value={targetNetProfit}
            onChange={(event) => {
              const value = Number(event.target.value);
              setTargetNetProfit(Number.isFinite(value) ? Math.max(0, value) : 0);
            }}
            className="w-24 rounded-lg border border-input bg-card px-2 py-1 text-xs"
          />
        </label>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <AdvisorMetric label="הוצאות ללקוחה לכיסוי עלויות" value={costPerClient} />
        <AdvisorMetric label="מחיר ממוצע נוכחי לטיפול" value={currentAvgPrice} />
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
          <span className="block text-[11px] font-bold text-muted-foreground">מחיר מומלץ ליעד</span>
          <span className="text-xl font-black text-primary">
            ₪{formatCurrency(recommendedAvgPrice)}
          </span>
          <span className="mt-0.5 block text-[10px] font-bold text-orange-700">
            שינוי של ₪{formatCurrency(priceIncrease)} (
            {increasePct > 0 ? `+${increasePct}%` : "ללא תוספת"})
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-extrabold">הצעת מחירון לפי ממוצע העסק:</h4>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[32rem] text-right text-xs">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th scope="col" className="p-2.5">
                  שירות
                </th>
                <th scope="col" className="p-2.5">
                  מחיר נוכחי
                </th>
                <th scope="col" className="p-2.5 text-primary">
                  מחיר מומלץ
                </th>
                <th scope="col" className="p-2.5">
                  הפרש
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recommendedPricing.map((item) => (
                <tr key={item.service}>
                  <th scope="row" className="p-2.5 font-bold">
                    {item.service}
                  </th>
                  <td className="p-2.5">₪{formatCurrency(item.current)}</td>
                  <td className="p-2.5 font-black text-primary">
                    ₪{formatCurrency(item.recommended)}
                  </td>
                  <td className="p-2.5 font-bold text-emerald-700">
                    +₪{formatCurrency(item.recommended - item.current)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <button
          type="button"
          aria-expanded={showTemplate}
          onClick={() => setShowTemplate((shown) => !shown)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3 text-right text-xs font-bold hover:bg-accent"
        >
          <span>💬 נוסח וואטסאפ לעדכון לקוחות על המחירון</span>
          <span>{showTemplate ? "▲ סגירה" : "▼ הצגה"}</span>
        </button>
        {showTemplate && (
          <div className="mt-3 space-y-3 rounded-2xl bg-slate-950 p-4 text-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-2">
              <span className="text-xs text-slate-300">מומלץ לשלוח כחודש לפני עדכון המחירים</span>
              <button
                type="button"
                onClick={() => void copyToClipboard()}
                className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
              >
                📋 העתקת נוסח
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
              {whatsappMessage}
            </pre>
            {copyMessage && (
              <p role="status" className="text-xs text-slate-300">
                {copyMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function AdvisorMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-3.5">
      <span className="block text-[11px] text-muted-foreground">{label}</span>
      <span className="text-lg font-black">₪{formatCurrency(value)}</span>
    </div>
  );
}
