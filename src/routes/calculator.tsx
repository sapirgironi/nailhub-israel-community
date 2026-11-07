import { createFileRoute } from "@tanstack/react-router";
import { NailHubApp } from "@/components/NailHubApp";
export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "מחשבון תמחור — NailHub" },
      { name: "description", content: "מחשבון תמחור לקהילת הציפורניים של ישראל" },
      { property: "og:title", content: "מחשבון תמחור — NailHub" },
      { property: "og:description", content: "מחשבון תמחור לקהילת הציפורניים של ישראל" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <NailHubApp section="calculator" />,
});
