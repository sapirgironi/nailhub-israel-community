import { createFileRoute } from "@tanstack/react-router";
import { NailHubApp } from "@/components/NailHubApp";

export const Route = createFileRoute("/academy/syllabus")({
  head: () => ({
    meta: [
      { title: "מחולל סילבוסים — האקדמיה שלי | NailHub" },
      {
        name: "description",
        content: "סילבוסים לתלמידות ומערכי שיעור למדריכות NailHub.",
      },
    ],
  }),
  component: () => <NailHubApp section="academy_syllabus" />,
});
