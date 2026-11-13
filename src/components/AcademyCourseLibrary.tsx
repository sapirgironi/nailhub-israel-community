import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, Trash2 } from "lucide-react";
import { academyServerStorage } from "@/lib/academy-server-storage";
import { hebrewError } from "@/lib/hebrew-errors";
import type { SavedCourse } from "@/types/academy";
import { CourseLandingEditor } from "./CourseLandingEditor";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const currency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

export function AcademyCourseLibrary({ userId }: { userId: string }) {
  const [courses, setCourses] = useState<SavedCourse[]>([]);
  const [message, setMessage] = useState("");
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    academyServerStorage
      .getCourses(userId)
      .then((saved) => {
        if (active) {
          setCourses(saved);
          setMessage("");
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load academy course library", error);
        if (active) {
          setCourses([]);
          setMessage(hebrewError(error, "לא ניתן לטעון את מאגר הקורסים."));
        }
      });
    return () => {
      active = false;
    };
  }, [userId]);

  async function deleteCourse(courseId: string) {
    const course = courses.find((item) => item.id === courseId);
    if (!course || !window.confirm(`למחוק את הקורס "${course.title}" מהמאגר האישי?`)) return;

    try {
      await academyServerStorage.deleteCourse(userId, courseId);
      setCourses((current) => current.filter((item) => item.id !== courseId));
      setEditingCourseId((current) => (current === courseId ? null : current));
      setMessage("הקורס ועמוד הקורס נמחקו מהשרת.");
    } catch (error) {
      console.error("Failed to delete academy course", error);
      setMessage(hebrewError(error, "לא ניתן למחוק את הקורס. נסי שוב."));
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
          <BookOpen className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-black">מאגר הקורסים שלי</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            הקורסים נשמרים בחשבון שלך. קורסים מהמכשיר מועברים כטיוטות פרטיות; פרסום מחדש הופך את דף
            הקורס לנגיש לכל מי שיש לו קישור.
          </p>
        </div>
      </header>

      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}

      {courses.length === 0 ? (
        <Card className="rounded-3xl border-border">
          <CardContent className="space-y-3 p-6 text-center">
            <GraduationCap className="mx-auto size-8 text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              עדיין לא שמרת קורסים. אפשר ליצור קורס ולשמור אותו מתוך מחשבון התמחור.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.id} className="rounded-3xl border-border shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{course.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {course.category === "beginner" ? "קורס למתחילות" : "קורס מתקדם"} ·{" "}
                  {course.pricingInput.sessionsCount} מפגשים · {course.pricingInput.studentsCount}{" "}
                  תלמידות
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">מחיר מומלץ לתלמידה</p>
                    <p className="mt-1 font-bold text-primary">
                      {currency.format(course.pricingOutput.pricingTiers.recommendedPrice)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">נוצר בתאריך</p>
                    <p className="mt-1 font-bold">
                      {new Intl.DateTimeFormat("he-IL").format(new Date(course.createdAt))}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  aria-expanded={editingCourseId === course.id}
                  onClick={() =>
                    setEditingCourseId((current) => (current === course.id ? null : course.id))
                  }
                >
                  {editingCourseId === course.id ? "סגירת עורך המיתוג" : "עריכת מיתוג הקורס"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => deleteCourse(course.id)}
                >
                  <Trash2 aria-hidden="true" />
                  מחיקת קורס
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {editingCourseId &&
        courses.map((course) =>
          course.id === editingCourseId ? (
            <CourseLandingEditor
              key={course.id}
              course={course}
              onSave={(updatedCourse) => {
                setCourses((current) =>
                  current.map((item) => (item.id === updatedCourse.id ? updatedCourse : item)),
                );
              }}
            />
          ) : null,
        )}
    </div>
  );
}
