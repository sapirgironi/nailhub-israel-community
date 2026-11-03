import { createFileRoute } from "@tanstack/react-router";
import { DemoAcademy } from "@/components/DemoAcademy";

export const Route = createFileRoute("/academy/")({
  head: () => ({
    meta: [
      { title: "קורסים והשתלמויות — הדגמת NailHub Academy" },
      {
        name: "description",
        content: "לוח קורסים והשתלמויות בציפורניים עם הוספת קורס במצב הדגמה.",
      },
      { property: "og:title", content: "NailHub Academy — קורסים והשתלמויות" },
      {
        property: "og:description",
        content: "לוח קורסים אינטראקטיבי עם נתוני דוגמה בלבד.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemoAcademy,
});
