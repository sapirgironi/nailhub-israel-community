import { createFileRoute } from "@tanstack/react-router";
import { NailHubApp } from "@/components/NailHubApp";

export const Route = createFileRoute("/academy-pricing")({
  head: () => ({
    meta: [
      { title: "האקדמיה שלי — תמחור קורסים | NailHub" },
      {
        name: "description",
        content: "מחשבון תמחור קורסים והשתלמויות למדריכות NailHub.",
      },
    ],
  }),
  component: () => <NailHubApp section="academy_pricing" />,
});
