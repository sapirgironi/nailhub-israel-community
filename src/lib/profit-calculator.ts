export type ProfitCalculatorInput = {
  clientsCount: number;
  avgPrice: number;
  materialCostPerClient: number;
  isHomeClinic: boolean;
  homeRatio: number;
  rent: number;
  arnona: number;
  electricity: number;
  waterAndNet: number;
  fuelCost: number;
  marketingAndSoftware: number;
  toolsDepreciation: number;
  insuranceAndAccountant: number;
};

export type ProfitCalculatorResult = {
  monthlyRevenue: number;
  monthlyMaterials: number;
  monthlyHomeCosts: number;
  monthlyExpenses: number;
  monthlyNetProfit: number;
  profitMargin: number;
};

export function calculateProfit(input: ProfitCalculatorInput): ProfitCalculatorResult {
  const monthlyRevenue = input.clientsCount * input.avgPrice;
  const monthlyMaterials = input.clientsCount * input.materialCostPerClient;
  const monthlyHomeCosts = input.isHomeClinic
    ? (input.rent + input.arnona + input.electricity + input.waterAndNet) * (input.homeRatio / 100)
    : input.rent;
  const monthlyExpenses =
    monthlyMaterials +
    monthlyHomeCosts +
    input.fuelCost +
    input.marketingAndSoftware +
    input.toolsDepreciation +
    input.insuranceAndAccountant;
  const monthlyNetProfit = monthlyRevenue - monthlyExpenses;

  return {
    monthlyRevenue,
    monthlyMaterials,
    monthlyHomeCosts,
    monthlyExpenses,
    monthlyNetProfit,
    profitMargin: monthlyRevenue > 0 ? (monthlyNetProfit / monthlyRevenue) * 100 : 0,
  };
}
