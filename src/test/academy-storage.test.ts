import { beforeEach, describe, expect, it } from "vitest";
import { academyStorage } from "@/lib/academy-storage";
import { generateSyllabusFromCourse } from "@/lib/academy-syllabus";
import { calculateCoursePricing, DEFAULT_CALCULATOR_STATE } from "@/lib/course-pricing";
import type { SavedCourse } from "@/types/academy";

function createCourse(overrides: Partial<SavedCourse> = {}): SavedCourse {
  const pricingInput = { ...DEFAULT_CALCULATOR_STATE };
  const course: SavedCourse = {
    id: "9ba7b810-9dad-41f0-8b2a-0b2f6d5f5e54",
    userId: "user-1",
    createdAt: "2026-11-03T00:00:00.000Z",
    updatedAt: "2026-11-03T00:00:00.000Z",
    title: "קורס בדיקה",
    category: "beginner",
    pricingInput,
    pricingOutput: calculateCoursePricing(pricingInput),
  };
  course.content = generateSyllabusFromCourse(course);
  return { ...course, ...overrides };
}

describe("academy storage synchronization", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("finds a locally published course by its course ID without duplicating its data", () => {
    const course = createCourse({
      isPublished: true,
      landingProfile: {
        businessName: "סטודיו בדיקה",
        instructorName: "מדריכה",
        city: "חיפה",
        phone: "0521234567",
      },
    });

    academyStorage.saveCourse(course.userId, course);

    expect(academyStorage.getPublishedCourseById(course.id)).toMatchObject({
      id: course.id,
      isPublished: true,
      landingProfile: course.landingProfile,
      content: course.content,
    });
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem("nailhub_instructor_courses_user-1")).toContain("pricingOutput");
  });

  it("does not return unpublished courses from the landing-page lookup", () => {
    const course = createCourse();
    academyStorage.saveCourse(course.userId, course);

    expect(academyStorage.getPublishedCourseById(course.id)).toBeUndefined();
  });

  it("removes a course and its landing page from the same local storage source", () => {
    const course = createCourse({ isPublished: true });
    academyStorage.saveCourse(course.userId, course);

    academyStorage.deleteCourse(course.userId, course.id);

    expect(academyStorage.getPublishedCourseById(course.id)).toBeUndefined();
    expect(academyStorage.getCourses(course.userId)).toEqual([]);
  });

  it("migrates existing local landing-page snapshots into the saved course record", () => {
    const course = createCourse({ publicId: "legacy-public-id" });
    const legacy = {
      publicId: "legacy-public-id",
      businessName: "סטודיו בדיקה",
      instructorName: "מדריכה",
      city: "חיפה",
      syllabusOverview: "תקציר ישן",
      targetAudience: "מתחילות",
      prerequisites: "אין",
      studentKitIncluded: ["ערכת בסיס"],
      sessionsForStudent: course.content?.sessionsForStudent ?? [],
      certificationTerms: "נוכחות מלאה",
      cancellationPolicy: "לפי תנאי ההרשמה",
      branding: course.branding ?? {
        primaryColor: "#e11d48",
        secondaryColor: "#fff1f2",
        fontStyle: "modern",
        badgeText: "",
        galleryImages: [],
        faqs: [],
      },
    };
    localStorage.setItem("nailhub_instructor_courses_user-1", JSON.stringify([course]));
    localStorage.setItem(
      "nailhub_public_academy_courses",
      JSON.stringify({ "legacy-public-id": legacy }),
    );

    const migrated = academyStorage.getPublishedCourseById(course.id);

    expect(migrated?.isPublished).toBe(true);
    expect(migrated?.content?.syllabusOverview).toBe("תקציר ישן");
    expect(migrated?.landingProfile?.phone).toBe("");
    expect(localStorage.getItem("nailhub_public_academy_courses")).toBeNull();
  });
});
