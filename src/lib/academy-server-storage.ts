import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { SavedCourse } from "@/types/academy";
import { academyStorage } from "./academy-storage";

const numeric = z.number().finite();
const pricingInput = z
  .object({
    category: z.enum(["beginner", "advanced"]),
    selectedCourseId: z.string(),
    customCourseName: z.string().optional(),
    sessionsCount: numeric,
    hoursPerSession: numeric,
    prepTimeMinutesPerSession: numeric,
    instructorHourlyRate: numeric,
    includeRemoteSupport: z.boolean(),
    remoteSupportHours: numeric,
    expectedDailyClientIncome: numeric.optional(),
    venueType: z.enum(["rented", "own_studio"]),
    rentCostPerSession: numeric,
    venueTravelExpenses: numeric,
    studioMonthlyExpenses: numeric,
    studioMonthlyWorkDays: numeric,
    studentsCount: numeric,
    includeStudentKit: z.boolean(),
    studentKitCost: numeric,
    dailyHospitalityCostPerStudent: numeric,
    dailyConsumablesCostPerStudent: numeric,
    certificateAndFolderCost: numeric,
    equipmentWearAndTearPerStudent: numeric,
    marketingBudget: numeric,
    creditCardFeePercentage: numeric,
    isVatExempt: z.boolean(),
  })
  .passthrough();
const pricingOutput = z
  .object({
    totalTeachingHours: numeric,
    totalWorkHoursWithPrep: numeric,
    hasGroupTimeOverflow: z.boolean(),
    instructorLaborCost: numeric,
    venueCostTotal: numeric,
    directCostPerStudent: numeric,
    totalDirectCostsAllStudents: numeric,
    totalCourseProductionCost: numeric,
    breakEvenStudentsCount: numeric,
    pricingTiers: z
      .object({ basePrice: numeric, recommendedPrice: numeric, premiumPrice: numeric })
      .passthrough(),
    netProfit: numeric,
    opportunityCostDifference: numeric,
    isBelowOpportunityCost: z.boolean(),
  })
  .passthrough();
const content = z
  .object({
    courseId: z.string(),
    syllabusOverview: z.string(),
    targetAudience: z.string(),
    prerequisites: z.string(),
    studentKitIncluded: z.array(z.string()),
    sessionsForStudent: z.array(
      z
        .object({
          sessionNumber: numeric,
          title: z.string(),
          summary: z.string(),
          practicalFocus: z.string(),
        })
        .passthrough(),
    ),
    instructorLessons: z.array(
      z
        .object({
          sessionNumber: numeric,
          topic: z.string(),
          learningGoal: z.string(),
          timeline: z.array(
            z
              .object({
                timeRange: z.string(),
                title: z.string(),
                description: z.string(),
                type: z.enum(["theory", "demo", "practice", "summary"]),
              })
              .passthrough(),
          ),
          requiredEquipment: z.array(z.string()),
          instructorCommonMistakesToWatch: z.array(z.string()),
          homework: z.string(),
        })
        .passthrough(),
    ),
    certificationTerms: z.string(),
    cancellationPolicy: z.string(),
  })
  .passthrough();
const branding = z
  .object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    fontStyle: z.enum(["modern", "luxury", "bold"]),
    badgeText: z.string(),
    coverImageUrl: z.string().optional(),
    galleryImages: z.array(z.string()),
    videoUrl: z.string().optional(),
    faqs: z.array(
      z.object({ id: z.string(), question: z.string(), answer: z.string() }).passthrough(),
    ),
  })
  .passthrough();
const courseSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    title: z.string(),
    category: z.enum(["beginner", "advanced"]),
    pricingInput,
    pricingOutput,
    content: content.optional(),
    branding: branding.optional(),
    landingProfile: z
      .object({
        businessName: z.string(),
        instructorName: z.string(),
        city: z.string(),
        phone: z.string(),
        logoUrl: z.string().optional(),
      })
      .passthrough()
      .optional(),
    isPublished: z.boolean().optional(),
    publicId: z.string().optional(),
  })
  .passthrough();

