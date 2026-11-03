import { createFileRoute } from "@tanstack/react-router";
import { NailHubApp } from "@/components/NailHubApp";

export const Route = createFileRoute("/academy/calculator")({
  head: () => ({
    meta: [
      { title: "מחשבון תמחור קורסים — האקדמיה שלי | NailHub" },
      {
        name: "description",
        content: "מחשבון תמחור קורסים והשתלמויות למדריכות NailHub.",
      },
    ],
  }),
  component: () => <NailHubApp section="academy_pricing" />,
});
