import { useEffect, useState, type ChangeEvent } from "react";
import { calculateProfit, type ProfitCalculatorInput } from "@/lib/profit-calculator";
import { estimateTaxAndPension, type PensionMode } from "@/lib/tax-pension-estimator";
import { TaxAndPensionEstimator } from "./TaxAndPensionEstimator";
import MonthlyProfitTrendChart from "./MonthlyProfitTrendChart.jsx";
import PricingAdvisorCard from "./PricingAdvisorCard.jsx";

const initialValues: ProfitCalculatorInput = {
  clientsCount: 60,
  avgPrice: 160,
  materialCostPerClient: 18,
  isHomeClinic: true,
  homeRatio: 25,
  rent: 4000,
  arnona: 450,
  electricity: 400,
  waterAndNet: 220,
  fuelCost: 450,
  marketingAndSoftware: 250,
  toolsDepreciation: 150,
  insuranceAndAccountant: 350,
};

const inputClass =
  "w-full rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring";
type NumericKey = {
  [Key in keyof ProfitCalculatorInput]: ProfitCalculatorInput[Key] extends number ? Key : never;
}[keyof ProfitCalculatorInput];
const formatCurrency = (value: number) =>
  value.toLocaleString("he-IL", { maximumFractionDigits: 1 });

type SavedReport = {
  period: string;
  month_name: string;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
};

function isSavedReport(value: unknown): value is SavedReport {
  if (typeof value !== "object" || value === null) return false;
  const report = value as Record<string, unknown>;
  return (
    typeof report["period"] === "string" &&
    typeof report["month_name"] === "string" &&
    typeof report["total_revenue"] === "number" &&
    Number.isFinite(report["total_revenue"]) &&
    typeof report["total_expenses"] === "number" &&
    Number.isFinite(report["total_expenses"]) &&
    typeof report["net_profit"] === "number" &&
    Number.isFinite(report["net_profit"])
  );
}

