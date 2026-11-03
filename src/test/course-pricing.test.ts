import { describe, expect, it } from "vitest";
import { DEFAULT_CALCULATOR_STATE, calculateCoursePricing } from "@/lib/course-pricing";

describe("course pricing calculator", () => {
  it("calculates teaching time, production cost, and a recommended price", () => {
    const result = calculateCoursePricing(DEFAULT_CALCULATOR_STATE);

    expect(result.totalTeachingHours).toBe(12);
    expect(result.totalWorkHoursWithPrep).toBe(13.5);
    expect(result.instructorLaborCost).toBe(3375);
    expect(result.venueCostTotal).toBe(1200);
    expect(result.directCostPerStudent).toBe(240);
    expect(result.totalCourseProductionCost).toBe(6315);
    expect(result.netProfit).toBeCloseTo(6315);
    expect(result.breakEvenStudentsCount).toBe(3);
    expect(
      result.pricingTiers.basePrice * (1 - DEFAULT_CALCULATOR_STATE.creditCardFeePercentage / 100),
    ).toBeCloseTo(result.totalCourseProductionCost / DEFAULT_CALCULATOR_STATE.studentsCount);
    expect(
      result.pricingTiers.recommendedPrice *
        (1 - DEFAULT_CALCULATOR_STATE.creditCardFeePercentage / 100),
    ).toBeCloseTo((result.totalCourseProductionCost * 2) / DEFAULT_CALCULATOR_STATE.studentsCount);
  });

  it("includes remote support time and its instructor labor cost when enabled", () => {
    const result = calculateCoursePricing({
      ...DEFAULT_CALCULATOR_STATE,
      includeRemoteSupport: true,
      remoteSupportHours: 2,
    });

    expect(result.totalWorkHoursWithPrep).toBe(15.5);
    expect(result.instructorLaborCost).toBe(3875);
  });

  it("allocates monthly studio expenses across work days", () => {
    const result = calculateCoursePricing({
      ...DEFAULT_CALCULATOR_STATE,
      venueType: "own_studio",
    });

    expect(result.venueCostTotal).toBeCloseTo(654.54545);
  });

  it("includes VAT in customer prices for a non-exempt instructor", () => {
    const exempt = calculateCoursePricing(DEFAULT_CALCULATOR_STATE);
    const registered = calculateCoursePricing({
      ...DEFAULT_CALCULATOR_STATE,
      isVatExempt: false,
    });

    expect(registered.pricingTiers.basePrice / exempt.pricingTiers.basePrice).toBeCloseTo(1.18);
  });

  it("compares course profit with the time-based client income opportunity", () => {
    const result = calculateCoursePricing({
      ...DEFAULT_CALCULATOR_STATE,
      expectedDailyClientIncome: 800,
    });

    expect(result.opportunityCostDifference).toBeCloseTo(4965);
    expect(result.isBelowOpportunityCost).toBe(false);
  });

  it("flags a training day longer than eight hours including preparation", () => {
    const result = calculateCoursePricing({
      ...DEFAULT_CALCULATOR_STATE,
      hoursPerSession: 8,
    });

    expect(result.hasGroupTimeOverflow).toBe(true);
  });

  it("rejects invalid counts and card fees that cannot be covered", () => {
    expect(() =>
      calculateCoursePricing({ ...DEFAULT_CALCULATOR_STATE, studentsCount: 0 }),
    ).toThrow();
    expect(() =>
      calculateCoursePricing({
        ...DEFAULT_CALCULATOR_STATE,
        creditCardFeePercentage: 100,
      }),
    ).toThrow();
  });
});