function json(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

const importing = new Map<string, Promise<void>>();

async function importLocalCourses(userId: string): Promise<void> {
  const project = import.meta.env["VITE_SUPABASE_URL"];
  if (!project) throw new Error("Missing Supabase environment variable for course import.");
  const marker = `nailhub_academy_imported_${project}_${userId}`;
  if (localStorage.getItem(marker)) return;

  const courseKey = `nailhub_instructor_courses_${userId}`;
  const legacyKey = "nailhub_public_academy_courses";
  for (const key of [courseKey, legacyKey]) {
    const original = localStorage.getItem(key);
    const backupKey = `nailhub_academy_backup_${project}_${userId}_${key}`;
    if (original !== null && localStorage.getItem(backupKey) === null) {
      localStorage.setItem(backupKey, original);
    }
  }
  const courses = academyStorage.getCourses(userId).map((course) => courseSchema.parse(course));
  if (courses.some((course) => course.userId !== userId)) {
    throw new Error("A local academy course belongs to a different account.");
  }
  if (courses.length) {
    const { error } = await supabase.rpc("import_academy_courses", { courses: json(courses) });
    if (error) throw error;
  }
  localStorage.setItem(marker, "1");
}

async function ensureImported(userId: string): Promise<void> {
  let task = importing.get(userId);
  if (!task) {
    task = importLocalCourses(userId);
    importing.set(userId, task);
  }
  try {
    await task;
  } finally {
    if (importing.get(userId) === task) importing.delete(userId);
  }
}

export const academyServerStorage = {
  async getCourses(userId: string): Promise<SavedCourse[]> {
    await ensureImported(userId);
    const { data, error } = await supabase
      .from("academy_courses")
      .select("id,owner_id,course_data")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data.map((row) => {
      const course = courseSchema.parse(row.course_data);
      if (course.id !== row.id || course.userId !== row.owner_id) {
        throw new Error("Invalid academy course ownership.");
      }
      return course as SavedCourse;
    });
  },
  async createCourse(userId: string, value: SavedCourse): Promise<void> {
    await ensureImported(userId);
    const course = courseSchema.parse({ ...value, updatedAt: new Date().toISOString() });
    if (course.userId !== userId) throw new Error("Invalid academy course ownership.");
    const { error } = await supabase.from("academy_courses").insert({
      id: course.id,
      owner_id: userId,
      course_data: json(course),
      updated_at: course.updatedAt,
    });
    if (error) throw error;
  },
  async saveCourse(userId: string, value: SavedCourse): Promise<SavedCourse> {
    await ensureImported(userId);
    const updatedAt = new Date(Math.max(Date.now(), Date.parse(value.updatedAt) + 1)).toISOString();
    const course = courseSchema.parse({ ...value, updatedAt });
    if (course.userId !== userId) throw new Error("Invalid academy course ownership.");
    const { data, error } = await supabase
      .from("academy_courses")
      .update({ course_data: json(course), updated_at: course.updatedAt })
      .eq("owner_id", userId)
      .eq("id", course.id)
      .eq("course_data->>updatedAt", value.updatedAt)
      .select("id");
    if (error) throw error;
    if (data.length !== 1) throw new Error("Academy course was changed or removed elsewhere.");
    return course as SavedCourse;
  },
  async deleteCourse(userId: string, courseId: string): Promise<void> {
    await ensureImported(userId);
    const { data, error } = await supabase
      .from("academy_courses")
      .delete()
      .eq("owner_id", userId)
      .eq("id", courseId)
      .select("id");
    if (error) throw error;
    if (data.length !== 1) throw new Error("Academy course could not be deleted.");
  },
  async getPublishedCourseById(courseId: string): Promise<Json | null> {
    const { data, error } = await supabase.rpc("public_academy_course", { course_id: courseId });
    if (error) throw error;
    return data;
  },
};