export function UnifiedProfitCalculator({ userId }: { userId: string }) {
  const [values, setValues] = useState(initialValues);
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");
  const [taxRate, setTaxRate] = useState(0);
  const [pensionMode, setPensionMode] = useState<PensionMode>("recommended");
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [historyMessage, setHistoryMessage] = useState("");
  const result = calculateProfit(values);
  const taxEstimate = estimateTaxAndPension(result.monthlyNetProfit, taxRate, pensionMode);
  const divisor = viewMode === "weekly" ? 4 : 1;
  const storageKey = `nailhub_profit_reports_${userId}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) {
        setSavedReports([]);
        setHistoryMessage("");
        return;
      }

      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed) || !parsed.every(isSavedReport)) {
        throw new Error("Saved monthly profit reports have an invalid format.");
      }
      setSavedReports([...parsed].sort((a, b) => a.period.localeCompare(b.period)));
      setHistoryMessage("");
    } catch (error) {
      console.error("Could not load monthly profit history", error);
      setHistoryMessage("לא ניתן לטעון את היסטוריית החודשים השמורה.");
    }
  }, [storageKey]);

  function saveCurrentMonth() {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const report: SavedReport = {
      period,
      month_name: new Intl.DateTimeFormat("he-IL", {
        month: "long",
        year: "numeric",
      }).format(now),
      total_revenue: result.monthlyRevenue,
      total_expenses: result.monthlyExpenses,
      net_profit: result.monthlyNetProfit,
    };
    const updatedReports = [
      ...savedReports.filter((savedReport) => savedReport.period !== period),
      report,
    ].sort((a, b) => a.period.localeCompare(b.period));

    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedReports));
      setSavedReports(updatedReports);
      setHistoryMessage("");
    } catch (error) {
      console.error("Could not save monthly profit report", error);
      setHistoryMessage("שמירת החודש נכשלה. בדקי את שטח האחסון הזמין בדפדפן.");
    }
  }

  function shareToWhatsApp() {
    const monthName = new Intl.DateTimeFormat("he-IL", {
      month: "long",
      year: "numeric",
    }).format(new Date());
    const message = [
      `📊 סיכום חודשי לרואה החשבון — ${monthName}`,
      "",
      `💰 סך הכנסות: ₪${formatCurrency(result.monthlyRevenue)}`,
      `📉 הוצאות מוכרות: ₪${formatCurrency(result.monthlyExpenses)}`,
      `💵 רווח לפני הפרשות: ₪${formatCurrency(result.monthlyNetProfit)}`,
      "",
      "📌 הפרשות משוערות:",
      `🛡️ ביטוח לאומי ומס בריאות: ₪${formatCurrency(taxEstimate.nationalInsurance)}`,
      `🧾 מקדמות מס הכנסה (${taxRate}%): ₪${formatCurrency(taxEstimate.incomeTax)}`,
      `🏦 הפרשה לפנסיה: ₪${formatCurrency(taxEstimate.pension)}`,
      `💼 סך הפרשות בצד: ₪${formatCurrency(taxEstimate.totalDeductions)}`,
      "",
      `✅ נטו פנוי למשיכה אישית: ₪${formatCurrency(taxEstimate.takeHomeNet)}`,
      "",
      "הנתונים הם אומדן חודשי ואינם תחליף לייעוץ חשבונאי.",
    ].join("\n");
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function updateNumber(key: NumericKey) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setValues((current) => ({
        ...current,
        [key]: Number.isFinite(value) ? Math.max(0, value) : 0,
      }));
    };
  }

  function numberField(
    key: NumericKey,
    label: string,
    options: { min?: number; max?: number; step?: number } = {},
  ) {
    const value = values[key];
    if (typeof value !== "number") return null;
    return (
      <label key={key} className="block space-y-1 text-xs text-muted-foreground">
        <span>{label}</span>
        <input
          type="number"
          min={options.min ?? 0}
          max={options.max}
          step={options.step ?? 1}
          value={value}
          onChange={updateNumber(key)}
          className={inputClass}
        />
      </label>
    );
  }

  return (
    <section
      aria-labelledby="profit-calculator-title"
      className="mt-8 rounded-3xl border border-border bg-card p-4 shadow-soft md:p-6"
      dir="rtl"
    >
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="profit-calculator-title"
            className="bg-rose-glam bg-clip-text text-xl font-black text-transparent md:text-2xl"
          >
            מחשבון הוצאות ורווחים לעסק
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            הכנסות, חומרים, הוצאות קליניקה, רכב ותקורה חודשית
          </p>
        </div>
        <div className="flex w-fit rounded-xl bg-muted p-1" role="group" aria-label="תקופת תצוגה">
          {(["monthly", "weekly"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                viewMode === mode
                  ? "bg-rose-glam text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "monthly" ? "חודשי" : "שבועי"}
            </button>
          ))}
        </div>
      </header>

      <div className="my-5 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label={`סך הכנסות (${viewMode === "monthly" ? "חודשי" : "שבועי"})`}
          value={result.monthlyRevenue / divisor}
          footnote={`${Math.round(values.clientsCount / divisor)} לקוחות`}
          tone="pink"
        />
        <SummaryCard
          label="סך הוצאות כולל"
          value={result.monthlyExpenses / divisor}
          footnote="חומרים + קליניקה + רכב + תקורה"
          tone="peach"
        />
        <SummaryCard
          label="רווח לפני מס (משוער)"
          value={result.monthlyNetProfit / divisor}
          footnote={`רווחיות לפני מס: ${result.profitMargin.toFixed(1)}%`}
          tone="gradient"
        />
      </div>
      <TaxAndPensionEstimator
        netProfit={result.monthlyNetProfit}
        taxRate={taxRate}
        onTaxRateChange={setTaxRate}
        pensionMode={pensionMode}
        onPensionModeChange={setPensionMode}
      />

      <div className="space-y-4">
        <fieldset className="rounded-2xl border border-border bg-muted/40 p-4">
          <legend className="px-1 text-sm font-bold">לקוחות והכנסות מטיפולים · לחודש</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {numberField("clientsCount", "כמות לקוחות בחודש")}
            {numberField("avgPrice", "מחיר ממוצע לטיפול (₪)", { step: 10 })}
            {numberField("materialCostPerClient", "חומרים מתכלים ללקוחה (₪)", { step: 1 })}
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-border bg-muted/40 p-4">
          <legend className="px-1 text-sm font-bold">הוצאות קליניקה ודיור · לחודש</legend>
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            {(
              [
                ["home", "חדר בבית", true],
                ["studio", "סטודיו שכור בחוץ", false],
              ] as const
            ).map(([name, label, isHome]) => (
              <label key={name} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="profit-clinic-type"
                  checked={values.isHomeClinic === isHome}
                  onChange={() => setValues((current) => ({ ...current, isHomeClinic: isHome }))}
                  className="accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
          {values.isHomeClinic && (
            <label className="mb-4 block rounded-xl border border-border bg-card p-3 text-xs">
              <span className="flex justify-between text-muted-foreground">
                <span>אחוז שטח החדר מסך הדירה</span>
                <strong className="text-primary">{values.homeRatio}%</strong>
              </span>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={values.homeRatio}
                onChange={updateNumber("homeRatio")}
                aria-label="אחוז שטח החדר מסך הדירה"
                className="mt-2 w-full accent-primary"
              />
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {numberField("rent", "שכירות (₪)", { step: 100 })}
            {values.isHomeClinic && (
              <>
                {numberField("arnona", "ארנונה לחודש (₪)", { step: 50 })}
                {numberField("electricity", "חשמל לחודש (₪)", { step: 50 })}
                {numberField("waterAndNet", "מים ותקשורת (₪)", { step: 50 })}
              </>
            )}
          </div>
          {values.isHomeClinic && (
            <p className="mt-3 text-xs text-muted-foreground">
              * החלק היחסי של הוצאות הדיור שהוכנס לחישוב: ₪{formatCurrency(result.monthlyHomeCosts)}{" "}
              לחודש. לצורכי המחשה בלבד.
            </p>
          )}
        </fieldset>

        <fieldset className="rounded-2xl border border-border bg-muted/40 p-4">
          <legend className="px-1 text-sm font-bold">רכב ותקורה שוטפת · לחודש</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {numberField("fuelCost", "דלק ונסיעות עבודה (₪)", { step: 50 })}
            {numberField("marketingAndSoftware", "תוכנות ושיווק (₪)", { step: 50 })}
            {numberField("toolsDepreciation", "בלאי מכשור וציוד (₪)", { step: 50 })}
            {numberField("insuranceAndAccountant", "ביטוח והנה״ח (₪)", { step: 50 })}
          </div>
        </fieldset>
      </div>
      <div className="mt-5">
        <PricingAdvisorCard
          totalExpenses={result.monthlyExpenses}
          totalRevenue={result.monthlyRevenue}
          clientCount={values.clientsCount}
        />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        החישוב הוא אומדן כללי בלבד ואינו כולל מסים או מחליף ייעוץ חשבונאי.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <p className="text-sm font-semibold">היסטוריית חודשים שמורים</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={shareToWhatsApp}
            className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
          >
            שיתוף לרואה החשבון בוואטסאפ
          </button>
          <button
            type="button"
            onClick={saveCurrentMonth}
            className="rounded-xl bg-rose-glam px-4 py-2 text-sm font-bold text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
          >
            שמירת סיכום החודש
          </button>
        </div>
      </div>
      {historyMessage && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {historyMessage}
        </p>
      )}
      <div className="mt-5">
        <MonthlyProfitTrendChart savedReports={savedReports} />
      </div>
      {savedReports.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[32rem] text-right text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  חודש
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  הכנסות
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  הוצאות
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  רווח נקי
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {savedReports.map((report) => (
                <tr key={report.period}>
                  <th scope="row" className="px-4 py-3 font-semibold">
                    {report.month_name}
                  </th>
                  <td className="px-4 py-3">₪{formatCurrency(report.total_revenue)}</td>
                  <td className="px-4 py-3">₪{formatCurrency(report.total_expenses)}</td>
                  <td className="px-4 py-3 font-bold">₪{formatCurrency(report.net_profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          עדיין לא נשמרו חודשים. שמרי את סיכום החודש כדי להתחיל לעקוב אחר המגמה.
        </p>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  footnote,
  tone,
}: {
  label: string;
  value: number;
  footnote: string;
  tone: "pink" | "peach" | "gradient";
}) {
  const color =
    tone === "pink"
      ? "border-primary/20 bg-primary/5"
      : tone === "peach"
        ? "border-orange-200 bg-orange-50/70"
        : "border-transparent bg-rose-glam text-primary-foreground";
  return (
    <div className={`rounded-2xl border p-4 text-center ${color}`}>
      <div
        className={`text-xs font-semibold ${tone === "peach" ? "text-orange-700" : tone === "pink" ? "text-primary" : "opacity-90"}`}
      >
        {label}
      </div>
      <div className="mt-1 text-2xl font-black">₪{formatCurrency(value)}</div>
      <div
        className={`mt-1 text-xs ${tone === "gradient" ? "opacity-90" : "text-muted-foreground"}`}
      >
        {footnote}
      </div>
    </div>
  );
}
