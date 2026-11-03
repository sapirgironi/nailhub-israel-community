import { describe, expect, it } from "vitest";
import { generateSyllabusFromCourse } from "@/lib/academy-syllabus";
import { calculateCoursePricing, DEFAULT_CALCULATOR_STATE } from "@/lib/course-pricing";
import type { SavedCourse } from "@/types/academy";

function createCourse(overrides: Partial<SavedCourse["pricingInput"]> = {}): SavedCourse {
  const pricingInput = { ...DEFAULT_CALCULATOR_STATE, ...overrides };
  return {
    id: "course-1",
    userId: "user-1",
    createdAt: "2026-11-02T00:00:00.000Z",
    updatedAt: "2026-11-02T00:00:00.000Z",
    title: "קורס בדיקה",
    category: pricingInput.category,
    pricingInput,
    pricingOutput: calculateCoursePricing(pricingInput),
  };
}

describe("academy syllabus generator", () => {
  it("uses the detailed beginner curriculum and course kit selection", () => {
    const syllabus = generateSyllabusFromCourse(createCourse({ includeStudentKit: true }));

    expect(syllabus.sessionsForStudent).toHaveLength(DEFAULT_CALCULATOR_STATE.sessionsCount);
    expect(syllabus.sessionsForStudent[0]).toMatchObject({
      sessionNumber: 1,
      title: "יסודות, אנטומיה, חיטוי ומבנה הציפורן",
      summary: expect.stringContaining("סטריליזציה"),
    });
    expect(syllabus.instructorLessons[0]?.requiredEquipment).toContain("מכשיר שיוף");
    expect(syllabus.studentKitIncluded).toContain(
      "מכשיר שיוף מקצועי + ערכת ראשי יהלום (להבה, כדור, חרוט)",
    );
  });

  it("sets timeline boundaries to the duration of a short course session", () => {
    const syllabus = generateSyllabusFromCourse(createCourse({ hoursPerSession: 0.25 }));
    const timeline = syllabus.instructorLessons[0]?.timeline ?? [];

    expect(timeline).toHaveLength(4);
    expect(timeline[0]?.timeRange.split(" - ")[0]).toBe("00:00");
    expect(timeline.at(-1)?.timeRange.split(" - ")[1]).toBe("00:15");
  });
});
