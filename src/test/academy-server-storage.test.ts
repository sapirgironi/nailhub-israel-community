import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateCoursePricing, DEFAULT_CALCULATOR_STATE } from "@/lib/course-pricing";
import { generateSyllabusFromCourse } from "@/lib/academy-syllabus";
import type { SavedCourse } from "@/types/academy";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks }));
import { academyServerStorage } from "@/lib/academy-server-storage";

const userId = "10000000-0000-4000-8000-000000000003";
const courseId = "40000000-0000-4000-8000-000000000001";
const key = `nailhub_instructor_courses_${userId}`;

function localCourse(): SavedCourse {
  const pricingInput = { ...DEFAULT_CALCULATOR_STATE };
  const course: SavedCourse = {
    id: courseId,
    userId,
    createdAt: "2026-11-03T00:00:00.000Z",
    updatedAt: "2026-11-03T00:00:00.000Z",
    title: "Test course",
    category: "beginner",
    pricingInput,
    pricingOutput: calculateCoursePricing(pricingInput),
    isPublished: true,
    publicId: courseId,
  };
  course.content = generateSyllabusFromCourse(course);
  return course;
}

describe("academy server storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  });

  it("backs up local data before importing and does not repeat a successful import", async () => {
    const raw = JSON.stringify([localCourse()]);
    localStorage.setItem(key, raw);
    mocks.rpc.mockResolvedValue({ data: 1, error: null });
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ order }) }) });

    await academyServerStorage.getCourses(userId);
    await academyServerStorage.getCourses(userId);

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "import_academy_courses",
      expect.objectContaining({ courses: [expect.objectContaining({ id: courseId })] }),
    );
    expect(localStorage.getItem(key)).toBe(raw);
    expect(
      localStorage.getItem(`nailhub_academy_backup_https://example.supabase.co_${userId}_${key}`),
    ).toBe(raw);
  });

  it("keeps local data and retries after a failed import", async () => {
    const raw = JSON.stringify([localCourse()]);
    localStorage.setItem(key, raw);
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: new Error("offline") })
      .mockResolvedValueOnce({ data: 1, error: null });
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      }),
    });

    await expect(academyServerStorage.getCourses(userId)).rejects.toThrow("offline");
    expect(localStorage.getItem(key)).toBe(raw);
    await expect(academyServerStorage.getCourses(userId)).resolves.toEqual([]);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });

  it("propagates public lookup failures rather than pretending the course is absent", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("offline") });
    await expect(academyServerStorage.getPublishedCourseById(courseId)).rejects.toThrow("offline");
  });

  it("rejects stale updates and returns the new revision after a successful update", async () => {
    localStorage.setItem(`nailhub_academy_imported_https://example.supabase.co_${userId}`, "1");
    const select = vi
      .fn()
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [{ id: courseId }], error: null });
    const eq = vi.fn();
    eq.mockReturnValue({ eq, select });
    mocks.from.mockReturnValue({ update: () => ({ eq }) });
    const course = localCourse();

    await expect(academyServerStorage.saveCourse(userId, course)).rejects.toThrow(
      "changed or removed",
    );
    const saved = await academyServerStorage.saveCourse(userId, course);
    expect(Date.parse(saved.updatedAt)).toBeGreaterThan(Date.parse(course.updatedAt));
    expect(eq).toHaveBeenCalledWith("course_data->>updatedAt", course.updatedAt);
  });
});
