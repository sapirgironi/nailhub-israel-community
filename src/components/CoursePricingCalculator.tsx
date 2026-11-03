import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MapPin,
  Save,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  COURSE_TYPES,
  DEFAULT_CALCULATOR_STATE,
  calculateCoursePricing,
} from "@/lib/course-pricing";
import { academyStorage } from "@/lib/academy-storage";
import { generateSyllabusFromCourse } from "@/lib/academy-syllabus";
import { hebrewError } from "@/lib/hebrew-errors";
import { plainText } from "@/lib/input-security";
import type { SavedCourse } from "@/types/academy";
import type { CalculatorState, CourseCategory } from "@/types/pricing-calculator";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

const currency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return currency.format(value);
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-3xl border-border shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-black">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-bold leading-relaxed">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => {
            const parsed = Number(event.currentTarget.value);
            const bounded = Math.max(min, Number.isFinite(parsed) ? parsed : min);
            onChange(max === undefined ? bounded : Math.min(max, bounded));
          }}
          className="text-right"
        />
        {suffix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-border p-3">
      <div className="space-y-1">
        <Label htmlFor={id} className="cursor-pointer text-xs font-bold">
          {label}
        </Label>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function PriceTier({
  title,
  description,
  price,
  featured = false,
}: {
  title: string;
  description: string;
  price: number;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        featured ? "border-primary bg-accent/70" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {featured && <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />}
      </div>
      <p className="mt-3 text-2xl font-black text-primary">{formatCurrency(price)}</p>
      <p className="text-[11px] text-muted-foreground">למשתתפת</p>
    </div>
  );
}

export function CoursePricingCalculator({
  canAccess = true,
  userId,
}: {
  canAccess?: boolean;
  userId?: string;
}) {
  const [state, setState] = useState<CalculatorState>(() => ({
    ...DEFAULT_CALCULATOR_STATE,
  }));
  const [courseTitle, setCourseTitle] = useState("קורס בסיס ומבנה אנטומי");
  const [saveMessage, setSaveMessage] = useState("");

  function update<K extends keyof CalculatorState>(key: K, value: CalculatorState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  const courseOptions = COURSE_TYPES.filter((course) => course.category === state.category);
  const result = canAccess ? calculateCoursePricing(state) : null;
  const selectedCourse = courseOptions.find((course) => course.id === state.selectedCourseId);
  const courseName =
    state.selectedCourseId === "custom"
      ? state.customCourseName?.trim() || "קורס בהתאמה אישית"
      : (selectedCourse?.name ?? "קורס");

  function setCategory(category: CourseCategory) {
    const firstCourse = COURSE_TYPES.find((course) => course.category === category);
    setState((current) => {
      const { customCourseName: _customCourseName, ...withoutCustomCourseName } = current;
      return {
        ...withoutCustomCourseName,
        category,
        selectedCourseId: firstCourse?.id ?? "",
      };
    });
  }

  function saveCourse() {
    if (!userId || !result) return;

    const validatedTitle = plainText(100).safeParse(courseTitle.trim());
    if (!validatedTitle.success || validatedTitle.data.length === 0) {
      setSaveMessage("יש להזין שם קורס תקין עד 100 תווים.");
      return;
    }

    try {
      const now = new Date().toISOString();
      const course: SavedCourse = {
        id: crypto.randomUUID(),
        userId,
        createdAt: now,
        updatedAt: now,
        title: validatedTitle.data,
        category: state.category,
        pricingInput: state,
        pricingOutput: result,
      };
      course.content = generateSyllabusFromCourse(course);
      academyStorage.saveCourse(userId, course);
      setSaveMessage("הקורס והסילבוס נשמרו במכשיר הזה.");
      window.setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Failed to save academy course", error);
      setSaveMessage(hebrewError(error, "לא ניתן לשמור את הקורס. נסי שוב."));
    }
  }

  if (!canAccess) {
    return (
      <Card role="alert" className="rounded-3xl border-border p-6 text-center">
        <GraduationCap className="mx-auto mb-3 size-8 text-primary" />
        <h1 className="font-black">המחשבון מיועד לפרופיל מדריכה</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          כדי להשתמש בכלי, יש לבחור בפרופיל מדריכה / מעבירת השתלמויות.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/clinic">חזרה להקליניקה</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <header className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-mr-3">
          <Link to="/clinic">
            <ArrowRight aria-hidden="true" />
            הקליניקה שלי
          </Link>
        </Button>
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
            <GraduationCap className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-black">האקדמיה שלי</h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              תכנני את עלויות ההדרכה וקבלי טווחי מחיר לקורס ולמשתתפת.
            </p>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <SectionCard title="סוג הקורס" icon={<BookOpen className="size-5" />}>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-bold">רמת הקורס</Label>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="רמת הקורס">
                {(
                  [
                    ["beginner", "קורס למתחילות"],
                    ["advanced", "קורס מתקדם"],
                  ] as const
                ).map(([category, label]) => (
                  <Button
                    key={category}
                    type="button"
                    variant={state.category === category ? "secondary" : "outline"}
                    aria-pressed={state.category === category}
                    onClick={() => setCategory(category)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="course-type" className="text-xs font-bold">
                תחום ההדרכה
              </Label>
              <select
                id="course-type"
                value={state.selectedCourseId}
                onChange={(event) => update("selectedCourseId", event.currentTarget.value)}
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-right text-sm"
              >
                {courseOptions.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
                <option value="custom">קורס אחר — שם חופשי</option>
              </select>
              {state.selectedCourseId === "custom" && (
                <Input
                  aria-label="שם הקורס"
                  maxLength={100}
                  value={state.customCourseName ?? ""}
                  onChange={(event) => update("customCourseName", event.currentTarget.value)}
                  placeholder="לדוגמה: השתלמות בטכניקת עבודה חדשה"
                  className="mt-2 text-right"
                />
              )}
            </div>
          </SectionCard>

          <SectionCard title="זמן ושכר הדרכה" icon={<Clock3 className="size-5" />}>
            <NumberField
              id="sessions-count"
              label="מספר מפגשים"
              value={state.sessionsCount}
              min={1}
              suffix="מפגשים"
              onChange={(value) => update("sessionsCount", value)}
              hint="אפשר להזין גם יותר מ־10 מפגשים."
            />
            <NumberField
              id="session-hours"
              label="שעות הדרכה בכל מפגש"
              value={state.hoursPerSession}
              min={0.25}
              step={0.25}
              suffix="שעות"
              onChange={(value) => update("hoursPerSession", value)}
            />
            <NumberField
              id="prep-minutes"
              label="זמן הכנה לכל מפגש"
              value={state.prepTimeMinutesPerSession}
              suffix="דקות"
              onChange={(value) => update("prepTimeMinutesPerSession", value)}
              hint="כולל הכנת חומרים, סביבת עבודה ותכנון השיעור."
            />
            <NumberField
              id="hourly-rate"
              label="שכר שעתי מבוקש"
              value={state.instructorHourlyRate}
              step={10}
              suffix="₪ לשעה"
              onChange={(value) => update("instructorHourlyRate", value)}
            />
            <div className="sm:col-span-2">
              <ToggleField
                id="remote-support"
                label="כולל תמיכה מרחוק לאחר הקורס"
                description="השעות מתווספות לשעות העבודה ולעלות שכר ההדרכה."
                checked={state.includeRemoteSupport}
                onCheckedChange={(value) => update("includeRemoteSupport", value)}
              />
            </div>
            {state.includeRemoteSupport && (
              <NumberField
                id="remote-hours"
                label="שעות תמיכה מרחוק לכל הקורס"
                value={state.remoteSupportHours}
                step={0.5}
                suffix="שעות"
                onChange={(value) => update("remoteSupportHours", value)}
              />
            )}
          </SectionCard>

          <SectionCard title="חלל ומיקום" icon={<MapPin className="size-5" />}>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-bold">איפה מתקיימת ההדרכה?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={state.venueType === "rented" ? "secondary" : "outline"}
                  aria-pressed={state.venueType === "rented"}
                  onClick={() => update("venueType", "rented")}
                >
                  חלל שכור
                </Button>
                <Button
                  type="button"
                  variant={state.venueType === "own_studio" ? "secondary" : "outline"}
                  aria-pressed={state.venueType === "own_studio"}
                  onClick={() => update("venueType", "own_studio")}
                >
                  הסטודיו שלי
                </Button>
              </div>
            </div>
            {state.venueType === "rented" ? (
              <NumberField
                id="rent-per-session"
                label="עלות השכרת החלל לכל מפגש"
                value={state.rentCostPerSession}
                step={50}
                suffix="₪"
                onChange={(value) => update("rentCostPerSession", value)}
              />
            ) : (
              <>
                <NumberField
                  id="studio-expenses"
                  label="הוצאות חודשיות של הסטודיו"
                  value={state.studioMonthlyExpenses}
                  step={100}
                  suffix="₪ לחודש"
                  onChange={(value) => update("studioMonthlyExpenses", value)}
                  hint="שכירות, חשבונות והוצאות קבועות; ההקצאה מחושבת לפי מפגש אחד לכל יום עבודה."
                />
                <NumberField
                  id="studio-workdays"
                  label="ימי עבודה בחודש"
                  value={state.studioMonthlyWorkDays}
                  min={1}
                  suffix="ימים"
                  onChange={(value) => update("studioMonthlyWorkDays", value)}
                />
              </>
            )}
            <NumberField
              id="travel-expenses"
              label="נסיעות וחניה לכל מפגש"
              value={state.venueTravelExpenses}
              step={10}
              suffix="₪"
              onChange={(value) => update("venueTravelExpenses", value)}
            />
          </SectionCard>

          <SectionCard title="עלויות ישירות לכל תלמידה" icon={<Users className="size-5" />}>
            <NumberField
              id="students-count"
              label="מספר תלמידות מתוכנן"
              value={state.studentsCount}
              min={1}
              suffix="תלמידות"
              onChange={(value) => update("studentsCount", value)}
            />
            <div className="sm:col-span-2">
              <ToggleField
                id="student-kit"
                label="הקורס כולל ערכת תלמידה"
                description="עלות הערכה תתווסף לעלות הישירה לכל משתתפת."
                checked={state.includeStudentKit}
                onCheckedChange={(value) => update("includeStudentKit", value)}
              />
            </div>
            {state.includeStudentKit && (
              <NumberField
                id="kit-cost"
                label="עלות הערכה לכל תלמידה"
                value={state.studentKitCost}
                step={10}
                suffix="₪"
                onChange={(value) => update("studentKitCost", value)}
              />
            )}
            <NumberField
              id="hospitality-cost"
              label="כיבוד לכל תלמידה, לכל יום"
              value={state.dailyHospitalityCostPerStudent}
              step={5}
              suffix="₪ ליום"
              onChange={(value) => update("dailyHospitalityCostPerStudent", value)}
            />
            <NumberField
              id="consumables-cost"
              label="מתכלים לכל תלמידה, לכל יום"
              value={state.dailyConsumablesCostPerStudent}
              step={5}
              suffix="₪ ליום"
              onChange={(value) => update("dailyConsumablesCostPerStudent", value)}
              hint="כולל חומרים מתכלים המשמשים במהלך ההדרכה."
            />
            <NumberField
              id="certificate-cost"
              label="תעודה, חוברת ומארז לכל תלמידה"
              value={state.certificateAndFolderCost}
              step={5}
              suffix="₪"
              onChange={(value) => update("certificateAndFolderCost", value)}
            />
            <NumberField
              id="equipment-wear"
              label="בלאי ציוד לכל תלמידה"
              value={state.equipmentWearAndTearPerStudent}
              step={5}
              suffix="₪"
              onChange={(value) => update("equipmentWearAndTearPerStudent", value)}
            />
          </SectionCard>

          <SectionCard title="שיווק, סליקה ומיסוי" icon={<Wallet className="size-5" />}>
            <NumberField
              id="marketing-budget"
              label="תקציב שיווק לכל הקורס"
              value={state.marketingBudget}
              step={50}
              suffix="₪"
              onChange={(value) => update("marketingBudget", value)}
            />
            <NumberField
              id="card-fee"
              label="עמלת סליקת אשראי"
              value={state.creditCardFeePercentage}
              min={0}
              max={99.9}
              step={0.1}
              suffix="%"
              onChange={(value) => update("creditCardFeePercentage", value)}
              hint="האחוז מנוכה מכל תשלום בכרטיס."
            />
            <div className="sm:col-span-2">
              <ToggleField
                id="vat-exempt"
                label="עוסק פטור"
                description={
                  state.isVatExempt
                    ? "לא מתווסף מע״מ למחיר."
                    : "המחיר כולל מע״מ בשיעור 18%, בהתאם למחשבון הקיים."
                }
                checked={state.isVatExempt}
                onCheckedChange={(value) => update("isVatExempt", value)}
              />
            </div>
            <NumberField
              id="daily-client-income"
              label="הכנסה יומית צפויה מלקוחות רגילות"
              value={state.expectedDailyClientIncome ?? 0}
              step={100}
              suffix="₪ ליום"
              onChange={(value) => {
                if (value === 0) {
                  setState((current) => {
                    const { expectedDailyClientIncome: _income, ...withoutIncome } = current;
                    return withoutIncome;
                  });
                } else {
                  update("expectedDailyClientIncome", value);
                }
              }}
              hint="להשוואת הרווח בקורס להכנסה שהייתה מתקבלת בזמן הזה."
            />
          </SectionCard>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6" aria-live="polite">
          {result && (
            <>
              <Card className="rounded-3xl border-border shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-black">
                    <Calculator className="size-5 text-primary" aria-hidden="true" />
                    תמחור הקורס
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {courseName} · {state.studentsCount} תלמידות · {state.sessionsCount} מפגשים
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {userId && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="saved-course-title" className="text-xs font-bold">
                          שם הקורס לשמירה
                        </Label>
                        <Input
                          id="saved-course-title"
                          type="text"
                          maxLength={100}
                          value={courseTitle}
                          onChange={(event) => {
                            setCourseTitle(event.currentTarget.value);
                            setSaveMessage("");
                          }}
                          className="text-right"
                        />
                      </div>
                      <Button type="button" className="w-full" onClick={saveCourse}>
                        <Save aria-hidden="true" />
                        שמירת הקורס במאגר האישי
                      </Button>
                      {saveMessage && (
                        <p role="status" className="text-xs text-muted-foreground">
                          {saveMessage}
                        </p>
                      )}
                    </>
                  )}
                  <PriceTier
                    title="מחיר איזון"
                    description="כיסוי עלויות הקורס, שכר, עמלות ומע״מ."
                    price={result.pricingTiers.basePrice}
                  />
                  <PriceTier
                    title="מחיר מומלץ"
                    description="כולל יעד לרווח של כ־50% מההכנסה לאחר מע״מ ועמלת סליקה."
                    price={result.pricingTiers.recommendedPrice}
                    featured
                  />
                  <PriceTier
                    title="מחיר בוטיק"
                    description="תמחור פרימיום, 25% מעל המחיר המומלץ."
                    price={result.pricingTiers.premiumPrice}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-black">תמונת מצב</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <ResultRow label="שעות הדרכה" value={`${result.totalTeachingHours} שעות`} />
                  <ResultRow
                    label="שעות עבודה כולל הכנה ותמיכה"
                    value={`${result.totalWorkHoursWithPrep.toFixed(1)} שעות`}
                  />
                  <ResultRow
                    label="עלות הפקת הקורס"
                    value={formatCurrency(result.totalCourseProductionCost)}
                  />
                  <ResultRow
                    label="עלות ישירה לתלמידה"
                    value={formatCurrency(result.directCostPerStudent)}
                  />
                  <ResultRow
                    label="רווח נקי משוער בקורס"
                    value={formatCurrency(result.netProfit)}
                    emphasize
                  />
                  <ResultRow
                    label="תלמידות לאיזון במחיר המומלץ"
                    value={
                      Number.isFinite(result.breakEvenStudentsCount)
                        ? `${result.breakEvenStudentsCount}`
                        : "לא ניתן להגיע לאיזון"
                    }
                  />
                  {state.expectedDailyClientIncome !== undefined &&
                    state.expectedDailyClientIncome > 0 && (
                      <div
                        className={`rounded-xl p-3 text-xs leading-relaxed ${
                          result.isBelowOpportunityCost
                            ? "bg-destructive/10 text-destructive"
                            : "bg-accent text-foreground"
                        }`}
                      >
                        {result.isBelowOpportunityCost ? (
                          <AlertTriangle className="mb-1 inline size-4" aria-hidden="true" />
                        ) : (
                          <CheckCircle2
                            className="mb-1 inline size-4 text-primary"
                            aria-hidden="true"
                          />
                        )}{" "}
                        {result.isBelowOpportunityCost
                          ? `הרווח בקורס נמוך בכ־${formatCurrency(Math.abs(result.opportunityCostDifference))} מהכנסה צפויה מלקוחות בזמן העבודה.`
                          : `הרווח בקורס גבוה בכ־${formatCurrency(result.opportunityCostDifference)} מהכנסה צפויה מלקוחות בזמן העבודה.`}
                      </div>
                    )}
                  {result.hasGroupTimeOverflow && (
                    <div className="rounded-xl bg-destructive/10 p-3 text-xs leading-relaxed text-destructive">
                      <AlertTriangle className="mb-1 inline size-4" aria-hidden="true" /> מפגש
                      ההדרכה וההכנה אורכים יותר מ־8 שעות ביום.
                    </div>
                  )}
                  <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
                    החישוב הוא אומדן לתכנון בלבד. הוא כולל מע״מ בשיעור 18% לעוסק מורשה, עמלת סליקה
                    והוצאות שהוזנו; מומלץ להתאים אותו לנתוני העסק בפועל.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-left ${emphasize ? "font-black text-primary" : "font-bold"}`}>
        {value}
      </span>
    </div>
  );
}
