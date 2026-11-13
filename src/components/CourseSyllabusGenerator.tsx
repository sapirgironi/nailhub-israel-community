import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, EyeOff, MessageCircle, Printer, Upload } from "lucide-react";
import { academyServerStorage } from "@/lib/academy-server-storage";
import { generateSyllabusFromCourse } from "@/lib/academy-syllabus";
import { hebrewError } from "@/lib/hebrew-errors";
import type {
  AcademyLandingProfile,
  CourseBranding,
  GeneratedCourseContent,
  SavedCourse,
} from "@/types/academy";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface InstructorProfile {
  businessName: string;
  fullName: string;
  phone: string;
  city: string;
  logoUrl?: string | undefined;
}

export function CourseSyllabusGenerator({
  userId,
  instructorProfile,
}: {
  userId: string;
  instructorProfile: InstructorProfile;
}) {
  const [courses, setCourses] = useState<SavedCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [content, setContent] = useState<GeneratedCourseContent | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"student" | "instructor">("student");
  const [siteOrigin, setSiteOrigin] = useState("");

  const selectedCourse = courses.find((course) => course.id === selectedCourseId);

  useEffect(() => {
    setSiteOrigin(window.location.origin);
  }, []);

  async function publishSelectedCourse() {
    if (!selectedCourse || !content || saving) return;
    if (
      !window.confirm("לפרסם את דף הקורס? כל מי שיש לו קישור יוכל לצפות בו. מספר הטלפון לא יוצג.")
    )
      return;
    setMessage("");

    try {
      setSaving(true);
      const branding: CourseBranding = {
        primaryColor: "#e11d48",
        secondaryColor: "#fff1f2",
        fontStyle: "modern",
        badgeText: "",
        galleryImages: [],
        faqs: [],
        ...selectedCourse.branding,
      };
      const landingProfile: AcademyLandingProfile = {
        businessName: instructorProfile.businessName,
        instructorName: instructorProfile.fullName,
        city: instructorProfile.city,
        phone: instructorProfile.phone,
        ...(instructorProfile.logoUrl?.startsWith("data:image/")
          ? { logoUrl: instructorProfile.logoUrl }
          : {}),
      };
      const updatedCourse: SavedCourse = {
        ...selectedCourse,
        isPublished: true,
        publicId: selectedCourse.id,
        landingProfile,
        branding,
        content,
      };
      const savedCourse = await academyServerStorage.saveCourse(userId, updatedCourse);
      setCourses((current) =>
        current.map((course) => (course.id === savedCourse.id ? savedCourse : course)),
      );
      setMessage("דף הקורס פורסם. אפשר לשתף את הקישור.");
    } catch (error) {
      console.error("Failed to save local academy publication", error);
      setMessage(hebrewError(error, "פרסום דף הקורס נכשל. נסי שוב."));
    } finally {
      setSaving(false);
    }
  }

  async function unpublishSelectedCourse() {
    if (!selectedCourse?.isPublished || saving) return;
    if (!window.confirm("להסיר את דף הקורס מהפרסום? הקישור לא יהיה זמין יותר לציבור.")) return;

    setMessage("");
    try {
      setSaving(true);
      const updatedCourse = { ...selectedCourse };
      delete updatedCourse.isPublished;
      delete updatedCourse.landingProfile;
      delete updatedCourse.publicId;
      const savedCourse = await academyServerStorage.saveCourse(userId, updatedCourse);
      setCourses((current) =>
        current.map((course) => (course.id === savedCourse.id ? savedCourse : course)),
      );
      setMessage("דף הקורס הוסר מהפרסום.");
    } catch (error) {
      console.error("Failed to remove local academy publication", error);
      setMessage(hebrewError(error, "הסרת דף הקורס מהפרסום נכשלה. נסי שוב."));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let active = true;
    academyServerStorage
      .getCourses(userId)
      .then((savedCourses) => {
        if (!active) return;
        setCourses(savedCourses);
        const firstCourse = savedCourses[0];
        setSelectedCourseId(firstCourse?.id ?? "");
        setContent(
          firstCourse ? (firstCourse.content ?? generateSyllabusFromCourse(firstCourse)) : null,
        );
        setMessage("");
      })
      .catch((error: unknown) => {
        console.error("Failed to load academy courses", error);
        if (!active) return;
        setCourses([]);
        setSelectedCourseId("");
        setContent(null);
        setMessage(hebrewError(error, "לא ניתן לטעון את הקורסים השמורים."));
      });
    return () => {
      active = false;
    };
  }, [userId]);

  function handleSelectCourse(courseId: string) {
    const course = courses.find((item) => item.id === courseId);
    if (!course) return;

    try {
      setSelectedCourseId(courseId);
      setContent(course.content ?? generateSyllabusFromCourse(course));
      setMessage("");
    } catch (error) {
      console.error("Failed to generate academy syllabus", error);
      setContent(null);
      setMessage(hebrewError(error, "לא ניתן ליצור סילבוס לקורס הזה."));
    }
  }

  if (!content) {
    return (
      <div dir="rtl" className="space-y-4">
        <Card className="rounded-3xl border-border">
          <CardContent className="space-y-3 p-6 text-center">
            <BookOpen className="mx-auto size-8 text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {courses.length === 0
                ? "אין קורסים שמורים במאגר. שמרי קורס דרך מחשבון התמחור כדי ליצור עבורו סילבוס."
                : "לא ניתן להציג את הסילבוס כרגע."}
            </p>
            {message && (
              <p role="alert" className="text-sm text-destructive">
                {message}
              </p>
            )}
          </CardContent>
        </Card>
        {courses.length > 0 && (
          <label className="block space-y-2 text-sm font-bold">
            בחירת קורס
            <select
              value={selectedCourseId}
              onChange={(event) => handleSelectCourse(event.currentTarget.value)}
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-right text-sm font-normal"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    );
  }

  const landingUrl =
    selectedCourse?.isPublished && siteOrigin
      ? `${siteOrigin}/c/${encodeURIComponent(selectedCourse.id)}`
      : "";
  const whatsappMessage = [
    `✨ *הזמנה להכשרה מקצועית | ${instructorProfile.businessName}*`,
    "",
    `היי! מוזמנת לצפות בפרטים על *${selectedCourse?.title ?? "הקורס המקצועי"}*.`,
    "",
    "👇 תוכנית המפגשים, הערכה וכל פרטי הקורס:",
    landingUrl,
    "",
    "_הופק באמצעות פלטפורמת NailHub_",
  ].join("\n");
  const whatsappShareUrl = landingUrl
    ? `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`
    : "";

  return (
    <div dir="rtl" className="space-y-6">
      <style>{`
        @page { margin: 16mm; }
        @media print {
          body * { visibility: hidden !important; }
          #printable-syllabus, #printable-syllabus * { visibility: visible !important; }
          #printable-syllabus {
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            color: #111827 !important;
            box-shadow: none !important;
            border: 0 !important;
          }
          .no-print { display: none !important; }
          #printable-syllabus article,
          #printable-syllabus section { break-inside: avoid; page-break-inside: avoid; }
          #printable-syllabus .print-page-break { break-before: page; page-break-before: always; }
        }
      `}</style>
      <header className="no-print flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
            <BookOpen className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-black">מחולל סילבוסים ומערכי שיעור</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              הסילבוס נוצר מתוך נתוני הקורס השמור שלך.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="syllabus-course">
            בחירת קורס
          </label>
          <select
            id="syllabus-course"
            value={selectedCourseId}
            onChange={(event) => handleSelectCourse(event.currentTarget.value)}
            className="h-10 min-w-44 rounded-md border border-input bg-card px-3 text-right text-sm"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <Button
            type="button"
            onClick={publishSelectedCourse}
            disabled={!selectedCourse || saving}
          >
            <Upload aria-hidden="true" />
            {selectedCourse?.isPublished ? "עדכון דף הקורס" : "פרסום דף הקורס"}
          </Button>
          {selectedCourse?.isPublished && siteOrigin && (
            <>
              <Button asChild variant="outline">
                <a href={landingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" />
                  פתיחת הדף
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden="true" />
                  שתפי בוואטסאפ
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={unpublishSelectedCourse}
                disabled={saving}
              >
                <EyeOff aria-hidden="true" />
                הסרת פרסום
              </Button>
            </>
          )}
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            הדפסה / PDF
          </Button>
        </div>
      </header>

      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <p className="no-print text-xs text-muted-foreground">
        לאחר הפרסום הדף זמין לכל מי שיש לו קישור. יוצגו בו פרטי הסילבוס לתלמידה והמיתוג; חישובי
        המחיר, מספר הטלפון ומערך ההדרכה נשארים פרטיים.
      </p>

      <div
        className="no-print flex gap-2 border-b border-border"
        role="tablist"
        aria-label="תצוגת הסילבוס"
      >
        <Button
          id="student-syllabus-tab"
          type="button"
          variant="ghost"
          role="tab"
          aria-selected={activeTab === "student"}
          aria-controls="student-syllabus-panel"
          onClick={() => setActiveTab("student")}
          className={`rounded-none border-b-2 ${
            activeTab === "student"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          }`}
        >
          סילבוס לתלמידה
        </Button>
        <Button
          id="instructor-syllabus-tab"
          type="button"
          variant="ghost"
          role="tab"
          aria-selected={activeTab === "instructor"}
          aria-controls="instructor-syllabus-panel"
          onClick={() => setActiveTab("instructor")}
          className={`rounded-none border-b-2 ${
            activeTab === "instructor"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          }`}
        >
          מערך שיעור למדריכה
        </Button>
      </div>

      <div id="printable-syllabus" className="space-y-6 bg-white text-gray-900">
        <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">
              {instructorProfile.businessName || "האקדמיה שלי"}
            </h2>
            <p className="font-medium text-primary">
              בהדרכת: {instructorProfile.fullName || "המדריכה"}
            </p>
            <p className="text-xs text-muted-foreground">
              {[instructorProfile.phone, instructorProfile.city].filter(Boolean).join(" | ")}
            </p>
            <h3 className="pt-3 text-lg font-bold">
              {courses.find((course) => course.id === selectedCourseId)?.title || "סילבוס קורס"}
            </h3>
          </div>
          {instructorProfile.logoUrl?.startsWith("data:image/") ? (
            <img
              src={instructorProfile.logoUrl}
              alt={`לוגו או תמונת פרופיל של ${instructorProfile.businessName}`}
              className="size-16 rounded-lg object-contain"
            />
          ) : (
            <BookOpen className="size-10 shrink-0 text-primary" aria-hidden="true" />
          )}
        </header>

        {activeTab === "student" ? (
          <div
            id="student-syllabus-panel"
            role="tabpanel"
            aria-labelledby="student-syllabus-tab"
            className="space-y-6"
          >
            <Card className="rounded-3xl border-border shadow-soft">
              <CardHeader>
                <CardTitle>אודות הקורס</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {content.syllabusOverview}
                </p>
                <div className="grid gap-3 rounded-2xl bg-muted/50 p-4 text-sm sm:grid-cols-2">
                  <p>
                    <strong>קהל יעד:</strong> {content.targetAudience}
                  </p>
                  <p>
                    <strong>ידע מקדים:</strong> {content.prerequisites}
                  </p>
                </div>
                <section className="space-y-3">
                  <h2 className="font-bold">תוכנית המפגשים</h2>
                  {content.sessionsForStudent.map((session) => (
                    <article
                      key={session.sessionNumber}
                      className="rounded-2xl border border-border p-4"
                    >
                      <h3 className="font-bold text-primary">
                        מפגש {session.sessionNumber}: {session.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">{session.summary}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        <strong>דגש מעשי:</strong> {session.practicalFocus}
                      </p>
                    </article>
                  ))}
                </section>
                <section>
                  <h2 className="mb-2 font-bold">תכולת ערכת העבודה</h2>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {content.studentKitIncluded.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <div className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
                  <p>
                    <strong>תנאי תעודה:</strong> {content.certificationTerms}
                  </p>
                  <p>
                    <strong>מדיניות ביטולים:</strong> {content.cancellationPolicy}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div
            id="instructor-syllabus-panel"
            role="tabpanel"
            aria-labelledby="instructor-syllabus-tab"
            className="space-y-5"
          >
            {content.instructorLessons.map((lesson) => (
              <Card
                key={lesson.sessionNumber}
                className={`print-session rounded-3xl border-border shadow-soft ${
                  lesson.sessionNumber > 1 ? "print-page-break" : ""
                }`}
              >
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-lg">
                    מפגש {lesson.sessionNumber} - {lesson.topic}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  <section>
                    <h3 className="text-xs font-bold text-muted-foreground">יעד לימודי למפגש</h3>
                    <p className="mt-1 text-sm">{lesson.learningGoal}</p>
                  </section>
                  <section>
                    <h3 className="mb-3 text-xs font-bold text-muted-foreground">
                      לוח זמנים מפורט
                    </h3>
                    <div className="space-y-3">
                      {lesson.timeline.map((segment) => (
                        <div
                          key={`${segment.timeRange}-${segment.type}`}
                          className="flex items-start gap-4 border-r-2 border-primary pr-3"
                        >
                          <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                            {segment.timeRange}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold">{segment.title}</h4>
                            <p className="text-xs text-muted-foreground">{segment.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h3 className="mb-2 text-xs font-bold text-muted-foreground">ציוד נדרש</h3>
                    <ul className="list-inside list-disc text-sm">
                      {lesson.requiredEquipment.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                    <h3 className="font-bold">טעויות נפוצות שכדאי לשים לב אליהן</h3>
                    <ul className="mt-2 list-inside list-disc">
                      {lesson.instructorCommonMistakesToWatch.map((mistake) => (
                        <li key={mistake}>{mistake}</li>
                      ))}
                    </ul>
                  </section>
                  <p className="text-sm text-muted-foreground">
                    <strong>משימת בית:</strong> {lesson.homework}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <footer className="flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>
            <strong className="text-primary">NailHub Academy</strong>
            {" · "}מערכת ניהול, תמחור והדרכות למקצועיות הציפורניים
          </span>
          <span>מסמך זה הופק באמצעות NailHub</span>
        </footer>
      </div>
    </div>
  );
}
