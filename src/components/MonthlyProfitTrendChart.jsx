import { useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatCurrency = (value) =>
  `₪${Number(value).toLocaleString("he-IL", { maximumFractionDigits: 1 })}`;

export default function MonthlyProfitTrendChart({ savedReports = [] }) {
  const [targetProfit, setTargetProfit] = useState(6000);
  const chartData = savedReports.map((report) => ({
    month: report.month_name || report.period,
    revenue: report.total_revenue,
    expenses: report.total_expenses,
    netProfit: report.net_profit,
  }));

  return (
    <section
      className="rounded-3xl border border-border bg-card p-5 shadow-soft"
      dir="rtl"
      aria-labelledby="profit-trend-title"
    >
      <header className="mb-4 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="profit-trend-title" className="text-base font-extrabold">
            מגמת רווח חודשי לאורך זמן 📈
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">השוואת הרווח הנקי החודשי ליעד שהגדרת</p>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs font-semibold">
          יעד רווח חודשי
          <span className="text-primary">₪</span>
          <input
            type="number"
            min="0"
            step="500"
            value={targetProfit}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setTargetProfit(Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0);
            }}
            className="w-24 rounded-lg border border-input bg-card px-2 py-1 text-sm"
            aria-label="יעד רווח חודשי"
          />
        </label>
      </header>

      {chartData.length < 2 ? (
        <div className="grid min-h-48 place-items-center rounded-2xl bg-muted/40 px-5 text-center text-sm text-muted-foreground">
          הגרף יציג מגמת השוואה ברגע שיישמרו נתונים של חודשיים ומעלה
        </div>
      ) : (
        <div className="h-64 w-full" role="img" aria-label="גרף מגמת רווח נקי לפי חודש">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 16, right: 12, left: 12, bottom: 4 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrency}
                domain={[
                  (minimum) => Math.min(minimum, targetProfit),
                  (maximum) => Math.max(maximum, targetProfit),
                ]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const report = payload[0]?.payload;
                  if (!report) return null;
                  const margin = report.revenue > 0 ? (report.netProfit / report.revenue) * 100 : 0;
                  return (
                    <div className="space-y-1 rounded-xl border border-border bg-card p-3 text-right text-xs shadow-soft">
                      <p className="mb-2 border-b border-border pb-1 font-bold">{report.month}</p>
                      <p>הכנסות: {formatCurrency(report.revenue)}</p>
                      <p>הוצאות: {formatCurrency(report.expenses)}</p>
                      <p className="font-bold text-primary">
                        רווח נקי: {formatCurrency(report.netProfit)}
                      </p>
                      <p>אחוז רווחיות: {margin.toFixed(1)}%</p>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={targetProfit}
                stroke="#8b5cf6"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `יעד: ${formatCurrency(targetProfit)}`,
                  position: "insideTopRight",
                  fill: "#7c3aed",
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="netProfit"
                name="רווח נקי"
                stroke="#E60067"
                strokeWidth={3}
                dot={{ r: 5, fill: "#FF6B00", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 7, fill: "#FF6B00" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
