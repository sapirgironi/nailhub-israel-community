import { createFileRoute } from "@tanstack/react-router";
import { PlansView } from "@/components/PlansView";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "מסלולים ושדרוג חשבון — NailHub" },
      {
        name: "description",
        content: "בחרי את מסלול NailHub שמתאים לעסק שלך.",
      },
    ],
  }),
  component: PlansView,
});
