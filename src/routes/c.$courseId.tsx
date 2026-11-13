import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, GraduationCap, MessageCircle, Phone } from "lucide-react";
import { z } from "zod";
import { academyServerStorage } from "@/lib/academy-server-storage";
import { normalizeAcademyVideoUrl } from "@/lib/academy-media";
import { whatsappLink } from "@/lib/input-security";

const publicCourseSchema = z.object({
  id: z.string().uuid(),
  isPublished: z.literal(true),
  title: z.string(),
  category: z.enum(["beginner", "advanced"]),
  content: z.object({
    syllabusOverview: z.string(),
    targetAudience: z.string(),
    prerequisites: z.string(),
    studentKitIncluded: z.array(z.string()),
    sessionsForStudent: z.array(
      z.object({
        sessionNumber: z.number(),
        title: z.string(),
        summary: z.string(),
        practicalFocus: z.string(),
      }),
    ),
    certificationTerms: z.string(),
    cancellationPolicy: z.string(),
  }),
  branding: z.object({
    primaryColor: z.string().regex(/^#[\da-f]{6}$/i),
    secondaryColor: z.string().regex(/^#[\da-f]{6}$/i),
    fontStyle: z.enum(["modern", "luxury", "bold"]),
    badgeText: z.string(),
    coverImageUrl: z.string().optional(),
    galleryImages: z.array(z.string()),
    videoUrl: z
      .string()
      .refine((value) => normalizeAcademyVideoUrl(value) !== null)
      .optional(),
    faqs: z.array(
      z.object({
        id: z.string(),
        question: z.string(),
        answer: z.string(),
      }),
    ),
  }),
  landingProfile: z.object({
    businessName: z.string(),
    instructorName: z.string(),
    city: z.string(),
    phone: z.string(),
    logoUrl: z.string().optional(),
  }),
});

type PublicCourse = z.infer<typeof publicCourseSchema>;

export const Route = createFileRoute("/c/$courseId")({
  head: () => ({
    meta: [
      { title: "קורס מקצועי — NailHub Academy" },
      { name: "description", content: "פרטי קורס והכשרה מקצועית ב-NailHub Academy." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PublicCourseLanding,
});

function PublicCourseLanding() {
  const { courseId } = Route.useParams();
  const [course, setCourse] = useState<PublicCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    setCourse(null);
    if (!z.string().uuid().safeParse(courseId).success) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    academyServerStorage
      .getPublishedCourseById(courseId)
      .then((savedCourse) => {
        if (active) setCourse(savedCourse ? publicCourseSchema.parse(savedCourse) : null);
      })
      .catch((error: unknown) => {
        console.error("Failed to load published academy course", error);
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  if (loading) {
    return (
      <p role="status" className="p-8 text-center">
        טוענת את פרטי הקורס...
      </p>
    );
  }
  if (loadError) {
    return (
      <main dir="rtl" className="mx-auto max-w-2xl p-8 text-center">
        לא ניתן לטעון את פרטי הקורס כרגע. נסי שוב מאוחר יותר.
      </main>
    );
  }
  if (!course) {
    return (
      <main dir="rtl" className="mx-auto max-w-2xl p-8 text-center">
        הקורס לא נמצא או שאינו מפורסם.
      </main>
    );
  }

  return <CoursePage course={course} />;
}

function LocalCourseImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  if (!src.startsWith("data:image/")) return null;
  return <img src={src} alt={alt} className={className} />;
}

function CoursePage({ course }: { course: PublicCourse }) {
  const { branding, content, landingProfile } = course;
  const contactWhatsApp = whatsappLink(landingProfile.phone);
  const phoneDigits = contactWhatsApp ? new URL(contactWhatsApp).pathname.slice(1) : "";

  return (
    <main dir="rtl" className="min-h-screen bg-background px-4 py-8 text-right sm:px-6">
      <article
        className={`mx-auto max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-soft ${
          branding.fontStyle === "luxury"
            ? "font-serif"
            : branding.fontStyle === "bold"
              ? "font-sans font-bold"
              : "font-sans"
        }`}
      >
        {branding.coverImageUrl && (
          <LocalCourseImage
            src={branding.coverImageUrl}
            alt={`תמונת הקורס ${course.title}`}
            className="max-h-[28rem] w-full object-cover"
          />
        )}
        <div className="space-y-8 p-5 sm:p-9">
          <header className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <GraduationCap aria-hidden="true" />
              NailHub Academy
            </div>
            {branding.badgeText && (
              <span
                className="inline-flex rounded-full px-3 py-1 text-sm font-semibold"
                style={{ backgroundColor: branding.secondaryColor, color: branding.primaryColor }}
              >
                {branding.badgeText}
              </span>
            )}
            <h1 className="text-3xl font-black sm:text-4xl">{course.title}</h1>
            <p className="text-lg font-semibold" style={{ color: branding.primaryColor }}>
              {landingProfile.businessName}
            </p>
            <div className="flex items-center gap-3">
              {landingProfile.logoUrl?.startsWith("data:image/") && (
                <LocalCourseImage
                  src={landingProfile.logoUrl}
                  alt={`לוגו ${landingProfile.businessName}`}
                  className="size-14 rounded-lg object-contain"
                />
              )}
              <p className="text-sm text-muted-foreground">
                בהדרכת {landingProfile.instructorName}
                {landingProfile.city ? ` · ${landingProfile.city}` : ""}
                {" · "}
                {course.category === "beginner" ? "קורס למתחילות" : "קורס מתקדם"}
              </p>
            </div>
          </header>

          <section className="space-y-2">
            <h2 className="text-xl font-bold">על הקורס</h2>
            <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {content.syllabusOverview}
            </p>
            <div
              className="grid gap-3 rounded-2xl p-4 text-sm sm:grid-cols-2"
              style={{ backgroundColor: branding.secondaryColor }}
            >
              <p>
                <strong>למי הקורס מתאים:</strong> {content.targetAudience}
              </p>
              <p>
                <strong>ידע מקדים:</strong> {content.prerequisites}
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold">תוכנית המפגשים</h2>
            {content.sessionsForStudent.map((session) => (
              <article key={session.sessionNumber} className="rounded-2xl border border-border p-4">
                <h3 className="font-bold" style={{ color: branding.primaryColor }}>
                  מפגש {session.sessionNumber}: {session.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{session.summary}</p>
                <p className="mt-2 text-sm">
                  <strong>דגש מעשי:</strong> {session.practicalFocus}
                </p>
              </article>
            ))}
          </section>

          {content.studentKitIncluded.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xl font-bold">ערכת העבודה</h2>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                {content.studentKitIncluded.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {branding.galleryImages.some((image) => image.startsWith("data:image/")) && (
            <section className="space-y-3">
              <h2 className="text-xl font-bold">עבודות ותוצאות</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {branding.galleryImages.map((url, index) => (
                  <LocalCourseImage
                    key={`${url}-${index}`}
                    src={url}
                    alt={`עבודה לדוגמה ${index + 1}`}
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            </section>
          )}

          {branding.videoUrl && (
            <p>
              <a
                href={branding.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-4"
                style={{ color: branding.primaryColor }}
              >
                לצפייה בסרטון הקורס
              </a>
            </p>
          )}

          {branding.faqs.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-bold">שאלות נפוצות</h2>
              {branding.faqs.map((faq) => (
                <details key={faq.id} className="rounded-xl border border-border p-4">
                  <summary className="cursor-pointer font-bold">{faq.question}</summary>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </section>
          )}

          <section className="grid gap-3 border-t border-border pt-5 text-sm sm:grid-cols-2">
            <p>
              <strong>תנאי קבלת תעודה:</strong> {content.certificationTerms}
            </p>
            <p>
              <strong>מדיניות ביטולים:</strong> {content.cancellationPolicy}
            </p>
          </section>

          {contactWhatsApp && (
            <section className="flex flex-wrap gap-3 border-t border-border pt-5">
              <a
                href={contactWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white"
                style={{ backgroundColor: branding.primaryColor }}
              >
                <MessageCircle aria-hidden="true" />
                לפרטים והרשמה בוואטסאפ
              </a>
              <a
                href={`tel:+${phoneDigits}`}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-input px-4 text-sm font-semibold"
              >
                <Phone aria-hidden="true" />
                התקשרות למדריכה
              </a>
            </section>
          )}

          <footer className="border-t border-border pt-5 text-center text-xs text-muted-foreground">
            <BookOpen className="mx-auto mb-2 size-5 text-primary" aria-hidden="true" />
            <strong className="text-primary">NailHub Academy</strong>
            {" · "}עמוד זה נוצר ומופעל באמצעות מערכת NailHub
          </footer>
        </div>
      </article>
    </main>
  );
}
