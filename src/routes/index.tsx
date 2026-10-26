import { createFileRoute } from "@tanstack/react-router";
import { NailHubApp } from "@/components/NailHubApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NailHub — קהילת הציפורניים של ישראל" },
      { name: "description", content: "דירקטורי מקצועי לבונות ציפורניים, מדריכות וספקים בישראל." },
      { property: "og:title", content: "NailHub — קהילת הציפורניים של ישראל" },
      { property: "og:description", content: "דירקטורי מקצועי לבונות ציפורניים, מדריכות וספקים בישראל." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NailHubApp,
});
