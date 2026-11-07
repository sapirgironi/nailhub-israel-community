export type PensionMode = "mandatory" | "recommended";

export type TaxPensionEstimate = {
  nationalInsurance: number;
  incomeTax: number;
  pension: number;
  totalDeductions: number;
  takeHomeNet: number;
};

const REDUCED_NATIONAL_INSURANCE_RATE = 0.0597;
const FULL_NATIONAL_INSURANCE_RATE = 0.1783;
const REDUCED_RATE_THRESHOLD = 7522;

export function estimateTaxAndPension(
  netProfit: number,
  taxRate: number,
  pensionMode: PensionMode,
): TaxPensionEstimate {
  const taxableProfit = Math.max(0, Number.isFinite(netProfit) ? netProfit : 0);
  const validTaxRate = Math.min(30, Math.max(0, Number.isFinite(taxRate) ? taxRate : 0));
  const nationalInsurance = Math.round(
    Math.min(taxableProfit, REDUCED_RATE_THRESHOLD) * REDUCED_NATIONAL_INSURANCE_RATE +
      Math.max(0, taxableProfit - REDUCED_RATE_THRESHOLD) * FULL_NATIONAL_INSURANCE_RATE,
  );
  const incomeTax = Math.round(taxableProfit * (validTaxRate / 100));
  const pensionRate = pensionMode === "mandatory" ? 0.0445 : 0.165;
  const pension = Math.round(taxableProfit * pensionRate);
  const totalDeductions = nationalInsurance + incomeTax + pension;

  return {
    nationalInsurance,
    incomeTax,
    pension,
    totalDeductions,
    takeHomeNet: Math.max(0, Math.round(taxableProfit - totalDeductions)),
  };
}
