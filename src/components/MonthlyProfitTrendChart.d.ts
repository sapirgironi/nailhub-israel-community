type MonthlyProfitReport = {
  month_name: string;
  period: string;
  net_profit: number;
  total_revenue: number;
  total_expenses: number;
};

declare function MonthlyProfitTrendChart(props: {
  savedReports?: MonthlyProfitReport[];
}): JSX.Element;

export default MonthlyProfitTrendChart;
