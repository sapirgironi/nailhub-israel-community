import type {
  CalculationResult,
  CalculatorState,
  CourseTypeOption,
} from "@/types/pricing-calculator";
import { VAT_RATE } from "./pricing";

export const COURSE_TYPES: CourseTypeOption[] = [
  { id: "nail-foundations", name: "יסודות בניית ציפורניים", category: "beginner" },
  { id: "gel-polish", name: "לק ג׳ל ומניקור משולב", category: "beginner" },
  { id: "builder-gel", name: "מבנה אנטומי ובנייה בג׳ל", category: "beginner" },
  { id: "acrylic-basics", name: "יסודות אקריל ופוליג׳ל", category: "beginner" },
  { id: "advanced-structure", name: "מבנה אדריכלי ושיטות מתקדמות", category: "advanced" },
  { id: "dual-forms", name: "טיפסים הפוכים וטכניקות מתקדמות", category: "advanced" },
  { id: "nail-art", name: "נייל ארט, פרנץ׳ ואפקטים", category: "advanced" },
  { id: "salon-business", name: "ניהול עסק, תמחור ושיווק", category: "advanced" },
];

export const DEFAULT_CALCULATOR_STATE: CalculatorState = {
  category: "beginner",
  selectedCourseId: "nail-foundations",
  sessionsCount: 2,
  hoursPerSession: 6,
  prepTimeMinutesPerSession: 45,
  instructorHourlyRate: 250,
  includeRemoteSupport: false,
  remoteSupportHours: 0,
  venueType: "rented",
  rentCostPerSession: 500,
  venueTravelExpenses: 100,
  studioMonthlyExpenses: 5000,
  studioMonthlyWorkDays: 22,
  studentsCount: 6,
  includeStudentKit: false,
  studentKitCost: 250,
  dailyHospitalityCostPerStudent: 25,
  dailyConsumablesCostPerStudent: 40,
  certificateAndFolderCost: 35,
  equipmentWearAndTearPerStudent: 75,
  marketingBudget: 300,
  creditCardFeePercentage: 1.8,
  isVatExempt: true,
};

const TARGET_PROFIT_MARGIN = 0.5;
const PREMIUM_MULTIPLIER = 1.25;
const WORK_HOURS_PER_DAY = 8;

function assertValidState(state: CalculatorState) {
  const numbers = Object.entries(state).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number",
  );
  if (numbers.some(([, value]) => !Number.isFinite(value) || value < 0)) {
    throw new Error("כל הערכים המספריים חייבים להיות מספרים חיוביים או אפס");
  }
  if (
    state.sessionsCount < 1 ||
    state.hoursPerSession <= 0 ||
    state.studentsCount < 1 ||
    state.studioMonthlyWorkDays < 1 ||
    state.creditCardFeePercentage >= 100
  ) {
    throw new Error("יש להזין לפחות מפגש, שעת הדרכה, תלמידה ויום עבודה חודשי אחד");
  }
}

/**
 * Converts the net amount the instructor needs to keep into a price that
 * accounts for card fees and, for a VAT-registered business, collected VAT.
 */
function grossPriceForNetAmount(netAmount: number, state: CalculatorState) {
  const cardFeeRate = state.creditCardFeePercentage / 100;
  const vatMultiplier = state.isVatExempt ? 1 : 1 + VAT_RATE;
  return (netAmount * vatMultiplier) / (1 - cardFeeRate);
}

/**
 * Prices each student after VAT and card fees. The base tier recovers course
 * costs, the recommended tier targets a 50% net margin, and the premium tier
 * adds 25%. Each session is treated as a training day; opportunity cost uses
 * an eight-hour work day.
 */
export function calculateCoursePricing(state: CalculatorState): CalculationResult {
  assertValidState(state);

  // Each session is treated as one training day when allocating daily and venue costs.
  const sessions = state.sessionsCount;
  const teachingHours = sessions * state.hoursPerSession;
  const prepHours = (sessions * state.prepTimeMinutesPerSession) / 60;
  const supportHours = state.includeRemoteSupport ? state.remoteSupportHours : 0;
  const totalWorkHours = teachingHours + prepHours + supportHours;

  const instructorLaborCost = totalWorkHours * state.instructorHourlyRate;
  const venueCostTotal =
    state.venueType === "rented"
      ? sessions * (state.rentCostPerSession + state.venueTravelExpenses)
      : (sessions * state.studioMonthlyExpenses) / state.studioMonthlyWorkDays +
        sessions * state.venueTravelExpenses;

  const directCostPerStudent =
    (state.includeStudentKit ? state.studentKitCost : 0) +
    sessions * (state.dailyHospitalityCostPerStudent + state.dailyConsumablesCostPerStudent) +
    state.certificateAndFolderCost +
    state.equipmentWearAndTearPerStudent;
  const totalDirectCostsAllStudents = directCostPerStudent * state.studentsCount;
  const fixedCosts = instructorLaborCost + venueCostTotal + state.marketingBudget;
  const totalCourseProductionCost = fixedCosts + totalDirectCostsAllStudents;
  const productionCostPerStudent = totalCourseProductionCost / state.studentsCount;
  const basePrice = grossPriceForNetAmount(productionCostPerStudent, state);
  const recommendedPrice = grossPriceForNetAmount(
    productionCostPerStudent / (1 - TARGET_PROFIT_MARGIN),
    state,
  );
  const premiumPrice = recommendedPrice * PREMIUM_MULTIPLIER;
  const recommendedNetRevenuePerStudent =
    (recommendedPrice * (1 - state.creditCardFeePercentage / 100)) /
    (state.isVatExempt ? 1 : 1 + VAT_RATE);
  const contributionPerStudent = recommendedNetRevenuePerStudent - directCostPerStudent;
  const breakEvenStudentsCount =
    fixedCosts <= 0
      ? 0
      : contributionPerStudent <= 0
        ? Number.POSITIVE_INFINITY
        : Math.ceil(fixedCosts / contributionPerStudent);
  const netProfit =
    recommendedNetRevenuePerStudent * state.studentsCount - totalCourseProductionCost;
  // Daily client income is prorated to the course's total hours on an eight-hour work day.
  const opportunityCost =
    ((state.expectedDailyClientIncome ?? 0) * totalWorkHours) / WORK_HOURS_PER_DAY;
  const opportunityCostDifference = netProfit - opportunityCost;

  return {
    totalTeachingHours: teachingHours,
    totalWorkHoursWithPrep: totalWorkHours,
    hasGroupTimeOverflow:
      state.hoursPerSession + state.prepTimeMinutesPerSession / 60 > WORK_HOURS_PER_DAY,
    instructorLaborCost,
    venueCostTotal,
    directCostPerStudent,
    totalDirectCostsAllStudents,
    totalCourseProductionCost,
    breakEvenStudentsCount,
    pricingTiers: { basePrice, recommendedPrice, premiumPrice },
    netProfit,
    opportunityCostDifference,
    isBelowOpportunityCost: opportunityCostDifference < 0,
  };
}
