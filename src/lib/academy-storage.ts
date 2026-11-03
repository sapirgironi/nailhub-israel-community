import type { CourseBranding, InstructorSettings, SavedCourse } from "../types/academy";

const COURSES_KEY_PREFIX = "nailhub_instructor_courses_";
const SETTINGS_KEY_PREFIX = "nailhub_instructor_settings_";
const LEGACY_PUBLIC_COURSES_KEY = "nailhub_public_academy_courses";

interface LegacyPublicCourse {
  publicId: string;
  businessName: string;
  instructorName: string;
  city: string;
  syllabusOverview: string;
  targetAudience: string;
  prerequisites: string;
  studentKitIncluded: string[];
  sessionsForStudent: NonNullable<SavedCourse["content"]>["sessionsForStudent"];
  certificationTerms: string;
  cancellationPolicy: string;
  branding: CourseBranding;
}

const defaultSettings: InstructorSettings = {
  defaultHourlyRate: 350,
  defaultStudioRentPerSession: 0,
  defaultConsumablesPerStudent: 40,
  defaultDailyHospitality: 25,
  defaultOpportunityDailyIncome: 1200,
  defaultVatExempt: true,
};

function parseStoredValue<T>(data: string, key: string): T {
  try {
    return JSON.parse(data) as T;
  } catch (error) {
    throw new Error(`Academy storage entry "${key}" contains invalid JSON.`, {
      cause: error,
    });
  }
}

function migrateLegacyPublications(userId: string, courses: SavedCourse[]): SavedCourse[] {
  const legacyData = localStorage.getItem(LEGACY_PUBLIC_COURSES_KEY);
  if (legacyData === null) return courses;

  const legacyCourses = parseStoredValue<unknown>(legacyData, LEGACY_PUBLIC_COURSES_KEY);
  if (typeof legacyCourses !== "object" || legacyCourses === null || Array.isArray(legacyCourses)) {
    throw new Error(
      `Academy storage entry "${LEGACY_PUBLIC_COURSES_KEY}" must contain a course map.`,
    );
  }

  const legacyMap = legacyCourses as Record<string, LegacyPublicCourse>;
  const migratedPublicIds: string[] = [];
  const migratedCourses = courses.map((course) => {
    const legacy = course.publicId ? legacyMap[course.publicId] : undefined;
    if (!legacy) return course;

    migratedPublicIds.push(legacy.publicId);
    return {
      ...course,
      isPublished: true,
      landingProfile: {
        businessName: legacy.businessName,
        instructorName: legacy.instructorName,
        city: legacy.city,
        phone: "",
      },
      branding: legacy.branding,
      content: {
        courseId: course.id,
        syllabusOverview: legacy.syllabusOverview,
        targetAudience: legacy.targetAudience,
        prerequisites: legacy.prerequisites,
        studentKitIncluded: legacy.studentKitIncluded,
        sessionsForStudent: legacy.sessionsForStudent,
        instructorLessons: course.content?.instructorLessons ?? [],
        certificationTerms: legacy.certificationTerms,
        cancellationPolicy: legacy.cancellationPolicy,
      },
    };
  });

  if (migratedPublicIds.length === 0) return courses;
  localStorage.setItem(`${COURSES_KEY_PREFIX}${userId}`, JSON.stringify(migratedCourses));
  for (const publicId of migratedPublicIds) delete legacyMap[publicId];
  if (Object.keys(legacyMap).length === 0) {
    localStorage.removeItem(LEGACY_PUBLIC_COURSES_KEY);
  } else {
    localStorage.setItem(LEGACY_PUBLIC_COURSES_KEY, JSON.stringify(legacyMap));
  }
  return migratedCourses;
}

export const academyStorage = {
  getCourses: (userId: string): SavedCourse[] => {
    const key = `${COURSES_KEY_PREFIX}${userId}`;
    const data = localStorage.getItem(key);
    if (data === null) return [];

    const courses = parseStoredValue<unknown>(data, key);
    if (!Array.isArray(courses)) {
      throw new Error(`Academy storage entry "${key}" must contain a course list.`);
    }

    return migrateLegacyPublications(userId, courses as SavedCourse[]);
  },

  getCourseById: (userId: string, courseId: string): SavedCourse | undefined => {
    const list = academyStorage.getCourses(userId);
    return list.find((course) => course.id === courseId);
  },

  saveCourse: (userId: string, course: SavedCourse): void => {
    const list = academyStorage.getCourses(userId);
    const existingIndex = list.findIndex((item) => item.id === course.id);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      list[existingIndex] = { ...course, updatedAt: now };
    } else {
      list.unshift({ ...course, createdAt: now, updatedAt: now });
    }

    localStorage.setItem(`${COURSES_KEY_PREFIX}${userId}`, JSON.stringify(list));
  },

  getPublishedCourseById: (courseId: string): SavedCourse | undefined => {
    const courseKeys = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    ).filter((key): key is string => key?.startsWith(COURSES_KEY_PREFIX) === true);

    for (const key of courseKeys) {
      const courses = academyStorage.getCourses(key.slice(COURSES_KEY_PREFIX.length));
      const course = courses.find(
        (item) => item.isPublished && (item.id === courseId || item.publicId === courseId),
      );
      if (course) return course;
    }
    return undefined;
  },

  deleteCourse: (userId: string, courseId: string): void => {
    const list = academyStorage.getCourses(userId).filter((item) => item.id !== courseId);
    localStorage.setItem(`${COURSES_KEY_PREFIX}${userId}`, JSON.stringify(list));
  },

  getSettings: (userId: string): InstructorSettings => {
    const key = `${SETTINGS_KEY_PREFIX}${userId}`;
    const data = localStorage.getItem(key);
    if (data === null) return { ...defaultSettings };

    const storedSettings = parseStoredValue<unknown>(data, key);
    if (
      typeof storedSettings !== "object" ||
      storedSettings === null ||
      Array.isArray(storedSettings)
    ) {
      throw new Error(`Academy storage entry "${key}" must contain settings.`);
    }

    return { ...defaultSettings, ...storedSettings };
  },

  saveSettings: (userId: string, settings: InstructorSettings): void => {
    localStorage.setItem(`${SETTINGS_KEY_PREFIX}${userId}`, JSON.stringify(settings));
  },
};
