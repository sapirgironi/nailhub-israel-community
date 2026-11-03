import type { CalculationResult, CalculatorState } from "./pricing-calculator";

export interface LessonSegment {
  timeRange: string;
  title: string;
  description: string;
  type: "theory" | "demo" | "practice" | "summary";
}

export interface LessonPlanItem {
  sessionNumber: number;
  topic: string;
  learningGoal: string;
  timeline: LessonSegment[];
  requiredEquipment: string[];
  instructorCommonMistakesToWatch: string[];
  homework: string;
}

export interface StudentSyllabusItem {
  sessionNumber: number;
  title: string;
  summary: string;
  practicalFocus: string;
}

export interface GeneratedCourseContent {
  courseId: string;
  syllabusOverview: string;
  targetAudience: string;
  prerequisites: string;
  studentKitIncluded: string[];
  sessionsForStudent: StudentSyllabusItem[];
  instructorLessons: LessonPlanItem[];
  certificationTerms: string;
  cancellationPolicy: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface CourseBranding {
  primaryColor: string;
  secondaryColor: string;
  fontStyle: "modern" | "luxury" | "bold";
  badgeText: string;
  coverImageUrl?: string | undefined;
  galleryImages: string[];
  videoUrl?: string | undefined;
  faqs: FaqItem[];
}

export interface AcademyLandingProfile {
  businessName: string;
  instructorName: string;
  city: string;
  phone: string;
  logoUrl?: string | undefined;
}

export interface InstructorSettings {
  defaultHourlyRate: number;
  defaultStudioRentPerSession: number;
  defaultConsumablesPerStudent: number;
  defaultDailyHospitality: number;
  defaultOpportunityDailyIncome: number;
  defaultVatExempt: boolean;
}

export interface SavedCourse {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  category: "beginner" | "advanced";
  pricingInput: CalculatorState;
  pricingOutput: CalculationResult;
  content?: GeneratedCourseContent;
  branding?: CourseBranding;
  landingProfile?: AcademyLandingProfile;
  isPublished?: boolean;
  publicId?: string;
}
