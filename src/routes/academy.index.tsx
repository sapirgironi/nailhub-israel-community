import { createFileRoute } from "@tanstack/react-router";
import { NailHubApp } from "@/components/NailHubApp";

export const Route = createFileRoute("/academy/")({
  head: () => ({
    meta: [
      { title: "האקדמיה שלי — NailHub" },
      {
        name: "description",
        content: "מרכז לניהול קורסים, סילבוסים ותמחור באקדמיה שלך.",
      },
      { property: "og:title", content: "האקדמיה שלי — NailHub" },
      {
        property: "og:description",
        content: "מרכז לניהול קורסים, סילבוסים ותמחור באקדמיה שלך.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <NailHubApp section="academy_hub" />,
});
