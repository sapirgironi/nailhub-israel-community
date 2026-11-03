export type CourseCategory = "beginner" | "advanced";

export interface CourseTypeOption {
  id: string;
  name: string;
  category: CourseCategory;
  isCustom?: boolean;
}

export type VenueType = "rented" | "own_studio";

export interface CalculatorState {
  category: CourseCategory;
  selectedCourseId: string;
  customCourseName?: string;

  sessionsCount: number;
  hoursPerSession: number;
  prepTimeMinutesPerSession: number;
  instructorHourlyRate: number;
  includeRemoteSupport: boolean;
  remoteSupportHours: number;
  expectedDailyClientIncome?: number;

  venueType: VenueType;
  rentCostPerSession: number;
  venueTravelExpenses: number;
  studioMonthlyExpenses: number;
  studioMonthlyWorkDays: number;

  studentsCount: number;
  includeStudentKit: boolean;
  studentKitCost: number;
  dailyHospitalityCostPerStudent: number;
  dailyConsumablesCostPerStudent: number;
  certificateAndFolderCost: number;
  equipmentWearAndTearPerStudent: number;

  marketingBudget: number;
  creditCardFeePercentage: number;
  isVatExempt: boolean;
}

export interface CalculationResult {
  totalTeachingHours: number;
  totalWorkHoursWithPrep: number;
  hasGroupTimeOverflow: boolean;
  instructorLaborCost: number;
  venueCostTotal: number;
  directCostPerStudent: number;
  totalDirectCostsAllStudents: number;
  totalCourseProductionCost: number;
  breakEvenStudentsCount: number;
  pricingTiers: {
    basePrice: number;
    recommendedPrice: number;
    premiumPrice: number;
  };
  netProfit: number;
  opportunityCostDifference: number;
  isBelowOpportunityCost: boolean;
}
