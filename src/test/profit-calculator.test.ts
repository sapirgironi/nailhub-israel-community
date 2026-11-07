import { describe, expect, it } from "vitest";
import { calculateProfit, type ProfitCalculatorInput } from "../lib/profit-calculator";

const defaults: ProfitCalculatorInput = {
  clientsCount: 60,
  avgPrice: 160,
  materialCostPerClient: 18,
  isHomeClinic: true,
  homeRatio: 25,
  rent: 4000,
  arnona: 450,
  electricity: 400,
  waterAndNet: 220,
  fuelCost: 450,
  marketingAndSoftware: 250,
  toolsDepreciation: 150,
  insuranceAndAccountant: 350,
};

describe("profit calculator", () => {
  it("calculates revenue, proportional home costs, expenses, and profit", () => {
    expect(calculateProfit(defaults)).toEqual({
      monthlyRevenue: 9600,
      monthlyMaterials: 1080,
      monthlyHomeCosts: 1267.5,
      monthlyExpenses: 3547.5,
      monthlyNetProfit: 6052.5,
      profitMargin: (6052.5 / 9600) * 100,
    });
  });

  it("uses the full rent for a rented studio and safely handles zero revenue", () => {
    const result = calculateProfit({
      ...defaults,
      isHomeClinic: false,
      clientsCount: 0,
    });
    expect(result.monthlyHomeCosts).toBe(defaults.rent);
    expect(result.monthlyRevenue).toBe(0);
    expect(result.profitMargin).toBe(0);
  });
});
