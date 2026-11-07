import { estimateTaxAndPension, type PensionMode } from "@/lib/tax-pension-estimator";

const formatCurrency = (value: number) => Math.round(value).toLocaleString("he-IL");

export function TaxAndPensionEstimator({
  netProfit,
  taxRate,
  onTaxRateChange,
  pensionMode,
  onPensionModeChange,
}: {
  netProfit: number;
  taxRate: number;
  onTaxRateChange: (value: number) => void;
  pensionMode: PensionMode;
  onPensionModeChange: (mode: PensionMode) => void;
}) {
  const estimate = estimateTaxAndPension(netProfit, taxRate, pensionMode);

  return (
    <section
      className="space-y-4 rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/5 to-orange-50/50 p-5 shadow-soft"
      dir="rtl"
      aria-labelledby="tax-pension-title"
    >
      <header className="flex flex-col gap-3 border-b border-primary/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="tax-pension-title" className="flex items-center gap-2 text-base font-extrabold">
            הפרשות מס, ביטוח לאומי ופנסיה 🛡️
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">אומדן חודשי להיערכות ולתכנון תזרים</p>
        </div>
        <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          רווח עסקי: ₪{formatCurrency(netProfit)}
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <EstimateCard
          label="ביטוח לאומי ובריאות"
          value={estimate.nationalInsurance}
          detail="אומדן לפי שיעורים וסף שהוגדרו במחשבון"
        />
        <div className="space-y-2 rounded-2xl border border-border bg-card p-3.5">
          <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>מקדמות מס הכנסה</span>
            <span className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="30"
                step="0.5"
                value={taxRate}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  onTaxRateChange(Number.isFinite(value) ? Math.min(30, Math.max(0, value)) : 0);
                }}
                aria-label="אחוז מקדמות מס הכנסה משוער"
                className="w-16 rounded border border-input bg-card px-1.5 py-1 text-center text-xs font-bold text-primary"
              />
              <span className="font-bold">%</span>
            </span>
          </label>
          <p className="text-lg font-black">₪{formatCurrency(estimate.incomeTax)}</p>
          <p className="text-[10px] text-muted-foreground">
            הזיני את שיעור המקדמות שנקבע לך, אם קיים.
          </p>
        </div>
        <div className="space-y-2 rounded-2xl border border-border bg-card p-3.5">
          <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>חיסכון לפנסיה</span>
            <select
              value={pensionMode}
              onChange={(event) => {
                const mode = event.target.value;
                if (mode === "mandatory" || mode === "recommended") {
                  onPensionModeChange(mode);
                }
              }}
              className="max-w-36 rounded border border-input bg-card px-1.5 py-1 text-[10px] font-bold"
              aria-label="מסלול הפרשה לפנסיה"
            >
              <option value="recommended">אומדן 16.5%</option>
              <option value="mandatory">אומדן 4.45%</option>
            </select>
          </label>
          <p className="text-lg font-black text-primary">₪{formatCurrency(estimate.pension)}</p>
          <p className="text-[10px] text-muted-foreground">
            שיעור המחשה בלבד; ההפקדה בפועל תלויה בנתונים האישיים.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-card p-4 sm:flex-row">
        <div className="text-center sm:text-right">
          <p className="text-xs font-bold text-muted-foreground">יתרה משוערת לאחר ההפרשות</p>
          <p className="mt-1 text-xs text-muted-foreground">
            אומדן ניכויים כולל: ₪{formatCurrency(estimate.totalDeductions)}
          </p>
        </div>
        <p className="text-2xl font-black text-emerald-700">
          ₪{formatCurrency(estimate.takeHomeNet)}
        </p>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        זהו אומדן כללי בלבד, לא חישוב מס אישי או ייעוץ פיננסי. שיעורי המס והביטוח עשויים להשתנות;
        בדקי את הנתונים העדכניים מול רואה חשבון או הגורם המוסמך.
      </p>
    </section>
  );
}

function EstimateCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-3.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-black">₪{formatCurrency(value)}</p>
      <p className="text-[10px] text-muted-foreground">{detail}</p>
    </div>
  );
}
