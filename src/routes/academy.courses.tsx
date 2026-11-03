import { createFileRoute } from "@tanstack/react-router";
import { NailHubApp } from "@/components/NailHubApp";

export const Route = createFileRoute("/academy/courses")({
  head: () => ({
    meta: [
      { title: "מאגר הקורסים שלי — האקדמיה | NailHub" },
      {
        name: "description",
        content: "צפייה וניהול של הקורסים ששמרת במאגר האישי שלך.",
      },
    ],
  }),
  component: () => <NailHubApp section="academy_courses" />,
});
