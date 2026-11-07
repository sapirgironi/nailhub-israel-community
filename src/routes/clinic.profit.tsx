import { createFileRoute } from "@tanstack/react-router";
import { NailHubApp } from "@/components/NailHubApp";

export const Route = createFileRoute("/clinic/profit")({
  head: () => ({
    meta: [
      { title: "מחשבון הוצאות ורווחים — הקליניקה שלי — NailHub" },
      {
        name: "description",
        content: "מחשבון חודשי ושבועי להוצאות ולרווחיות העסק והקליניקה.",
      },
    ],
  }),
  component: () => <NailHubApp section="profit_calculator" />,
});
