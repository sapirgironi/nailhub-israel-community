import { describe, expect, it } from "vitest";
import { estimateTaxAndPension } from "@/lib/tax-pension-estimator";

describe("estimateTaxAndPension", () => {
  it("uses the reduced and higher contribution bands progressively", () => {
    expect(estimateTaxAndPension(10_000, 0, "mandatory").nationalInsurance).toBe(
      Math.round(7522 * 0.0597 + (10_000 - 7522) * 0.1783),
    );
  });

  it("clamps rates and prevents deductions from creating negative take-home", () => {
    const estimate = estimateTaxAndPension(-500, 60, "recommended");
    expect(estimate).toEqual({
      nationalInsurance: 0,
      incomeTax: 0,
      pension: 0,
      totalDeductions: 0,
      takeHomeNet: 0,
    });
  });
});
