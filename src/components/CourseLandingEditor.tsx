import { useState } from "react";
import { ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { plainText } from "@/lib/input-security";
import { optimizeUploadImage } from "@/lib/image-optimization";
import { academyStorage } from "@/lib/academy-storage";
import { hebrewError } from "@/lib/hebrew-errors";
import type { CourseBranding, FaqItem, SavedCourse } from "@/types/academy";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const PRESET_PALETTES = [
  { name: "רוז גולד וניוד", primary: "#e11d48", secondary: "#fff1f2" },
  { name: "סגול לילך יוקרתי", primary: "#9333ea", secondary: "#faf5ff" },
  { name: "שחור ושיש אלגנטי", primary: "#18181b", secondary: "#f4f4f5" },
  { name: "ירוק מרווה עדין", primary: "#059669", secondary: "#ecfdf5" },
];

const DEFAULT_BRANDING: CourseBranding = {
  primaryColor: "#e11d48",
  secondaryColor: "#fff1f2",
  fontStyle: "modern",
  badgeText: "✨ יחס אישי - עד 4 משתתפות במחזור",
  galleryImages: [],
  faqs: [
    {
      id: "faq-experience",
      question: "האם צריך ניסיון קודם כדי להירשם לקורס?",
      answer: "לא, הקורס נבנה כדי ללמד את יסודות העבודה מהבסיס.",
    },
    {
      id: "faq-support",
      question: "האם מקבלים ליווי לאחר סיום ההכשרה?",
      answer: "פרטי הליווי לאחר הקורס יימסרו על ידי המדריכה.",
    },
  ],
};

function isValidColor(value: string) {
  return /^#[\da-f]{6}$/i.test(value);
}

function normalizeVideoUrl(value: string) {
  if (!value.trim()) return "";

  try {
    const url = new URL(value.trim());
    const allowedHosts = new Set([
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be",
      "vimeo.com",
      "www.vimeo.com",
      "player.vimeo.com",
    ]);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      !allowedHosts.has(url.hostname.toLowerCase())
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function validateFaqs(faqs: FaqItem[]) {
  return faqs.every(
    (faq) =>
      faq.id.length > 0 &&
      plainText(180).safeParse(faq.question).success &&
      faq.question.trim().length > 0 &&
      plainText(1000).safeParse(faq.answer).success &&
      faq.answer.trim().length > 0,
  );
}

export function CourseLandingEditor({
  course,
  onSave,
}: {
  course: SavedCourse;
  onSave?: (updatedCourse: SavedCourse) => void;
}) {
  const [branding, setBranding] = useState<CourseBranding>(() => ({
    ...DEFAULT_BRANDING,
    ...course.branding,
    galleryImages: [...(course.branding?.galleryImages ?? [])],
    faqs: [...(course.branding?.faqs ?? DEFAULT_BRANDING.faqs)],
  }));
  const [videoInput, setVideoInput] = useState(course.branding?.videoUrl ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function updateFaq(id: string, field: "question" | "answer", value: string) {
    setBranding((current) => ({
      ...current,
      faqs: current.faqs.map((faq) => (faq.id === id ? { ...faq, [field]: value } : faq)),
    }));
  }

  async function uploadImage(file: File, kind: "cover" | "gallery") {
    setBusy(true);
    setMessage("");
    try {
      if (kind === "gallery" && branding.galleryImages.length >= 12) {
        throw new Error("אפשר לשמור עד 12 תמונות בגלריה.");
      }
      const optimized = await optimizeUploadImage(file);
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error("קריאת התמונה נכשלה"));
        reader.onerror = () => reject(new Error("קריאת התמונה נכשלה"));
        reader.readAsDataURL(optimized);
      });
      setBranding((current) =>
        kind === "cover"
          ? { ...current, coverImageUrl: imageUrl }
          : { ...current, galleryImages: [...current.galleryImages, imageUrl] },
      );
    } catch (error) {
      console.error(`Failed to upload academy ${kind} image`, error);
      setMessage(hebrewError(error, "העלאת התמונה נכשלה. נסי שוב."));
    } finally {
      setBusy(false);
    }
  }

  function saveBranding() {
    if (!isValidColor(branding.primaryColor) || !isValidColor(branding.secondaryColor)) {
      setMessage("יש לבחור צבעי מותג תקינים.");
      return;
    }
    if (!plainText(120).safeParse(branding.badgeText).success) {
      setMessage("הטקסט למדבקה חייב להיות טקסט רגיל באורך של עד 120 תווים.");
      return;
    }
    if (!validateFaqs(branding.faqs)) {
      setMessage("יש למלא שאלה ותשובה תקינות לכל שאלה נפוצה.");
      return;
    }

    const videoUrl = normalizeVideoUrl(videoInput);
    if (videoInput.trim() && !videoUrl) {
      setMessage("קישור הסרטון חייב להיות כתובת HTTPS תקינה מ-YouTube או Vimeo.");
      return;
    }

    const { videoUrl: _previousVideoUrl, ...brandingWithoutVideo } = branding;
    const updatedBranding: CourseBranding = {
      ...brandingWithoutVideo,
      badgeText: branding.badgeText.trim(),
      ...(videoUrl ? { videoUrl } : {}),
    };

    try {
      const updatedCourse: SavedCourse = { ...course, branding: updatedBranding };
      academyStorage.saveCourse(course.userId, updatedCourse);
      setBranding(updatedBranding);
      setVideoInput(updatedBranding.videoUrl ?? "");
      setMessage("המיתוג נשמר בהצלחה.");
      onSave?.(updatedCourse);
    } catch (error) {
      console.error("Failed to save academy course branding", error);
      setMessage(hebrewError(error, "שמירת המיתוג נכשלה. נסי שוב."));
    }
  }

  return (
    <Card className="mx-auto max-w-3xl rounded-3xl border-border shadow-soft" dir="rtl">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border">
        <div>
          <CardTitle>עיצוב ומיתוג דף הקורס</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            התאימי את הצבעים, התמונות והמידע שמוצג על הקורס.
          </p>
        </div>
        <Button type="button" onClick={saveBranding} disabled={busy}>
          <Save aria-hidden="true" />
          שמירת שינויים
        </Button>
      </CardHeader>
      <CardContent className="space-y-7 pt-6">
        {message && (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        )}

        <section className="space-y-3">
          <h3 className="text-sm font-bold">צבעי מותג</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PRESET_PALETTES.map((palette) => (
              <Button
                key={palette.name}
                type="button"
                variant="outline"
                aria-pressed={branding.primaryColor === palette.primary}
                onClick={() =>
                  setBranding((current) => ({
                    ...current,
                    primaryColor: palette.primary,
                    secondaryColor: palette.secondary,
                  }))
                }
                className="justify-start"
              >
                <span
                  className="size-5 rounded-full border border-border"
                  style={{ backgroundColor: palette.primary }}
                />
                {palette.name}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 text-sm">
              צבע ראשי
              <Input
                type="color"
                value={isValidColor(branding.primaryColor) ? branding.primaryColor : "#e11d48"}
                onChange={(event) =>
                  setBranding((current) => ({
                    ...current,
                    primaryColor: event.currentTarget.value,
                  }))
                }
                className="h-10 w-16 p-1"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              צבע רקע משני
              <Input
                type="color"
                value={isValidColor(branding.secondaryColor) ? branding.secondaryColor : "#fff1f2"}
                onChange={(event) =>
                  setBranding((current) => ({
                    ...current,
                    secondaryColor: event.currentTarget.value,
                  }))
                }
                className="h-10 w-16 p-1"
              />
            </label>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="branding-font-style">סגנון עיצוב</Label>
            <select
              id="branding-font-style"
              value={branding.fontStyle}
              onChange={(event) =>
                setBranding((current) => ({
                  ...current,
                  fontStyle: event.currentTarget.value as CourseBranding["fontStyle"],
                }))
              }
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-right text-sm"
            >
              <option value="modern">מודרני</option>
              <option value="luxury">יוקרתי</option>
              <option value="bold">בולט</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="branding-badge">מדבקה בולטת</Label>
            <Input
              id="branding-badge"
              value={branding.badgeText}
              maxLength={120}
              onChange={(event) =>
                setBranding((current) => ({ ...current, badgeText: event.currentTarget.value }))
              }
              placeholder="לדוגמה: יחס אישי - עד 4 משתתפות"
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold">תמונת קאבר</h3>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void uploadImage(file, "cover");
              }}
            />
            <span className="inline-flex h-10 items-center gap-2 rounded-md border border-input px-4 text-sm font-medium hover:bg-accent">
              <ImagePlus aria-hidden="true" className="size-4" />
              {busy ? "מעבדת תמונה..." : "בחירת תמונת קאבר"}
            </span>
          </label>
          {branding.coverImageUrl && (
            <div className="space-y-2">
              {branding.coverImageUrl.startsWith("data:image/") && (
                <img
                  src={branding.coverImageUrl}
                  alt="תצוגה מקדימה של תמונת הקאבר"
                  className="max-h-64 w-full rounded-2xl object-cover"
                />
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setBranding((current) => {
                    const { coverImageUrl: _coverImageUrl, ...rest } = current;
                    return rest;
                  })
                }
              >
                <Trash2 aria-hidden="true" />
                הסרת תמונת קאבר
              </Button>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <Label htmlFor="branding-video">קישור לסרטון YouTube או Vimeo</Label>
          <Input
            id="branding-video"
            type="url"
            inputMode="url"
            maxLength={500}
            value={videoInput}
            onChange={(event) => setVideoInput(event.currentTarget.value)}
            placeholder="https://youtu.be/..."
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground">
            יוצג קישור מאובטח בלבד; כתובות מאתרים אחרים לא יישמרו.
          </p>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-bold">גלריית עבודות ותוצאות</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              התמונות מכווצות ונשמרות מקומית יחד עם הקורס. הקישור לקורס זמין רק במכשיר הזה.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void uploadImage(file, "gallery");
              }}
            />
            <span className="inline-flex h-10 items-center gap-2 rounded-md border border-input px-4 text-sm font-medium hover:bg-accent">
              <ImagePlus aria-hidden="true" className="size-4" />
              הוספת תמונה לגלריה
            </span>
          </label>
          {branding.galleryImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {branding.galleryImages.map((image, index) => (
                <div key={`${image}-${index}`} className="space-y-2">
                  {image.startsWith("data:image/") ? (
                    <img
                      src={image}
                      alt={`עבודת גלריה ${index + 1}`}
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid aspect-square place-items-center rounded-xl bg-muted text-xs text-muted-foreground">
                      התמונה הישנה לא זמינה מקומית
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() =>
                      setBranding((current) => ({
                        ...current,
                        galleryImages: current.galleryImages.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      }))
                    }
                  >
                    <Trash2 aria-hidden="true" />
                    הסרה
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">שאלות נפוצות</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                הוסיפי תשובות לשאלות שתלמידות שואלות לפני ההרשמה.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setBranding((current) => ({
                  ...current,
                  faqs: [...current.faqs, { id: crypto.randomUUID(), question: "", answer: "" }],
                }))
              }
            >
              <Plus aria-hidden="true" />
              הוספת שאלה
            </Button>
          </div>
          {branding.faqs.map((faq, index) => (
            <Card key={faq.id} className="rounded-2xl border-border">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold">שאלה {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`מחיקת שאלה ${index + 1}`}
                    onClick={() =>
                      setBranding((current) => ({
                        ...current,
                        faqs: current.faqs.filter((item) => item.id !== faq.id),
                      }))
                    }
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`faq-question-${faq.id}`}>שאלה</Label>
                  <Input
                    id={`faq-question-${faq.id}`}
                    value={faq.question}
                    maxLength={180}
                    onChange={(event) => updateFaq(faq.id, "question", event.currentTarget.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`faq-answer-${faq.id}`}>תשובה</Label>
                  <Textarea
                    id={`faq-answer-${faq.id}`}
                    value={faq.answer}
                    maxLength={1000}
                    onChange={(event) => updateFaq(faq.id, "answer", event.currentTarget.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section
          className="space-y-3 rounded-2xl border border-border p-4"
          style={{ backgroundColor: branding.secondaryColor }}
        >
          <p className="text-xs font-bold text-muted-foreground">תצוגה מקדימה</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-black" style={{ color: branding.primaryColor }}>
              {course.title}
            </h3>
            {branding.badgeText && (
              <span
                className="rounded-full px-3 py-1 text-xs font-bold text-white"
                style={{ backgroundColor: branding.primaryColor }}
              >
                {branding.badgeText}
              </span>
            )}
          </div>
          <footer className="mt-8 border-t border-border pt-5 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-2 text-xs font-semibold text-primary shadow-sm">
              <span aria-hidden="true">✨</span>
              <span>עמוד זה נוצר ומופעל באמצעות מערכת NailHub Academy</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              הפלטפורמה המקצועית לניהול, תמחור והדרכות למקצועיות הציפורניים
            </p>
          </footer>
        </section>

        <div className="flex justify-start border-t border-border pt-5">
          <Button type="button" onClick={saveBranding} disabled={busy}>
            <Save aria-hidden="true" />
            שמירת שינויים
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
